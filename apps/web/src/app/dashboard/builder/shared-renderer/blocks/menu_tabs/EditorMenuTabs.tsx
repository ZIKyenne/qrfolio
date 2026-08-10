"use client"
import { menuTabsViewModel } from "../../models/menuTabs"
import { BlockEmptyState } from "../../primitives/BlockEmptyState"
import type { EditorAdapterProps } from "../../renderTypes"

// Aperçu canvas : barre d'onglets + produits de la 1re section (le vrai contenu s'édite dans le panneau).
export function EditorMenuTabs({ content, ctx }: EditorAdapterProps) {
  const { title, sections, textScale, rowPad } = menuTabsViewModel(content)
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
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{title}</p>}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 0 9px" }}>
        {sections.map((s, i) => (
          <span key={s.i} style={{ flexShrink: 0, padding: "5px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", background: i === 0 ? primary : "rgba(255,255,255,0.05)", color: i === 0 ? "#080808" : text, border: i === 0 ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.1)" }}>
            {s.title}{s.items.length > 0 ? ` ${s.items.length}` : ""}
          </span>
        ))}
      </div>
      <div>
        {cur.items.slice(0, 6).map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: `${Math.max(4, rowPad - 3)}px 0`, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ flex: 1 }}><p style={{ color: text, fontSize: fs(13), fontWeight: 600, margin: "0 0 1px" }}>{it.name}</p>{it.desc && <p style={{ color: muted, fontSize: fs(10.5), margin: 0 }}>{it.desc}</p>}</div>
            {it.price && <span style={{ color: primary, fontSize: fs(13), fontWeight: 700, flexShrink: 0 }}>{it.price}</span>}
          </div>
        ))}
        {cur.items.length === 0 && <p style={{ color: muted, fontSize: 11, margin: "6px 0" }}>Collez les produits de cette section dans le panneau.</p>}
      </div>
    </div>
  )
}
