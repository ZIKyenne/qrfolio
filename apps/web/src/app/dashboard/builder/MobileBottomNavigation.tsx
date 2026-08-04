// MobileBottomNavigation.tsx — Barre de navigation principale mobile (mission C05, §6). Max 5 actions,
// icône + libellé, état actif, badge optionnel, safe area basse, variante compacte (paysage).
// A11y : role=tablist, aria-selected, cibles ≥ 44 px.

import { MOBILE_BOTTOM_NAV, type MobileBuilderTab } from "./builderMobile"
import { BUILDER_UI } from "./builderUi"

const MUTED = BUILDER_UI.text.muted

export interface MobileBottomNavigationProps {
  active: MobileBuilderTab | null
  onSelect: (tab: MobileBuilderTab) => void
  compact?: boolean
  /** Badges par onglet (ex. { publish: "error" }). */
  badges?: Partial<Record<MobileBuilderTab, "error" | number>>
}

export function MobileBottomNavigation({ active, onSelect, compact, badges }: MobileBottomNavigationProps) {
  return (
    <nav role="tablist" aria-label="Navigation du Builder" data-testid="mobile-nav"
      style={{ flexShrink: 0, display: "flex", background: "#0C0C0C", borderTop: "1px solid rgba(255,255,255,0.08)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {MOBILE_BOTTOM_NAV.map(item => {
        const on = active === item.id
        const badge = badges?.[item.id]
        return (
          <button key={item.id} type="button" role="tab" aria-selected={on} data-nav={item.id}
            onClick={() => onSelect(item.id)}
            style={{ position: "relative", flex: 1, minHeight: compact ? 46 : 54, display: "flex", flexDirection: compact ? "row" : "column", alignItems: "center", justifyContent: "center", gap: compact ? 6 : 3, padding: "6px 4px", background: on ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent", border: "none", borderTop: `3px solid ${on ? "var(--accent)" : "transparent"}`, color: on ? "var(--accent)" : MUTED, fontSize: compact ? 12 : 11, fontWeight: on ? 800 : 500, cursor: "pointer" }}>
            <span aria-hidden="true" style={{ fontSize: compact ? 15 : 17 }}>{item.icon}</span>
            <span>{item.label}</span>
            {badge === "error" && <span aria-label="erreur" style={{ position: "absolute", top: 6, right: "50%", marginRight: -22, width: 8, height: 8, borderRadius: "50%", background: "var(--danger)" }} />}
            {typeof badge === "number" && badge > 0 && <span style={{ position: "absolute", top: 4, right: "50%", marginRight: -24, background: "var(--accent)", color: "#080808", borderRadius: 8, minWidth: 15, height: 15, padding: "0 4px", fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{badge}</span>}
          </button>
        )
      })}
    </nav>
  )
}
