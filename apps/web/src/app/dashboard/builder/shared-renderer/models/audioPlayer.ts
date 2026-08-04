// Modèle pur `audio_player`. Source audio native sécurisée (safeAvSrc), couverture via
// safeMediaSrc. Public masqué si pas de source ; l'éditeur rend une carte représentative.
import { safeAvSrc, safeMediaSrc } from "./mediaUrl"

export type AudioPlayerViewModel = {
  visible: boolean; src: string | null; cover: string | null; title: string; artist?: string; showDownload: boolean
}

export function audioPlayerViewModel(content: Record<string, any> | null | undefined): AudioPlayerViewModel {
  const c = content || {}
  const src = safeAvSrc(c.src)
  return {
    visible: src != null, src, cover: safeMediaSrc(c.cover),
    title: c.title || "Écouter", artist: c.artist || undefined, showDownload: c.show_download === "yes",
  }
}
