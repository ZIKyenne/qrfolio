// Modèle pur `product_catalog`. Répétiteur produits (p{i}), image via SharedImageModel, prix brut,
// lien produit par item (durci extHref). Badge cta_label partagé. Limite 50, filtre sur name.
import { extHref } from "../../types"
import { sharedImageModel, type SharedImageModel } from "./sharedImage"
import { extractIndexed } from "./repeaterExtract"
import type { CtaLink } from "./ctaLink"

export type ProductCatalogItem = { img: SharedImageModel; name: string; price?: string; desc?: string; link: CtaLink }
export type ProductCatalogViewModel = { visible: boolean; title?: string; ctaLabel?: string; items: ProductCatalogItem[] }

export function productCatalogViewModel(content: Record<string, any> | null | undefined): ProductCatalogViewModel {
  const c = content || {}
  const items = extractIndexed<ProductCatalogItem>(c, 50, (cc, i) => {
    if (!cc[`p${i}_name`]) return null
    const url = typeof cc[`p${i}_url`] === "string" ? cc[`p${i}_url`] : ""
    return {
      img: sharedImageModel(cc[`p${i}_img`], { decorative: true }),
      name: cc[`p${i}_name`], price: cc[`p${i}_price`], desc: cc[`p${i}_desc`],
      link: { href: extHref(url) || null, external: /^https?:/.test(url), trackTarget: url || "product", visible: true },
    }
  })
  return {
    visible: items.length > 0, title: typeof c.title === "string" && c.title ? c.title : undefined,
    ctaLabel: c.cta_label || undefined, items,
  }
}
