"use client"
import { orderOnlineViewModel } from "../../models/orderOnline"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import { IconLabelCta } from "../../views/IconLabelCta"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicOrderOnline({ content, ctx }: PublicAdapterProps) {
  const { label, link } = orderOnlineViewModel(content) // toujours visible (href||"#")
  return (
    <div style={{ padding: "6px 24px 10px" }}>
      <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={ctx.trackClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "rgba(249,115,22,0.12)", border: "1.5px solid rgba(249,115,22,0.3)", borderRadius: 13, padding: "15px 18px", textDecoration: "none" }}>
        <IconLabelCta icon="🛒" label={label} color="#F97316" iconSize={17} labelSize={15} fontBody={ctx.FONT_B} />
      </PublicCtaLink>
    </div>
  )
}
