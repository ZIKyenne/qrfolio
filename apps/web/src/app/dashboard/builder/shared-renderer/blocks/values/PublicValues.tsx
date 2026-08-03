"use client"
// Adapter PUBLIC de `values`. Reproduit PublicPageClient case "values" : null si vide,
// sinon grille de cartes. N'importe AUCUN symbole éditeur.
import { valuesViewModel } from "../../models/values"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicValues({ content, ctx }: PublicAdapterProps) {
  const vm = valuesViewModel(content)
  if (!vm.visible) return null
  const { G, TEXT, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {vm.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{vm.title}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {vm.items.map((v, i) => (
          <div key={i} style={{ background: `${G}08`, border: `1px solid ${G}15`, borderRadius: 13, padding: "14px 11px", textAlign: "center" }}>
            {v.icon && <span style={{ fontSize: 26, display: "block", marginBottom: 7 }}>{v.icon}</span>}
            <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: v.desc ? "0 0 3px" : "0", fontFamily: FONT_B }}>{v.label}</p>
            {v.desc && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{v.desc}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
