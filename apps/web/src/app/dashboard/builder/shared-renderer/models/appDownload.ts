// Modèle pur `app_download`. Liens stores iOS/Android (href durci via extHref). Public masqué si
// aucun lien ; l'éditeur affiche un placeholder textuel (aucune fausse image).
import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

export type AppDownloadViewModel = { visible: boolean; ios: CtaLink | null; android: CtaLink | null }

function storeLink(url: unknown): CtaLink | null {
  const u = typeof url === "string" ? url : ""
  if (!u) return null
  return { href: extHref(u) || null, external: true, trackTarget: u, visible: true }
}

export function appDownloadViewModel(content: Record<string, any> | null | undefined): AppDownloadViewModel {
  const c = content || {}
  const ios = storeLink(c.ios_url), android = storeLink(c.android_url)
  return { visible: !!(ios || android), ios, android }
}
