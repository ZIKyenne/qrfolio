import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AnalyticsShell from "./AnalyticsShell"
import { accessibleOwnerIds } from "@/lib/team"

export const metadata = { title: "Analytics — QRowg" }

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Profil + périmètre d'accès en parallèle (indépendants, ne dépendent que du user).
  const [{ data: profile }, ownerIds] = await Promise.all([
    supabase.from("profiles").select("total_pages, total_scans, plan, email, full_name").eq("id", user.id).single(),
    accessibleOwnerIds(supabase, user.id),
  ])

  // Pages accessibles : les siennes + celles des équipes dont il est membre.
  const { data: pages } = await supabase
    .from("pages")
    .select("id, title, slug, total_views, unique_views, status")
    .in("user_id", ownerIds)
    .order("total_views", { ascending: false })

  const pageIds = (pages || []).map(p => p.id)
  const since = new Date();   since.setDate(since.getDate() - 30)
  const since90 = new Date(); since90.setDate(since90.getDate() - 90)
  // Plafond de lignes par requête : garde-fou contre un payload géant pour un
  // compte très actif (l'agrégation reste côté client -> chantier P5 : vues SQL).
  // Tri décroissant : en cas de plafonnement, on conserve les données récentes.
  const LIM = 50000

  // Requêtes indépendantes (ne dépendent que de pageIds) lancées EN PARALLÈLE
  // (avant : ~6 allers-retours séquentiels -> latence additionnée sur le TTFB).
  const [
    { data: recentScans },
    { data: recentClicks },
    { data: recentViews },
    { data: allBlocks },
    { data: baseEventsRaw },
    { data: tapEventsRaw },
  ] = await Promise.all([
    supabase.from("scans")
      .select("scanned_at, device, country, city, os, browser, page_id, qr_code_id")
      .in("page_id", pageIds).gte("scanned_at", since.toISOString())
      .order("scanned_at", { ascending: false }).limit(LIM),
    supabase.from("block_clicks")
      .select("block_id, click_target, clicked_at, page_id, blocks(type)")
      .in("page_id", pageIds).gte("clicked_at", since90.toISOString())
      .order("clicked_at", { ascending: false }).limit(LIM),
    supabase.from("page_views")
      .select("viewed_at, device, source, country, page_id")
      .in("page_id", pageIds).gte("viewed_at", since.toISOString())
      .order("viewed_at", { ascending: false }).limit(LIM),
    supabase.from("blocks")
      .select("id, type, page_id, position, is_visible")
      .in("page_id", pageIds).eq("is_visible", true),
    // Engagement (scroll/impression/dwell) — sans x/y : indépendant de la migration 021.
    supabase.from("page_events")
      .select("kind, ref, value, page_id, created_at")
      .in("kind", ["scroll", "impression", "dwell"]).in("page_id", pageIds)
      .gte("created_at", since.toISOString()).limit(LIM),
    // Taps (heatmap) — requête séparée : si 021 absente, seule la heatmap dégrade.
    supabase.from("page_events")
      .select("ref, x, y, page_id, created_at")
      .eq("kind", "tap").in("page_id", pageIds)
      .gte("created_at", since.toISOString()).limit(LIM),
  ])

  // Attribution par support (QR de pages) — colonnes récentes hors types générés -> cast any.
  // Si la migration n'est pas appliquée, ces requêtes renvoient vide (dégradation douce).
  const [
    { data: supportQrs },
    { data: supportViews },
    { data: supportClicks },
    { data: supportLeads },
  ] = (await Promise.all([
    (supabase.from("qr_codes") as any).select("id, short_code, label, page_id").in("page_id", pageIds).order("created_at", { ascending: false }).limit(2000),
    (supabase.from("page_views") as any).select("qr_source").in("page_id", pageIds).gte("viewed_at", since.toISOString()).not("qr_source", "is", null).limit(LIM),
    (supabase.from("block_clicks") as any).select("qr_source").in("page_id", pageIds).gte("clicked_at", since90.toISOString()).not("qr_source", "is", null).limit(LIM),
    (supabase.from("leads") as any).select("qr_source").in("page_id", pageIds).gte("created_at", since.toISOString()).not("qr_source", "is", null).limit(LIM),
  ])) as any[]

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
    <AnalyticsShell
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
      supportQrs={supportQrs || []}
      supportViews={supportViews || []}
      supportClicks={supportClicks || []}
      supportLeads={supportLeads || []}
    />
  )
}
