"use client"
// Adapter PUBLIC de `pricing`. Reproduit PublicPageClient case "pricing" : null si vide,
// sinon cartes + CTA <a> sécurisé (extHref via le modèle) et tracké. Aucun symbole éditeur.
import { pricingViewModel } from "../../models/pricing"
import type { PublicAdapterProps } from "../../renderTypes"
import { avecCibleTactile } from "../../primitives/BlockCtaLink"

export function PublicPricing({ content, ctx }: PublicAdapterProps) {
  const vm = pricingViewModel(content)
  if (!vm.visible) return null
  const { G, TEXT, MUTED, FONT_D, FONT_B, trackClick } = ctx
  const cta = vm.cta
  return (
    <div style={{ padding: "6px 24px 16px" }}>
      {vm.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{vm.title}</p>}
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        {vm.plans.map((pl, i) => (
          <div key={i} style={{ flex: 1, minWidth: 90, position: "relative", background: i === 1 ? `${G}10` : "rgba(255,255,255,0.03)", border: `1px solid ${i === 1 ? G + "40" : "rgba(255,255,255,0.06)"}`, borderRadius: 13, padding: "16px 12px", textAlign: "center", transition: "transform 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
            {pl.disc && <span style={{ position: "absolute", top: -9, right: 8, background: "#EF4444", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 800, fontFamily: FONT_B }}>{pl.disc.label}</span>}
            <p style={{ color: MUTED, fontSize: 10, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: 1, fontFamily: FONT_B }}>{pl.title}</p>
            <p style={{ color: G, fontSize: 26, fontWeight: 700, margin: "0 0 4px", fontFamily: FONT_D }}>{pl.price}</p>
            {pl.oldPrice && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 4px", textDecoration: "line-through", fontFamily: FONT_B }}>{pl.oldPrice}</p>}
            <p style={{ color: MUTED, fontSize: 13.5, margin: 0, fontFamily: FONT_B }}>{pl.desc}</p>
            {cta.visible && <a href={cta.href || "#"} onClick={() => trackClick(content.cta_url || "pricing")} style={avecCibleTactile({ display: "block", background: `${G}12`, border: `1px solid ${G}25`, color: G, textDecoration: "none", borderRadius: 7, padding: "7px", marginTop: 8, fontSize: 11, fontWeight: 700, fontFamily: FONT_B })}>{cta.label}</a>}
          </div>
        ))}
      </div>
    </div>
  )
}
