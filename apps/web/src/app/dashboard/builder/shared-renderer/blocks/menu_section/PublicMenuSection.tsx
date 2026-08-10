"use client"
import { useState } from "react"
import { menuSectionViewModel } from "../../models/menuSection"
import { MenuItemList } from "../../primitives/MenuItemList"
import type { PublicAdapterProps } from "../../renderTypes"

// Liste simple (legacy) OU grande carte dépliable (menu_display) : en-tête cliquable qui replie/déplie
// les plats — pratique pour les gros menus. 1 ou 2 colonnes internes. Conteneur toujours rendu en liste.
export function PublicMenuSection({ content, ctx }: PublicAdapterProps) {
  const { category, items, collapsible, columns } = menuSectionViewModel(content)
  const { G, TEXT, MUTED, FONT_D, FONT_B } = ctx
  const [open, setOpen] = useState(true)

  const rows = <MenuItemList items={items} columns={columns} text={TEXT} muted={MUTED} primary={G} fontB={FONT_B} fontD={FONT_D} />

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
