// MobileContextBar.tsx — Barre contextuelle du bloc sélectionné (mission C05, §14). S'affiche au-dessus
// de la bottom navigation. Actions principales inline + « Plus » (masquer/verrouiller/brouillon/
// supprimer). Réutilise BlockContextToolbar. A11y : boutons nommés, ≥ 44 px.

import { BlockContextToolbar } from "./BlockContextToolbar"
import { MOBILE_PRIMARY_ACTIONS } from "./builderMobile"
import type { BlockActionId } from "./builderUx"
import type { Block } from "./types"

export interface MobileContextBarProps {
  block: Block
  index: number
  total: number
  handlers: Partial<Record<BlockActionId, () => void>>
  onMore: () => void
}

export function MobileContextBar({ block, index, total, handlers, onMore }: MobileContextBarProps) {
  return (
    <div data-testid="mobile-context-bar"
      style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(12,12,12,0.96)", borderTop: "1px solid rgba(201,168,76,0.18)" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>Bloc {index + 1}</span>
      <div style={{ flex: 1, minWidth: 0, overflowX: "auto" }}>
        <BlockContextToolbar block={block} index={index} total={total} mobile handlers={handlers} only={MOBILE_PRIMARY_ACTIONS} />
      </div>
      <button type="button" data-testid="context-more" onClick={onMore} aria-label="Plus d'actions"
        style={{ minWidth: 44, height: 44, borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "var(--ink, #F5F0E8)", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>⋯</button>
    </div>
  )
}
