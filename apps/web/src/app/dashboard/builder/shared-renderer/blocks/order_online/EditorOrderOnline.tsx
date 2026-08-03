"use client"
import { orderOnlineViewModel } from "../../models/orderOnline"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import { IconLabelCta } from "../../views/IconLabelCta"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorOrderOnline({ content, ctx }: EditorAdapterProps) {
  const { label } = orderOnlineViewModel(content)
  return (
    <div style={{ padding: "4px 16px 10px", ...ctx.surfaceStyle }}>
      <EditorCtaShell style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(249,115,22,0.1)", border: "1.5px solid rgba(249,115,22,0.25)", borderRadius: 12, padding: "13px 18px" }}>
        <IconLabelCta icon="🛒" label={label} color="#F97316" iconSize={16} labelSize={13} labelTag="p" />
      </EditorCtaShell>
    </div>
  )
}
