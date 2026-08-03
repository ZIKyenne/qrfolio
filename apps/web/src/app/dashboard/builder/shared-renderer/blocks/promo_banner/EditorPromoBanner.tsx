"use client"
import { promoBannerViewModel } from "../../models/promoBanner"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorPromoBanner({ content, ctx }: EditorAdapterProps) {
  const { emoji, text, subtext, ctaLabel } = promoBannerViewModel(content)
  const { text: textColor, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <div style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.15),rgba(249,115,22,0.08))", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
        {emoji && <span style={{ fontSize: 24 }}>{emoji}</span>}
        <p style={{ color: textColor, fontSize: 14, fontWeight: 700, margin: "5px 0 2px" }}>{text}</p>
        {subtext && <p style={{ color: muted, fontSize: 11, margin: "0 0 8px" }}>{subtext}</p>}
        {ctaLabel && <EditorCtaShell style={{ display: "inline-block", background: "#F97316", color: "#fff", padding: "6px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700 }}>{ctaLabel}</EditorCtaShell>}
      </div>
    </div>
  )
}
