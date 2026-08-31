import type { PlanId } from "./plans"

// Source unique du mapping price Stripe -> plan (mensuel + annuel), depuis les
// variables d'env NEXT_PUBLIC_STRIPE_*_PRICE_ID. Etait duplique dans le webhook.
export const PLAN_FROM_PRICE: Record<string, PlanId> = (() => {
  const m: Record<string, PlanId> = {}
  const add = (id: string | undefined, plan: PlanId) => { if (id) m[id] = plan }
  // Le palier « Starter » (4,90 €) n'existe plus. Ses anciens identifiants de prix
  // ne sont volontairement PAS remappés : un webhook portant un ancien prix ne doit
  // pas ouvrir un plan à 19 € par accident. Aucun abonnement n'existait sur ce
  // palier, il n'y a donc personne à migrer.
  add(process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID, "pro")
  add(process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID, "business")
  add(process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID, "pro")
  add(process.env.NEXT_PUBLIC_STRIPE_BUSINESS_ANNUAL_PRICE_ID, "business")
  return m
})()

// Plan correspondant a un price Stripe, ou null si le price est inconnu
// (env manquante). Renvoyer null permet aux appelants de NE PAS retrograder a
// tort un abonne actif dont le price n'est pas dans la config.
export function planFromPriceId(priceId?: string | null): PlanId | null {
  if (!priceId) return null
  return PLAN_FROM_PRICE[priceId] ?? null
}
