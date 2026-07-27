"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Users, Mail, Trash2, ShieldCheck, Pencil, Crown, Loader2, LogOut, Sparkles } from "lucide-react"
import { useToast } from "@/components/Toast"

type Role = "owner" | "admin" | "editor" | "viewer"
type Member = { id: string; user_id: string; role: Role; joined_at: string; profiles?: { email?: string; full_name?: string } }
type Invitation = { id: string; email: string; role: Role; created_at: string }
type TeamData = {
  team: { id: string; name: string; ownerId: string }
  owner: { id: string; email?: string; name?: string }
  members: Member[]
  invitations: Invitation[]
  myRole: Role | null
  plan: string
  teamEnabled: boolean
  teamLimit: number | null
  seatsUsed: number
}

const GOLD = "#C9A84C"
const ROLE_LABEL: Record<Role, string> = { owner: "Propriétaire", admin: "Admin", editor: "Éditeur", viewer: "Lecture" }

function RoleBadge({ role }: { role: Role }) {
  const c = role === "owner" ? GOLD : role === "admin" ? "#A78BFA" : "var(--success)"
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      padding: "3px 10px", borderRadius: 20, background: `${c}1e`, border: `1px solid ${c}55`, color: c }}>
      {role === "owner" ? <Crown size={11} /> : role === "admin" ? <ShieldCheck size={11} /> : <Pencil size={11} />}
      {ROLE_LABEL[role]}
    </span>
  )
}

