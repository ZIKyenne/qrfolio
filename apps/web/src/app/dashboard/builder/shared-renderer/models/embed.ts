// Contrat d'iframe SÛRE (B09.11) — préparé pour la future migration de `video` /
// `google_maps_embed`. Modèle pur (aucun composant React). La `src` provient EXCLUSIVEMENT des
// helpers d'allowlist (embedVideoUrl / mapEmbedUrl) qui ne renvoient qu'une URL canonique de
// provider connu ou "" → aucune URL arbitraire ne peut atteindre un iframe.src.
import { embedVideoUrl, mapEmbedUrl } from "../../types"

export type EmbedProvider = "youtube" | "vimeo" | "dailymotion" | "google-maps"
export type SafeEmbedModel = {
  visible: boolean
  src: string | null
  title: string
  provider: EmbedProvider | null
  allow: string
  allowFullScreen: boolean
  loading: "lazy"
  referrerPolicy: string
}

// Double garde : la src finale DOIT correspondre à un domaine canonique connu, sinon rejetée.
function providerOf(src: string): EmbedProvider | null {
  if (/^https:\/\/www\.youtube-nocookie\.com\/embed\//i.test(src)) return "youtube"
  if (/^https:\/\/player\.vimeo\.com\/video\//i.test(src)) return "vimeo"
  if (/^https:\/\/www\.dailymotion\.com\/embed\/video\//i.test(src)) return "dailymotion"
  if (/^https:\/\/(?:www\.|maps\.)?google\.[a-z.]{2,7}\/maps/i.test(src)) return "google-maps"
  return null
}

const VIDEO_ALLOW = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"

export function videoEmbedModel(content: Record<string, any> | null | undefined): SafeEmbedModel {
  const c = content || {}
  const raw = embedVideoUrl(typeof c.url === "string" ? c.url : "") || ""
  const provider = raw ? providerOf(raw) : null
  const ok = provider != null && provider !== "google-maps"
  return {
    visible: ok, src: ok ? raw : null, title: c.title || "Vidéo", provider: ok ? provider : null,
    allow: VIDEO_ALLOW, allowFullScreen: true, loading: "lazy", referrerPolicy: "strict-origin-when-cross-origin",
  }
}

export function mapEmbedModel(content: Record<string, any> | null | undefined): SafeEmbedModel {
  const c = content || {}
  const addr = typeof c.address === "string" ? c.address : ""
  const emb = typeof c.embed_url === "string" ? c.embed_url : ""
  const raw = mapEmbedUrl(addr, emb, c.zoom) || ""
  const ok = !!raw && providerOf(raw) === "google-maps"
  return {
    visible: ok, src: ok ? raw : null, title: c.label || c.title || "Carte", provider: ok ? "google-maps" : null,
    allow: "", allowFullScreen: false, loading: "lazy", referrerPolicy: "no-referrer-when-downgrade",
  }
}
