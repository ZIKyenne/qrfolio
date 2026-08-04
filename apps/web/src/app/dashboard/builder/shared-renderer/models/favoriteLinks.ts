// Modèle pur `favorite_links`. items filtrés sur label (link_{i}), limite 50. Chaque item = un
// lien réel (href durci via extHref, cible de tracking = url brute || "link").
import { extHref } from "../../types"
import { extractIndexed } from "./repeaterExtract"
import type { CtaLink } from "./ctaLink"

export type FavoriteLinkItem = { icon?: string; label: string; link: CtaLink }
export type FavoriteLinksViewModel = { visible: boolean; title?: string; items: FavoriteLinkItem[] }

export function favoriteLinksViewModel(content: Record<string, any> | null | undefined): FavoriteLinksViewModel {
  const c = content || {}
  const items = extractIndexed<FavoriteLinkItem>(c, 50, (cc, i) => {
    if (!cc[`link_${i}_label`]) return null
    const url = typeof cc[`link_${i}_url`] === "string" ? cc[`link_${i}_url`] : ""
    return { icon: cc[`link_${i}_icon`], label: cc[`link_${i}_label`], link: { href: extHref(url) || null, external: true, trackTarget: url || "link", visible: true } }
  })
  return { visible: items.length > 0, title: typeof c.title === "string" && c.title ? c.title : undefined, items }
}
