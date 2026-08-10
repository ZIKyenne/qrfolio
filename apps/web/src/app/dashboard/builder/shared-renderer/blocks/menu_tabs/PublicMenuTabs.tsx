"use client"
import { useState } from "react"
import { menuTabsViewModel } from "../../models/menuTabs"
import { MenuItemList } from "../../primitives/MenuItemList"
import type { PublicAdapterProps } from "../../renderTypes"

// Grande carte à onglets : barre d'onglets (sections) + produits de l'onglet actif. Compact pour les
// gros menus. Taille de texte + densité + colonnes pilotées par le modèle. Mode « repliable » : le
// titre devient un en-tête cliquable, fermé par défaut → empiler plusieurs cartes (Boissons, Nourriture…).
export function PublicMenuTabs({ content, ctx }: PublicAdapterProps) {
  const { title, sections, textScale, rowPad, columns, collapsible, totalItems } = menuTabsViewModel(content)
  const { G, TEXT, MUTED, FONT_D, FONT_B } = ctx
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(!collapsible) // fermé par défaut si repliable
  if (sections.length === 0) return null
  const cur = sections[Math.min(active, sections.length - 1)]
  const fs = (n: number) => Math.round(n * textScale * 10) / 10

  // Contenu (onglets + produits de la section active) — commun aux 2 modes.
  const body = (
    <>
      <div role="tablist" style={{ display: "flex", gap: 7, overflowX: "auto", padding: "0 0 12px", WebkitOverflowScrolling: "touch", scrollSnapType: "x proximity" }}>
        {sections.map((s, i) => {
          const on = i === Math.min(active, sections.length - 1)
          return (
            <button key={s.i} role="tab" aria-selected={on} onClick={() => setActive(i)}
              style={{ scrollSnapAlign: "start", flexShrink: 0, padding: "7px 14px", borderRadius: 999, cursor: "pointer", fontFamily: FONT_B, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", transition: "background .15s, color .15s",
                background: on ? G : "rgba(255,255,255,0.05)", color: on ? "#080808" : TEXT, border: on ? `1px solid ${G}` : "1px solid rgba(255,255,255,0.1)" }}>
              {s.title}{s.items.length > 0 && <span style={{ opacity: 0.6, marginLeft: 6, fontWeight: 600 }}>{s.items.length}</span>}
            </button>
          )
        })}
      </div>
      {cur.items.length === 0
        ? <p style={{ color: MUTED, fontSize: fs(12.5), margin: "8px 0", fontFamily: FONT_B }}>Aucun produit dans cette section.</p>
        : <MenuItemList items={cur.items} columns={columns} rowPad={rowPad} fs={fs} text={TEXT} muted={MUTED} primary={G} fontB={FONT_B} fontD={FONT_D} />}
    </>
  )

  // Mode REPLIABLE : carte avec en-tête cliquable (titre + total), fermée par défaut.
  if (collapsible) {
    return (
      <div style={{ padding: "6px 20px 14px" }}>
        <div style={{ border: `1px solid ${open ? G + "45" : G + "24"}`, borderRadius: 18, background: "rgba(255,255,255,0.02)", overflow: "hidden", transition: "border-color .2s" }}>
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", background: open ? `${G}12` : "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background .2s" }}>
            <span style={{ flex: 1, minWidth: 0, color: TEXT, fontSize: 16, fontWeight: 800, fontFamily: FONT_D, letterSpacing: 0.2, overflowWrap: "anywhere" }}>{title || "Menu"}</span>
            <span style={{ color: MUTED, fontSize: 11.5, fontWeight: 600, fontFamily: FONT_B, whiteSpace: "nowrap" }}>{totalItems} produit{totalItems > 1 ? "s" : ""}</span>
            <span aria-hidden style={{ width: 22, height: 22, borderRadius: "50%", background: `${G}1f`, color: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .25s" }}>▾</span>
          </button>
          {open && <div style={{ padding: "14px 16px 16px", borderTop: `1px solid ${G}1a` }}>{body}</div>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: "6px 24px 16px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{title}</p>}
      {body}
    </div>
  )
}
