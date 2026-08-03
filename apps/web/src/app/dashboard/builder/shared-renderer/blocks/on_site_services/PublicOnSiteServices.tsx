"use client"
import { onSiteServicesViewModel } from "../../models/onSiteServices"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicOnSiteServices({ content, ctx }: PublicAdapterProps) {
  const { title, items } = onSiteServicesViewModel(content)
  if (items.length === 0) return null
  const { TEXT, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {items.map((svc, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.15)", borderRadius: 11, padding: "11px 13px" }}>
            <span style={{ fontSize: 21, flexShrink: 0 }}>{svc.icon}</span>
            <span style={{ color: TEXT, fontSize: 12, fontWeight: 600, fontFamily: FONT_B }}>{svc.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
