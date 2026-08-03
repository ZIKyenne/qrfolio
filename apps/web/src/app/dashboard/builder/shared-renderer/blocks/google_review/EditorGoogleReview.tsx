"use client"
import { googleReviewViewModel } from "../../models/googleReview"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorGoogleReview({ content, ctx }: EditorAdapterProps) {
  const { stars, label } = googleReviewViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "4px 16px 10px", ...surfaceStyle }}>
      <EditorCtaShell style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(251,191,36,0.08)", border: "1.5px solid rgba(251,191,36,0.25)", borderRadius: 12, padding: "11px 14px" }}>
        <div style={{ display: "flex", gap: 1 }}>{Array.from({ length: stars }).map((_, i) => <span key={i} style={{ color: "#FBBF24", fontSize: 12 }}>★</span>)}</div>
        <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>{label}</p><p style={{ color: muted, fontSize: 9, margin: 0 }}>Google Reviews</p></div>
        <span style={{ fontSize: 18 }}>⭐</span>
      </EditorCtaShell>
    </div>
  )
}
