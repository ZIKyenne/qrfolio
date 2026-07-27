import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AnalyticsClient from "./AnalyticsClient"
import { accessibleOwnerIds } from "@/lib/team"

export const metadata = { title: "Analytics — QRowg" }

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Stats globales du profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("total_pages, total_scans, plan, email, full_name")
    .eq("id", user.id)
    .single()

  // Pages accessibles : les siennes + celles des équipes dont il est membre.
  const ownerIds = await accessibleOwnerIds(supabase, user.id)
  const { data: pages } = await supabase
    .from("pages")
    .select("id, title, slug, total_views, unique_views, status")
    .in("user_id", ownerIds)
    .order("total_views", { ascending: false })

  // Scans des 30 derniers jours
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data: recentScans } = await supabase
    .from("scans")
    .select("scanned_at, device, country, city, os, browser, page_id")
    .in("page_id", (pages || []).map(p => p.id))
    .gte("scanned_at", since.toISOString())
    .order("scanned_at", { ascending: true })

  // Clics liens des 90 derniers jours
  const since90 = new Date()
  since90.setDate(since90.getDate() - 90)

  const { data: recentClicks } = await supabase
    .from("block_clicks")
    .select("block_id, click_target, clicked_at, page_id, blocks(type)")
    .in("page_id", (pages || []).map(p => p.id))
    .gte("clicked_at", since90.toISOString())
    .order("clicked_at", { ascending: false })

  // Vues des 30 derniers jours
  const { data: recentViews } = await supabase
    .from("page_views")
    .select("viewed_at, device, source, country, page_id")
    .in("page_id", (pages || []).map(p => p.id))
    .gte("viewed_at", since.toISOString())
    .order("viewed_at", { ascending: true })

  // Blocs de toutes les pages
  const { data: allBlocks } = await supabase
    .from("blocks")
    .select("id, type, page_id, position, is_visible")
    .in("page_id", (pages || []).map(p => p.id))
    .eq("is_visible", true)

  // Engagement (scroll + impressions + dwell) des 30 derniers jours.
  // Requête SANS x/y : indépendante de la migration 021 (si 021 absente, ces données restent OK).
  const pageIds = (pages || []).map(p => p.id)
  const { data: baseEventsRaw } = await supabase
    .from("page_events")
    .select("kind, ref, value, page_id, created_at")
    .in("kind", ["scroll", "impression", "dwell"])
    .in("page_id", pageIds)
    .gte("created_at", since.toISOString())
  // Taps (carte de chaleur) — requête SÉPARÉE : si la migration 021 n'est pas lancée,
  // seule la heatmap dégrade (l'erreur est ignorée), le reste de l'engagement n'est pas affecté.
  const { data: tapEventsRaw } = await supabase
    .from("page_events")
    .select("ref, x, y, page_id, created_at")
    .eq("kind", "tap")
    .in("page_id", pageIds)
    .gte("created_at", since.toISOString())
  type PageEvRow = { kind: "scroll" | "impression" | "dwell" | "tap"; ref: string; value: number | null; x: number | null; y: number | null; page_id: string; created_at: string }
  const pageEvents: PageEvRow[] = [
    ...((baseEventsRaw || []) as any[]).map(e => ({ ...e, x: null, y: null })),
    ...((tapEventsRaw || []) as any[]).map(e => ({ ...e, kind: "tap" as const, value: null })),
  ]

  // Normaliser les clics (joindre block_type depuis blocks)
  const clicks = (recentClicks || []).map((c: any) => ({
    block_id:     c.block_id,
    click_target: c.click_target,
    clicked_at:   c.clicked_at,
    page_id:      c.page_id,
    block_type:   c.blocks?.type || "cta_button",
  }))

  // Données géo normalisées
  const geoScans = (recentScans || []).map((s: any) => ({
    country:    s.country,
    city:       s.city ?? null,
    page_id:    s.page_id,
    scanned_at: s.scanned_at,
  }))

  // Données device normalisées
  const deviceScans = (recentScans || []).map((s: any) => ({
    device:     s.device,
    os:         s.os ?? null,
    browser:    s.browser ?? null,
    page_id:    s.page_id,
    scanned_at: s.scanned_at,
  }))

  return (
    <AnalyticsClient
      profile={profile}
      pages={pages || []}
      recentScans={recentScans || []}
      recentViews={recentViews || []}
      clicks={clicks}
      blocks={allBlocks || []}
      geoScans={geoScans}
      deviceScans={deviceScans}
      pageEvents={pageEvents}
      userEmail={profile?.email ?? ""}
    />
  )
}
