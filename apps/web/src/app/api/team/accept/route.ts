import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server"

// POST — accepter une invitation via son token (l'utilisateur connecté rejoint l'équipe).
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  let body: { token?: string } = {}
  try { body = await req.json() } catch {}
  const token = (body.token ?? "").trim()
  if (!token) return NextResponse.json({ error: "Token manquant." }, { status: 400 })

  const admin = createAdminClient()
  const { data: inv } = await admin.from("team_invitations")
    .select("id, team_id, email, role, accepted_at")
    .eq("token", token)
    .maybeSingle()
  if (!inv) return NextResponse.json({ error: "Invitation introuvable ou expirée." }, { status: 404 })
  if (inv.accepted_at) return NextResponse.json({ error: "Invitation déjà utilisée." }, { status: 410 })

  // L'e-mail de l'invitation doit correspondre au compte connecté.
  const { data: prof } = await admin.from("profiles").select("email").eq("id", user.id).single()
  if ((prof?.email ?? "").toLowerCase() !== inv.email.toLowerCase()) {
    return NextResponse.json({ error: "Cette invitation vise une autre adresse e-mail." }, { status: 403 })
  }

  // Rejoint l'équipe (idempotent).
  const { error: joinErr } = await admin.from("team_members")
    .upsert({ team_id: inv.team_id, user_id: user.id, role: inv.role, invited_by: null }, { onConflict: "team_id,user_id" })
  if (joinErr) return NextResponse.json({ error: "Impossible de rejoindre l'équipe." }, { status: 500 })

  await admin.from("team_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id)

  return NextResponse.json({ ok: true, teamId: inv.team_id })
}
