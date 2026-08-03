"use client"
import { advantagesViewModel } from "../../models/advantages"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicAdvantages({ content, ctx }: PublicAdapterProps) {
  const { visible, title, items } = advantagesViewModel(content)
  if (!visible) return null
  const { TEXT, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((adv, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: "rgba(57,255,143,0.05)", border: "1px solid rgba(57,255,143,0.15)", borderRadius: 10 }}><p style={{ color: TEXT, fontSize: 13, margin: 0, fontFamily: FONT_B }}>{adv}</p></div>)}
      </div>
    </div>
  )
}
