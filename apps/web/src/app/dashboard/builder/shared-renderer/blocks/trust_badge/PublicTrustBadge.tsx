"use client"
import { trustBadgeViewModel } from "../../models/trustBadge"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicTrustBadge({ content, ctx }: PublicAdapterProps) {
  const { title, items } = trustBadgeViewModel(content)
  if (items.length === 0) return null
  const { TEXT, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", textAlign: "center", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center" }}>
        {items.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(57,255,143,0.08)", border: "1px solid rgba(57,255,143,0.2)", borderRadius: 20, padding: "8px 15px" }}>
            <span style={{ color: "var(--success)", fontSize: 15, fontWeight: 700 }}>{b.icon}</span>
            <span style={{ color: TEXT, fontSize: 13, fontWeight: 600, fontFamily: FONT_B }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
