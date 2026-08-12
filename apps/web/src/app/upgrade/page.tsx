"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Check, Zap, Crown, Star, ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"
import { PLAN_LIST, PLAN_COMPARISON, fmtPrice } from "@/lib/plans"
import { DYN_PAID_PLANS, DYN_TRIAL_DAYS, dynMonthlyLabel, dynAnnualTotalLabel, type DynPlanId } from "@/lib/dynamicPlans"
import { useAccent } from "@/lib/useAccent"
import Particles from "@/components/Particles"
import SubscribeButton from "@/components/SubscribeButton"

// UI par plan (icône, CTA, mise en avant) ; les DONNÉES viennent de lib/plans
const PLAN_UI = {
  free:     { icon: <Star size={20} />,     cta: "Plan actuel",                 ctaDisabled: true,  highlight: false, priceId: undefined },
  starter:  { icon: <Zap size={20} />,      cta: "Commencer l essai gratuit",   ctaDisabled: false, highlight: false, priceId: "starter"  },
  pro:      { icon: <Sparkles size={20} />, cta: "Passer a Pro",                ctaDisabled: false, highlight: true,  priceId: "pro"      },
  business: { icon: <Crown size={20} />,    cta: "Passer a Business",           ctaDisabled: false, highlight: false, priceId: "business" },
} as Record<string, any>

const PLANS = PLAN_LIST.map(p => ({
  id: p.id,
  name: p.label,
  price: { monthly: fmtPrice(p.priceMonthly), annual: fmtPrice(p.priceAnnual) },
  rawMonthly: p.priceMonthly,
  rawAnnual: p.priceAnnual,
  color: p.color,
  description: p.description,
  badge: p.badge,
  perks: p.perks,
  ...PLAN_UI[p.id],
}))

const COMPARISON = PLAN_COMPARISON

