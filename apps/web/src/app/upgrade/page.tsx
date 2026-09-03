"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Check, Zap, Crown, Star, ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"
import { PLAN_LIST, PLAN_COMPARISON, fmtPrice } from "@/lib/plans"
import { useAccent } from "@/lib/useAccent"
import Particles from "@/components/Particles"
import SubscribeButton from "@/components/SubscribeButton"
import CheckoutErrorBanner from "@/components/CheckoutErrorBanner"

// UI par plan (icône, CTA, mise en avant) ; les DONNÉES viennent de lib/plans
const PLAN_UI = {
  free:     { icon: <Star size={20} />,     cta: "Plan gratuit",                ctaDisabled: true,  highlight: false, priceId: undefined },
  pro:      { icon: <Sparkles size={20} />, cta: "Choisir Établissement",       ctaDisabled: false, highlight: true,  priceId: "pro"      },
  business: { icon: <Crown size={20} />,    cta: "Choisir Multi-sites",         ctaDisabled: false, highlight: false, priceId: "business" },
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
  const [payErr, setPayErr] = useState<string | null>(null)

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
    if (!data.url) throw new Error(data.error || "Le paiement n'a pas pu démarrer. Réessayez.")
    return data.url as string
  }


  const G = useAccent(); const MUTED = "#8A8478"

  // Cette page est hors du layout dashboard : on applique l'accent au document
  // (et on prévient les particules) pour qu'elles prennent la couleur de l'utilisateur.
  useEffect(() => {
    if (!G) return
    document.documentElement.style.setProperty("--accent", G)
    window.dispatchEvent(new CustomEvent("qrfolio-accent", { detail: G }))
  }, [G])

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "DM Sans, sans-serif", padding: "0 24px 80px", position: "relative", isolation: "isolate" }}>
      <CheckoutErrorBanner error={payErr} onClose={() => setPayErr(null)} />
      <Particles behind />
      <style>{``}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Back */}
        <div style={{ paddingTop: 32, marginBottom: 40 }}>
          {/* 17 px de haut mesurés : le seul chemin de retour de la page, et il
              fallait viser juste. Épaissi sans décaler la mise en page. */}
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: MUTED, textDecoration: "none", fontSize: 14, minHeight: 44, padding: "0 6px", marginLeft: -6 }}>
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
            {["Plan gratuit sans carte, sans durée", "Vues illimitées sur tous les plans", "Annulation en 1 clic"].map((r, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 12.5 }}>
                <Check size={13} color="var(--success)" /> {r}
              </span>
            ))}
          </div>

          {/* Toggle annuel */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#111009", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 30, padding: "8px 16px" }}>
            <span style={{ color: !annual ? "#F5F0E8" : MUTED, fontSize: 14, fontWeight: !annual ? 600 : 400 }}>Mensuel</span>
            {/* L'interrupteur mesurait 44 x 24 : sous le seuil du pouce. Le dessin ne
                change pas — c'est le BOUTON qui passe a 44 x 44, avec une marge
                negative pour que la pastille garde exactement sa hauteur visuelle. */}
            <button onClick={() => setAnnual(a => !a)} role="switch" aria-checked={annual} aria-label="Facturation annuelle"
              style={{ width: 44, height: 44, margin: "-10px 0", padding: 0, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ display: "block", width: 44, height: 24, borderRadius: 12, background: annual ? G : "rgba(255,255,255,0.1)", position: "relative", transition: "background 0.2s" }}>
                <span style={{ position: "absolute", top: 3, left: annual ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </span>
            </button>
            <span style={{ color: annual ? "#F5F0E8" : MUTED, fontSize: 14, fontWeight: annual ? 600 : 400 }}>Annuel</span>
            {annual && <span style={{ background: "rgba(57,255,143,0.15)", border: "1px solid rgba(57,255,143,0.3)", borderRadius: 10, padding: "2px 8px", fontSize: 11, color: "var(--success)", fontWeight: 700 }}>-20%</span>}
          </div>
        </div>

        {/* Plans grid — un seul abonnement, une seule grille */}
        <div style={{ position: "relative", margin: "8px 0 40px", padding: "30px 22px 26px", borderRadius: 24, background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.10), transparent 60%), #0E0D0A", border: "1px solid rgba(201,168,76,0.2)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16, alignItems: "start" }}>
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
                  {plan.perks.map((perk: { text: string; included: boolean; soon?: boolean }, i: number) => (
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

                {!isCurrentPlan && !plan.ctaDisabled ? (
                  // Plans Stripe actionnables (Établissement / Multi-sites) : CTA animé « scan QR »
                  // qui récupère l'URL de paiement et redirige en fin d'animation. L'accent =
                  // la couleur de CHAQUE carte (pas l'or global) pour rester cohérent.
                  <SubscribeButton
                    label={plan.cta}
                    accent={pc}
                    successLabel="Redirection vers le paiement…"
                    minScanMs={1600}
                    height={48}
                    onSubscribe={() => checkoutUrl(plan)}
                    onError={(e) => { setLoading(null); setPayErr(e instanceof Error ? e.message : "Le paiement n'a pas pu démarrer. Réessayez.") }}
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
        </div>

        {/* ── Les QR modifiables sont INCLUS dans les plans ────────────────────── */}
        {/* Il y avait ici une seconde grille tarifaire, avec ses propres « Pro » et  */}
        {/* « Business » à d'autres prix. Deux abonnements homonymes sur le même site :*/}
        {/* personne ne pouvait dire lequel il payait. Un seul abonnement désormais.   */}
        <div style={{ position: "relative", margin: "8px 0 44px", padding: "30px 22px", borderRadius: 24, overflow: "hidden", background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.10), transparent 60%), #0E0D0A", border: "1px solid rgba(201,168,76,0.22)" }}>
          <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 999, padding: "5px 14px", color: G, fontSize: 12, fontWeight: 800, letterSpacing: 0.5, marginBottom: 14 }}>
              <Zap size={14} /> INCLUS DANS VOTRE PLAN
            </span>
            <h2 style={{ color: "#F5F0E8", fontSize: 28, fontWeight: 800, margin: "0 0 10px", letterSpacing: -0.5, lineHeight: 1.15 }}>Des QR modifiables après impression</h2>
            <p style={{ color: MUTED, fontSize: 14.5, margin: "0 0 22px", lineHeight: 1.55 }}>
              Changez la destination d'un QR déjà collé sur une table, et suivez les scans. Pas d'abonnement séparé, pas d'expiration&nbsp;: le nombre est compris dans votre plan.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, maxWidth: 560, margin: "0 auto" }}>
              {PLAN_LIST.map(pl => (
                <div key={pl.id} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${pl.id === "pro" ? pl.color + "66" : "rgba(255,255,255,0.09)"}`, borderRadius: 14, padding: "14px 10px" }}>
                  <div style={{ color: pl.color, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 7 }}>{pl.label}</div>
                  <div style={{ color: "#F5F0E8", fontSize: 25, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>{pl.limits.dyn === null ? "∞" : pl.limits.dyn}</div>
                  <div style={{ color: "#6E685E", fontSize: 10.5, marginTop: 5 }}>QR modifiables</div>
                </div>
              ))}
            </div>
            <p style={{ color: "#6E685E", fontSize: 12, margin: "20px 0 0", lineHeight: 1.5 }}>
              Statistiques détaillées, domaine de marque et sécurité du lien à partir du plan Pro&nbsp;; création en masse en Business.
            </p>
          </div>
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
            <div className="cmp-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ padding: "14px 20px" }}><span style={{ color: MUTED, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Fonctionnalite</span></div>
              {["Gratuit", "Établissement", "Multi-sites"].map((h, i) => (
                <div key={i} style={{ padding: "14px 12px", textAlign: "center" }}>
                  <span style={{ color: ["#8A8478","#C9A84C","var(--success)"][i], fontSize: 12, fontWeight: 700 }}>{h}</span>
                </div>
              ))}
            </div>
            {COMPARISON.map((row, i) => (
              <div key={i} className="cmp-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: i < COMPARISON.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                <div style={{ padding: "11px 20px" }}><span style={{ color: "#F5F0E8", fontSize: 13 }}>{row.feature}</span></div>
                {[row.free, row.pro, row.business].map((val, j) => (
                  <div key={j} style={{ padding: "11px 12px", textAlign: "center" }}>
                    <span style={{ color: val === "—" ? "rgba(255,255,255,0.15)" : val === "✓" ? ["#8A8478","#C9A84C","var(--success)"][j] : "#F5F0E8", fontSize: 12 }}>{val}</span>
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
