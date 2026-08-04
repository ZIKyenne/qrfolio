"use client"

// InsertBetweenBlocks.tsx — Bouton « + » d'insertion entre deux blocs (missions C04/C09).
// Desktop : ligne fine + cercle discret, révélé au hover/focus (sobre au repos). Mobile : cercle plus
// grand toujours accessible (≥ 44 px). Ouvre la bibliothèque à l'index d'insertion (géré par le parent).

import { useState } from "react"
import { BUILDER_UI } from "./builderUi"

export interface InsertBetweenBlocksProps {
  /** Index d'insertion (position de gap). */
  index: number
  mobile?: boolean
  onInsert: (index: number) => void
}

export function InsertBetweenBlocks({ index, mobile, onInsert }: InsertBetweenBlocksProps) {
  const [active, setActive] = useState(false)
  // Desktop : discret au repos, net au survol/focus. Mobile : toujours visible.
  const shown = mobile || active
  return (
    <div className="insert-gap" data-insert-gap={index}
      onMouseEnter={() => setActive(true)} onMouseLeave={() => setActive(false)}
      style={{ position: "relative", height: mobile ? 40 : 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Ligne de repère (desktop), révélée au hover */}
      {!mobile && (
        <span aria-hidden="true" style={{ position: "absolute", left: 8, right: 8, height: 1, background: "color-mix(in srgb, var(--accent) 30%, transparent)", opacity: shown ? 1 : 0, transition: BUILDER_UI.transition }} />
      )}
      <button
        type="button"
        data-insert={index}
        onClick={() => onInsert(index)}
        onFocus={() => setActive(true)} onBlur={() => setActive(false)}
        aria-label={`Insérer un bloc à la position ${index + 1}`}
        title="Insérer un bloc ici"
        style={{
          position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
          width: mobile ? 44 : 22, height: mobile ? 44 : 22, borderRadius: BUILDER_UI.radius.pill,
          border: `1px solid ${shown ? BUILDER_UI.border.accent : BUILDER_UI.border.subtle}`,
          background: shown ? BUILDER_UI.accentBg.chip : BUILDER_UI.surface.chrome,
          color: shown ? BUILDER_UI.text.accent : BUILDER_UI.text.muted,
          fontSize: mobile ? 20 : 14, fontWeight: 700, cursor: "pointer", lineHeight: 1,
          opacity: mobile ? 1 : (shown ? 1 : 0.55), transition: BUILDER_UI.transition,
        }}
      >
        +
      </button>
    </div>
  )
}
