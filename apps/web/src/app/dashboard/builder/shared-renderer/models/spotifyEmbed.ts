// Modèle pur `spotify_embed`. URL d'embed via `spotifyEmbedUrl` (transformation STRICTE et pure :
// allowlist open.spotify.com / URI spotify:, aucun repli sur URL arbitraire → "" si non reconnu).
// Aucune iframe arbitraire possible. Public masqué si pas de source valide.
import { spotifyEmbedUrl } from "../../types"

export type SpotifyEmbedViewModel = { visible: boolean; src: string | null; height: number }

export function spotifyEmbedViewModel(content: Record<string, any> | null | undefined): SpotifyEmbedViewModel {
  const c = content || {}
  const src = spotifyEmbedUrl(c.url) || null
  const height = c.size === "lg" ? 352 : c.size === "sm" ? 80 : 152
  return { visible: src != null, src, height }
}
