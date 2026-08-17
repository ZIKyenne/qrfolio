"use client"

import { useState, useEffect } from "react"
import { Mail, Calendar, Bell, BellOff, CheckCircle, Clock, Loader, ChevronRight, BarChart2 } from "lucide-react"

type Subscription = {
  id:           string
  frequency:    "weekly" | "monthly"
  enabled:      boolean
  email:        string
  last_sent_at: string | null
}

interface Props {
  userEmail: string
  plan:      string
}

const PAID_PLANS = ["pro", "business"]

const FREQ_CONFIG = {
  weekly: {
    label:   "Hebdomadaire",
    desc:    "Chaque lundi — résumé de la semaine passée",
    icon:    <Calendar size={16} />,
    detail:  "Visites · Scans · Liens · Croissance",
    color:   "var(--accent)",
  },
  monthly: {
    label:   "Mensuel",
    desc:    "Le 1er de chaque mois — bilan du mois",
    icon:    <BarChart2 size={16} />,
    detail:  "Tendances · Top pages · Top liens · Évolution",
    color:   "var(--success)",
  },
} as const

const G     = "var(--accent)"
const MUTED = "#A8A190"

export default function ReportSubscriptionPanel({ userEmail, plan }: Props) {
  const [subs,    setSubs]    = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<"weekly" | "monthly" | null>(null)
  const [email,   setEmail]   = useState(userEmail)
  const [editEmail, setEditEmail] = useState(false)
  const [saved,   setSaved]   = useState<"weekly" | "monthly" | null>(null)

  const isPaid = PAID_PLANS.includes(plan?.toLowerCase() ?? "")

  useEffect(() => {
    fetch("/api/reports/subscribe")
      .then(r => r.json())
      .then(d => { setSubs(d.subscriptions ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function getSub(freq: "weekly" | "monthly"): Subscription | undefined {
    return subs.find(s => s.frequency === freq)
  }

  async function toggle(freq: "weekly" | "monthly") {
    if (!isPaid) return
    const current = getSub(freq)
    const enabled = !(current?.enabled ?? false)
    setSaving(freq)

    const res = await fetch("/api/reports/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frequency: freq, enabled, email }),
    })
    const data = await res.json()

    if (data.ok) {
      setSubs(prev => {
        const filtered = prev.filter(s => s.frequency !== freq)
        return [...filtered, data.subscription]
      })
      setSaved(freq)
      setTimeout(() => setSaved(null), 2500)
    }
    setSaving(null)
  }

  function formatLastSent(iso: string | null): string {
    if (!iso) return "Jamais envoyé"
    return "Dernier envoi : " + new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
  }

  return (
    <div style={{ background: "#0F0E0B", border: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius: 16, padding: 24, fontFamily: "DM Sans, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
        <Mail size={16} color={G} style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <h3 style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: "0 0 3px" }}>
            Rapports automatiques
          </h3>
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>
            Recevez vos performances par email sans vous connecter
          </p>
        </div>
      </div>

      {!isPaid ? (
        /* Paywall */
        <div style={{ textAlign: "center", padding: "32px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)" }}>
          <div style={{ marginBottom: 12, color: "#5c554b" }}><Mail size={30} /></div>
          <p style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 600, margin: "0 0 6px" }}>
            Rapports disponibles en Pro et Business
          </p>
          <p style={{ color: MUTED, fontSize: 12, margin: "0 0 20px", lineHeight: 1.6 }}>
            Visites, scans, top liens et croissance<br />directement dans votre boîte mail
          </p>
          <a href="/upgrade"
            style={{ display: "inline-block", background: "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", borderRadius: 10, padding: "10px 24px", color: "#080808", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Passer au Pro
          </a>
        </div>
      ) : (
        <div>
          {/* Email de destination */}
          <div style={{ marginBottom: 20, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Mail size={13} color={MUTED} />
                <span style={{ color: MUTED, fontSize: 11, fontWeight: 600 }}>Envoyé à</span>
              </div>
              {!editEmail ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#F5F0E8", fontSize: 12 }}>{email}</span>
                  <button type="button" onClick={() => setEditEmail(true)}
                    style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
                    Modifier
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                    style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 7, color: "#F5F0E8", padding: "5px 10px", fontSize: 12, outline: "none", width: 200 }} />
                  <button type="button" onClick={() => setEditEmail(false)}
                    style={{ background: G, border: "none", borderRadius: 7, color: "#080808", padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cards fréquence */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "32px", color: MUTED }}>
              <Loader size={20} color={MUTED} style={{ animation: "mo-spin 0.8s linear infinite" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(["weekly", "monthly"] as const).map(freq => {
                const cfg  = FREQ_CONFIG[freq]
                const sub  = getSub(freq)
                const on   = sub?.enabled ?? false
                const busy = saving === freq
                const ok   = saved === freq

                return (
                  <div key={freq} style={{ padding: "16px 18px", background: on ? `${cfg.color}08` : "rgba(255,255,255,0.02)", border: on ? `1px solid ${cfg.color}30` : "1px solid rgba(255,255,255,0.07)", borderRadius: 12, transition: "all 0.2s" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>

                      <div style={{ display: "flex", gap: 12, flex: 1 }}>
                        <div style={{ width: 40, height: 40, background: on ? `${cfg.color}15` : "rgba(255,255,255,0.04)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                          {cfg.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 700, margin: 0 }}>{cfg.label}</p>
                            {on && (
                              <span style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}40`, borderRadius: 5, padding: "1px 6px", fontSize: 9, color: cfg.color, fontWeight: 700 }}>
                                ACTIF
                              </span>
                            )}
                          </div>
                          <p style={{ color: MUTED, fontSize: 11, margin: "0 0 4px" }}>{cfg.desc}</p>
                          <p style={{ color: MUTED, fontSize: 10, margin: 0, opacity: 0.7 }}>{cfg.detail}</p>
                          {sub?.last_sent_at && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                              <Clock size={10} color={MUTED} />
                              <span style={{ color: MUTED, fontSize: 10 }}>{formatLastSent(sub.last_sent_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button type="button" onClick={() => toggle(freq)} disabled={busy}
                        style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: on ? cfg.color : "rgba(255,255,255,0.1)", cursor: busy ? "wait" : "pointer", position: "relative", transition: "all 0.2s", flexShrink: 0, opacity: busy ? 0.7 : 1 }}>
                        {busy ? (
                          <Loader size={12} color={on ? "#080808" : MUTED} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", animation: "mo-spin 0.8s linear infinite" }} />
                        ) : ok ? (
                          <CheckCircle size={14} color={on ? "#080808" : "var(--success)"} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
                        ) : (
                          <div style={{ width: 16, height: 16, borderRadius: "50%", background: on ? "#080808" : "rgba(255,255,255,0.3)", position: "absolute", top: "50%", transform: "translateY(-50%)", transition: "left 0.2s", left: on ? "calc(100% - 20px)" : 4 }} />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Info envoi */}
          <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 9, display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={12} color={MUTED} style={{ flexShrink: 0 }} />
            <p style={{ color: MUTED, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
              Les rapports sont générés automatiquement et envoyés selon la fréquence choisie. Vous pouvez vous désabonner à tout moment depuis le lien dans l'email.
            </p>
          </div>
        </div>
      )}

      <style>{``}</style>
    </div>
  )
}
