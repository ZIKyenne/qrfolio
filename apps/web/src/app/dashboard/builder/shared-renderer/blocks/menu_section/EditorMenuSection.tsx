"use client"
import { menuSectionViewModel } from "../../models/menuSection"
import type { EditorAdapterProps } from "../../renderTypes"

// Legacy : bordure basse sur CHAQUE ligne (pas d'exception dernier item), toujours rendu.
export function EditorMenuSection({ content, ctx }: EditorAdapterProps) {
  const { category, items, collapsible } = menuSectionViewModel(content)
  const { text, muted, primary, surfaceStyle } = ctx
  const rows = (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 7, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 13, fontWeight: 600, margin: "0 0 1px" }}>{it.name}</p>{it.desc && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{it.desc}</p>}</div>
          <span style={{ color: primary, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{it.price}</span>
        </div>
      ))}
    </div>
  )
  if (collapsible) {
    // Aperçu éditeur : carte toujours dépliée (édition), avec l'en-tête « dépliable ».
    return (
      <div style={{ padding: "10px 16px", ...surfaceStyle }}>
        <div style={{ border: `1px solid ${primary}2e`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px", background: `${primary}0f` }}>
            <span style={{ flex: 1, color: primary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{category || "Menu"}</span>
            <span style={{ color: muted, fontSize: 11, fontWeight: 600 }}>{items.length}</span>
            <span aria-hidden style={{ color: primary, fontSize: 12 }}>▾</span>
          </div>
          <div style={{ padding: "4px 12px 10px" }}>{rows}</div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {category && <p style={{ color: primary, fontSize: 12, fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>{category}</p>}
      {rows}
    </div>
  )
}
