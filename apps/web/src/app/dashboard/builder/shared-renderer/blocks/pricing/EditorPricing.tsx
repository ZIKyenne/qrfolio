"use client"
// Adapter ÉDITEUR de `pricing`. Reproduit builderPreview case "pricing" : cartes + CTA
// NON navigable (aria-disabled). Consomme le modèle pur partagé (offres + pricingCtaModel).
import { pricingViewModel } from "../../models/pricing"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorPricing({ content, ctx }: EditorAdapterProps) {
  const vm = pricingViewModel(content)
  const { theme, primary, muted, surfaceStyle } = ctx
  const cta = vm.cta
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {vm.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{vm.title}</p>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {vm.plans.map((pl, i) => (
          <div key={i} style={{ flex: 1, minWidth: 70, position: "relative", background: i === 1 ? primary + "12" : "rgba(255,255,255,0.04)", border: `1px solid ${i === 1 ? primary + "40" : "rgba(255,255,255,0.08)"}`, borderRadius: 9, padding: "12px 8px", textAlign: "center" }}>
            {pl.disc && <span style={{ position: "absolute", top: -7, right: 6, background: "#EF4444", color: "#fff", borderRadius: 5, padding: "1px 5px", fontSize: 9, fontWeight: 800 }}>{pl.disc.label}</span>}
            <p style={{ color: muted, fontSize: 9, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: 1 }}>{pl.title}</p>
            <p style={{ color: primary, fontSize: 20, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay }}>{pl.price}</p>
            {pl.oldPrice && <p style={{ color: muted, fontSize: 11, margin: "0 0 3px", textDecoration: "line-through" }}>{pl.oldPrice}</p>}
            <p style={{ color: muted, fontSize: 9, margin: cta.visible ? "0 0 8px" : 0 }}>{pl.desc}</p>
            {cta.visible && <div aria-disabled="true" title="Lien actif uniquement sur la page publiée" style={{ background: primary + "12", border: `1px solid ${primary}25`, color: primary, borderRadius: 7, padding: "6px", fontSize: 10, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cta.label}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
