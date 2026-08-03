"use client"
import { emailButtonViewModel } from "../../models/emailButton"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import { IconLabelCta } from "../../views/IconLabelCta"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorEmailButton({ content, ctx }: EditorAdapterProps) {
  const { label } = emailButtonViewModel(content)
  return (
    <div style={{ padding: "4px 16px 10px", ...ctx.surfaceStyle }}>
      <EditorCtaShell style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(56,189,248,0.1)", border: "1.5px solid rgba(56,189,248,0.3)", borderRadius: 12, padding: "13px 18px" }}>
        <IconLabelCta icon="✉️" label={label} color="var(--action)" iconSize={16} labelSize={13} />
      </EditorCtaShell>
    </div>
  )
}
