// Contrat d'IMAGE partagé (B09.11) — réduit la divergence `<img>` (éditeur) / `SmartImage`
// (public) au niveau des DONNÉES et du comportement, sans imposer le même composant React.
// Pur (aucun React). Source sécurisée via safeMediaSrc. Distingue informatif / décoratif.
import { safeMediaSrc } from "./mediaUrl"

export type ImageFallback = "hide" | "placeholder" | "icon"
export type SharedImageModel = {
  visible: boolean            // une image sûre est disponible (sinon appliquer `fallback`)
  src: string | null
  alt: string                 // jamais une URL/nom de fichier ; "" si décoratif
  decorative: boolean
  objectFit: "cover" | "contain"
  aspectRatio?: string
  fallback: ImageFallback
}

export function sharedImageModel(rawSrc: unknown, opts?: {
  alt?: string; decorative?: boolean; objectFit?: "cover" | "contain"; aspectRatio?: string; fallback?: ImageFallback
}): SharedImageModel {
  const o = opts || {}
  const src = safeMediaSrc(rawSrc)
  const decorative = o.decorative === true
  const rawAlt = typeof o.alt === "string" ? o.alt.trim() : ""
  return {
    visible: src != null, src,
    alt: decorative ? "" : rawAlt, decorative,
    objectFit: o.objectFit === "contain" ? "contain" : "cover",
    aspectRatio: o.aspectRatio, fallback: o.fallback || "hide",
  }
}
