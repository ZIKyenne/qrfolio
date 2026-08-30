// /api/qr-instant/stats?id=<uuid> — statistiques DÉTAILLÉES d'un lien dynamique
// (par jour / appareil / pays, 30 derniers jours). Réservé au plan Pro et au-dessus
// (canDynStats). Données réelles agrégées depuis
// instant_scan_events (RLS : le propriétaire ne lit que ses événements).

import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { canDynStats } from "@/lib/plans"
import { aggregateScanEvents } from "@/lib/scanStats"

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  // Gating : stats détaillées uniquement à partir du plan Pro.
  const { data: prof } = await supabase.from("profiles").select("plan").eq("id", user.id).single()
  if (!canDynStats(prof?.plan)) return NextResponse.json({ detailed: false })

  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data: events } = await supabase
    .from("instant_scan_events")
    .select("scanned_at, device, country")
    .eq("instant_qr_id", id).eq("user_id", user.id) // RLS + double filtre : ne lit que ses propres scans
    .gte("scanned_at", since)
    .order("scanned_at", { ascending: false })
    .limit(5000)

  const stats = aggregateScanEvents(events || [], 30, Date.now())
  return NextResponse.json({ detailed: true, ...stats })
}
