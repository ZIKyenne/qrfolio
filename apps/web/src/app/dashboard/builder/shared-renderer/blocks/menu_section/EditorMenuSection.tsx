"use client"
import { menuSectionViewModel } from "../../models/menuSection"
import type { EditorAdapterProps } from "../../renderTypes"

// Legacy : bordure basse sur CHAQUE ligne (pas d'exception dernier item), toujours rendu.
export function EditorMenuSection({ content, ctx }: EditorAdapterProps) {
  const { category, items } = menuSectionViewModel(content)
  const { text, muted, primary, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {category && <p style={{ color: primary, fontSize: 12, fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>{category}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 7, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 13, fontWeight: 600, margin: "0 0 1px" }}>{it.name}</p>{it.desc && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{it.desc}</p>}</div>
            <span style={{ color: primary, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{it.price}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
