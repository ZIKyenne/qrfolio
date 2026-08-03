"use client"
import { eventTicketingViewModel } from "../../models/eventTicketing"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicEventTicketing({ content, ctx }: PublicAdapterProps) {
  const { visible, eventName, date, location, price, ctaText, link } = eventTicketingViewModel(content)
  if (!visible) return null
  const { TEXT, MUTED, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div style={{ background: "rgba(236,72,153,0.08)", border: "1.5px solid rgba(236,72,153,0.3)", borderRadius: 15, padding: "17px" }}>
        <div style={{ display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 15 }}>
          <span style={{ fontSize: 34, flexShrink: 0 }}>🎟️</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_B }}>{eventName || "Mon événement"}</p>
            {date && <p style={{ color: MUTED, fontSize: 12, margin: "0 0 2px" }}>📅 {date}</p>}
            {location && <p style={{ color: MUTED, fontSize: 12, margin: "0 0 2px" }}>📍 {location}</p>}
            {price && <p style={{ color: "#EC4899", fontSize: 13, fontWeight: 700, margin: 0 }}>💶 {price}</p>}
          </div>
        </div>
        <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={trackClick} style={{ display: "block", background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 11, padding: "13px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", fontFamily: FONT_B }}>{ctaText}</PublicCtaLink>
      </div>
    </div>
  )
}
