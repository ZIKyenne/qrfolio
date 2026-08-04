// Modèle pur `discography`. Répétiteur d'albums/singles (a{i}), couverture via SharedImageModel,
// lien optionnel par album (durci extHref). visible via hasPublishableContent (DETECTORS/B05).
import { hasPublishableContent } from "../../blockEmptyState"
import { extHref } from "../../types"
import { sharedImageModel, type SharedImageModel } from "./sharedImage"
import { extractIndexed } from "./repeaterExtract"
import type { CtaLink } from "./ctaLink"

export type DiscographyItem = { cover: SharedImageModel; title: string; year?: string; type?: string; link: CtaLink }
export type DiscographyViewModel = { visible: boolean; title?: string; items: DiscographyItem[] }

export function discographyViewModel(content: Record<string, any> | null | undefined): DiscographyViewModel {
  const c = content || {}
  const items = extractIndexed<DiscographyItem>(c, 50, (cc, i) => {
    if (!cc[`a${i}_title`]) return null
    const url = typeof cc[`a${i}_url`] === "string" ? cc[`a${i}_url`] : ""
    return {
      cover: sharedImageModel(cc[`a${i}_cover`], { decorative: true }),
      title: cc[`a${i}_title`], year: cc[`a${i}_year`], type: cc[`a${i}_type`],
      link: { href: extHref(url) || null, external: true, trackTarget: url, visible: !!url },
    }
  })
  return { visible: hasPublishableContent("discography", c), title: typeof c.title === "string" && c.title ? c.title : undefined, items }
}
