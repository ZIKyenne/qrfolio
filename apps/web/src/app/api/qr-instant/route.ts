// /api/qr-instant — CRUD des QR instantanés persistants (lien, WiFi, texte,
// contact, appel, email). STATIQUES par défaut (contenu encodé directement) ;
// les LIENS peuvent être DYNAMIQUES (redirigés par /q/[code], destination
// modifiable, essai 7 jours par lien). Stockés dans `instant_qrs`. Consomme le
// quota `limits.qr` (distinct des pages).

import { NextRequest, NextResponse } from "next/server"
import { serverError } from "@/lib/apiError"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { qrLimit } from "@/lib/plans"
import { countInstantQrs } from "@/lib/quota"

const KINDS = new Set(["link", "wifi", "text", "contact", "phone", "call", "email"])
const COLS = "id, kind, label, payload, inputs, style, created_at, dynamic, short_code, dest_url, status, expires_at, total_scans"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://qrowg.com"
const TRIAL_MS = 7 * 24 * 60 * 60 * 1000 // essai gratuit : 7 jours par lien

// Normalise + durcit une destination de lien dynamique : http(s) uniquement.
function safeDestUrl(raw: string): string | null {
  const v = (raw || "").trim()
  if (!v) return null
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try { const u = new URL(withProto); return (u.protocol === "http:" || u.protocol === "https:") ? u.toString() : null }
  catch { return null }
}

// Génère un short_code unique (base62), en évitant les collisions dans instant_qrs ET qr_codes.
async function uniqueShortCode(supabase: any): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789" // sans O/0/I/l/1 ambigus
  for (let attempt = 0; attempt < 8; attempt++) {
    let code = ""
    const bytes = new Uint8Array(7); crypto.getRandomValues(bytes)
    for (let i = 0; i < 7; i++) code += alphabet[bytes[i] % alphabet.length]
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from("instant_qrs").select("id").eq("short_code", code).maybeSingle(),
      supabase.from("qr_codes").select("id").eq("short_code", code).maybeSingle(),
    ])
    if (!a && !b) return code
  }
  throw new Error("short_code generation failed")
}

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
  const wantsDynamic = body?.dynamic === true
  if (!KINDS.has(kind)) return NextResponse.json({ error: "Type de QR invalide" }, { status: 400 })
  // Le contenu encodé (payload) n'est requis qu'en STATIQUE : en dynamique le serveur génère
  // payload = /q/<code> et stocke la cible/le contenu dans dest_url.
  if (!wantsDynamic && (!payload.trim() || payload.length > 4000)) return NextResponse.json({ error: "Contenu du QR invalide" }, { status: 400 })

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

  // ── QR DYNAMIQUE (TOUS les types) : le QR encode /q/<code>, expirable (essai 7 j par QR). ──
  // dest_url = cible/contenu résolu par /q/[code] : lien→URL, appel→tel:, email→mailto:,
  // texte/wifi/contact→contenu encodé (rendu sur une page). Les 3 derniers ne marchent plus hors ligne.
  if (wantsDynamic) {
    let dest: string
    if (kind === "link") {
      const d = safeDestUrl(String(body?.dest || body?.inputs?.url || payload || ""))
      if (!d) return NextResponse.json({ error: "Lien invalide (http/https requis)." }, { status: 400 })
      dest = d
    } else {
      dest = String(body?.dest || payload || "").trim()
      if (!dest || dest.length > 4000) return NextResponse.json({ error: "Contenu du QR invalide" }, { status: 400 })
    }
    let short_code: string
    try { short_code = await uniqueShortCode(supabase) } catch (e) { return serverError("qr-instant", e) }
    // Essai gratuit 7 jours par QR. (Étape ultérieure : abonnement « QR Dynamique » → expires_at = null.)
    const expires_at = new Date(Date.now() + TRIAL_MS).toISOString()
    const dynPayload = `${APP_URL}/q/${short_code}`
    const { data, error } = await supabase
      .from("instant_qrs")
      .insert({ user_id: user.id, kind, label, payload: dynPayload, inputs, style,
        dynamic: true, short_code, dest_url: dest, status: "active", expires_at })
      .select(COLS)
      .single()
    if (error) return serverError("qr-instant", error)
    return NextResponse.json({ ok: true, item: data })
  }

  const { data, error } = await supabase
    .from("instant_qrs")
    .insert({ user_id: user.id, kind, label, payload, inputs, style })
    .select(COLS)
    .single()
  if (error) return serverError("qr-instant", error)
  return NextResponse.json({ ok: true, item: data })
}

// PATCH — modifier la destination d'un lien dynamique (le cœur du QR dynamique : changer où il pointe
// sans réimprimer le QR). Propriétaire uniquement (RLS + filtre user_id).
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const body = await req.json().catch(() => ({} as any))
  const id = String(body?.id || "")
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })
  const patch: Record<string, any> = {}
  if (typeof body?.dest === "string") {
    const dest = safeDestUrl(body.dest)
    if (!dest) return NextResponse.json({ error: "Lien invalide (http/https requis)." }, { status: 400 })
    patch.dest_url = dest
  }
  if (typeof body?.label === "string") patch.label = body.label.trim().slice(0, 80) || null
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Rien à modifier" }, { status: 400 })
  const { data, error } = await supabase
    .from("instant_qrs").update(patch).eq("id", id).eq("user_id", user.id).select(COLS).single()
  if (error) return serverError("qr-instant", error)
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
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
