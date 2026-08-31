// /api/qr-instant/bulk — création EN MASSE de QR modifiables (plan Business).
// Reçoit des lignes {label, dest} (déjà parsées côté client via lib/bulkCsv), re-valide,
// crée des QR modifiables (Business = quota illimité). Propriétaire uniquement.

import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { canDynMasse } from "@/lib/plans"
import { normalizeBulkUrl } from "@/lib/bulkCsv"
import { uniqueShortCode } from "@/lib/shortCode"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://qrowg.com"
const MAX_BULK = 100 // borne par requête (anti-abus)
const OUT_COLS = "id, kind, label, payload, inputs, style, created_at, dynamic, short_code, dest_url, status, expires_at, total_scans, last_scan_at, paused_reason"

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  // Gating : création en masse réservée au plan Business.
  const { data: prof } = await supabase.from("profiles").select("plan").eq("id", user.id).single()
  if (!canDynMasse(prof?.plan)) {
    return NextResponse.json({ error: "La création en masse est réservée au plan Business.", upgrade: true }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))
  const input = Array.isArray(body?.items) ? body.items : []
  if (input.length === 0) return NextResponse.json({ error: "Aucune ligne à importer." }, { status: 400 })

  const truncated = Math.max(0, input.length - MAX_BULK)
  const seen = new Set<string>()
  const toInsert: any[] = []
  let skipped = 0
  for (const r of input.slice(0, MAX_BULK)) {
    const dest = normalizeBulkUrl(String(r?.dest || ""))
    if (!dest) { skipped++; continue }
    const label = (typeof r?.label === "string" ? r.label.trim().slice(0, 80) : "") || null
    let code: string
    try { code = await uniqueShortCode(supabase, seen) } catch { skipped++; continue }
    // Business = quota illimité ; aucun QR ne porte d'expiration à la création.
    toInsert.push({
      user_id: user.id, kind: "link", label, payload: `${APP_URL}/q/${code}`, inputs: {}, style: {},
      dynamic: true, short_code: code, dest_url: dest, status: "active", expires_at: null,
    })
  }

  if (toInsert.length === 0) return NextResponse.json({ error: "Aucun lien valide à créer.", skipped }, { status: 400 })

  const { data, error } = await supabase.from("instant_qrs").insert(toInsert).select(OUT_COLS)
  if (error) return serverError("qr-instant/bulk", error)

  // OUT_COLS n'inclut pas password_hash -> rien de sensible à masquer ; on ajoute has_password=false.
  const items = (data || []).map((row: any) => ({ ...row, has_password: false }))
  return NextResponse.json({ ok: true, created: items.length, skipped, truncated, items })
}
