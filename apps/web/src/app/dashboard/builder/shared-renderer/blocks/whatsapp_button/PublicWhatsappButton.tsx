"use client"
import { whatsappButtonViewModel } from "../../models/whatsappButton"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import { IconLabelCta } from "../../views/IconLabelCta"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicWhatsappButton({ content, ctx }: PublicAdapterProps) {
  const { label, link } = whatsappButtonViewModel(content)
  if (!link.visible) return null
  return (
    <div style={{ padding: "6px 24px 10px" }}>
      <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={ctx.trackClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "rgba(37,211,102,0.12)", border: "1.5px solid rgba(37,211,102,0.35)", borderRadius: 13, padding: "15px 18px", textDecoration: "none" }}>
        <IconLabelCta icon="💬" label={label} color="#25D366" iconSize={17} labelSize={15} fontBody={ctx.FONT_B} />
      </PublicCtaLink>
    </div>
  )
}
