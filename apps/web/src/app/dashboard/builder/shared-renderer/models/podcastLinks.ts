// Modèle pur `podcast_links`. Carte podcast (couverture via SharedImageModel) + liens plateformes
// (durcis extHref). Public visible si (une plateforme || podcast_name). Aucun lecteur audio.
import { extHref } from "../../types"
import { sharedImageModel, type SharedImageModel } from "./sharedImage"

export type PodcastPlatform = { key: string; icon: string; color: string; label: string; href: string; trackTarget: string }
export type PodcastLinksViewModel = {
  visible: boolean; cover: SharedImageModel; name: string; description?: string; platforms: PodcastPlatform[]
}

const PLATS: [string, string, string, string][] = [
  ["spotify_url", "🟢", "#1DB954", "Spotify Podcasts"], ["apple_url", "🍎", "#B150E2", "Apple Podcasts"],
  ["pocket_url", "📻", "#F43E37", "Pocket Casts"], ["rss_url", "📡", "#F97316", "RSS Feed"],
]

export function podcastLinksViewModel(content: Record<string, any> | null | undefined): PodcastLinksViewModel {
  const c = content || {}
  const platforms = PLATS.filter(([k]) => c[k]).map(([k, icon, color, label]) => {
    const url = typeof c[k] === "string" ? c[k] : ""
    return { key: k, icon, color, label, href: extHref(url) || "#", trackTarget: url }
  })
  return {
    visible: platforms.length > 0 || !!c.podcast_name,
    cover: sharedImageModel(c.cover_url, { decorative: true }),
    name: c.podcast_name || "Mon Podcast", description: c.description || undefined, platforms,
  }
}
