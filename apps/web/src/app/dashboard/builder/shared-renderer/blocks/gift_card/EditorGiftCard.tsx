"use client"
import { giftCardViewModel } from "../../models/giftCard"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import type { EditorAdapterProps } from "../../renderTypes"

// Legacy sans gate éditeur : carte toujours rendue (titre par défaut affiché).
export function EditorGiftCard({ content, ctx }: EditorAdapterProps) {
  const { title, description, amounts, ctaLabel } = giftCardViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <div style={{ background: `linear-gradient(135deg,#EC489915,#F472B610)`, border: "1.5px solid rgba(236,72,153,0.3)", borderRadius: 14, padding: "16px" }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 32 }}>🎁</span>
          <p style={{ color: text, fontSize: 15, fontWeight: 700, margin: "6px 0 3px" }}>{title || "Offrez une expérience"}</p>
          {description && <p style={{ color: muted, fontSize: 12.5, margin: 0 }}>{description}</p>}
        </div>
        <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 12 }}>
          {amounts.map((amount, i) => (
            <div key={i} style={{ background: i === 1 ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.06)", border: `1.5px solid ${i === 1 ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
              <p style={{ color: i === 1 ? "#EC4899" : text, fontSize: 16, fontWeight: 700, margin: 0 }}>{amount}</p>
            </div>
          ))}
        </div>
        {ctaLabel && <EditorCtaShell style={{ background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 10, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{ctaLabel}</EditorCtaShell>}
      </div>
    </div>
  )
}
