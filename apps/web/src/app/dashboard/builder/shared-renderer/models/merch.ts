// Modèle pur `merch`. 3 produits (img{n}/name{n}/price{n}) filtrés sur name, image optionnelle
// (safeMediaSrc), prix brut. CTA optionnel (target si http(s)). visible via hasPublishableContent.
import { hasPublishableContent } from "../../blockEmptyState"
import { extHref } from "../../types"
import { safeMediaSrc } from "./mediaUrl"
import type { CtaLink } from "./ctaLink"

export type MerchProduct = { img: string | null; name: string; price?: string }
export type MerchViewModel = { visible: boolean; title?: string; description?: string; items: MerchProduct[]; ctaLabel?: string; link: CtaLink }

export function merchViewModel(content: Record<string, any> | null | undefined): MerchViewModel {
  const c = content || {}
  const raw: [any, any, any][] = [[c.img1, c.name1, c.price1], [c.img2, c.name2, c.price2], [c.img3, c.name3, c.price3]]
  const items = raw.filter(([, n]) => n).map(([img, name, price]) => ({ img: safeMediaSrc(img), name: name as string, price: price as string | undefined }))
  const url = typeof c.cta_url === "string" ? c.cta_url : ""
  return {
    visible: hasPublishableContent("merch", c), title: typeof c.title === "string" && c.title ? c.title : undefined,
    description: c.description || undefined, items, ctaLabel: c.cta_label || undefined,
    link: { href: extHref(url) || null, external: /^https?:/.test(url), trackTarget: url || "merch", visible: !!c.cta_label },
  }
}
