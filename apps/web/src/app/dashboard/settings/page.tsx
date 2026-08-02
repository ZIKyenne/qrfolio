"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Save, Check, AlertTriangle, Eye, EyeOff, Bell, Shield, Trash2, LogOut, Key, Globe, Palette, Moon, CreditCard, ArrowRight, Loader2, Download, DatabaseBackup } from "lucide-react"
import Particles from "@/components/Particles"

type Profile = { id: string; email: string; full_name: string | null; plan: string }

function Section({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", borderRadius: 8, padding: 8 }}>{icon}</div>
        <div>
          <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</p>
          {subtitle && <p style={{ color: "#A8A190", fontSize: 12, margin: 0 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  )
}

function Toggle({ value, onChange, label, description }: { value: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div>
        <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 600, margin: 0 }}>{label}</p>
        {description && <p style={{ color: "#A8A190", fontSize: 12.5, margin: "2px 0 0" }}>{description}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        style={{ width: 44, height: 24, borderRadius: 12, background: value ? "var(--accent)" : "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Mot de passe
  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSaved, setPwdSaved] = useState(false)
  const [pwdError, setPwdError] = useState("")

  // Notifications
  const [notifs, setNotifs] = useState({ email_leads: true, scan_alert: true, weekly_report: true, product_updates: false, marketing: false })
  const [notifSaved, setNotifSaved] = useState(false)

  // Apparence
  const [appearance, setAppearance] = useState({ compact_mode: false, animations: true })

  // Export RGPD
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState("")

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = "/auth/login"; return }
      const { data } = await supabase.from("profiles").select("id,email,full_name,plan,preferences").eq("id", user.id).single()
      if (data) {
        setProfile(data)
        const p = (data as any).preferences || {}
        setNotifs(n => ({ ...n, email_leads: p.email_leads !== false }))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function changePassword() {
    if (!newPwd || !confirmPwd) { setPwdError("Remplissez tous les champs"); return }
    if (newPwd !== confirmPwd) { setPwdError("Les mots de passe ne correspondent pas"); return }
    if (newPwd.length < 8) { setPwdError("Minimum 8 caractères"); return }
    setPwdError(""); setPwdSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    if (error) { setPwdError(error.message); setPwdSaving(false); return }
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("")
    setPwdSaving(false); setPwdSaved(true); setTimeout(() => setPwdSaved(false), 3000)
  }

  async function saveNotifications() {
    localStorage.setItem("qrfolio_notifs", JSON.stringify(notifs))
    // email_leads est réellement persisté en base (pilote la notification /api/emails/new-lead)
    if (profile) {
      const supabase = createClient()
      const { data: cur } = await supabase.from("profiles").select("preferences").eq("id", profile.id).single()
      const prefs = { ...((cur as any)?.preferences || {}), email_leads: notifs.email_leads }
      await supabase.from("profiles").update({ preferences: prefs }).eq("id", profile.id)
    }
    setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2000)
  }

  async function exportData() {
    if (exporting) return
    setExporting(true); setExportError("")
    try {
      const res = await fetch("/api/account/export")
      if (!res.ok) { setExportError("L'export a échoué. Réessayez."); setExporting(false); return }
      const blob = await res.blob()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `qrfolio-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      setExportError("L'export a échoué. Vérifiez votre connexion.")
    }
    setExporting(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  async function deleteAccount() {
    if (deleteConfirm !== profile?.email || deleting) return
    setDeleting(true); setDeleteError("")
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deleteConfirm.trim() }),
      })
      if (res.ok) {
        // Compte supprime : la session est invalidee cote serveur -> retour accueil.
        window.location.href = "/?deleted=1"
        return
      }
      const j = await res.json().catch(() => ({}))
      setDeleteError(j.error || "La suppression a échoué. Réessayez.")
    } catch {
      setDeleteError("La suppression a échoué. Vérifiez votre connexion.")
    }
    setDeleting(false)
  }

  const G = "var(--accent)"; const MUTED = "#A8A190"
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#0d0c09", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
    borderRadius: 10, padding: "11px 14px", color: "#F5F0E8", fontSize: 14,
    outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif"
  }

  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "transparent", padding: "32px 28px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div className="skeleton" style={{ width: 220, height: 34, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 280, height: 16, marginBottom: 28 }} />
        {[150, 220, 190, 130].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 16, marginBottom: 20 }} />)}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100dvh", background: "#080808", padding: "32px 28px", fontFamily: "DM Sans, sans-serif", position: "relative" }}>
      <style>{`input:focus,textarea:focus{border-color:color-mix(in srgb, var(--accent) 50%, transparent)!important;background:#111009!important}`}</style>

      {/* Particules dorées en fond (comble le vide, comme la landing) */}
      <Particles />

      <div style={{ maxWidth: 680, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 32, color: "#F5F0E8", fontWeight: 700, margin: 0 }}>Paramètres</h1>
          <p style={{ color: MUTED, fontSize: 14, margin: "4px 0 0" }}>Gère ton compte et tes préférences</p>
        </div>

        {/* Compte */}
        <Section title="Informations du compte" subtitle="Email et identifiant" icon={<Shield size={16} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Email</label>
              <div style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#F5F0E8" }}>{profile?.email}</span>
                <span style={{ marginLeft: "auto", color: "var(--success)", fontSize: 10, background: "rgba(57,255,143,0.1)", border: "1px solid rgba(57,255,143,0.2)", borderRadius: 6, padding: "2px 7px" }}>Vérifié</span>
              </div>
              <p style={{ color: MUTED, fontSize: 12, margin: "4px 0 0" }}>L'e-mail ne peut pas être modifié pour des raisons de sécurité.</p>
            </div>
            <div>
              <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Plan actuel</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: "color-mix(in srgb, var(--accent) 7%, transparent)", border: `1px solid color-mix(in srgb, var(--accent) 15%, transparent)`, borderRadius: 8, padding: "6px 14px", color: G, fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>
                  {profile?.plan || "free"}
                </span>
                {profile?.plan !== "business" && (
                  <a href="/upgrade" style={{ color: G, fontSize: 12, textDecoration: "none", opacity: 0.8 }}>Changer de plan →</a>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Facturation */}
        <Section title="Facturation" subtitle="Abonnement, factures et paiements" icon={<CreditCard size={16} />}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div>
              <p style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: "0 0 2px", textTransform: "capitalize" as const }}>Plan {profile?.plan || "free"}</p>
              <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Factures et reçus envoyés par e-mail à chaque paiement.</p>
            </div>
            <a href="/upgrade" style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, background: `linear-gradient(90deg,${G},color-mix(in srgb, var(--accent) 75%, #000))`, color: "#080808", textDecoration: "none", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
              {profile?.plan === "free" ? "Découvrir les offres" : "Gérer mon abonnement"} <ArrowRight size={14} />
            </a>
          </div>
        </Section>

        {/* Mot de passe */}
        <Section title="Sécurité" subtitle="Mot de passe et authentification" icon={<Key size={16} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Nouveau mot de passe</label>
              <div style={{ position: "relative" }}>
                <input type={showPwd ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  placeholder="Minimum 8 caractères" style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={e => e.target.style.borderColor = "color-mix(in srgb, var(--accent) 50%, transparent)"}
                  onBlur={e => e.target.style.borderColor = "color-mix(in srgb, var(--accent) 20%, transparent)"} />
                <button onClick={() => setShowPwd(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: MUTED, cursor: "pointer" }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Confirmer le mot de passe</label>
              <input type={showPwd ? "text" : "password"} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Repete le mot de passe" style={inputStyle}
                onFocus={e => e.target.style.borderColor = "color-mix(in srgb, var(--accent) 50%, transparent)"}
                onBlur={e => e.target.style.borderColor = "color-mix(in srgb, var(--accent) 20%, transparent)"} />
            </div>

            {/* Strength indicator */}
            {newPwd && (
              <div>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= (newPwd.length >= 12 && /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) ? 4 : newPwd.length >= 10 ? 3 : newPwd.length >= 8 ? 2 : 1) ? (newPwd.length >= 12 ? "var(--success)" : newPwd.length >= 10 ? G : newPwd.length >= 8 ? "#F97316" : "#EF4444") : "rgba(255,255,255,0.06)" }} />
                  ))}
                </div>
                <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{newPwd.length < 8 ? "Trop court" : newPwd.length < 10 ? "Acceptable" : newPwd.length < 12 ? "Bon" : "Excellent"}</p>
              </div>
            )}

            {pwdError && (
              <div style={{ display: "flex", gap: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "9px 12px" }}>
                <AlertTriangle size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: "#EF4444", fontSize: 12, margin: 0 }}>{pwdError}</p>
              </div>
            )}

            <button onClick={changePassword} disabled={pwdSaving || !newPwd || !confirmPwd}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: pwdSaved ? "rgba(57,255,143,0.1)" : (pwdSaving || !newPwd) ? "color-mix(in srgb, var(--accent) 20%, transparent)" : `linear-gradient(90deg,${G},color-mix(in srgb, var(--accent) 75%, #000))`, border: pwdSaved ? "1px solid rgba(57,255,143,0.3)" : "none", borderRadius: 10, padding: "12px", color: pwdSaved ? "var(--success)" : (!newPwd || pwdSaving) ? MUTED : "#080808", fontSize: 14, fontWeight: 700, cursor: (pwdSaving || !newPwd) ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
              {pwdSaved ? <><Check size={14} /> Mot de passe modifié !</> : pwdSaving ? "Modification..." : <><Key size={14} /> Changer le mot de passe</>}
            </button>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" subtitle="Gère les e-mails que tu reçois" icon={<Bell size={16} />}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Toggle value={notifs.email_leads} onChange={v => setNotifs(n => ({ ...n, email_leads: v }))}
              label="Nouveaux messages" description="Reçois un e-mail à chaque demande (devis, réservation, inscription, RSVP...)" />
            <Toggle value={notifs.scan_alert} onChange={v => setNotifs(n => ({ ...n, scan_alert: v }))}
              label="Alertes de scans" description="Reçois un e-mail quand ton QR code est scanné" />
            <Toggle value={notifs.weekly_report} onChange={v => setNotifs(n => ({ ...n, weekly_report: v }))}
              label="Rapport hebdomadaire" description="Résumé de tes stats chaque lundi" />
            <Toggle value={notifs.product_updates} onChange={v => setNotifs(n => ({ ...n, product_updates: v }))}
              label="Nouveautés produit" description="Nouvelles fonctionnalités et mises à jour" />
            <Toggle value={notifs.marketing} onChange={v => setNotifs(n => ({ ...n, marketing: v }))}
              label="Offres et promotions" description="Réductions et offres spéciales" />
            <div style={{ paddingTop: 14 }}>
              <button onClick={saveNotifications}
                style={{ display: "flex", alignItems: "center", gap: 7, background: notifSaved ? "rgba(57,255,143,0.1)" : `color-mix(in srgb, var(--accent) 7%, transparent)`, border: `1px solid ${notifSaved ? "rgba(57,255,143,0.3)" : "color-mix(in srgb, var(--accent) 15%, transparent)"}`, borderRadius: 9, padding: "9px 18px", color: notifSaved ? "var(--success)" : G, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {notifSaved ? <><Check size={12} /> Sauvegarde !</> : <><Save size={12} /> Sauvegarder les préférences</>}
              </button>
            </div>
          </div>
        </Section>

        {/* Apparence */}
        <Section title="Apparence" subtitle="Interface et affichage" icon={<Palette size={16} />}>
          <div>
            <Toggle value={appearance.compact_mode} onChange={v => setAppearance(a => ({ ...a, compact_mode: v }))}
              label="Mode compact" description="Interface plus dense, moins d'espacement" />
            <Toggle value={appearance.animations} onChange={v => setAppearance(a => ({ ...a, animations: v }))}
              label="Animations" description="Transitions et effets visuels dans l'interface" />
          </div>
        </Section>

        {/* Mes donnees — droit RGPD a la portabilite */}
        <Section title="Mes données" subtitle="Exporte une copie de tes données" icon={<DatabaseBackup size={16} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ color: MUTED, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              Télécharge l&apos;ensemble de tes données (profil, pages, blocs, QR codes et messages reçus) dans un fichier JSON lisible et réutilisable.
            </p>
            {exportError && (
              <div style={{ display: "flex", gap: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "9px 12px" }}>
                <AlertTriangle size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: "#EF4444", fontSize: 12, margin: 0 }}>{exportError}</p>
              </div>
            )}
            <button onClick={exportData} disabled={exporting}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "color-mix(in srgb, var(--accent) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)", borderRadius: 10, padding: "12px 18px", color: G, fontSize: 14, fontWeight: 600, cursor: exporting ? "not-allowed" : "pointer", width: "fit-content" }}>
              {exporting
                ? <><Loader2 size={15} style={{ animation: "mo-spin 0.7s linear infinite" }} /> Préparation…</>
                : <><Download size={15} /> Télécharger mes données</>}
            </button>
          </div>
        </Section>

        {/* Session */}
        <Section title="Session" subtitle="Connexion et déconnexion" icon={<LogOut size={16} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", animation: "mo-pulse 2s infinite" }} />
              <div style={{ flex: 1 }}>
                <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 600, margin: 0 }}>Session active</p>
                <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{profile?.email}</p>
              </div>
            </div>
            {/* Deconnexion = action reversible -> neutre (le rouge reste reserve au destructif, #05) */}
            <button onClick={handleLogout}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 18px", color: "#F5F0E8", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "fit-content" }}>
              <LogOut size={15} /> Se déconnecter
            </button>
          </div>
          <style>{``}</style>
        </Section>

        {/* Danger zone — isolee en fin de page, davantage d'espace (#05) */}
        <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, overflow: "hidden", marginTop: 16 }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(239,68,68,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: "#EF4444", background: "rgba(239,68,68,0.1)", borderRadius: 8, padding: 8 }}><AlertTriangle size={16} /></div>
            <div>
              <p style={{ color: "#EF4444", fontSize: 15, fontWeight: 700, margin: 0 }}>Zone de danger</p>
              <p style={{ color: "#A8A190", fontSize: 12, margin: 0 }}>Actions irréversibles</p>
            </div>
          </div>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: MUTED, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              La suppression de ton compte effacera définitivement toutes tes pages, QR codes et données analytics. Cette action est irréversible.
            </p>
            <div>
              <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Confirme en tapant ton e-mail : <span style={{ color: "#EF4444" }}>{profile?.email}</span></label>
              <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={profile?.email || "ton@email.com"}
                style={{ ...inputStyle, borderColor: deleteConfirm === profile?.email ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.04)" }}
                onFocus={e => e.target.style.borderColor = "rgba(239,68,68,0.5)"}
                onBlur={e => e.target.style.borderColor = deleteConfirm === profile?.email ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.15)"} />
            </div>
            {deleteError && (
              <div style={{ display: "flex", gap: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "9px 12px" }}>
                <AlertTriangle size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: "#EF4444", fontSize: 12, margin: 0 }}>{deleteError}</p>
              </div>
            )}
            <button onClick={deleteAccount} disabled={deleteConfirm !== profile?.email || deleting}
              style={{ display: "flex", alignItems: "center", gap: 8, background: deleteConfirm === profile?.email ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.05)", border: `1px solid ${deleteConfirm === profile?.email ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.15)"}`, borderRadius: 10, padding: "12px 18px", color: deleteConfirm === profile?.email ? "#EF4444" : "rgba(239,68,68,0.4)", fontSize: 14, fontWeight: 700, cursor: deleteConfirm === profile?.email && !deleting ? "pointer" : "not-allowed", width: "fit-content", transition: "all 0.2s" }}>
              {deleting
                ? <><Loader2 size={15} style={{ animation: "mo-spin 0.7s linear infinite" }} /> Suppression…</>
                : <><Trash2 size={15} /> Supprimer définitivement mon compte</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
