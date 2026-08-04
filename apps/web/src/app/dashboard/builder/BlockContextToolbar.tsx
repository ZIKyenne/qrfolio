// BlockContextToolbar.tsx — Barre d'actions contextuelle d'un bloc (mission C03, §16-18).
// Présentational, pilotée par le modèle pur `blockContextActions` (builderUx). A11y : boutons nommés,
// jamais imbriqués, Supprimer clairement destructeur (confirmation gérée par l'appelant). Utilisée
// dans l'en-tête du panneau (actions rapides) et réutilisable en bottom-sheet mobile.

import { blockContextActions, type BlockActionId } from "./builderUx"
import type { Block } from "./types"

const MUTED = "#8A8478"

const ICON: Record<BlockActionId, string> = {
  moveUp: "↑", moveDown: "↓", duplicate: "⧉", toggleVisible: "👁", toggleLock: "🔒",
  toggleDraft: "✏", reset: "↺", copyStyle: "🎨", settings: "⚙", delete: "🗑",
}

export interface BlockContextToolbarProps {
  block: Block
  index: number
  total: number
  mobile?: boolean
  /** Un handler par action. Absent = action non proposée. */
  handlers: Partial<Record<BlockActionId, () => void>>
  /** Sous-ensemble d'actions à afficher (défaut : toutes celles ayant un handler). */
  only?: BlockActionId[]
}

export function BlockContextToolbar({ block, index, total, mobile, handlers, only }: BlockContextToolbarProps) {
  const actions = blockContextActions(block, { index, total, mobile })
    .filter(a => handlers[a.id] && (!only || only.includes(a.id)))
  const tap = mobile ? 44 : 30

  return (
    <div role="toolbar" aria-label="Actions du bloc" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {actions.map(a => (
        <button
          key={a.id}
          type="button"
          data-action={a.id}
          disabled={a.disabled}
          onClick={() => handlers[a.id]?.()}
          aria-label={a.label}
          title={a.label}
          style={{
            minWidth: tap, height: tap, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
            padding: mobile ? "0 12px" : "0 9px", borderRadius: 8,
            background: a.danger ? "color-mix(in srgb, var(--danger) 10%, transparent)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${a.danger ? "color-mix(in srgb, var(--danger) 34%, transparent)" : "rgba(255,255,255,0.08)"}`,
            color: a.disabled ? "rgba(255,255,255,0.25)" : (a.danger ? "var(--danger)" : "var(--ink, #F5F0E8)"),
            fontSize: mobile ? 13 : 12, fontWeight: 600, cursor: a.disabled ? "not-allowed" : "pointer",
          }}
        >
          <span aria-hidden="true">{ICON[a.id]}</span>
          {mobile && <span>{a.label}</span>}
        </button>
      ))}
    </div>
  )
}
