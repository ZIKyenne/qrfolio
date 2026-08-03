"use client"
import { eventInfoViewModel } from "../../models/eventInfo"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import type { PublicAdapterProps } from "../../renderTypes"

// Legacy : conteneur toujours rendu. CTA legacy sans target/rel (external=false).
export function PublicEventInfo({ content, ctx }: PublicAdapterProps) {
  const { name, rows, ctaLabel, link } = eventInfoViewModel(content)
  const { TEXT, MUTED, FONT_D, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "6px 24px 16px" }}>
      <div style={{ background: "rgba(236,72,153,0.07)", border: "1px solid rgba(236,72,153,0.18)", borderRadius: 15, padding: "18px 18px" }}>
        <p style={{ color: TEXT, fontSize: 19, fontWeight: 700, margin: "0 0 12px", fontFamily: FONT_D }}>{name}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: ctaLabel ? "14px" : "0" }}>
          {rows.map((r) => (
            <p key={r.icon} style={{ color: MUTED, fontSize: 13, margin: 0, fontFamily: FONT_B }}>{r.icon} {r.val}</p>
          ))}
        </div>
        {link.visible && <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={trackClick} style={{ display: "block", background: "#EC4899", color: "#fff", textAlign: "center", padding: "12px", borderRadius: 9, textDecoration: "none", fontSize: 14, fontWeight: 700, fontFamily: FONT_B }}>{ctaLabel}</PublicCtaLink>}
      </div>
    </div>
  )
}
