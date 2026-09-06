"use client"

import { useState } from "react"
import Link from "next/link"
import { useInView, Eyebrow } from "../homeUi"
import { PLAN_LIST, PLAN_COMPARISON, fmtPrice, PLANS as PLANS_DEF } from "@/lib/plans"

const PLAN_LANDING_UI = {
  free:     { cta: "Commencer gratuitement",     href: "/creer",                       badge: null,                note: "Sans compte pour composer · le compte n'est demandé qu'à la publication" },

  pro:      { cta: `Choisir ${PLANS_DEF.pro.label}`,                 href: "/auth/signup?plan=pro",      badge: "Le plus populaire",   note: "Sans engagement · Annulable en 1 clic" },
  business: { cta: `Choisir ${PLANS_DEF.business.label}`,            href: "/auth/signup?plan=business", badge: null,                note: "Sans engagement · Annulable en 1 clic" },
} as Record<string, { cta: string; href: string; badge: string | null; note: string | null }>

// Bénéfices orientés résultat (Pb 12) — on vend ce que ça apporte, pas une liste de specs.
// ⚠️ Les `ok` DOIVENT refléter lib/plans.ts (source de vérité) : retrait du branding et
// domaine personnalisé dès le premier plan payant (PLANS.pro). Ne pas laisser diverger.
const LANDING_BENEFITS: Record<string, { text: string; ok: boolean }[]> = {
  free: [
    { text: "Votre page en ligne en 5 minutes", ok: true },
    { text: "3 QR codes, dont 1 modifiable après impression", ok: true },
    { text: "Vues illimitées — votre QR ne s'arrête jamais", ok: true },
    { text: "Suivez vos premières visites", ok: true },
    { text: "Sans la mention QRowg", ok: false },
    { text: "Votre nom de domaine", ok: false },
  ],
  pro: [
    { text: "Changez la destination d'un QR déjà imprimé", ok: true },
    { text: "Concevez vos supports : stickers, chevalets, affiches", ok: true },
    { text: "Voyez qui scanne, quand et avec quoi", ok: true },
    { text: "Votre marque, sans mention QRowg", ok: true },
    { text: "Votre propre nom de domaine", ok: true },
    { text: "10 pages · 30 QR dont 20 modifiables", ok: true },
  ],
  business: [
    { text: "Plusieurs établissements, une seule facture", ok: true },
    { text: "Tout le plan Établissement inclus", ok: true },
    { text: "Création en masse par import CSV", ok: true },
    { text: "Travaillez à plusieurs · 5 membres", ok: true },
    { text: "Marque blanche", ok: true },
    { text: "Accès API · 10 000 appels / mois", ok: true },
  ],
}

const PLANS = PLAN_LIST.map(p => ({
  id: p.id,
  name: p.label,
  tagline: p.description,
  isFree: p.priceMonthly === 0,
  priceMonthly: fmtPrice(p.priceMonthly),
  priceAnnual: fmtPrice(p.priceAnnual),
  rawMonthly: p.priceMonthly,
  rawAnnual: p.priceAnnual,
  highlight: p.id === "pro",
  badge: PLAN_LANDING_UI[p.id].badge,
  color: p.color,
  cta: PLAN_LANDING_UI[p.id].cta,
  ctaHref: PLAN_LANDING_UI[p.id].href,
  features: LANDING_BENEFITS[p.id] ?? p.perks.slice(0, 6).map(k => ({ text: k.text, ok: k.included })),
  note: PLAN_LANDING_UI[p.id].note,
}))

