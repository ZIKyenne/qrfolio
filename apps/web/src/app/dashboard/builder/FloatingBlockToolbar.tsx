// FloatingBlockToolbar.tsx — Toolbar flottante du bloc sélectionné (mission C04, §14-15).
// Positionnée près du bloc via le helper pur `resolveFloatingToolbarPosition`. Réutilise
// `BlockContextToolbar` (C03). Masquée en aperçu, jamais rendue côté public. A11y : toolbar nommée.

import { resolveFloatingToolbarPosition, type Rect } from "./builderCanvas"
import { BlockContextToolbar } from "./BlockContextToolbar"
import type { BlockActionId } from "./builderUx"
import type { Block } from "./types"

export interface FloatingBlockToolbarProps {
  block: Block
  index: number
  total: number
  blockRect: Rect
  canvasRect: Rect
  mobile?: boolean
  handlers: Partial<Record<BlockActionId, () => void>>
  only?: BlockActionId[]
}

const TOOLBAR_H = 34

export function FloatingBlockToolbar({ block, index, total, blockRect, canvasRect, mobile, handlers, only }: FloatingBlockToolbarProps) {
  const pos = resolveFloatingToolbarPosition(blockRect, canvasRect, TOOLBAR_H)
  return (
    <div
      data-testid="floating-toolbar"
      data-placement={pos.placement}
      style={{
        position: "absolute", top: pos.top, left: pos.left, zIndex: 40,
        display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 10,
        background: "rgba(10,10,10,0.94)", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
        boxShadow: "0 6px 22px rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
      }}
    >
      <BlockContextToolbar block={block} index={index} total={total} mobile={mobile} handlers={handlers}
        only={only ?? ["settings", "moveUp", "moveDown", "duplicate", "toggleVisible", "toggleLock", "delete"]} />
    </div>
  )
}
