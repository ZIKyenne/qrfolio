"use client"
import { businessStatsViewModel } from "../../models/businessStats"
import type { EditorAdapterProps } from "../../renderTypes"

// Legacy sans état vide éditeur : grille (éventuellement vide) rendue telle quelle.
export function EditorBusinessStats({ content, ctx }: EditorAdapterProps) {
  const { items } = businessStatsViewModel(content)
  const { theme, primary, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <div style={{ display: "grid", gridTemplateColumns: items.length <= 2 ? "1fr 1fr" : items.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8 }}>
        {items.map((st, i) => (
          <div key={i} style={{ background: primary + "08", border: `1px solid ${primary}15`, borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
            {st.icon && <span style={{ fontSize: 20, display: "block", marginBottom: 5 }}>{st.icon}</span>}
            <p style={{ color: primary, fontSize: 22, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay, lineHeight: 1 }}>{st.value}</p>
            <p style={{ color: muted, fontSize: 10, margin: 0 }}>{st.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
