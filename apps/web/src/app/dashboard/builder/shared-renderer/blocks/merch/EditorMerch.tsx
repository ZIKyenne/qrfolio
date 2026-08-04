"use client"
import { merchViewModel } from "../../models/merch"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorMerch({ content, ctx }: EditorAdapterProps) {
  const { visible, title, description, items, ctaLabel } = merchViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{title}</p>}
      {description && <p style={{ color: muted, fontSize: 11, margin: "0 0 12px" }}>{description}</p>}
      {!visible ? <BlockEmptyState icon="🛍️" label="Ajoutez un produit" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={muted} /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
          {items.map((p, i) => (
            <div key={i} style={{ background: "rgba(145,70,255,0.06)", border: "1px solid rgba(145,70,255,0.15)", borderRadius: 10, overflow: "hidden" }}>
              {p.img
                ? <img src={p.img} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                : <div style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👕</div>}
              <div style={{ padding: "6px 8px" }}>
                <p style={{ color: text, fontSize: 10, fontWeight: 700, margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                <p style={{ color: "#9146FF", fontSize: 11, fontWeight: 700, margin: 0 }}>{p.price}</p>
              </div>
            </div>
          ))}
        </div>)}
      {ctaLabel && <EditorCtaShell style={{ background: "linear-gradient(90deg,#9146FF,#7B3FCC)", borderRadius: 9, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{ctaLabel}</EditorCtaShell>}
    </div>
  )
}
