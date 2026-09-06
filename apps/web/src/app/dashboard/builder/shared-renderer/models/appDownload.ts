// Modèle pur `app_download`. Liens stores iOS/Android (href durci via extHref). Public masqué si
// aucun lien ; l'éditeur affiche un placeholder textuel (aucune fausse image).
import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

export type AppDownloadViewModel = { visible: boolean; label: string; ios: CtaLink | null; android: CtaLink | null }

function storeLink(url: unknown): CtaLink | null {
  const u = typeof url === "string" ? url : ""
  if (!u) return null
  return { href: extHref(u) || null, external: true, trackTarget: u, visible: true }
}

export function appDownloadViewModel(content: Record<string, any> | null | undefined): AppDownloadViewModel {
  const c = content || {}
  const ios = storeLink(c.ios_url), android = storeLink(c.android_url)
  // « Titre » etait reglable et affiche nulle part.
  const label = typeof c.label === "string" ? c.label.trim() : ""
  return { visible: !!(ios || android), label, ios, android }
}
