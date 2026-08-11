import type { DynPlanId } from "./dynamicPlans"

// Mapping price Stripe -> palier « QR Dynamique » (mensuel + annuel), depuis les
// variables d'env NEXT_PUBLIC_STRIPE_DYN_*_PRICE_ID. Symétrique de lib/stripePlan.ts
// (qui gère les plans QRowg). 6 prix à créer dans Stripe : 3 paliers × mensuel/annuel.
export const DYN_PLAN_FROM_PRICE: Record<string, DynPlanId> = (() => {
  const m: Record<string, DynPlanId> = {}
  const add = (id: string | undefined, plan: DynPlanId) => { if (id) m[id] = plan }
  add(process.env.NEXT_PUBLIC_STRIPE_DYN_BASIQUE_PRICE_ID, "basique")
  add(process.env.NEXT_PUBLIC_STRIPE_DYN_PRO_PRICE_ID, "pro")
  add(process.env.NEXT_PUBLIC_STRIPE_DYN_BUSINESS_PRICE_ID, "business")
  add(process.env.NEXT_PUBLIC_STRIPE_DYN_BASIQUE_ANNUAL_PRICE_ID, "basique")
  add(process.env.NEXT_PUBLIC_STRIPE_DYN_PRO_ANNUAL_PRICE_ID, "pro")
  add(process.env.NEXT_PUBLIC_STRIPE_DYN_BUSINESS_ANNUAL_PRICE_ID, "business")
  return m
})()

// Palier « QR Dynamique » d'un price Stripe, ou null si le price est inconnu
// (env manquante) — permet de NE PAS rétrograder à tort un abonné dont le price
// n'est pas dans la config (une vraie annulation passe par subscription.deleted).
export function dynPlanFromPriceId(priceId?: string | null): DynPlanId | null {
  if (!priceId) return null
  return DYN_PLAN_FROM_PRICE[priceId] ?? null
}

// Prix Stripe (mensuel/annuel) d'un palier « QR Dynamique », pour créer la session
// Checkout. Renvoie "" si non configuré (env manquante) -> l'appelant refuse.
export function dynPriceId(plan: string, annual: boolean): string {
  const mo: Record<string, string> = {
    basique: process.env.NEXT_PUBLIC_STRIPE_DYN_BASIQUE_PRICE_ID || "",
    pro: process.env.NEXT_PUBLIC_STRIPE_DYN_PRO_PRICE_ID || "",
    business: process.env.NEXT_PUBLIC_STRIPE_DYN_BUSINESS_PRICE_ID || "",
  }
  const yr: Record<string, string> = {
    basique: process.env.NEXT_PUBLIC_STRIPE_DYN_BASIQUE_ANNUAL_PRICE_ID || "",
    pro: process.env.NEXT_PUBLIC_STRIPE_DYN_PRO_ANNUAL_PRICE_ID || "",
    business: process.env.NEXT_PUBLIC_STRIPE_DYN_BUSINESS_ANNUAL_PRICE_ID || "",
  }
  return (annual && yr[plan]) ? yr[plan] : (mo[plan] || "")
}
