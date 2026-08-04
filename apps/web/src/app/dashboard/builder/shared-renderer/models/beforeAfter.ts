// Modèle pur `before_after`. Deux images publiques côte à côte (grille statique, aucun slider,
// aucune lib). Images sécurisées via safeMediaSrc. Public masqué si aucune des deux images.
import { safeMediaSrc } from "./mediaUrl"

export type BeforeAfterViewModel = {
  visible: boolean; title?: string; description?: string
  beforeImg: string | null; afterImg: string | null; beforeLabel: string; afterLabel: string
}

export function beforeAfterViewModel(content: Record<string, any> | null | undefined): BeforeAfterViewModel {
  const c = content || {}
  return {
    visible: !!(c.before_img || c.after_img), title: c.title || undefined, description: c.description || undefined,
    beforeImg: safeMediaSrc(c.before_img), afterImg: safeMediaSrc(c.after_img),
    beforeLabel: c.before_label || "Avant", afterLabel: c.after_label || "Après",
  }
}
