"use client"
import { useState } from "react"
import { menuSectionViewModel } from "../../models/menuSection"
import type { PublicAdapterProps } from "../../renderTypes"

// Liste simple (legacy) OU grande carte dépliable (menu_display) : en-tête cliquable qui replie/déplie
// les plats — pratique pour les gros menus. Conteneur toujours rendu (même vide) en mode liste.
export function PublicMenuSection({ content, ctx }: PublicAdapterProps) {
  const { category, items, collapsible } = menuSectionViewModel(content)
  const { G, TEXT, MUTED, FONT_D, FONT_B } = ctx
  const [open, setOpen] = useState(true)

  const rows = (
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
  )

  if (collapsible) {
    return (
      <div style={{ padding: "6px 24px 16px" }}>
        <div style={{ border: `1px solid ${G}2e`, borderRadius: 16, background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "15px 16px", background: `${G}0f`, border: "none", cursor: "pointer", textAlign: "left" }}>
            <span style={{ flex: 1, color: G, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: FONT_B }}>{category || "Menu"}</span>
            <span style={{ color: MUTED, fontSize: 12, fontWeight: 600, fontFamily: FONT_B }}>{items.length}</span>
            <span aria-hidden style={{ color: G, fontSize: 13, transform: open ? "rotate(180deg)" : "none", transition: "transform .25s" }}>▾</span>
          </button>
          {open && <div style={{ padding: "4px 16px 12px" }}>{rows}</div>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: "6px 24px 16px" }}>
      {category && <p style={{ color: G, fontSize: 12, fontWeight: 700, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: FONT_B }}>{category}</p>}
      {rows}
    </div>
  )
}
