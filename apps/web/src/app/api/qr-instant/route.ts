// /api/qr-instant — CRUD des QR instantanés persistants (lien, WiFi, texte,
// contact, appel, email). Statiques (contenu encodé directement), stockés dans
// la table dédiée `instant_qrs`. Consomme le quota `limits.qr` (distinct des pages).

import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { qrLimit } from "@/lib/plans"
import { countInstantQrs } from "@/lib/quota"

const KINDS = new Set(["link", "wifi", "text", "contact", "phone", "call", "email"])
const COLS = "id, kind, label, payload, inputs, style, created_at"

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { data } = await supabase
    .from("instant_qrs").select(COLS)
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(300)
  return NextResponse.json({ items: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const kind = String(body?.kind || "")
  const payload = typeof body?.payload === "string" ? body.payload : ""
  if (!KINDS.has(kind)) return NextResponse.json({ error: "Type de QR invalide" }, { status: 400 })
  if (!payload.trim() || payload.length > 4000) return NextResponse.json({ error: "Contenu du QR invalide" }, { status: 400 })

  // Quota du plan : nombre de QR instantanés (limits.qr), distinct des pages.
  const { data: prof } = await supabase.from("profiles").select("plan").eq("id", user.id).single()
  const limit = qrLimit(prof?.plan as string)
  if (limit !== null && (await countInstantQrs(supabase, user.id)) >= limit) {
    return NextResponse.json(
      { error: `Limite de ${limit} QR instantané${limit > 1 ? "s" : ""} atteinte sur votre plan.`, upgrade: true },
      { status: 403 },
    )
  }

  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 80) || null : null
  const inputs = body?.inputs && typeof body.inputs === "object" ? body.inputs : {}
  const style = body?.style && typeof body.style === "object" ? body.style : {}

  const { data, error } = await supabase
    .from("instant_qrs")
    .insert({ user_id: user.id, kind, label, payload, inputs, style })
    .select(COLS)
    .single()
  if (error) return serverError("qr-instant", error)
  return NextResponse.json({ ok: true, item: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { id } = await req.json().catch(() => ({} as any))
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })
  const { data, error } = await supabase
    .from("instant_qrs").delete().eq("id", id).eq("user_id", user.id).select("id")
  if (error) return serverError("qr-instant", error)
  if (!data || data.length === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
