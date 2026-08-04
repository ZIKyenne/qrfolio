// Modèle pur `video_local`. Source vidéo native sécurisée (safeAvSrc), poster via safeMediaSrc,
// ratio déterministe. Options d'affichage normalisées. Public masqué si pas de source.
import { safeAvSrc, safeMediaSrc } from "./mediaUrl"

const AR: Record<string, string | undefined> = { "16:9": "16/9", "9:16": "9/16", "1:1": "1" }

export type VideoLocalViewModel = {
  visible: boolean; src: string | null; poster: string | null; title?: string
  autoplay: boolean; loop: boolean; muted: boolean; aspectRatio?: string; vertical: boolean
}

export function videoLocalViewModel(content: Record<string, any> | null | undefined): VideoLocalViewModel {
  const c = content || {}
  const src = safeAvSrc(c.src)
  return {
    visible: src != null, src, poster: safeMediaSrc(c.poster), title: c.title || undefined,
    autoplay: c.autoplay === "yes", loop: c.loop === "yes", muted: c.muted !== "no",
    aspectRatio: AR[c.ratio || "16:9"], vertical: c.ratio === "9:16",
  }
}
