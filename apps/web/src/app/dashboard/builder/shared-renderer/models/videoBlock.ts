// Modèle pur `video`. Embed vidéo STRICTEMENT allowlisté (via SafeEmbedModel → embedVideoUrl :
// YouTube / Vimeo / Dailymotion → URL canonique, "" sinon). Aucune iframe arbitraire possible.
import { videoEmbedModel, type SafeEmbedModel } from "./embed"

export type VideoBlockViewModel = { visible: boolean; embed: SafeEmbedModel; title?: string }

export function videoBlockViewModel(content: Record<string, any> | null | undefined): VideoBlockViewModel {
  const c = content || {}
  const embed = videoEmbedModel(c) // lit c.url + c.title
  return { visible: embed.visible, embed, title: typeof c.title === "string" && c.title ? c.title : undefined }
}
