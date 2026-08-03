"use client"
import { whatsappButtonViewModel } from "../../models/whatsappButton"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import { IconLabelCta } from "../../views/IconLabelCta"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorWhatsappButton({ content, ctx }: EditorAdapterProps) {
  const { label } = whatsappButtonViewModel(content)
  return (
    <div style={{ padding: "4px 16px 10px", ...ctx.surfaceStyle }}>
      <EditorCtaShell style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(37,211,102,0.1)", border: "1.5px solid rgba(37,211,102,0.3)", borderRadius: 12, padding: "13px 18px" }}>
        <IconLabelCta icon="💬" label={label} color="#25D366" iconSize={16} labelSize={13} />
      </EditorCtaShell>
    </div>
  )
}
