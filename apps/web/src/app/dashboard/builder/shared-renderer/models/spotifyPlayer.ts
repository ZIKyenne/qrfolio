// Modèle pur `spotify_player`. Carte média + ouverture externe (lien « Play » durci via extHref,
// tracké). Aucun lecteur intégré, aucune iframe. Carte toujours rendue (fidèle legacy).
import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

export type SpotifyPlayerViewModel = { title: string; link: CtaLink }

export function spotifyPlayerViewModel(content: Record<string, any> | null | undefined): SpotifyPlayerViewModel {
  const c = content || {}
  const url = typeof c.url === "string" ? c.url : ""
  return {
    title: c.title || "Ma musique",
    link: { href: extHref(url) || null, external: true, trackTarget: url || "spotify_player", visible: !!url },
  }
}
