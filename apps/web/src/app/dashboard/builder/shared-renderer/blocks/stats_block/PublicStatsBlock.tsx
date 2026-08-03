"use client"
import { statsBlockViewModel } from "../../models/statsBlock"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicStatsBlock({ content, ctx }: PublicAdapterProps) {
  const { items } = statsBlockViewModel(content)
  if (items.length === 0) return null
  const { G, MUTED, FONT_D, FONT_B } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: items.length <= 2 ? "1fr 1fr" : items.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 9 }}>
        {items.map((st, i) => (
          <div key={i} style={{ background: `${G}08`, border: `1px solid ${G}15`, borderRadius: 13, padding: "16px 10px", textAlign: "center" }}>
            {st.icon && <span style={{ fontSize: 22, display: "block", marginBottom: 5 }}>{st.icon}</span>}
            <p style={{ color: G, fontSize: 24, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_D, lineHeight: 1 }}>{st.value}</p>
            <p style={{ color: MUTED, fontSize: 11, margin: 0, fontFamily: FONT_B }}>{st.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
