"use client"
import { menuSectionViewModel } from "../../models/menuSection"
import type { PublicAdapterProps } from "../../renderTypes"

// Legacy : bordure basse sauf dernier item ; conteneur TOUJOURS rendu (même vide).
export function PublicMenuSection({ content, ctx }: PublicAdapterProps) {
  const { category, items } = menuSectionViewModel(content)
  const { G, TEXT, MUTED, FONT_D, FONT_B } = ctx
  return (
    <div style={{ padding: "6px 24px 16px" }}>
      {category && <p style={{ color: G, fontSize: 12, fontWeight: 700, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: FONT_B }}>{category}</p>}
      <div>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "11px 0", borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: "0 0 2px", fontFamily: FONT_B }}>{it.name}</p>
              {it.desc && <p style={{ color: MUTED, fontSize: 12, margin: 0, fontFamily: FONT_B }}>{it.desc}</p>}
            </div>
            <span style={{ color: G, fontSize: 14, fontWeight: 700, flexShrink: 0, fontFamily: FONT_D }}>{it.price}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
