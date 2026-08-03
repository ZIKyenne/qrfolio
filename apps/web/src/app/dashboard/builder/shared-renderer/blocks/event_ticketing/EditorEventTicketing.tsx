"use client"
import { eventTicketingViewModel } from "../../models/eventTicketing"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import type { EditorAdapterProps } from "../../renderTypes"

// Legacy sans gate : carte toujours rendue, CTA toujours présent (neutralisé en éditeur).
export function EditorEventTicketing({ content, ctx }: EditorAdapterProps) {
  const { eventName, date, location, price, ctaText } = eventTicketingViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <div style={{ background: "rgba(236,72,153,0.08)", border: "1.5px solid rgba(236,72,153,0.3)", borderRadius: 14, padding: "16px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
          <span style={{ fontSize: 32, flexShrink: 0 }}>🎟️</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 3px" }}>{eventName || "Mon événement"}</p>
            {date && <p style={{ color: muted, fontSize: 11, margin: "0 0 2px" }}>📅 {date}</p>}
            {location && <p style={{ color: muted, fontSize: 11, margin: "0 0 2px" }}>📍 {location}</p>}
            {price && <p style={{ color: "#EC4899", fontSize: 12, fontWeight: 700, margin: 0 }}>💶 {price}</p>}
          </div>
        </div>
        <EditorCtaShell style={{ background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{ctaText}</EditorCtaShell>
      </div>
    </div>
  )
}
