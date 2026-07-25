// Export des donnees personnelles (droit RGPD a la portabilite). Le client
// est authentifie via la session : la RLS restreint naturellement chaque
// requete aux donnees de l'utilisateur (pas besoin du service-role).
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

  const [profileRes, pagesRes, qrRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("pages").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    supabase.from("qr_codes").select("*").eq("user_id", user.id),
  ])

  const pages = pagesRes.data ?? []
  const pageIds = pages.map((p: { id: string }) => p.id)

  let blocks: unknown[] = []
  let leads: unknown[] = []
  if (pageIds.length) {
    const [blocksRes, leadsRes] = await Promise.all([
      supabase.from("blocks").select("*").in("page_id", pageIds),
      supabase.from("leads").select("*").in("page_id", pageIds),
    ])
    blocks = blocksRes.data ?? []
    leads = leadsRes.data ?? []
  }

  const payload = {
    export_version: 1,
    generated_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profileRes.data ?? null,
    pages,
    blocks,
    qr_codes: qrRes.data ?? [],
    leads,
  }

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="qrowg-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
