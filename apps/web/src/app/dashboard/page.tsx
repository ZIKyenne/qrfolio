import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardClient from "./DashboardClient"
import { accessibleOwnerIds } from "@/lib/team"

// Rendu SERVEUR des données initiales du dashboard : évite le 2e getUser() côté
// client + le waterfall de requêtes + le spinner. DashboardClient garde son
// load() pour rafraîchir après une mutation (suppression / publication).
export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const ownerIds = await accessibleOwnerIds(supabase, user.id)
  const [{ data: prof }, { data: pgs }] = await Promise.all([
    supabase.from("profiles").select("full_name,plan,total_scans,total_pages,avatar_url").eq("id", user.id).single(),
    supabase.from("pages").select("id,title,slug,status,total_views,created_at").in("user_id", ownerIds).order("created_at", { ascending: false }).limit(20),
  ])

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

  return (
    <DashboardClient
      initialProfile={(prof as any) ?? null}
      initialPages={(pgs as any) ?? []}
      initialMonthViews={monthViews}
      initialTodayViews={todayViews}
      initialWeekViews={weekViews}
    />
  )
}
