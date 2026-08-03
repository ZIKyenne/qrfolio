"use client"
import { emailButtonViewModel } from "../../models/emailButton"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import { IconLabelCta } from "../../views/IconLabelCta"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicEmailButton({ content, ctx }: PublicAdapterProps) {
  const { label, link } = emailButtonViewModel(content)
  if (!link.visible) return null
  return (
    <div style={{ padding: "6px 24px 10px" }}>
      <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={ctx.trackClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "rgba(56,189,248,0.1)", border: "1.5px solid rgba(56,189,248,0.3)", borderRadius: 13, padding: "15px 18px", textDecoration: "none" }}>
        <IconLabelCta icon="✉️" label={label} color="var(--action)" iconSize={17} labelSize={15} fontBody={ctx.FONT_B} />
      </PublicCtaLink>
    </div>
  )
}
