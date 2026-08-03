"use client"
import { brandsViewModel } from "../../models/brands"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorBrands({ content, ctx }: EditorAdapterProps) {
  const { title, items } = brandsViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{title}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {items.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "5px 12px" }}>
            {b.icon && <span style={{ fontSize: 16 }}>{b.icon}</span>}
            <span style={{ color: text, fontSize: 11, fontWeight: 600 }}>{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
