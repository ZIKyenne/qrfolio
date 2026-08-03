"use client"
import { googleReviewViewModel } from "../../models/googleReview"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicGoogleReview({ content, ctx }: PublicAdapterProps) {
  const { stars, label, link } = googleReviewViewModel(content)
  if (!link.visible) return null
  const { TEXT, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "6px 24px 12px" }}>
      <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={ctx.trackClick} style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(251,191,36,0.08)", border: "1.5px solid rgba(251,191,36,0.25)", borderRadius: 13, padding: "13px 15px", textDecoration: "none" }}>
        <div style={{ display: "flex", gap: 1 }}>{Array.from({ length: stars }).map((_, i) => <span key={i} style={{ color: "#FBBF24", fontSize: 13 }}>★</span>)}</div>
        <div style={{ flex: 1 }}><p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{label}</p><p style={{ color: MUTED, fontSize: 10, margin: 0 }}>Google Reviews</p></div>
        <span style={{ fontSize: 19 }}>⭐</span>
      </PublicCtaLink>
    </div>
  )
}
