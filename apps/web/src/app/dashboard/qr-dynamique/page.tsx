"use client"

// Page d'abonnement « QR Dynamique » — offre DÉDIÉE (distincte des plans QRowg).
// 3 paliers (Basique / Pro / Business), mensuel ou annuel (−20%). Les DONNÉES viennent
// de lib/dynamicPlans ; le checkout passe product="dynamic" à /api/stripe/checkout.
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Check, X as XIcon, Zap, Sparkles, Crown, ArrowLeft, Link2 } from "lucide-react"
import Link from "next/link"
import { DYN_PAID_PLANS, DYN_TRIAL_DAYS, dynAnnualTotalLabel, dynMonthlyLabel, type DynPlanId } from "@/lib/dynamicPlans"
import Particles from "@/components/Particles"

const G = "#C9A84C"
const MUTED = "#A8A190"

const PLAN_ICON: Record<DynPlanId, React.ReactNode> = {
  none: null,
  basique: <Zap size={19} />,
  pro: <Sparkles size={19} />,
  business: <Crown size={19} />,
}

export default function QrDynamiquePage() {
  const [current, setCurrent] = useState<string>("none")
  const [annual, setAnnual] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [canceled, setCanceled] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("canceled")) setCanceled(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("dyn_plan").eq("id", user.id).single()
        .then(({ data }) => { if (data?.dyn_plan) setCurrent(data.dyn_plan) })
    })
  }, [])

  async function subscribe(planId: DynPlanId) {
    if (current === planId) return
    setLoading(planId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = "/auth/login"; return }
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "dynamic", plan: planId, annual }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else { setLoading(null); alert(data.error || "Impossible d'ouvrir le paiement.") }
    } catch { setLoading(null) }
  }

  const card: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 22 }

  return (
    <div className="rpad" style={{ position: "relative", minHeight: "100dvh", maxWidth: 1040, margin: "0 auto", padding: "18px 18px calc(40px + env(safe-area-inset-bottom))" }}>
      <Particles behind />

      <Link href="/dashboard/qr-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, textDecoration: "none", fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={16} /> Retour aux QR
      </Link>

      {/* En-tête */}
      <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 8px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.28)", borderRadius: 999, padding: "5px 13px", color: G, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          <Zap size={14} /> QR Dynamique
        </div>
        <h1 style={{ color: "#F5F0E8", fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: -0.5, lineHeight: 1.15 }}>Des QR modifiables, pour toujours</h1>
        <p style={{ color: MUTED, fontSize: 14.5, margin: 0, lineHeight: 1.55 }}>
          Un QR dynamique reste imprimé, mais sa destination change quand vous voulez — et vous suivez les scans.
          Chaque lien est gratuit <strong style={{ color: "#FBBF24" }}>{DYN_TRIAL_DAYS} jours</strong>, puis un abonnement le garde actif.
        </p>
      </div>

      {canceled && (
        <p style={{ textAlign: "center", color: "#FBBF24", fontSize: 13, margin: "14px 0 0" }}>Paiement annulé — aucun montant n'a été prélevé.</p>
      )}

      {/* Bascule mensuel / annuel */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "22px 0 24px" }}>
        <span style={{ color: !annual ? "#F5F0E8" : MUTED, fontSize: 14, fontWeight: !annual ? 600 : 400 }}>Mensuel</span>
        <button onClick={() => setAnnual(a => !a)} aria-label="Basculer mensuel/annuel" style={{ width: 44, height: 24, borderRadius: 12, background: annual ? G : "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
          <div style={{ position: "absolute", top: 3, left: annual ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
        </button>
        <span style={{ color: annual ? "#F5F0E8" : MUTED, fontSize: 14, fontWeight: annual ? 600 : 400 }}>Annuel</span>
        <span style={{ background: "rgba(57,255,143,0.15)", border: "1px solid rgba(57,255,143,0.3)", borderRadius: 10, padding: "2px 8px", fontSize: 11, color: "var(--success)", fontWeight: 700 }}>−20%</span>
      </div>

      {/* Cartes de paliers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, alignItems: "stretch" }}>
        {DYN_PAID_PLANS.map(p => {
          const isCurrent = current === p.id
          const highlight = p.id === "pro"
          const priceMo = dynMonthlyLabel(p.id, annual)
          return (
            <div key={p.id} style={{
              ...card, position: "relative", display: "flex", flexDirection: "column",
              border: highlight ? `1.5px solid ${G}77` : card.border as string,
              background: highlight ? "linear-gradient(180deg, rgba(201,168,76,0.08), rgba(255,255,255,0.02))" : card.background as string,
              boxShadow: highlight ? "0 14px 40px rgba(201,168,76,0.1)" : "none",
            }}>
              {p.badge && (
                <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: G, color: "#080808", fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "4px 12px", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{p.badge}</span>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: `${p.color}1f`, border: `1px solid ${p.color}55`, display: "flex", alignItems: "center", justifyContent: "center", color: p.color, flexShrink: 0 }}>{PLAN_ICON[p.id]}</span>
                <span style={{ color: "#F5F0E8", fontSize: 18, fontWeight: 800 }}>{p.label}</span>
              </div>
              <p style={{ color: MUTED, fontSize: 12.5, margin: "0 0 14px", lineHeight: 1.4, minHeight: 34 }}>{p.description}</p>

              <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 2 }}>
                <span style={{ color: "#F5F0E8", fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>{priceMo}</span>
                <span style={{ color: MUTED, fontSize: 13 }}>€ / mois</span>
              </div>
              <p style={{ color: "#6E685E", fontSize: 11.5, margin: "0 0 16px", minHeight: 16 }}>
                {annual ? `soit ${dynAnnualTotalLabel(p.id)} € facturés à l'année` : "sans engagement, résiliable à tout moment"}
              </p>

              <button onClick={() => subscribe(p.id)} disabled={isCurrent || loading !== null}
                style={{ width: "100%", minHeight: 46, borderRadius: 12, border: highlight ? "none" : `1px solid ${G}55`, cursor: isCurrent ? "default" : "pointer", marginBottom: 18,
                  background: isCurrent ? "rgba(255,255,255,0.05)" : highlight ? G : "transparent", color: isCurrent ? MUTED : highlight ? "#080808" : G, fontSize: 14, fontWeight: 700, opacity: loading && loading !== p.id ? 0.5 : 1, transition: "all .15s" }}>
                {isCurrent ? "Palier actuel" : loading === p.id ? "Ouverture…" : `Choisir ${p.label}`}
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {p.perks.map((perk, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                    {perk.included
                      ? <Check size={15} color="var(--success)" style={{ flexShrink: 0, marginTop: 1.5 }} />
                      : <XIcon size={15} color="#4A453D" style={{ flexShrink: 0, marginTop: 1.5 }} />}
                    <span style={{ color: perk.included ? "#D8D2C6" : "#6E685E", fontSize: 12.5, lineHeight: 1.4 }}>{perk.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Réassurance */}
      <div style={{ ...card, marginTop: 22, display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center" }}>
        {[
          { t: "Essai 7 j par lien", d: "Testez sans payer, chaque lien est gratuit une semaine." },
          { t: "Modifiable après impression", d: "Changez la destination sans réimprimer le QR." },
          { t: "Scans illimités", d: "Aucun plafond de trafic, quel que soit le palier." },
        ].map((f, i) => (
          <div key={i} style={{ flex: "1 1 220px", minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}><Link2 size={15} color={G} /> {f.t}</div>
            <p style={{ color: MUTED, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{f.d}</p>
          </div>
        ))}
      </div>

      <p style={{ color: "#6E685E", fontSize: 11.5, textAlign: "center", margin: "18px 0 0", lineHeight: 1.55 }}>
        Abonnement dédié aux QR dynamiques, indépendant de votre plan QRowg. Prix TTC. Paiement sécurisé par Stripe.
      </p>
    </div>
  )
}