export default function TeamPage() {
  const toast = useToast()
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"editor" | "admin">("editor")
  const [inviting, setInviting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/team")
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Erreur")
      setData(d)
    } catch (e) {
      toast.error((e as Error).message || "Impossible de charger l'équipe.")
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const canManage = data?.myRole === "owner" || data?.myRole === "admin"

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || inviting) return
    setInviting(true)
    try {
      const res = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Erreur")
      toast.success("Invitation envoyée à " + email)
      setEmail("")
      load()
    } catch (e) { toast.error((e as Error).message) } finally { setInviting(false) }
  }

  const changeRole = async (memberId: string, newRole: "editor" | "admin") => {
    try {
      const res = await fetch("/api/team/member", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, role: newRole }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Erreur")
      toast.success("Rôle mis à jour")
      load()
    } catch (e) { toast.error((e as Error).message) }
  }

  const removeMember = async (memberId: string, label: string) => {
    if (!window.confirm(`Retirer ${label} de l'équipe ?`)) return
    try {
      const res = await fetch("/api/team/member", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Erreur")
      toast.success("Membre retiré")
      load()
    } catch (e) { toast.error((e as Error).message) }
  }

  const cancelInvite = async (invitationId: string) => {
    try {
      const res = await fetch("/api/team/member", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitationId }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Erreur")
      toast.success("Invitation annulée")
      load()
    } catch (e) { toast.error((e as Error).message) }
  }

  const leaveTeam = async () => {
    if (!window.confirm("Quitter cette équipe ? Vous perdrez l'accès au contenu partagé.")) return
    try {
      const res = await fetch("/api/team/member", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leave: true }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Erreur")
      toast.success("Vous avez quitté l'équipe")
      window.location.href = "/dashboard"
    } catch (e) { toast.error((e as Error).message) }
  }

  const card: React.CSSProperties = { background: "#0F0E0B", border: "1px solid rgba(201,168,76,0.14)", borderRadius: 16, padding: 22 }
  const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(20px,4vw,40px) clamp(16px,4vw,28px)", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <Users size={22} color={GOLD} />
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700, color: "#F5F0E8", margin: 0 }}>Équipe</h1>
      </div>
      <p style={{ color: "#8A8478", fontSize: 14.5, margin: "0 0 28px" }}>
        Invitez des collaborateurs à gérer vos pages et QR codes. <strong style={{ color: "#B8B2A4" }}>Éditeur</strong> : modifie ; <strong style={{ color: "#B8B2A4" }}>Admin</strong> : gère aussi les membres.
      </p>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#8A8478", padding: 40, justifyContent: "center" }}>
          <Loader2 size={18} className="qf-spin" /> Chargement…
          <style>{`.qf-spin{animation:qfspin 1s linear infinite}@keyframes qfspin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : !data ? (
        <div style={{ ...card, color: "#8A8478" }}>Impossible de charger l'équipe.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Upsell si le plan du propriétaire n'inclut pas l'Équipe */}
          {data.myRole === "owner" && !data.teamEnabled && (
            <div style={{ ...card, borderColor: "rgba(201,168,76,0.35)", background: "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02))" }}>
              <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}><Sparkles size={16} color={GOLD} /> Invitez votre équipe</p>
              <p style={{ color: "#B8B2A4", fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 }}>La collaboration en équipe est incluse dans le plan <strong style={{ color: GOLD }}>Business</strong> (jusqu'à 5 membres). Passez à Business pour inviter des éditeurs et admins.</p>
              <Link href="/upgrade?reason=team" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 10, background: "linear-gradient(135deg,#EBCE72,#C9A84C)", color: "#0A0A0A", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Passer à Business →</Link>
            </div>
          )}

          {/* Invitation */}
          {canManage && data.teamEnabled && (
            <form onSubmit={invite} style={card}>
              <p style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}><Mail size={15} color={GOLD} /> Inviter un membre</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="adresse@email.com"
                  style={{ flex: "1 1 220px", minWidth: 0, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "#0A0908", color: "#F5F0E8", fontSize: 14 }} />
                <select value={role} onChange={e => setRole(e.target.value as "editor" | "admin")}
                  style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "#0A0908", color: "#F5F0E8", fontSize: 14, cursor: "pointer" }}>
                  <option value="editor">Éditeur</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" disabled={inviting}
                  style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#EBCE72,#C9A84C)", color: "#0A0A0A", fontWeight: 700, fontSize: 14, cursor: inviting ? "default" : "pointer", opacity: inviting ? 0.6 : 1 }}>
                  {inviting ? "Envoi…" : "Inviter"}
                </button>
              </div>
            </form>
          )}

          {/* Membres */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 10, flexWrap: "wrap" }}>
              <p style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: 0 }}>
                Membres{data.teamLimit ? <span style={{ color: "#8A8478", fontWeight: 600, marginLeft: 8, fontSize: 12.5 }}>{data.seatsUsed} / {data.teamLimit}</span> : null}
              </p>
              {data.myRole && data.myRole !== "owner" && (
                <button type="button" onClick={leaveTeam} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,107,107,0.3)", background: "transparent", color: "var(--danger)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  <LogOut size={13} /> Quitter l'équipe
                </button>
              )}
            </div>
            {/* Propriétaire */}
            <div style={rowStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 600 }}>{data.owner.name || data.owner.email || "Propriétaire"}{data.myRole === "owner" ? " (vous)" : ""}</div>
                <div style={{ color: "#8A8478", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis" }}>{data.owner.email}</div>
              </div>
              <RoleBadge role="owner" />
            </div>
            {/* Membres invités */}
            {data.members.map(m => {
              const label = m.profiles?.full_name || m.profiles?.email || "Membre"
              return (
                <div key={m.id} style={rowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 600 }}>{label}</div>
                    <div style={{ color: "#8A8478", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis" }}>{m.profiles?.email}</div>
                  </div>
                  {canManage && (m.role === "editor" || m.role === "admin") ? (
                    <select value={m.role} onChange={e => changeRole(m.id, e.target.value as "editor" | "admin")}
                      style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", background: "#0A0908", color: "#F5F0E8", fontSize: 12.5, cursor: "pointer" }}>
                      <option value="editor">Éditeur</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : <RoleBadge role={m.role} />}
                  {canManage && (
                    <button type="button" onClick={() => removeMember(m.id, label)} aria-label={`Retirer ${label}`}
                      style={{ display: "flex", padding: 8, borderRadius: 8, border: "1px solid rgba(255,107,107,0.25)", background: "transparent", color: "var(--danger)", cursor: "pointer" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )
            })}
            {data.members.length === 0 && (
              <p style={{ color: "#8A8478", fontSize: 13, margin: "14px 0 2px" }}>Aucun membre pour l'instant. Invitez quelqu'un ci-dessus.</p>
            )}
          </div>

          {/* Invitations en attente */}
          {data.invitations.length > 0 && (
            <div style={card}>
              <p style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>Invitations en attente</p>
              {data.invitations.map(inv => (
                <div key={inv.id} style={rowStyle}>
                  <Mail size={15} color="#8A8478" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#F5F0E8", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" }}>{inv.email}</div>
                    <div style={{ color: "#8A8478", fontSize: 12 }}>Invité·e comme {ROLE_LABEL[inv.role]}</div>
                  </div>
                  {canManage && (
                    <button type="button" onClick={() => cancelInvite(inv.id)}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: "#8A8478", fontSize: 12.5, cursor: "pointer" }}>
                      Annuler
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
