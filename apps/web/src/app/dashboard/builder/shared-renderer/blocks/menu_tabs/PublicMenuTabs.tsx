"use client"
import { useState } from "react"
import { menuTabsViewModel } from "../../models/menuTabs"
import { MenuItemList } from "../../primitives/MenuItemList"
import type { PublicAdapterProps } from "../../renderTypes"

// Grande carte à onglets : barre d'onglets (sections) + produits de l'onglet actif. Compact pour les
// gros menus. Taille de texte + densité + colonnes pilotées par le modèle.
export function PublicMenuTabs({ content, ctx }: PublicAdapterProps) {
  const { title, sections, textScale, rowPad, columns } = menuTabsViewModel(content)
  const { G, TEXT, MUTED, FONT_D, FONT_B } = ctx
  const [active, setActive] = useState(0)
  if (sections.length === 0) return null
  const cur = sections[Math.min(active, sections.length - 1)]
  const fs = (n: number) => Math.round(n * textScale * 10) / 10

  return (
    <div style={{ padding: "6px 24px 16px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{title}</p>}

      {/* Barre d'onglets — défilable, vue d'ensemble de toutes les sections */}
      <div role="tablist" style={{ display: "flex", gap: 7, overflowX: "auto", padding: "0 0 10px", WebkitOverflowScrolling: "touch", scrollSnapType: "x proximity" }}>
        {sections.map((s, i) => {
          const on = i === Math.min(active, sections.length - 1)
          return (
            <button key={s.i} role="tab" aria-selected={on} onClick={() => setActive(i)}
              style={{ scrollSnapAlign: "start", flexShrink: 0, padding: "7px 13px", borderRadius: 999, cursor: "pointer", fontFamily: FONT_B, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
                background: on ? G : "rgba(255,255,255,0.05)", color: on ? "#080808" : TEXT, border: on ? `1px solid ${G}` : "1px solid rgba(255,255,255,0.1)" }}>
              {s.title}{s.items.length > 0 && <span style={{ opacity: 0.7, marginLeft: 5, fontWeight: 600 }}>{s.items.length}</span>}
            </button>
          )
        })}
      </div>

      {/* Produits de la section active */}
      {cur.items.length === 0
        ? <p style={{ color: MUTED, fontSize: fs(12.5), margin: "8px 0", fontFamily: FONT_B }}>Aucun produit dans cette section.</p>
        : <MenuItemList items={cur.items} columns={columns} rowPad={rowPad} fs={fs} text={TEXT} muted={MUTED} primary={G} fontB={FONT_B} fontD={FONT_D} />}
    </div>
  )
}
