import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server"
import { getPrimaryTeam, resolveRole, roleAtLeast, ASSIGNABLE_ROLES, type TeamRole } from "@/lib/team"

// Contexte : owner/admin de l'équipe primaire de l'utilisateur.
async function ctx() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) }
  const admin = createAdminClient()
  const { data: prof } = await admin.from("profiles").select("full_name").eq("id", user.id).single()
  const team = await getPrimaryTeam(admin, user.id, prof?.full_name ? `Équipe de ${prof.full_name}` : "Mon équipe")
  const myRole = await resolveRole(admin, team, user.id)
  if (!roleAtLeast(myRole, "admin")) return { error: NextResponse.json({ error: "Réservé au propriétaire / admin." }, { status: 403 }) }
  return { admin, team, user }
}

// PATCH — changer le rôle d'un membre.
export async function PATCH(req: NextRequest) {
  const c = await ctx()
  if ("error" in c) return c.error
  const { admin, team } = c
  let body: { memberId?: string; role?: string } = {}
  try { body = await req.json() } catch {}
  const role = body.role as TeamRole
  if (!body.memberId || !ASSIGNABLE_ROLES.includes(role)) return NextResponse.json({ error: "Requête invalide." }, { status: 400 })

  const { data: member } = await admin.from("team_members").select("id, team_id").eq("id", body.memberId).maybeSingle()
  if (!member || member.team_id !== team.id) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 })

  const { error } = await admin.from("team_members").update({ role }).eq("id", body.memberId)
  if (error) return NextResponse.json({ error: "Mise à jour impossible." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — retirer un membre ou annuler une invitation.
export async function DELETE(req: NextRequest) {
  const c = await ctx()
  if ("error" in c) return c.error
  const { admin, team } = c
  let body: { memberId?: string; invitationId?: string } = {}
  try { body = await req.json() } catch {}

  if (body.memberId) {
    const { data: member } = await admin.from("team_members").select("id, team_id").eq("id", body.memberId).maybeSingle()
    if (!member || member.team_id !== team.id) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 })
    const { error } = await admin.from("team_members").delete().eq("id", body.memberId)
    if (error) return NextResponse.json({ error: "Retrait impossible." }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.invitationId) {
    const { data: inv } = await admin.from("team_invitations").select("id, team_id").eq("id", body.invitationId).maybeSingle()
    if (!inv || inv.team_id !== team.id) return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 })
    const { error } = await admin.from("team_invitations").delete().eq("id", body.invitationId)
    if (error) return NextResponse.json({ error: "Annulation impossible." }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Requête invalide." }, { status: 400 })
}
