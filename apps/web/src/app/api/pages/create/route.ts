import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { MAX_PAGES, countPages, initialQrStatus } from "@/lib/quota"
import { slugifyUnique } from "@/lib/slug"
import { uniqueShortCode } from "@/lib/shortCode"
import { DEFAULT_PAGE_THEME } from "@/app/dashboard/builder/types"

// Cree une page VIERGE (brouillon) et renvoie son id. Utilise par le builder
// quand l'URL est /dashboard/builder/new (aucune page en base a ce stade).
// Respecte la contrainte slug_format : ^[a-z0-9_-]{2,60}$
// Le theme est ecrit au FORMAT CANONIQUE unique (voir DEFAULT_PAGE_THEME).

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

    // Plafond anti-abus : on peut créer jusqu'à MAX_PAGES pages (indépendant du
    // plan). Le quota du plan ne s'applique qu'aux QR ACTIFS (cf. lib/quota).
    const { data: prof } = await supabaseAdmin.from("profiles").select("plan").eq("id", user.id).single()
    if ((await countPages(supabaseAdmin, user.id)) >= MAX_PAGES) {
      return NextResponse.json({ error: "limit", message: `Vous avez atteint le plafond de ${MAX_PAGES} pages.` }, { status: 403 })
    }
    // Le nouveau QR démarre actif si le quota du plan le permet, sinon en
    // brouillon (créé mais non visitable tant qu'un slot n'est pas libéré).
    const qrStatus = await initialQrStatus(supabaseAdmin, user.id, prof?.plan as string)

    const body = await req.json().catch(() => ({}))
    const title = (body?.title && typeof body.title === "string" && body.title.trim()) ? body.title.trim().slice(0, 80) : "Ma page"

    // Slug unique : quelques tentatives en cas de collision (23505).
    let newPage: any = null
    let pageError: any = null
    for (let attempt = 0; attempt < 5 && !newPage; attempt++) {
      const cleanSlug = slugifyUnique(title)
      const res = await supabaseAdmin
        .from("pages")
        .insert({ user_id: user.id, title, slug: cleanSlug, status: "draft", theme: DEFAULT_PAGE_THEME })
        .select()
        .single()
      if (res.data) { newPage = res.data; break }
      pageError = res.error
      if (res.error?.code !== "23505") break // erreur non liee a l'unicite -> on arrete
    }

    if (!newPage) {
      return NextResponse.json({ error: pageError?.message || "Erreur creation page" }, { status: 500 })
    }

    // QR code associe (comme le flux template)
    const shortCode = await uniqueShortCode(supabaseAdmin)   // crypto (audit 2026-08-16) — plus de Math.random prédictible
    await supabaseAdmin.from("qr_codes").insert({ page_id: newPage.id, user_id: user.id, short_code: shortCode, status: qrStatus })

    return NextResponse.json({ pageId: newPage.id, slug: newPage.slug, success: true, qrStatus, atActiveLimit: qrStatus === "draft" })
  } catch (err: any) {
    return serverError("pages/create", err)
  }
}
