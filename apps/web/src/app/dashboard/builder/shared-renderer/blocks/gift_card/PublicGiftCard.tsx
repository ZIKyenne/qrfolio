"use client"
import { giftCardViewModel } from "../../models/giftCard"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicGiftCard({ content, ctx }: PublicAdapterProps) {
  const { visible, title, description, amounts, ctaLabel, link } = giftCardViewModel(content)
  if (!visible) return null
  const { TEXT, MUTED, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div style={{ background: "linear-gradient(135deg,#EC489915,#F472B610)", border: "1.5px solid rgba(236,72,153,0.3)", borderRadius: 15, padding: "17px" }}>
        <div style={{ textAlign: "center", marginBottom: 13 }}>
          <span style={{ fontSize: 34 }}>🎁</span>
          <p style={{ color: TEXT, fontSize: 16, fontWeight: 700, margin: "6px 0 3px", fontFamily: FONT_B }}>{title || "Offrez une expérience"}</p>
          {description && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{description}</p>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: ctaLabel ? 13 : 0 }}>
          {amounts.map((amount, i) => (
            <div key={i} style={{ background: i === 1 ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.06)", border: `1.5px solid ${i === 1 ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 11, padding: "11px 16px", textAlign: "center" }}>
              <p style={{ color: i === 1 ? "#EC4899" : TEXT, fontSize: 17, fontWeight: 700, margin: 0 }}>{amount}</p>
            </div>
          ))}
        </div>
        {link.visible && <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={trackClick} style={{ display: "block", background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 11, padding: "12px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", fontFamily: FONT_B }}>{ctaLabel}</PublicCtaLink>}
      </div>
    </div>
  )
}
