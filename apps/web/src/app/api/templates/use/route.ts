import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { MAX_PAGES, countPages, initialQrStatus } from "@/lib/quota"
import { slugifyUnique } from "@/lib/slug"

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

    const body = await req.json()
    const { templateId, templateName, theme, blocks, slug } = body

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
        theme: theme || {},
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

    // Insertion des blocs AVEC verification d'erreur (plus de page vide silencieuse).
    if (Array.isArray(blocks) && blocks.length > 0) {
      const { error: blocksError } = await supabaseAdmin.from("blocks").insert(
        blocks.map((b: any, i: number) => ({
          page_id: newPage.id,
          type: b.type,
          position: i,
          content: b.content || {},
          is_visible: true,
          styles: {},
        }))
      )

      if (blocksError) {
        // On nettoie la page creee pour ne pas laisser de page vide.
        await supabaseAdmin.from("pages").delete().eq("id", newPage.id)
        return NextResponse.json(
          { error: "Erreur creation blocs : " + blocksError.message },
          { status: 500 }
        )
      }
    }

    const shortCode = Math.random().toString(36).slice(2, 10)
    await supabaseAdmin.from("qr_codes").insert({
      page_id: newPage.id,
      user_id: user.id,
      short_code: shortCode,
      status: qrStatus,
    })

    return NextResponse.json({ pageId: newPage.id, success: true, qrStatus, atActiveLimit: qrStatus === "draft" })

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
