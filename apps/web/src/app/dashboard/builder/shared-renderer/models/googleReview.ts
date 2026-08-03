// Modèle pur du bloc `google_review`. Étoiles = parseInt(stars||5). href via extHref. Aucun React.
import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

export type GoogleReviewViewModel = { stars: number; label: string; link: CtaLink }
export function googleReviewViewModel(content: Record<string, any> | null | undefined): GoogleReviewViewModel {
  const c = content || {}
  const parsed = parseInt(c.stars || "5", 10)
  const stars = Number.isFinite(parsed) && parsed > 0 ? parsed : 5
  const url = typeof c.url === "string" ? c.url.trim() : ""
  const href = url ? extHref(url) : null
  return { stars, label: c.label || "Donner un avis", link: { href, external: true, trackTarget: url, visible: href != null } }
}
