"use client"
import { promoBannerViewModel } from "../../models/promoBanner"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import type { PublicAdapterProps } from "../../renderTypes"

// Legacy : conteneur toujours rendu. CTA legacy sans target/rel (external=false).
export function PublicPromoBanner({ content, ctx }: PublicAdapterProps) {
  const { emoji, text, subtext, ctaLabel, link } = promoBannerViewModel(content)
  const { TEXT, MUTED, FONT_D, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "6px 24px 16px" }}>
      <div style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.12),rgba(249,115,22,0.06))", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 14, padding: "18px 18px", textAlign: "center" }}>
        {emoji && <span style={{ fontSize: 30, display: "block", marginBottom: 8 }}>{emoji}</span>}
        <p style={{ color: TEXT, fontSize: 17, fontWeight: 700, margin: "0 0 4px", fontFamily: FONT_D }}>{text}</p>
        {subtext && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 12px", fontFamily: FONT_B }}>{subtext}</p>}
        {link.visible && <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={trackClick} style={{ display: "inline-block", background: "#F97316", color: "#fff", padding: "10px 22px", borderRadius: 9, textDecoration: "none", fontSize: 14, fontWeight: 700, fontFamily: FONT_B }}>{ctaLabel}</PublicCtaLink>}
      </div>
    </div>
  )
}
