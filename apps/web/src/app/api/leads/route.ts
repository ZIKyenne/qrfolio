// POST /api/leads — enregistre une soumission de formulaire / RSVP (table leads).
// Déplacé côté serveur pour SORTIR le client @supabase/supabase-js (~214 Ko) du
// bundle des pages publiques (chaque scan de QR). L'insert utilise le service role
// (le visiteur est anonyme) ; rate-limité par IP pour limiter le spam de leads.
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { rateLimit, ipOf } from "@/lib/rateLimit"
import { notifierProprietaireLead } from "@/lib/notifierProprietaireLead"
import { envoyerAccuseReception } from "@/lib/accuseReceptionLead"
import { after } from "next/server"
import { objetBorne } from "@/lib/bornes"

export async function POST(req: NextRequest) {
  if (!(await rateLimit("lead:" + ipOf(req), 15, 600_000))) {
    return NextResponse.json({ error: "Trop de soumissions" }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const pageId = String(body.pageId ?? "").trim()
  if (!/^[0-9a-f-]{36}$/i.test(pageId)) {
    return NextResponse.json({ error: "Page invalide" }, { status: 400 })
  }

  const admin = createAdminClient()

  // La page cible doit exister (évite le spam d'inserts vers des page_id arbitraires).
  const { data: page } = await admin.from("pages").select("id").eq("id", pageId).maybeSingle()
  if (!page) return NextResponse.json({ error: "Page introuvable" }, { status: 404 })

  const base = {
    page_id:  pageId,
    block_id: body.blockId ? String(body.blockId).slice(0, 200) : null,
    type:     typeof body.type === "string" && body.type ? body.type.slice(0, 40) : "form",
    name:     typeof body.name === "string" ? body.name.slice(0, 200) || null : null,
    email:    typeof body.email === "string" ? body.email.slice(0, 200) || null : null,
    phone:    typeof body.phone === "string" ? body.phone.slice(0, 60) || null : null,
    message:  typeof body.message === "string" ? body.message.slice(0, 3000) || null : null,
    data:     objetBorne(body.data, 8_000) ?? {},   // 8 Ko : les champs d'un formulaire, pas une pièce jointe
  }
  // Attribution par support (qr_source) — insert résilient : si la colonne n'existe pas
  // encore (migration non appliquée), on réessaie SANS -> la soumission ne casse jamais.
  // `qr_source` pas encore dans les types Supabase générés (migration récente) -> cast any.
  const qs = typeof body.qrSource === "string" ? body.qrSource.slice(0, 40) || null : null
  let { error } = await admin.from("leads").insert((qs ? { ...base, qr_source: qs } : base) as any)
  if (error && qs) ({ error } = await admin.from("leads").insert(base))
  if (error) return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 })

  // Le propriétaire est prévenu ICI, après l'insertion réussie et avec les champs
  // bornés — plus par une route publique que n'importe qui pouvait appeler.
  after(async () => {
    const r = await notifierProprietaireLead({ pageId, type: base.type, name: base.name, email: base.email, phone: base.phone, message: base.message, data: base.data as Record<string, unknown> })
    if (!r.envoye && r.raison && !["opt-out", "pas de destinataire"].includes(r.raison)) console.error("[leads] notification non envoyée :", r.raison)
    // Accusé de réception au visiteur, avec les champs bornés du lead enregistré.
    const a = await envoyerAccuseReception({ pageId, email: base.email, name: base.name, type: base.type })
    if (!a.envoye && a.raison && !["opt-out", "pas d'e-mail"].includes(a.raison)) console.error("[leads] accusé non envoyé :", a.raison)
  })

  return NextResponse.json({ ok: true })
}
