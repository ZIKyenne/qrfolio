// app/api/qr-stats/[id]/route.ts
// Stats performance d'un QR code : totaux, évolution, top device/pays, sparkline

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await params
  const period  = req.nextUrl.searchParams.get("period") ?? "7"  // "7" | "30"
  const days    = period === "30" ? 30 : 7

  // Vérifier ownership
  const { data: qr } = await supabase
    .from("qr_codes")
    .select("id, total_scans, last_scan_at, created_at")
    .eq("id", id)
    .single()

  // QR introuvable (ou pas encore en base / sans stats) : on renvoie un état vide
  // en 200 plutôt qu'un 404 -> pas d'erreur rouge en console, le client affiche 0.
  if (!qr) return NextResponse.json({
    total: 0, current: 0, prev: 0, evolution: 0, last_scan: null,
    top_device: null, top_country: null, sparkline: [], period: days, created_at: null, empty: true,
  })

  const now      = new Date()
  const fromDate = new Date(now); fromDate.setDate(fromDate.getDate() - days)
  const prevFrom = new Date(fromDate); prevFrom.setDate(prevFrom.getDate() - days)

  // Scans période courante
  const { count: scansCurrent } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("qr_code_id", id)
    .gte("scanned_at", fromDate.toISOString())

  // Scans période précédente (pour évolution)
  const { count: scansPrev } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("qr_code_id", id)
    .gte("scanned_at", prevFrom.toISOString())
    .lt("scanned_at", fromDate.toISOString())

  // Top device
  const { data: deviceRows } = await supabase
    .from("scans")
    .select("device")
    .eq("qr_code_id", id)
    .gte("scanned_at", fromDate.toISOString())

  const deviceMap: Record<string, number> = {}
  for (const r of deviceRows ?? []) {
    const d = r.device ?? "unknown"
    deviceMap[d] = (deviceMap[d] ?? 0) + 1
  }
  const topDevice = Object.entries(deviceMap).sort((a,b) => b[1]-a[1])[0]?.[0] ?? null

  // Top pays
  const { data: countryRows } = await supabase
    .from("scans")
    .select("country")
    .eq("qr_code_id", id)
    .gte("scanned_at", fromDate.toISOString())
    .not("country", "is", null)

  const countryMap: Record<string, number> = {}
  for (const r of countryRows ?? []) {
    const c = r.country ?? "—"
    countryMap[c] = (countryMap[c] ?? 0) + 1
  }
  const topCountry = Object.entries(countryMap).sort((a,b) => b[1]-a[1])[0]?.[0] ?? null

  // Sparkline : scans par jour
  const { data: scanRows } = await supabase
    .from("scans")
    .select("scanned_at")
    .eq("qr_code_id", id)
    .gte("scanned_at", fromDate.toISOString())
    .order("scanned_at", { ascending: true })

  // Construire tableau jours
  const sparkline: number[] = []
  for (let i = 0; i < days; i++) {
    const day = new Date(fromDate); day.setDate(day.getDate() + i)
    const next = new Date(day); next.setDate(next.getDate() + 1)
    const count = (scanRows ?? []).filter(r => {
      const d = new Date(r.scanned_at)
      return d >= day && d < next
    }).length
    sparkline.push(count)
  }

  const evolution = scansPrev && scansPrev > 0
    ? Math.round(((scansCurrent ?? 0) - scansPrev) / scansPrev * 100)
    : scansCurrent && scansCurrent > 0 ? 100 : 0

  return NextResponse.json({
    total:       qr.total_scans ?? 0,
    current:     scansCurrent ?? 0,
    prev:        scansPrev ?? 0,
    evolution,
    last_scan:   qr.last_scan_at,
    top_device:  topDevice,
    top_country: topCountry,
    sparkline,
    period:      days,
    created_at:  qr.created_at,
  })
}
