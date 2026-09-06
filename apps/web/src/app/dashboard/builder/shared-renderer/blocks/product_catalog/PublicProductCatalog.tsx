"use client"
import { productCatalogViewModel } from "../../models/productCatalog"
import { PublicSharedImage } from "../../primitives/PublicImage"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicProductCatalog({ content, ctx }: PublicAdapterProps) {
  const { visible, title, items, ctaLabel } = productCatalogViewModel(content)
  if (!visible) return null
  const { G, TEXT, MUTED, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {items.map((p, i) => (
          <a key={i} href={p.link.href || "#"} target={p.link.external ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => { try { trackClick(p.link.trackTarget) } catch {} }} style={{ display: "flex", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", textDecoration: "none" }}>
            {p.img.src
              ? <PublicSharedImage model={p.img} width={84} height={84} sizes="84px" style={{ width: 84, height: 84, objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 84, height: 84, background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>🛍️</div>}
            <div style={{ flex: 1, minWidth: 0, padding: "10px 12px 10px 0" }}>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{p.name}</p>
              {p.desc && <p style={{ color: MUTED, fontSize: 13.5, margin: "0 0 5px" }}>{p.desc}</p>}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: G, fontSize: 16, fontWeight: 700 }}>{p.price}</span>
                {ctaLabel && <span style={{ background: G, color: "#080808", borderRadius: 7, padding: "4px 11px", fontSize: 11, fontWeight: 700 }}>{ctaLabel}</span>}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
