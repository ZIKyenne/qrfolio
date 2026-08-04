"use client"

// MobileBottomSheet.tsx — Primitive UNIQUE de bottom sheet mobile (mission C05, §8-9). Réutilisée
// par tous les onglets (Ajouter/Structure/Modifier/Publier). role=dialog + aria-modal, drag handle,
// boutons de snap (compact/medium/expanded) accessibles, contenu scrollable, safe area, Escape,
// backdrop, restauration du focus. Variante latérale en paysage. Aucun scroll horizontal.

import { useEffect, useRef, type ReactNode } from "react"
import { SNAP_FRACTION, type MobileSnap } from "./builderMobile"
import { BUILDER_UI } from "./builderUi"

const MUTED = BUILDER_UI.text.muted

export interface MobileBottomSheetProps {
  open: boolean
  title: string
  snap: MobileSnap
  onSnap: (s: MobileSnap) => void
  onClose: () => void
  /** Applique la safe area basse à la sheet (quand la bottom nav est masquée). */
  safeAreaBottom?: boolean
  /** Paysage téléphone : sheet latérale pour garder le canvas visible. */
  side?: boolean
  children: ReactNode
}

const SNAPS: { id: MobileSnap; label: string }[] = [
  { id: "compact", label: "Réduit" }, { id: "medium", label: "Moyen" }, { id: "expanded", label: "Plein" },
]

export function MobileBottomSheet({ open, title, snap, onSnap, onClose, safeAreaBottom, side, children }: MobileBottomSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<Element | null>(null)

  useEffect(() => {
    if (open) {
      restoreRef.current = document.activeElement
      closeRef.current?.focus()
    } else if (restoreRef.current instanceof HTMLElement) {
      restoreRef.current.focus()
    }
  }, [open])

  if (!open) return null

  const panelStyle: React.CSSProperties = side
    ? { position: "absolute", top: 0, right: 0, bottom: 0, width: "min(380px, 80vw)", borderTopLeftRadius: 18, borderBottomLeftRadius: 18, borderLeft: "1px solid rgba(255,255,255,0.1)" }
    : { position: "absolute", left: 0, right: 0, bottom: 0, height: `${Math.round(SNAP_FRACTION[snap] * 100)}%`, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTop: "1px solid rgba(255,255,255,0.1)" }

  return (
    <div data-testid="mobile-sheet-backdrop" onClick={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: side ? "stretch" : "flex-end", justifyContent: side ? "flex-end" : "center" }}>
      <div
        role="dialog" aria-modal="true" aria-label={title} data-testid="mobile-sheet" data-snap={snap}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); onClose() } }}
        style={{
          ...panelStyle, boxSizing: "border-box", width: side ? panelStyle.width : "100%", maxWidth: side ? undefined : 640, margin: side ? undefined : "0 auto",
          display: "flex", flexDirection: "column", background: "#141210", boxShadow: "0 -16px 44px rgba(0,0,0,0.55)",
          paddingBottom: safeAreaBottom ? "env(safe-area-inset-bottom)" : undefined, overflow: "hidden",
        }}>
        {/* Drag handle (décoratif) */}
        {!side && <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.2)", margin: "8px auto 4px" }} />}

        {/* Header : titre + snaps + fermer */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 10px" }}>
          <h2 style={{ flex: 1, margin: 0, fontSize: 15, fontWeight: 800, color: "var(--ink, #F5F0E8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h2>
          {!side && (
            <div role="group" aria-label="Taille du panneau" style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2 }}>
              {SNAPS.map(s => (
                <button key={s.id} type="button" data-snap-btn={s.id} aria-pressed={snap === s.id} aria-label={`Taille : ${s.label}`}
                  onClick={() => onSnap(s.id)}
                  style={{ minHeight: 32, padding: "0 9px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: snap === s.id ? 800 : 600, background: snap === s.id ? "var(--accent)" : "transparent", color: snap === s.id ? "#080808" : MUTED }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <button ref={closeRef} type="button" data-testid="mobile-sheet-close" onClick={onClose} aria-label="Fermer"
            style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, cursor: "pointer", color: MUTED, fontSize: 16, flexShrink: 0 }}>✕</button>
        </div>

        {/* Contenu scrollable (un seul scroll vertical) */}
        <div data-testid="mobile-sheet-body" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          {children}
        </div>
      </div>
    </div>
  )
}
