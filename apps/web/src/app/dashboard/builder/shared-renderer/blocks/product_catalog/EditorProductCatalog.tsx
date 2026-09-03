"use client"
import { productCatalogViewModel } from "../../models/productCatalog"
import { EditorSharedImage } from "../../primitives/EditorImage"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorProductCatalog({ content, ctx }: EditorAdapterProps) {
  const { title, items, ctaLabel } = productCatalogViewModel(content)
  const { text, muted, primary, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.length === 0
          ? <div style={{ textAlign: "center", padding: "20px", color: muted, fontSize: 11 }}>Ajoutez vos produits</div>
          : items.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
              {p.img.src
                ? <EditorSharedImage model={p.img} style={{ width: 70, height: 70, objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 70, height: 70, background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🛍️</div>}
              <div style={{ flex: 1, padding: "8px 10px 8px 0" }}>
                <p style={{ color: text, fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{p.name}</p>
                {p.desc && <p style={{ color: muted, fontSize: 12.5, margin: "0 0 4px" }}>{p.desc}</p>}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: primary, fontSize: 14, fontWeight: 700 }}>{p.price}</span>
                  {ctaLabel && <span style={{ background: primary, color: "#080808", borderRadius: 6, padding: "3px 9px", fontSize: 10, fontWeight: 700 }}>{ctaLabel}</span>}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
