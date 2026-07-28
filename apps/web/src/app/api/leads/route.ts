// POST /api/leads — enregistre une soumission de formulaire / RSVP (table leads).
// Déplacé côté serveur pour SORTIR le client @supabase/supabase-js (~214 Ko) du
// bundle des pages publiques (chaque scan de QR). L'insert utilise le service role
// (le visiteur est anonyme) ; rate-limité par IP pour limiter le spam de leads.
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { rateLimit, ipOf } from "@/lib/rateLimit"

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

  const { error } = await admin.from("leads").insert({
    page_id:  pageId,
    block_id: body.blockId ? String(body.blockId).slice(0, 200) : null,
    type:     typeof body.type === "string" && body.type ? body.type.slice(0, 40) : "form",
    name:     typeof body.name === "string" ? body.name.slice(0, 200) || null : null,
    email:    typeof body.email === "string" ? body.email.slice(0, 200) || null : null,
    phone:    typeof body.phone === "string" ? body.phone.slice(0, 60) || null : null,
    message:  typeof body.message === "string" ? body.message.slice(0, 3000) || null : null,
    data:     body.data && typeof body.data === "object" ? body.data : {},
  })
  if (error) return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 })

  return NextResponse.json({ ok: true })
}
