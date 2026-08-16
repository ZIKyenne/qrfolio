"use client"

// Rail segmenté doré discret (handoffs « Sélecteur de vue » / « Arrondi général ») : rail sombre unifié +
// indicateur à cadre doré translucide qui glisse. Mutualise les rails identiques (aperçu QR/Carte/Affiche,
// arrondi général…). Or fixe assumé (identité de marque des handoffs). a11y : tablist/tab + aria-selected ;
// focus visible + prefers-reduced-motion gérés par les classes globales .qv-tab / .qv-ind.
import type { ReactNode } from "react"

export function SegTabs({ items, value, onChange, ariaLabel, width, fontSize = 13, dense = false }: {
  items: { key: string; label: string; icon?: ReactNode }[]
  value: number
  onChange: (index: number, key: string) => void
  ariaLabel?: string
  width?: string | number
  fontSize?: number
  dense?: boolean   // rail plus compact (moins de padding vertical) — ex. barre d'aperçu desktop
}) {
  const n = Math.max(1, items.length)
  return (
    <div role="tablist" aria-label={ariaLabel} style={{ position: "relative", display: "grid", gridAutoFlow: "column", gridAutoColumns: "1fr", width, flexShrink: 0, padding: 4, borderRadius: 12, background: "#100e0c", border: "1px solid #221f1b", boxShadow: "0 1px 0 rgba(255,255,255,.03) inset, 0 -1px 0 rgba(0,0,0,.5) inset", isolation: "isolate" }}>
      <div aria-hidden="true" className="qv-ind" style={{ position: "absolute", top: 4, bottom: 4, left: 4, width: `calc((100% - 8px) / ${n})`, transform: `translateX(calc(${value} * 100%))`, transition: "transform .38s cubic-bezier(.2,.85,.2,1)", borderRadius: 9, background: "rgba(232,200,119,.07)", border: "1px solid rgba(232,200,119,.34)", boxShadow: "0 0 0 1px rgba(0,0,0,.25)", pointerEvents: "none" }} />
      {items.map((it, i) => {
        const on = i === value
        return (
          <button key={it.key} role="tab" aria-selected={on} type="button" onClick={() => onChange(i, it.key)} className="qv-tab"
            style={{ position: "relative", zIndex: 1, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: dense ? "6px 10px" : "9px 10px", borderRadius: 9, fontSize, fontWeight: on ? 600 : 500, color: on ? "#e8c877" : "#7d766c", transition: "color .2s ease, font-weight .18s ease", whiteSpace: "nowrap" }}>
            {it.icon && <span style={{ display: "inline-flex", transition: "transform .26s cubic-bezier(.2,.8,.2,1)", transform: on ? "scale(1.08)" : "none" }}>{it.icon}</span>}{it.label}
          </button>
        )
      })}
    </div>
  )
}
