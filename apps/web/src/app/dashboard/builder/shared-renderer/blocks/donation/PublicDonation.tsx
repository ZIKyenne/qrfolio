"use client"
import { donationViewModel } from "../../models/donation"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import { IconLabelCta } from "../../views/IconLabelCta"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicDonation({ content, ctx }: PublicAdapterProps) {
  const { label, color, link } = donationViewModel(content)
  if (!link.visible) return null
  return (
    <div style={{ padding: "6px 24px 12px" }}>
      <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={ctx.trackClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: `${color}12`, border: `1.5px solid ${color}30`, borderRadius: 13, padding: "15px 18px", textDecoration: "none" }}>
        <IconLabelCta icon="☕" label={label} color={color} iconSize={19} labelSize={14} fontBody={ctx.FONT_B} />
      </PublicCtaLink>
    </div>
  )
}
