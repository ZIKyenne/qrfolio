import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { MAX_PAGES, countPages, initialQrStatus } from "@/lib/quota"
import { slugifyUnique } from "@/lib/slug"
import { uniqueShortCode } from "@/lib/shortCode"
import { normalizePageTheme } from "@/app/dashboard/builder/types"
import { BLOCK_DEFS } from "@/app/dashboard/builder/blockDefs"
import { texte, objetBorne, tableauBorne } from "@/lib/bornes"

// Slug valide (minuscules, accents retires, non-alphanum -> "-", + suffixe
// aleatoire) via @/lib/slug. Respecte slug_format : ^[a-z0-9_-]{2,60}$

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()

    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 })
    }

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    // Plafond anti-abus (cf. lib/quota) : création plafonnée à MAX_PAGES,
    // indépendamment du plan. Le quota du plan porte sur les QR ACTIFS.
    const { data: prof } = await supabaseAdmin.from("profiles").select("plan").eq("id", user.id).single()
    if ((await countPages(supabaseAdmin, user.id)) >= MAX_PAGES) {
      return NextResponse.json({ error: "limit", message: `Vous avez atteint le plafond de ${MAX_PAGES} pages.` }, { status: 403 })
    }
    const qrStatus = await initialQrStatus(supabaseAdmin, user.id, prof?.plan as string)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
    // Bornes : 200 blocs / 600 Ko, un thème de 40 Ko, un nom de 120 caractères.
    // Avant, un corps de plusieurs Mo était inséré tel quel.
    const templateId = texte(body.templateId, 80)
    const templateName = texte(body.templateName, 120)
    const theme = objetBorne(body.theme, 40_000)
    if (body.theme !== undefined && body.theme !== null && !theme) return NextResponse.json({ error: "Thème trop volumineux." }, { status: 413 })
    const blocks = tableauBorne(body.blocks, 200, 600_000)
    if (body.blocks !== undefined && !blocks) return NextResponse.json({ error: "Trop de blocs, ou contenu trop volumineux (200 blocs, 600 Ko)." }, { status: 413 })
    const slug = body.slug

    const RESERVED = ["dashboard","admin","auth","login","signup","pricing","templates","settings","profile","api","legal","privacy","terms","contact","features","examples","qr-codes","upgrade","new"]

    let cleanSlug: string
    if (slug && typeof slug === "string" && slug.trim()) {
      const s = slug.trim().toLowerCase()
      if (!/^[a-z0-9_-]{2,60}$/.test(s)) {
        return NextResponse.json({ error: "Slug invalide (2-60 caracteres, lettres minuscules, chiffres et tirets)." }, { status: 400 })
      }
      if (RESERVED.includes(s)) {
        return NextResponse.json({ error: "Ce slug est reserve, choisis-en un autre." }, { status: 400 })
      }
      const { data: taken } = await supabaseAdmin.from("pages").select("id").eq("slug", s).maybeSingle()
      if (taken) {
        return NextResponse.json({ error: "Ce slug est deja pris." }, { status: 409 })
      }
      cleanSlug = s
    } else {
      cleanSlug = slugifyUnique(templateName || templateId || "page")
    }

    const { data: newPage, error: pageError } = await supabaseAdmin
      .from("pages")
      .insert({
        user_id: user.id,
        title: templateName || "Ma page",
        slug: cleanSlug,
        status: "draft",
        template_id: templateId,
        theme: normalizePageTheme(theme), // écrit au format canonique unique (jamais {} ni format hérité)
      })
      .select()
      .single()

    if (pageError || !newPage) {
      const isDup = pageError?.message?.includes("pages_slug_unique") || pageError?.code === "23505"
      return NextResponse.json(
        { error: isDup ? "Ce slug est deja pris." : (pageError?.message || "Erreur creation page") },
        { status: isDup ? 409 : 500 }
      )
    }

    // Validation SERVEUR : on n'insère que des blocs dont le type existe réellement
    // dans BLOCK_DEFS (sinon un type inconnu = bloc invisible/cassé publié en
    // silence). Les types inconnus sont ignorés et logués. Positions réindexées.
    const validBlocks = (Array.isArray(blocks) ? blocks : []).filter(
      (b: any) => b && typeof b.type === "string" && b.type in BLOCK_DEFS,
    )
    const skipped = (Array.isArray(blocks) ? blocks.length : 0) - validBlocks.length
    if (skipped > 0) console.warn(`[templates/use] ${skipped} bloc(s) de type inconnu ignoré(s)`)

    if (validBlocks.length > 0) {
      const { error: blocksError } = await supabaseAdmin.from("blocks").insert(
        validBlocks.map((b: any, i: number) => ({
          page_id: newPage.id,
          type: b.type,
          position: i,
          content: b.content || {},
          // L'assistant de personnalisation peut demander qu'un bloc soit posé MASQUÉ
          // (gardé dans la page mais invisible en ligne). Sans ce champ : visible.
          is_visible: b.visible !== false,
          styles: {},
        }))
      )

      if (blocksError) {
        // On nettoie la page creee pour ne pas laisser de page vide.
        await supabaseAdmin.from("pages").delete().eq("id", newPage.id)
        return serverError("templates/use:blocks", blocksError)
      }
    }

    const shortCode = await uniqueShortCode(supabaseAdmin)   // crypto (audit 2026-08-16) — plus de Math.random prédictible
    await supabaseAdmin.from("qr_codes").insert({
      page_id: newPage.id,
      user_id: user.id,
      short_code: shortCode,
      status: qrStatus,
    })

    return NextResponse.json({ pageId: newPage.id, success: true, qrStatus, atActiveLimit: qrStatus === "draft" })

  } catch (err: any) {
    return serverError("templates/use", err)
  }
}
