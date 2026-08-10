"use client"
import { menuTabsViewModel } from "../../models/menuTabs"
import { BlockEmptyState } from "../../primitives/BlockEmptyState"
import { MenuItemList } from "../../primitives/MenuItemList"
import type { EditorAdapterProps } from "../../renderTypes"

// Aperçu canvas : barre d'onglets + produits de la 1re section (le vrai contenu s'édite dans le panneau).
export function EditorMenuTabs({ content, ctx }: EditorAdapterProps) {
  const { title, sections, textScale, rowPad, columns, collapsible, totalItems } = menuTabsViewModel(content)
  const { text, muted, primary, surfaceStyle } = ctx
  const fs = (n: number) => Math.round(n * textScale * 10) / 10
  if (sections.length === 0) return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <BlockEmptyState icon="🍽️" label="Ajoutez une section (onglet)" muted={muted} />
    </div>
  )
  const cur = sections[0]
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {collapsible
        ? <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", marginBottom: 10, borderRadius: 12, background: `${primary}12`, border: `1px solid ${primary}30` }}>
            <span style={{ flex: 1, color: text, fontSize: 14, fontWeight: 800 }}>{title || "Menu"}</span>
            <span style={{ color: muted, fontSize: 10.5, fontWeight: 600 }}>{totalItems} produit{totalItems > 1 ? "s" : ""} · replié</span>
            <span aria-hidden style={{ color: primary, fontSize: 12 }}>▾</span>
          </div>
        : title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{title}</p>}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 0 9px" }}>
        {sections.map((s, i) => (
          <span key={s.i} style={{ flexShrink: 0, padding: "5px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", background: i === 0 ? primary : "rgba(255,255,255,0.05)", color: i === 0 ? "#080808" : text, border: i === 0 ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.1)" }}>
            {s.title}{s.items.length > 0 ? ` ${s.items.length}` : ""}
          </span>
        ))}
      </div>
      {cur.items.length === 0
        ? <p style={{ color: muted, fontSize: 11, margin: "6px 0" }}>Collez les produits de cette section dans le panneau.</p>
        : <MenuItemList items={cur.items.slice(0, 8)} columns={columns} rowPad={Math.max(4, rowPad - 3)} fs={fs} text={text} muted={muted} primary={primary} />}
    </div>
  )
}
