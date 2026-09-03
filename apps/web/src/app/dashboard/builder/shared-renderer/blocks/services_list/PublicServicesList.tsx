"use client"
import { servicesListViewModel } from "../../models/servicesList"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicServicesList({ content, ctx }: PublicAdapterProps) {
  const { visible, title, items } = servicesListViewModel(content)
  if (!visible) return null
  const { TEXT, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "6px 24px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 4px", fontFamily: FONT_B }}>{title}</p>}
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 13, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)", borderRadius: 13, padding: "13px 15px", transition: "transform 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateX(4px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "translateX(0)")}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>{it.icon}</span>
          <div>
            <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{it.name}</p>
            {it.desc && <p style={{ color: MUTED, fontSize: 13.5, margin: 0, lineHeight: 1.5, fontFamily: FONT_B }}>{it.desc}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
