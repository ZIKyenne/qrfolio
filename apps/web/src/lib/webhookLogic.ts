// Logique de décision PURE du webhook Stripe (extraite de la route pour être
// testable). La route applique l'issue (side-effects DB) ; ici, aucune I/O.
import type Stripe from "stripe"
import { planFromPriceId } from "./stripePlan"

// On accepte deux conventions de métadonnée userId : `userId` (posé par
// api/stripe/checkout, le chemin actuel) et `supabase_user_id` (ancienne
// convention, conservée par compat pour d'éventuels abonnements antérieurs).
export function metaUser(m?: Stripe.Metadata | null): string | undefined {
  return (m?.userId || m?.supabase_user_id) || undefined
}

// Un horodatage Stripe utilisable, ou `undefined`. Sans ce filtre, un champ absent
// devenait `NaN`, puis `new Date(NaN).toISOString()` levait « Invalid time value »
// et le webhook repondait 500 — constate en production le 01/09/2026.
function secondes(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined
}

// Depuis l'API Stripe 2025-03-31 (« Basil »), `current_period_start` et
// `current_period_end` ne sont PLUS sur l'abonnement : ils vivent sur chaque
// LIGNE d'abonnement. La version epinglee dans lib/stripe.ts ne protege pas de
// ca : c'est le point de terminaison configure dans Stripe qui decide de la
// version du corps recu, pas le SDK. On lit donc les deux emplacements.
export function periodeAbonnement(sub: any): { debut?: number; fin?: number } {
  const ligne = sub?.items?.data?.[0]
  return {
    debut: secondes(ligne?.current_period_start) ?? secondes(sub?.current_period_start),
    fin: secondes(ligne?.current_period_end) ?? secondes(sub?.current_period_end),
  }
}

// Meme rupture pour la facture : `invoice.subscription` a disparu au profit de
// `invoice.parent.subscription_details.subscription`. Les trois emplacements
// connus sont essayes, du plus recent au plus ancien.
export function abonnementDeFacture(inv: any): string | undefined {
  const direct = inv?.subscription
  if (typeof direct === "string" && direct) return direct
  if (direct?.id) return direct.id
  const parent = inv?.parent?.subscription_details?.subscription
  if (typeof parent === "string" && parent) return parent
  if (parent?.id) return parent.id
  const ligne = inv?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription
  if (typeof ligne === "string" && ligne) return ligne
  return undefined
}

export type WebhookOutcome =
  | { type: "checkout_completed"; userId: string; plan: string; customerId: string; subscriptionId: string; priceId?: string; billing?: string }
  | { type: "subscription_updated"; userId: string; plan: string | null; status: string; periodStart?: number; periodEnd?: number; cancelAtEnd: boolean; subId: string; priceId?: string }
  | { type: "subscription_deleted"; userId: string; subId: string }
  | { type: "payment_failed"; subId: string }
  | { type: "noop" }

// Traduit un événement Stripe en action DB voulue. `resolvePlan` est injectable
// pour les tests (par défaut : mapping price->plan depuis l'env).
//
// Il n'y a plus qu'un abonnement. Le second (metadata.product === "dynamic"), qui
// alimentait profiles.dyn_*, avait ses propres paliers « Pro » et « Business » à
// d'autres prix : deux grilles homonymes que personne ne pouvait distinguer.
// Le quota de QR modifiables vient maintenant du plan principal.
export function resolveStripeEvent(
  event: Stripe.Event,
  resolvePlan: (priceId?: string | null) => string | null = planFromPriceId,
): WebhookOutcome {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session
      const userId = metaUser(s.metadata)
      const priceId = s.metadata?.priceId ?? undefined
      // Le plan est dérivé du PRIX réellement facturé (source de vérité serveur)
      // ; `metadata.plan` n'est qu'un repli de compat (le checkout est désormais
      // authentifié, donc metadata est posé côté serveur).
      const plan = resolvePlan(priceId) ?? s.metadata?.plan
      // Il faut userId ET plan pour activer -> sinon on ne touche à rien.
      if (!userId || !plan) return { type: "noop" }
      // Le statut ne sort PAS d'ici. `payment_status` ne distingue pas un essai
      // gratuit d'une remise de 100 % : les deux valent « no_payment_required »,
      // et un client venu avec un code promo aurait ete etiquete « en essai ».
      // Seuls les evenements `customer.subscription.*` connaissent le vrai statut ;
      // ce sont eux, et eux seuls, qui l'ecrivent (voir la route).
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
    // `created` arrive a la souscription, `updated` aux changements ensuite.
    // Seul `updated` etait ecoute : les dates de periode d'un abonnement tout
    // neuf n'etaient donc ecrites qu'au premier renouvellement, un mois plus tard.
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const userId = metaUser(sub.metadata)
      if (!userId) return { type: "noop" }
      const priceId = sub.items.data[0]?.price.id
      // Prix inconnu (absent de la config) -> plan = null : on NE rétrograde PAS
      // l'abonné (une vraie annulation passe par subscription.deleted).
      const plan = resolvePlan(priceId)
      const periode = periodeAbonnement(sub)
      return {
        type: "subscription_updated",
        userId,
        plan,
        status: sub.status,
        periodStart: periode.debut,
        periodEnd: periode.fin,
        cancelAtEnd: sub.cancel_at_period_end,
        subId: sub.id,
        priceId: priceId ?? undefined,
      }
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const userId = metaUser(sub.metadata)
      if (!userId) return { type: "noop" }
      return { type: "subscription_deleted", userId, subId: sub.id }
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice
      const subId = abonnementDeFacture(inv)
      // Sans abonnement identifiable, il n'y a rien a marquer en impaye : mieux
      // vaut ne rien faire que de lancer un UPDATE sur `undefined`.
      if (!subId) return { type: "noop" }
      return { type: "payment_failed", subId }
    }
    default:
      return { type: "noop" }
  }
}
