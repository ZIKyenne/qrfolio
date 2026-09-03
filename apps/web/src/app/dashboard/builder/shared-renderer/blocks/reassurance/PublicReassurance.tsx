"use client"
import { reassuranceViewModel } from "../../models/reassurance"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicReassurance({ content, ctx }: PublicAdapterProps) {
  const { items } = reassuranceViewModel(content)
  if (items.length === 0) return null
  const { TEXT, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {items.map((g, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "rgba(57,255,143,0.05)", border: "1px solid rgba(57,255,143,0.12)", borderRadius: 12, padding: "13px 9px", textAlign: "center" }}>
            <span style={{ fontSize: 26 }}>{g.icon || "✅"}</span>
            <p style={{ color: TEXT, fontSize: 12, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{g.label}</p>
            {g.desc && <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>{g.desc}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
