// Logique de décision PURE du webhook Stripe (extraite de la route pour être
// testable). La route applique l'issue (side-effects DB) ; ici, aucune I/O.
import type Stripe from "stripe"
import { planFromPriceId } from "./stripePlan"
import { dynPlanFromPriceId } from "./dynStripe"

// On accepte deux conventions de métadonnée userId : `userId` (posé par
// api/stripe/checkout, le chemin actuel) et `supabase_user_id` (ancienne
// convention, conservée par compat pour d'éventuels abonnements antérieurs).
export function metaUser(m?: Stripe.Metadata | null): string | undefined {
  return (m?.userId || m?.supabase_user_id) || undefined
}

export type WebhookOutcome =
  | { type: "checkout_completed"; userId: string; plan: string; customerId: string; subscriptionId: string; priceId?: string; billing?: string }
  | { type: "subscription_updated"; userId: string; plan: string | null; status: string; periodStart: number; periodEnd: number; cancelAtEnd: boolean; subId: string }
  | { type: "subscription_deleted"; userId: string; subId: string }
  | { type: "payment_failed"; subId: string }
  // Abonnement DÉDIÉ « QR Dynamique » (metadata.product === "dynamic") — routé vers profiles.dyn_*.
  | { type: "dyn_checkout_completed"; userId: string; dynPlan: string; customerId: string; subscriptionId: string; priceId?: string; billing?: string; periodEnd?: number }
  | { type: "dyn_subscription_updated"; userId: string; dynPlan: string | null; status: string; periodEnd: number; cancelAtEnd: boolean; subId: string }
  | { type: "dyn_subscription_deleted"; userId: string; subId: string }
  | { type: "noop" }

// Traduit un événement Stripe en action DB voulue. `resolvePlan` / `resolveDynPlan`
// sont injectables pour les tests (par défaut : mapping price->plan depuis l'env).
// Le champ metadata.product ("dynamic") distingue l'abonnement « QR Dynamique » des
// plans QRowg : les chemins QRowg restent strictement inchangés.
export function resolveStripeEvent(
  event: Stripe.Event,
  resolvePlan: (priceId?: string | null) => string | null = planFromPriceId,
  resolveDynPlan: (priceId?: string | null) => string | null = dynPlanFromPriceId,
): WebhookOutcome {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session
      const userId = metaUser(s.metadata)
      const priceId = s.metadata?.priceId ?? undefined
      if (s.metadata?.product === "dynamic") {
        // Palier dérivé du prix facturé ; repli sur metadata.dynPlan (posé côté serveur).
        const dynPlan = resolveDynPlan(priceId) ?? s.metadata?.dynPlan
        if (!userId || !dynPlan) return { type: "noop" }
        return {
          type: "dyn_checkout_completed",
          userId, dynPlan,
          customerId: s.customer as string,
          subscriptionId: s.subscription as string,
          priceId,
          billing: s.metadata?.billing ?? undefined,
        }
      }
      // Le plan est dérivé du PRIX réellement facturé (source de vérité serveur)
      // ; `metadata.plan` n'est qu'un repli de compat (le checkout est désormais
      // authentifié, donc metadata est posé côté serveur).
      const plan = resolvePlan(priceId) ?? s.metadata?.plan
      // Il faut userId ET plan pour activer -> sinon on ne touche à rien.
      if (!userId || !plan) return { type: "noop" }
      return {
        type: "checkout_completed",
        userId,
        plan,
        customerId: s.customer as string,
        subscriptionId: s.subscription as string,
        priceId,
        billing: s.metadata?.billing ?? undefined,
      }
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const userId = metaUser(sub.metadata)
      if (!userId) return { type: "noop" }
      const priceId = sub.items.data[0]?.price.id
      if (sub.metadata?.product === "dynamic") {
        const dynPlan = resolveDynPlan(priceId)
        return {
          type: "dyn_subscription_updated",
          userId, dynPlan,
          status: sub.status,
          periodEnd: (sub as any).current_period_end,
          cancelAtEnd: sub.cancel_at_period_end,
          subId: sub.id,
        }
      }
      // Prix inconnu (absent de la config) -> plan = null : on NE rétrograde PAS
      // l'abonné (une vraie annulation passe par subscription.deleted).
      const plan = resolvePlan(priceId)
      return {
        type: "subscription_updated",
        userId,
        plan,
        status: sub.status,
        periodStart: (sub as any).current_period_start,
        periodEnd: (sub as any).current_period_end,
        cancelAtEnd: sub.cancel_at_period_end,
        subId: sub.id,
      }
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const userId = metaUser(sub.metadata)
      if (!userId) return { type: "noop" }
      if (sub.metadata?.product === "dynamic") return { type: "dyn_subscription_deleted", userId, subId: sub.id }
      return { type: "subscription_deleted", userId, subId: sub.id }
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice
      return { type: "payment_failed", subId: (inv as any).subscription as string }
    }
    default:
      return { type: "noop" }
  }
}
