// Modèle de vue PUR du bloc `values`. Réutilise hasPublishableContent (B05) pour la
// visibilité. Filtre les items sur `label` (comme les deux renderers legacy). Aucun React.

import { hasPublishableContent } from "../../blockEmptyState"

export type ValueItem = { i: number; icon?: string; label: string; desc?: string }
export type ValuesViewModel = { visible: boolean; title?: string; items: ValueItem[] }

export function valuesViewModel(content: Record<string, any> | null | undefined): ValuesViewModel {
  const c = content || {}
  // Même balayage/filtre que le legacy (éditeur + public) : jusqu'à 50, gardés si `label`.
  const items = Array.from({ length: 50 }, (_, k) => k + 1)
    .map(i => ({ i, icon: c[`v${i}_icon`], label: c[`v${i}_label`], desc: c[`v${i}_desc`] }))
    .filter(v => v.label)
  return {
    visible: hasPublishableContent("values", c),
    title: typeof c.title === "string" && c.title ? c.title : undefined,
    items,
  }
}