export default function UpgradePage() {
  const [currentPlan, setCurrentPlan] = useState("free")
  const [loading, setLoading] = useState<string | null>(null)
  const [annual, setAnnual] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("plan").eq("id", user.id).single().then(({ data }) => {
        if (data) setCurrentPlan(data.plan)
      })
    })
  }, [])

  async function handleUpgrade(plan: typeof PLANS[0]) {
    if (plan.ctaDisabled || currentPlan === plan.id) return
    if (plan.id === "business") {
      window.location.href = "mailto:hello@qrowg.com?subject=Plan Business QRowg"
      return
    }
    setLoading(plan.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = "/auth/login"; return }
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id, annual, userId: user.id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch { setLoading(null) }
  }

  // Renvoie l'URL de paiement Stripe ; le SubscribeButton redirige lui-même en fin
  // d'animation (une string renvoyée = redirection auto). Throw -> le bouton se réinitialise.
  async function checkoutUrl(plan: typeof PLANS[0]): Promise<string | void> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = "/auth/login"; return }
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: plan.id, annual, userId: user.id }),
    })
    const data = await res.json()
    if (!data.url) throw new Error("URL de paiement manquante")
    return data.url as string
  }

  const G = useAccent(); const MUTED = "#8A8478"
  // Le SubscribeButton attend une couleur hex ; on sécurise (accent utilisateur ou or de marque).
  const accentHex = /^#[0-9a-fA-F]{6}$/.test(G || "") ? (G as string) : "#C9A84C"

  // Cette page est hors du layout dashboard : on applique l'accent au document
  // (et on prévient les particules) pour qu'elles prennent la couleur de l'utilisateur.
  useEffect(() => {
    if (!G) return
    document.documentElement.style.setProperty("--accent", G)
    window.dispatchEvent(new CustomEvent("qrfolio-accent", { detail: G }))
  }, [G])

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "DM Sans, sans-serif", padding: "0 24px 80px", position: "relative", isolation: "isolate" }}>
      <Particles behind />
      <style>{``}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Back */}
        <div style={{ paddingTop: 32, marginBottom: 40 }}>
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: MUTED, textDecoration: "none", fontSize: 14 }}>
            <ArrowLeft size={16} /> Retour au dashboard
          </Link>
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ display: "inline-block", background: `${G}1a`, border: `1px solid ${G}4d`, borderRadius: 20, padding: "6px 16px", marginBottom: 18, fontSize: 12, color: G, letterSpacing: 2, textTransform: "uppercase" }}>
            Choisissez votre plan
          </div>
          <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(32px,5vw,52px)", color: "#F5F0E8", fontWeight: 700, margin: "0 0 14px", lineHeight: 1.1 }}>
            Choisissez le plan adapté à votre activité
          </h1>
          <p style={{ color: "#C9C3B6", fontSize: 16, maxWidth: 540, margin: "0 auto 18px", lineHeight: 1.7 }}>
            Créez vos pages, personnalisez vos QR codes et suivez vos performances. Sans engagement, annulez à tout moment.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginBottom: 26 }}>
            {["Essai gratuit 7 jours", "Sans carte pour le plan Gratuit", "Annulation en 1 clic"].map((r, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 12.5 }}>
                <Check size={13} color="var(--success)" /> {r}
              </span>
            ))}
          </div>

          {/* Toggle annuel */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#111009", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 30, padding: "8px 16px" }}>
            <span style={{ color: !annual ? "#F5F0E8" : MUTED, fontSize: 14, fontWeight: !annual ? 600 : 400 }}>Mensuel</span>
            <button onClick={() => setAnnual(a => !a)} style={{ width: 44, height: 24, borderRadius: 12, background: annual ? G : "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 3, left: annual ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </button>
            <span style={{ color: annual ? "#F5F0E8" : MUTED, fontSize: 14, fontWeight: annual ? 600 : 400 }}>Annuel</span>
            {annual && <span style={{ background: "rgba(57,255,143,0.15)", border: "1px solid rgba(57,255,143,0.3)", borderRadius: 10, padding: "2px 8px", fontSize: 11, color: "var(--success)", fontWeight: 700 }}>-20%</span>}
          </div>
        </div>

        {/* Plans grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16, alignItems: "start", marginBottom: 40 }}>
          {PLANS.map(plan => {
            const isCurrentPlan = currentPlan === plan.id
            const price = annual ? plan.price.annual : plan.price.monthly
            const pc = plan.color

            return (
              <div key={plan.id}
                style={{ background: plan.highlight ? `linear-gradient(135deg, ${pc}16, ${pc}05)` : "#111009", border: "1px solid " + (plan.highlight ? `${pc}88` : isCurrentPlan ? "rgba(57,255,143,0.3)" : "rgba(201,168,76,0.12)"), borderRadius: 20, padding: plan.badge ? "50px 24px 28px" : (plan.highlight ? "34px 24px" : "28px 24px"), position: "relative", overflow: "hidden", transform: plan.highlight ? "scale(1.04)" : "scale(1)", boxShadow: plan.highlight ? `0 0 60px ${pc}26` : "none", zIndex: plan.highlight ? 2 : 1 }}>

                {plan.badge && (
                  <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", background: pc, borderRadius: 20, padding: "4px 14px", fontSize: 10, fontWeight: 800, color: "#080808", letterSpacing: 1, whiteSpace: "nowrap", zIndex: 3, boxShadow: "0 4px 14px rgba(0,0,0,0.35)" }}>{plan.badge}</div>
                )}
                {isCurrentPlan && (
                  <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(57,255,143,0.15)", border: "1px solid rgba(57,255,143,0.3)", borderRadius: 20, padding: "4px 12px", fontSize: 10, fontWeight: 700, color: "var(--success)" }}>ACTUEL</div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ color: pc, background: pc + "18", borderRadius: 8, padding: 8 }}>{plan.icon}</div>
                  <div>
                    <p style={{ color: "#F5F0E8", fontSize: 17, fontWeight: 700, margin: 0 }}>{plan.name}</p>
                    <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{plan.description}</p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "18px 0 20px" }}>
                  <span style={{ color: pc, fontSize: 40, fontWeight: 700, fontFamily: "Fraunces, serif" }}>{price === "0" ? "Gratuit" : price + "€"}</span>
                  {price !== "0" && <span style={{ color: MUTED, fontSize: 13 }}>/mois</span>}
                </div>

                {annual && price !== "0" && (
                  <p style={{ color: "var(--success)", fontSize: 11, margin: "-14px 0 16px", fontWeight: 600 }}>
                    Soit {(plan.rawAnnual * 12).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€/an — économisez {((plan.rawMonthly - plan.rawAnnual) * 12).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
                  </p>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                  {plan.perks.map((perk, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, opacity: perk.included ? 1 : 0.35 }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: perk.included ? pc + "20" : "rgba(255,255,255,0.04)", border: "1px solid " + (perk.included ? pc + "40" : "rgba(255,255,255,0.08)"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {perk.included ? <Check size={9} color={pc} /> : <span style={{ color: MUTED, fontSize: 8 }}>—</span>}
                      </div>
                      <span style={{ color: perk.included ? "#F5F0E8" : MUTED, fontSize: 13 }}>{perk.text}</span>
                      {perk.soon && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#C9A84C", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.28)", borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>Bientôt</span>
                      )}
                    </div>
                  ))}
                </div>

                {!isCurrentPlan && !plan.ctaDisabled && plan.id !== "business" ? (
                  // Plans Stripe actionnables (starter / pro) : CTA animé « scan QR » qui
                  // récupère l'URL de paiement et redirige lui-même en fin d'animation.
                  <SubscribeButton
                    label={plan.cta}
                    accent={accentHex}
                    successLabel="Redirection vers le paiement…"
                    minScanMs={1600}
                    height={48}
                    onSubscribe={() => checkoutUrl(plan)}
                    onError={() => setLoading(null)}
                  />
                ) : (
                  <button onClick={() => handleUpgrade(plan)} disabled={loading === plan.id || isCurrentPlan || plan.ctaDisabled}
                    style={{ width: "100%", padding: "13px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: isCurrentPlan || plan.ctaDisabled ? "default" : "pointer", background: isCurrentPlan ? "rgba(57,255,143,0.08)" : plan.highlight ? "linear-gradient(90deg,var(--action),#818CF8)" : pc + "15", color: isCurrentPlan ? "var(--success)" : plan.highlight ? "#080808" : pc, border: isCurrentPlan ? "1px solid rgba(57,255,143,0.2)" : plan.highlight ? "none" : "1px solid " + pc + "30", transition: "all 0.2s", fontFamily: "DM Sans, sans-serif" }}>
                    {loading === plan.id ? "Chargement..." : isCurrentPlan ? "Plan actuel" : plan.cta}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Offre SÉPARÉE : QR Dynamique ─────────────────────────────────────── */}
        <div style={{ position: "relative", margin: "8px 0 44px", padding: "34px 22px", borderRadius: 24, overflow: "hidden", background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.12), transparent 60%), #0E0D0A", border: "1px solid rgba(201,168,76,0.22)" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 26px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 999, padding: "5px 14px", color: G, fontSize: 12, fontWeight: 800, letterSpacing: 0.5, marginBottom: 14 }}>
              <Zap size={14} /> NOUVEAU · OFFRE SÉPARÉE
            </span>
            <h2 style={{ color: "#F5F0E8", fontSize: 30, fontWeight: 800, margin: "0 0 10px", letterSpacing: -0.5, lineHeight: 1.1 }}>QR Dynamique — des QR modifiables, pour toujours</h2>
            <p style={{ color: MUTED, fontSize: 14.5, margin: 0, lineHeight: 1.55 }}>
              Changez la destination d'un QR déjà imprimé et suivez les scans. Abonnement <strong style={{ color: "#F5F0E8" }}>dédié</strong>, indépendant de votre plan QRowg — chaque lien est gratuit <strong style={{ color: "#FBBF24" }}>{DYN_TRIAL_DAYS} jours</strong>.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, maxWidth: 820, margin: "0 auto" }}>
            {DYN_PAID_PLANS.map(p => {
              const highlight = p.id === "pro"
              const icon = p.id === "basique" ? <Zap size={17} /> : p.id === "pro" ? <Sparkles size={17} /> : <Crown size={17} />
              return (
                <div key={p.id} style={{ position: "relative", background: highlight ? `linear-gradient(180deg, ${p.color}14, rgba(255,255,255,0.02))` : "rgba(255,255,255,0.025)", border: `1px solid ${highlight ? p.color + "77" : "rgba(255,255,255,0.09)"}`, borderRadius: 18, padding: "20px 18px", display: "flex", flexDirection: "column" }}>
                  {p.badge && <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: G, color: "#080808", fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "3px 11px", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{p.badge}</span>}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 9, background: `${p.color}1f`, border: `1px solid ${p.color}55`, display: "flex", alignItems: "center", justifyContent: "center", color: p.color, flexShrink: 0 }}>{icon}</span>
                    <span style={{ color: "#F5F0E8", fontSize: 16, fontWeight: 800 }}>{p.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 2 }}>
                    <span style={{ color: "#F5F0E8", fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>{dynMonthlyLabel(p.id as DynPlanId, annual)}€</span>
                    <span style={{ color: MUTED, fontSize: 12.5 }}>/mois</span>
                  </div>
                  <p style={{ color: "#6E685E", fontSize: 11, margin: "0 0 14px", minHeight: 15 }}>{annual ? `soit ${dynAnnualTotalLabel(p.id as DynPlanId)}€/an` : "sans engagement"}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16, flex: 1 }}>
                    {p.features.slice(0, 4).map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <Check size={13} color={p.color} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ color: "#D8D2C6", fontSize: 12.5, lineHeight: 1.35 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/dashboard/qr-dynamique" style={{ display: "block", textAlign: "center", padding: "11px", borderRadius: 11, textDecoration: "none", fontSize: 13.5, fontWeight: 700, background: highlight ? G : "transparent", color: highlight ? "#080808" : G, border: highlight ? "none" : `1px solid ${G}55` }}>
                    Choisir {p.label}
                  </Link>
                </div>
              )
            })}
          </div>
          <p style={{ textAlign: "center", color: "#6E685E", fontSize: 12, margin: "20px 0 0" }}>
            <Link href="/dashboard/qr-dynamique" style={{ color: G, textDecoration: "none", fontWeight: 600 }}>Voir tous les détails de l'offre QR Dynamique →</Link>
          </p>
        </div>

        {/* Tableau comparatif */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <button onClick={() => setShowComparison(s => !s)}
            style={{ background: "transparent", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10, padding: "10px 20px", color: MUTED, fontSize: 13, cursor: "pointer" }}>
            {showComparison ? "Masquer" : "Voir"} le tableau comparatif complet
          </button>
        </div>

        {showComparison && (
          <div className="cmp-table" style={{ background: "#111009", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 16, overflow: "hidden", marginBottom: 40 }}>
            <div className="cmp-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ padding: "14px 20px" }}><span style={{ color: MUTED, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Fonctionnalite</span></div>
              {["Gratuit", "Starter", "Pro", "Business"].map((h, i) => (
                <div key={i} style={{ padding: "14px 12px", textAlign: "center" }}>
                  <span style={{ color: ["#8A8478","var(--action)","#C9A84C","var(--success)"][i], fontSize: 12, fontWeight: 700 }}>{h}</span>
                </div>
              ))}
            </div>
            {COMPARISON.map((row, i) => (
              <div key={i} className="cmp-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", borderBottom: i < COMPARISON.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                <div style={{ padding: "11px 20px" }}><span style={{ color: "#F5F0E8", fontSize: 13 }}>{row.feature}</span></div>
                {[row.free, row.starter, row.pro, row.business].map((val, j) => (
                  <div key={j} style={{ padding: "11px 12px", textAlign: "center" }}>
                    <span style={{ color: val === "—" ? "rgba(255,255,255,0.15)" : val === "✓" ? ["#8A8478","var(--action)","#C9A84C","var(--success)"][j] : "#F5F0E8", fontSize: 12 }}>{val}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center" }}>
          <p style={{ color: MUTED, fontSize: 13, margin: "0 0 6px" }}>
            Des questions ? <a href="mailto:hello@qrowg.com" style={{ color: G, textDecoration: "none" }}>Contactez-nous</a>
          </p>
          <p style={{ color: "#8A8478", fontSize: 12, margin: 0 }}>
            Paiement sécurisé par Stripe · Annulation à tout moment · Remboursement 14 jours · Sans engagement
          </p>
        </div>
      </div>
    </div>
  )
}
