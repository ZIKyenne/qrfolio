import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { Resend } from "resend"
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { escapeHtml as esc } from "@/lib/escapeHtml"
import { emailShell, emailH1, emailButton } from "@/lib/emailLayout"
import { getPrimaryTeam, resolveRole, roleAtLeast, ASSIGNABLE_ROLES, type TeamRole } from "@/lib/team"
import { rateLimit } from "@/lib/rateLimit"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

// GET — équipe de l'utilisateur (créée à la demande) + membres + invitations + son rôle.
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const admin = createAdminClient()
  const { data: prof } = await admin.from("profiles").select("full_name, email").eq("id", user.id).single()
  const team = await getPrimaryTeam(admin, user.id, prof?.full_name ? `Équipe de ${prof.full_name}` : "Mon équipe")

  const [{ data: members }, { data: invitations }] = await Promise.all([
    admin.from("team_members").select("id, user_id, role, joined_at, profiles(email, full_name)").eq("team_id", team.id).order("joined_at"),
    admin.from("team_invitations").select("id, email, role, created_at").eq("team_id", team.id).is("accepted_at", null).order("created_at"),
  ])

  const myRole = await resolveRole(admin, team, user.id)
  return NextResponse.json({
    team: { id: team.id, name: team.name, ownerId: team.owner_id },
    owner: { id: user.id, email: prof?.email, name: prof?.full_name },
    members: members ?? [],
    invitations: invitations ?? [],
    myRole,
  })
}

// POST — inviter un membre par e-mail. Réservé owner/admin.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  if (!rateLimit("team-invite:" + user.id, 20, 3600_000)) {
    return NextResponse.json({ error: "Trop d'invitations. Réessayez plus tard." }, { status: 429 })
  }

  let body: { email?: string; role?: string } = {}
  try { body = await req.json() } catch {}
  const email = (body.email ?? "").trim().toLowerCase()
  const role = (body.role ?? "editor") as TeamRole
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return NextResponse.json({ error: "E-mail invalide." }, { status: 400 })
  if (!ASSIGNABLE_ROLES.includes(role)) return NextResponse.json({ error: "Rôle invalide." }, { status: 400 })

  const admin = createAdminClient()
  const { data: prof } = await admin.from("profiles").select("full_name, email").eq("id", user.id).single()
  const team = await getPrimaryTeam(admin, user.id, prof?.full_name ? `Équipe de ${prof.full_name}` : "Mon équipe")

  // Autorisation : owner ou admin.
  const myRole = await resolveRole(admin, team, user.id)
  if (!roleAtLeast(myRole, "admin")) return NextResponse.json({ error: "Réservé au propriétaire / admin." }, { status: 403 })

  if (email === (prof?.email ?? "").toLowerCase()) return NextResponse.json({ error: "Vous êtes déjà dans l'équipe." }, { status: 400 })

  // Déjà membre ?
  const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle()
  if (existingProfile) {
    const { data: alreadyMember } = await admin.from("team_members").select("id").eq("team_id", team.id).eq("user_id", existingProfile.id).maybeSingle()
    if (alreadyMember) return NextResponse.json({ error: "Cette personne est déjà membre." }, { status: 400 })
  }

  const token = randomUUID()
  const { error: invErr } = await admin.from("team_invitations")
    .upsert({ team_id: team.id, email, role, token, invited_by: user.id, accepted_at: null }, { onConflict: "team_id,email" })
  if (invErr) return NextResponse.json({ error: "Impossible de créer l'invitation." }, { status: 500 })

  // E-mail d'invitation (fire-and-forget — n'échoue jamais la requête).
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      const acceptUrl = `${APP_URL}/dashboard/team/accept?token=${token}`
      const inviter = prof?.full_name || prof?.email || "Un membre"
      const roleLabel = role === "admin" ? "Administrateur" : "Éditeur"
      const content = `
        ${emailH1("Vous êtes invité·e à rejoindre une équipe")}
        <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#B8B2A4;line-height:1.6;">
          <strong style="color:#F5F0E8;">${esc(inviter)}</strong> vous invite à collaborer sur <strong style="color:#F5F0E8;">${esc(team.name)}</strong> dans QRowg, en tant que <strong style="color:#C9A84C;">${esc(roleLabel)}</strong>.
        </p>
        ${emailButton("Rejoindre l'équipe", acceptUrl)}
        <p style="margin:22px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#8A8478;line-height:1.6;">
          Si vous n'avez pas de compte QRowg, créez-en un avec cette adresse e-mail, puis rouvrez ce lien.
        </p>`
      await new Resend(apiKey).emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: `Invitation à rejoindre « ${team.name} » sur QRowg`,
        html: emailShell({ preheader: `${inviter} vous invite sur QRowg`, content }),
      })
    }
  } catch (e) {
    console.warn("[team invite] email non envoyé:", (e as any)?.message)
  }

  return NextResponse.json({ ok: true })
}
