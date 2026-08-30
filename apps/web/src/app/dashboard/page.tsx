import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardClient from "./DashboardClient"
import GoalsShell from "./goals/GoalsShell"
import { accessibleOwnerIds } from "@/lib/team"
import { destinationApresConnexion, ECHAPPE } from "./atterrissage"

// Rendu SERVEUR des données initiales du dashboard : évite le 2e getUser() côté
// client + le waterfall de requêtes + le spinner. DashboardClient garde son
// load() pour rafraîchir après une mutation (suppression / publication).
export default async function DashboardPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const ownerIds = await accessibleOwnerIds(supabase, user.id)
  const [{ data: prof }, { data: pgs }] = await Promise.all([
    supabase.from("profiles").select("full_name,plan,total_scans,total_pages,avatar_url").eq("id", user.id).single(),
    supabase.from("pages").select("id,title,slug,status,total_views,created_at").in("user_id", ownerIds).order("created_at", { ascending: false }).limit(20),
  ])

  // Un compte qui n'a jamais rien créé n'a rien à administrer : on l'emmène
  // créer sa page au lieu de lui montrer un écran vide. Voir atterrissage.ts.
  const params = (await searchParams) ?? {}
  const lu = (k: string) => { const v = params[k]; return Array.isArray(v) ? v[0] : v }
  const versCreation = destinationApresConnexion({
    nbPages: (pgs ?? []).length,
    demande: lu("next"),
    dejaOriente: lu(ECHAPPE) === "1",
  })
  if (versCreation) redirect(versCreation)

  const ids = (pgs ?? []).map((p) => p.id)
  let monthViews = 0, todayViews = 0, weekViews: number[] = []
  if (ids.length) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6)
    const [{ count: mCount }, { count: tCount }, { data: wRows }] = await Promise.all([
      supabase.from("page_views").select("id", { count: "exact", head: true }).in("page_id", ids).gte("viewed_at", monthStart),
      supabase.from("page_views").select("id", { count: "exact", head: true }).in("page_id", ids).gte("viewed_at", todayStart.toISOString()),
      supabase.from("page_views").select("viewed_at").in("page_id", ids).gte("viewed_at", weekStart.toISOString()),
    ])
    monthViews = mCount ?? 0
    todayViews = tCount ?? 0
    const buckets = Array(7).fill(0)
    for (const r of (wRows ?? [])) {
      const d = new Date((r as any).viewed_at)
      const idx = Math.floor((d.getTime() - weekStart.getTime()) / 86400000)
      if (idx >= 0 && idx < 7) buckets[idx]++
    }
    weekViews = buckets
  }

  // Objectifs : la section vit désormais EN BAS du Dashboard (#objectifs), plus de page dédiée.
  // Données 90 j (clics + vues) sur les pages de l'utilisateur/équipe — mêmes que l'ancienne page.
  const since90 = new Date(); since90.setDate(since90.getDate() - 90)
  let goalClicks: any[] = [], goalViews: any[] = []
  if (ids.length) {
    const [gc, gv] = await Promise.all([
      supabase.from("block_clicks").select("block_id, click_target, clicked_at, page_id, blocks(type)").in("page_id", ids).gte("clicked_at", since90.toISOString()).order("clicked_at", { ascending: false }),
      supabase.from("page_views").select("viewed_at, page_id").in("page_id", ids).gte("viewed_at", since90.toISOString()),
    ])
    goalClicks = (gc.data || []).map((c: any) => ({ block_id: c.block_id, click_target: c.click_target, clicked_at: c.clicked_at, page_id: c.page_id, block_type: c.blocks?.type || "cta_button" }))
    goalViews = gv.data || []
  }

  return (
    <>
      <DashboardClient
        initialProfile={(prof as any) ?? null}
        initialPages={(pgs as any) ?? []}
        initialMonthViews={monthViews}
        initialTodayViews={todayViews}
        initialWeekViews={weekViews}
      />
      <section id="objectifs" style={{ scrollMarginTop: 20, maxWidth: 1180, margin: "0 auto", padding: "0 clamp(16px, 4vw, 24px) 60px" }}>
        <GoalsShell clicks={goalClicks} pageViews={goalViews as any} pages={(pgs ?? []).map((p: any) => ({ id: p.id, title: p.title, slug: p.slug }))} />
      </section>
    </>
  )
}
