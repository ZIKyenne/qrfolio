"use client"
import { portfolioWorkViewModel } from "../../models/portfolioWork"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorPortfolioWork({ content, ctx }: EditorAdapterProps) {
  const { title, items, ctaLabel } = portfolioWorkViewModel(content)
  const { text, muted, primary, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{title}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {items.map((w, i) => (
          <div key={i} style={{ borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {w.img
              ? <img src={w.img} alt="" style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }} />
              : <div style={{ height: 80, background: primary + "08", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📂</div>}
            <div style={{ padding: "8px" }}>
              <p style={{ color: text, fontSize: 11, fontWeight: 700, margin: "0 0 2px" }}>{w.title}</p>
              {w.desc && <p style={{ color: muted, fontSize: 9, margin: 0 }}>{w.desc}</p>}
            </div>
          </div>
        ))}
      </div>
      {ctaLabel && <EditorCtaShell style={{ marginTop: 10, background: primary + "10", border: `1px solid ${primary}25`, borderRadius: 9, padding: "10px", textAlign: "center", fontSize: 12, fontWeight: 700, color: primary }}>{ctaLabel}</EditorCtaShell>}
    </div>
  )
}
