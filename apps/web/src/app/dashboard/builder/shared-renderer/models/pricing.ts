// Modèle de vue PUR du bloc `pricing`. Réutilise pricingCtaModel (B06) et priceDiscount.
// Filtre les offres sur `title` (comme les deux renderers legacy). Aucun React.

import { priceDiscount } from "../../types"
import { pricingCtaModel, type PricingCtaModel } from "../../pricingCta"

export type PricingPlan = { title: string; price: string; desc: string; oldPrice?: string; disc: ReturnType<typeof priceDiscount> }
export type PricingViewModel = { visible: boolean; title?: string; plans: PricingPlan[]; cta: PricingCtaModel }

export function pricingViewModel(content: Record<string, any> | null | undefined): PricingViewModel {
  const c = content || {}
  const raw = [
    [c.title1, c.price1, c.desc1, c.old_price1],
    [c.title2, c.price2, c.desc2, c.old_price2],
    [c.title3, c.price3, c.desc3, c.old_price3],
  ].filter(([t]) => t)
  const plans: PricingPlan[] = raw.map(([title, price, desc, oldPrice]) => ({
    title, price, desc, oldPrice: oldPrice || undefined, disc: priceDiscount(price, oldPrice),
  }))
  return { visible: plans.length > 0, title: typeof c.title === "string" && c.title ? c.title : undefined, plans, cta: pricingCtaModel(c) }
}
