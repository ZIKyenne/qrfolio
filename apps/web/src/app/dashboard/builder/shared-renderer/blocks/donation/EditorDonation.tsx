"use client"
import { donationViewModel } from "../../models/donation"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import { IconLabelCta } from "../../views/IconLabelCta"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorDonation({ content, ctx }: EditorAdapterProps) {
  const { label, color } = donationViewModel(content)
  return (
    <div style={{ padding: "4px 16px 10px", ...ctx.surfaceStyle }}>
      <EditorCtaShell style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: color + "12", border: `1.5px solid ${color}30`, borderRadius: 12, padding: "13px 18px" }}>
        <IconLabelCta icon="☕" label={label} color={color} iconSize={18} labelSize={13} labelTag="p" />
      </EditorCtaShell>
    </div>
  )
}
