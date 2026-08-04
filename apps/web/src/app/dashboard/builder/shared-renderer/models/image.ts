// Modèle pur `image`. src validé (safeMediaSrc), alt = alt||caption||"", ratio déterministe.
// Public : lien optionnel (href durci via extHref). Public rend null si pas de média ;
// l'éditeur affiche un placeholder (aucune fausse image).
import { extHref } from "../../types"
import { safeMediaSrc } from "./mediaUrl"
import type { CtaLink } from "./ctaLink"

const RATIO_MAP: Record<string, string | undefined> = { square: "1", "16:9": "16/9", "9:16": "9/16", "4:3": "4/3" }

export type ImageViewModel = {
  visible: boolean; hasMedia: boolean; src: string | null; alt: string; caption?: string
  isCircle: boolean; rounded: string; aspectRatio?: string; link: CtaLink
}

export function imageViewModel(content: Record<string, any> | null | undefined): ImageViewModel {
  const c = content || {}
  const src = safeMediaSrc(c.src)
  const isCircle = c.rounded === "circle"
  const aspectRatio = isCircle ? "1" : RATIO_MAP[c.ratio || "original"]
  const linkUrl = typeof c.link === "string" ? c.link : ""
  return {
    visible: src != null, hasMedia: src != null,
    src, alt: c.alt || c.caption || "", caption: c.caption || undefined,
    isCircle, rounded: c.rounded || "", aspectRatio,
    link: { href: extHref(linkUrl) || null, external: true, trackTarget: linkUrl, visible: !!linkUrl },
  }
}
