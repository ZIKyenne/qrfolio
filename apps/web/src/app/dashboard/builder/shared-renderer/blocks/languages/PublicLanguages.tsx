"use client"
import { languagesViewModel } from "../../models/languages"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicLanguages({ content, ctx }: PublicAdapterProps) {
  const { visible, title, items } = languagesViewModel(content)
  if (!visible) return null
  const { TEXT, MUTED, G, FONT_B } = ctx
  return (
    <div style={{ padding: "8px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 9px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 11 }}>
            <span style={{ fontSize: 20 }}>{l.flag || "🌐"}</span>
            <span style={{ color: TEXT, fontSize: 14, fontWeight: 600, flex: 1, fontFamily: FONT_B }}>{l.name}</span>
            <span style={{ background: `${G}18`, border: `1px solid ${G}28`, borderRadius: 20, padding: "3px 10px", color: G, fontSize: 11, fontWeight: 600 }}>{l.level || "Courant"}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
