// InsertBetweenBlocks.tsx — Bouton « + » d'insertion entre deux blocs (mission C04, §13).
// Discret au repos, visible au hover/focus (desktop) ; toujours accessible et ≥ 44 px sur mobile.
// Ouvre la bibliothèque à l'index d'insertion donné (géré par le parent). A11y : bouton nommé.

export interface InsertBetweenBlocksProps {
  /** Index d'insertion (position de gap). */
  index: number
  mobile?: boolean
  onInsert: (index: number) => void
}

export function InsertBetweenBlocks({ index, mobile, onInsert }: InsertBetweenBlocksProps) {
  return (
    <div className="insert-gap" data-insert-gap={index}
      style={{ position: "relative", height: mobile ? 40 : 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button
        type="button"
        data-insert={index}
        onClick={() => onInsert(index)}
        aria-label={`Insérer un bloc à la position ${index + 1}`}
        title="Insérer un bloc ici"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          width: mobile ? 44 : 26, height: mobile ? 44 : 22, borderRadius: 999,
          border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
          background: "color-mix(in srgb, var(--accent) 14%, #0A0A0A)", color: "var(--accent)",
          fontSize: mobile ? 20 : 15, fontWeight: 700, cursor: "pointer", lineHeight: 1,
        }}
      >
        +
      </button>
    </div>
  )
}
