// POST /api/qr-label — renomme un QR (nom du support pour l'attribution : « Vitrine », « Table 4 »…).
// Le nom est stocké dans qr_codes.label et sert de libellé dans « Performance par support ».
// Sécurité : client de session utilisateur + RLS -> seul le propriétaire peut modifier son QR.
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { qr_id, label } = await req.json().catch(() => ({} as any))
  if (!qr_id || typeof qr_id !== "string") return NextResponse.json({ error: "qr_id requis" }, { status: 400 })
  const clean = typeof label === "string" ? label.trim().slice(0, 60) || null : null

  // `label` hors types Supabase générés (migration récente) -> cast any.
  const { error } = await (supabase.from("qr_codes") as any)
    .update({ label: clean, updated_at: new Date().toISOString() })
    .eq("id", qr_id)
  if (error) return NextResponse.json({ error: "Modification impossible" }, { status: 500 })

  return NextResponse.json({ ok: true, label: clean })
}
