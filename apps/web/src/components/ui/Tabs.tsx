// Primitive Tabs QRowg (design system). Barre d'onglets contrôlée. État actif =
// accent + soulignement 3px (motif de référence QR Studio). ARIA tablist/tab.

import { type ReactNode } from "react"

export interface TabItem { id: string; label: string; icon?: ReactNode }
export interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  fill?: boolean // true = onglets à largeur égale (flex:1)
}

export function Tabs({ items, value, onChange, fill = true }: TabsProps) {
  return (
    <div role="tablist" style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      {items.map((t) => {
        const on = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            style={{
              flex: fill ? 1 : undefined,
              minHeight: 46,
              padding: "0 14px",
              background: on ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
              border: "none",
              borderBottom: on ? "3px solid var(--accent)" : "3px solid transparent",
              color: on ? "var(--accent)" : "#8A8478",
              fontSize: 13,
              fontWeight: on ? 800 : 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "color var(--mo-fast) var(--mo-ease-standard), background var(--mo-fast) var(--mo-ease-standard)",
            }}
          >
            {t.icon}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