export function PricingSection() {
  const { ref, visible } = useInView(0.06)
  const [showCmp, setShowCmp] = useState(false)
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" ref={ref} aria-labelledby="pricing-title"
      style={{
        padding: "100px 48px", position: "relative", zIndex: 1,
        background: "linear-gradient(180deg, rgba(255,255,255,0.024), rgba(255,255,255,0.008)), radial-gradient(130% 60% at 50% 0%, rgba(201,168,76,0.06), transparent 60%)",
        borderTop: "1px solid rgba(201,168,76,0.13)",
        borderBottom: "1px solid rgba(201,168,76,0.13)",
      }}>
      <style>{`
        .plans-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; align-items:stretch; }
        .plan-card  { border-radius:20px; padding:28px 22px; position:relative; overflow:hidden;
                      transition:transform 0.3s var(--mo-ease-spring), box-shadow 0.3s, border-color 0.25s; }
        .plan-card:hover { transform:translateY(-6px); }
        .plan-card.highlight { transform:scale(1.05); }
        .plan-card.highlight:hover { transform:scale(1.05) translateY(-6px); }
        @media(max-width:1024px){ .plans-grid{ grid-template-columns:repeat(2,1fr)!important; max-width:680px!important; margin:0 auto!important; } .plan-card.highlight{ transform:none!important; } .plan-card.highlight:hover{ transform:translateY(-4px)!important; } }
        @media(max-width:560px){ .plans-grid{ grid-template-columns:1fr!important; max-width:420px!important; } #pricing{ padding:72px 20px!important; } }
      `}</style>

      {/* Header */}
      <div style={{
        maxWidth: 1000, margin: "0 auto 64px", textAlign: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <Eyebrow>Tarifs</Eyebrow>
        <h2 id="pricing-title" style={{
          fontFamily:"Fraunces, serif",
          fontSize:"clamp(28px,4vw,52px)",
          color:"#F5F0E8", fontWeight:700,
          margin:"0 auto 16px", lineHeight:1.1,
          maxWidth:520, letterSpacing:"-0.02em",
        }}>
          Simple, transparent,{" "}
          <span style={{ color:"#C9A84C" }}>sans surprise.</span>
        </h2>
        <p style={{ color:"rgba(188,182,166,0.8)", fontSize:16,
          maxWidth:440, margin:"0 auto", lineHeight:1.65 }}>
          Commencez gratuitement. Passez au plan {PLANS_DEF.pro.label} quand vous êtes prêt.
        </p>

        {/* Toggle mensuel / annuel */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:14, marginTop:28, flexWrap:"wrap" }}>
          <span style={{ color: !annual ? "#F5F0E8" : "rgba(188,182,166,0.6)", fontSize:14, fontWeight: !annual ? 600 : 400, transition:"color 0.2s" }}>Mensuel</span>
          <button type="button" onClick={() => setAnnual(a => !a)} role="switch" aria-checked={annual}
            aria-label="Basculer facturation annuelle"
            style={{ width:48, height:26, borderRadius:13, background: annual ? "linear-gradient(90deg,#C9A84C,#b8953f)" : "rgba(255,255,255,0.12)",
              border:"none", cursor:"pointer", position:"relative", transition:"background 0.25s", flexShrink:0 }}>
            <span style={{ position:"absolute", top:3, left: annual ? 25 : 3, width:20, height:20, borderRadius:"50%",
              background:"#fff", transition:"left 0.25s var(--mo-ease-spring)", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }}/>
          </button>
          <span style={{ color: annual ? "#F5F0E8" : "rgba(188,182,166,0.6)", fontSize:14, fontWeight: annual ? 600 : 400, transition:"color 0.2s" }}>Annuel</span>
          <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(57,255,143,0.12)", border:"1px solid rgba(57,255,143,0.3)",
            color:"var(--success)", fontSize:11.5, fontWeight:700, padding:"3px 10px", borderRadius:20, letterSpacing:0.2 }}>
            Jusqu'à 2 mois offerts
          </span>
        </div>
        <p style={{ color:"rgba(188,182,166,0.5)", fontSize:12, marginTop:12 }}>Prix TTC · Sans engagement · Annulable à tout moment</p>
      </div>

      {/* Cards */}
      <div style={{ maxWidth:1180, margin:"0 auto" }}>
        <div className="plans-grid">
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              className={"plan-card" + (plan.highlight ? " highlight" : "")}
              style={{
                background: plan.highlight
                  ? "linear-gradient(145deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04))"
                  : "rgba(255,255,255,0.02)",
                border: "1px solid " + (plan.highlight
                  ? "rgba(201,168,76,0.55)"
                  : "rgba(255,255,255,0.08)"),
                boxShadow: plan.highlight
                  ? "0 0 80px rgba(201,168,76,0.18), 0 0 0 1px rgba(201,168,76,0.12)"
                  : "none",
                opacity: visible ? 1 : 0,
                paddingTop: plan.badge ? 50 : undefined,
                transform: visible
                  ? (plan.highlight ? "scale(1.04)" : "translateY(0)")
                  : "translateY(28px)",
                transition: `opacity 0.5s ease ${i * 0.12}s, transform 0.5s ease ${i * 0.12}s, border-color 0.25s, box-shadow 0.3s`,
              }}
            >
              {/* Accent top */}
              <div style={{
                position:"absolute", top:0, left:0, right:0, height:2,
                background: plan.highlight
                  ? "linear-gradient(90deg,#C9A84C,#d4a843,#C9A84C)"
                  : "transparent",
                borderRadius:"22px 22px 0 0",
              }}/>

              {/* Badge */}
              {plan.badge && (
                <div style={{
                  position:"absolute", top:14, left:"50%", transform:"translateX(-50%)",
                  background:"linear-gradient(90deg,#C9A84C,#b8953f)",
                  borderRadius:20, padding:"4px 14px",
                  fontSize:10, fontWeight:800, color:"#080808",
                  letterSpacing:0.5, whiteSpace:"nowrap", zIndex:3,
                  boxShadow:"0 4px 14px rgba(201,168,76,0.45)",
                }}>{plan.badge}</div>
              )}

              {/* Plan name */}
              <p style={{
                color: plan.color, fontSize:10, fontWeight:700,
                letterSpacing:2.5, textTransform:"uppercase",
                margin:"0 0 4px",
              }}>{plan.name}</p>
              <p style={{ color:"rgba(188,182,166,0.7)", fontSize:12,
                margin:"0 0 20px", lineHeight:1.4 }}>{plan.tagline}</p>

              {/* Prix */}
              <div style={{ marginBottom:24 }}>
                <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                  <span style={{
                    fontFamily:"Fraunces, serif",
                    color:"#F5F0E8", fontSize:48, fontWeight:700, lineHeight:1,
                  }}>{annual ? plan.priceAnnual : plan.priceMonthly}</span>
                  <span style={{ color:"rgba(201,168,76,0.7)", fontSize:15, fontWeight:600 }}>€</span>
                  {!plan.isFree && (
                    <span style={{ color:"rgba(188,182,166,0.6)", fontSize:13, marginLeft:2 }}>/ mois</span>
                  )}
                </div>
                {/* Sous-ligne : facturation annuelle / prix barre */}
                <div style={{ minHeight:18, marginTop:6 }}>
                  {!plan.isFree && annual && (
                    <span style={{ color:"rgba(188,182,166,0.6)", fontSize:12 }}>
                      soit {(plan.rawAnnual * 12).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / an
                    </span>
                  )}
                  {!plan.isFree && !annual && (
                    <span style={{ color:"rgba(188,182,166,0.45)", fontSize:12 }}>ou {plan.priceAnnual} € / mois en annuel</span>
                  )}
                </div>
              </div>

              {/* Séparateur */}
              <div style={{
                height:1, marginBottom:24,
                background: plan.highlight
                  ? "linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent)"
                  : "rgba(255,255,255,0.06)",
              }}/>

              {/* Features */}
              <div style={{ display:"flex", flexDirection:"column", gap:11, marginBottom:28 }}>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{
                      width:16, height:16, borderRadius:"50%", flexShrink:0,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:9,
                      background: f.ok
                        ? "rgba(57,255,143,0.15)"
                        : "rgba(188,182,166,0.08)",
                      color: f.ok ? "var(--success)" : "rgba(188,182,166,0.4)",
                    }}>{f.ok ? "✓" : "✕"}</span>
                    <span style={{
                      color: f.ok ? "rgba(245,240,232,0.85)" : "rgba(188,182,166,0.45)",
                      fontSize:13.5,
                      textDecoration: f.ok ? "none" : "none",
                    }}>{f.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link href={plan.ctaHref} style={{
                display:"block", textAlign:"center", textDecoration:"none",
                padding:"13px 24px", borderRadius:11,
                fontWeight:700, fontSize:14, letterSpacing:0.1,
                background: plan.highlight
                  ? "linear-gradient(90deg,#C9A84C,#b8953f)"
                  : "transparent",
                color: plan.highlight ? "#080808" : plan.color,
                border: plan.highlight ? "none" : "1px solid " + plan.color + "40",
                transition:"all 0.2s ease",
                boxShadow: plan.highlight ? "0 4px 20px rgba(201,168,76,0.35)" : "none",
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  if (plan.highlight) {
                    el.style.boxShadow = "0 6px 28px rgba(201,168,76,0.5)"
                    el.style.transform = "translateY(-1px)"
                  } else {
                    el.style.background = plan.color + "12"
                    el.style.borderColor = plan.color + "70"
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  if (plan.highlight) {
                    el.style.boxShadow = "0 4px 20px rgba(201,168,76,0.35)"
                    el.style.transform = "none"
                  } else {
                    el.style.background = "transparent"
                    el.style.borderColor = plan.color + "40"
                  }
                }}>
                {plan.cta}
              </Link>

              {/* Note sous le CTA */}
              {plan.note && (
                <p style={{
                  color:"rgba(188,182,166,0.6)", fontSize:11,
                  textAlign:"center", margin:"12px 0 0", lineHeight:1.5,
                }}>{plan.note}</p>
              )}
            </div>
          ))}
        </div>

        {/* Comparaison détaillée des plans (Pb 13) */}
        <div style={{ marginTop: 56, opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.4s" }}>
          <div style={{ textAlign: "center" }}>
            <button type="button" onClick={() => setShowCmp(v => !v)} aria-expanded={showCmp} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "13px 26px", borderRadius: 12, background: showCmp ? "rgba(201,168,76,0.06)" : "transparent", border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
              {showCmp ? "Masquer le comparatif" : "Comparer les plans en détail"}
              <span style={{ fontSize: 12, transform: showCmp ? "rotate(180deg)" : "none", transition: "transform 0.25s" }}>▾</span>
            </button>
          </div>
          {showCmp && (
          <>
          <p style={{ color: "rgba(200,194,178,0.88)", fontSize: 14.5, textAlign: "center", margin: "22px 0 26px", lineHeight: 1.6 }}>
            Survolez le <span style={{ color: "#C9A84C" }}>?</span> de chaque ligne pour plus d'explications.
          </p>
          {(() => {
            const INFO: Record<string, string> = {
              "Pages": "Nombre de pages publiables en même temps.",
              "Vues / mois": "Nombre de visites comptabilisées chaque mois sur vos pages.",
              "QR codes": "Nombre de QR codes que vous pouvez générer.",
              "QR Studio": "Personnalisation avancée du QR : couleurs, formes des modules et des coins.",
              "Atelier d'impression": "Éditeur d'imprimables (affiches, flyers, cartes, stickers) façon Canva.",
              "IA": "Génération de design et recommandations automatiques.",
              "Export HD": "Formats de téléchargement haute définition pour l'impression.",
              "Templates": "Bibliothèque de modèles prêts à l'emploi.",
              "Branding QRowg": "Mention QRowg en bas de page (retirée dès le plan Établissement).",
              "Domaine perso": "Utiliser votre propre nom de domaine.",
              "Analytics": "Niveau de détail des statistiques.",
              "Equipe": "Nombre de membres pouvant collaborer sur le compte.",
              "API": "Accès programmatique pour automatiser vos QR codes.",
              "Marque blanche": "Aucune trace de QRowg : votre marque uniquement.",
              "Support": "Niveau et rapidité de l'assistance.",
            }
            const cell = (v: string, hl: boolean) => {
              const ok = v === "✓" || v === "Oui"
              const no = v === "❌" || v === "—" || v === "Non"
              return (
                <td style={{ padding: "12px 14px", textAlign: "center", fontSize: 12.5, fontWeight: hl ? 700 : 500, color: ok ? "var(--success)" : no ? "rgba(188,182,166,0.45)" : hl ? "#C9A84C" : "#E8E6E0", borderBottom: "1px solid rgba(255,255,255,0.05)", background: hl ? "rgba(201,168,76,0.05)" : "transparent" }}>
                  {ok ? "✓" : no ? "—" : v}
                </td>
              )
            }
            return (
              <div style={{ overflowX: "auto", maxWidth: 960, margin: "0 auto", border: "1px solid rgba(201,168,76,0.14)", borderRadius: 16, background: "rgba(255,255,255,0.02)" }}>
                <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "16px 14px", textAlign: "left", fontSize: 11, color: "rgba(188,182,166,0.8)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Fonctionnalité</th>
                      {PLAN_LIST.map(p => (
                        <th key={p.id} style={{ padding: "16px 14px", textAlign: "center", fontSize: 13, fontWeight: 800, color: p.id === "pro" ? "#C9A84C" : "#F5F0E8", background: p.id === "pro" ? "rgba(201,168,76,0.06)" : "transparent" }}>
                          {p.label}{p.id === "pro" && <div style={{ fontSize: 8.5, color: "#C9A84C", fontWeight: 700, letterSpacing: 0.5 }}>POPULAIRE</div>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PLAN_COMPARISON.map(row => (
                      <tr key={row.feature}>
                        <td style={{ padding: "12px 14px", textAlign: "left", fontSize: 12.5, color: "#E8E6E0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          {row.feature}
                          {INFO[row.feature] && <span title={INFO[row.feature]} style={{ marginLeft: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: "rgba(201,168,76,0.15)", color: "#C9A84C", fontSize: 9, fontWeight: 800, cursor: "help" }}>?</span>}
                        </td>
                        {cell(row.free, false)}
                        {cell(row.pro, true)}
                        {cell(row.business, false)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
          </>
          )}
        </div>
      </div>
    </section>
  )
}


// ── Proof strip ───────────────────────────────────────────────────────────────
