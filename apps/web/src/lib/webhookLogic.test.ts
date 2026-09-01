import { describe, it, expect } from "vitest"
import { resolveStripeEvent, metaUser } from "./webhookLogic"
import type Stripe from "stripe"

// Fabriques d'événements minimaux (cast : on ne teste que les champs lus).
const checkout = (metadata: any, customer = "cus_1", subscription = "sub_1", payment_status = "paid") =>
  ({ type: "checkout.session.completed", data: { object: { metadata, customer, subscription, payment_status } } }) as unknown as Stripe.Event

const subUpdated = (metadata: any, priceId: string | undefined, status = "active", cancelAtEnd = false) =>
  ({
    type: "customer.subscription.updated",
    data: { object: { id: "sub_9", metadata, status, cancel_at_period_end: cancelAtEnd, current_period_start: 1000, current_period_end: 2000, items: { data: priceId ? [{ price: { id: priceId } }] : [] } } },
  }) as unknown as Stripe.Event

const subCreated = (metadata: any, priceId: string | undefined, status = "active") =>
  ({
    type: "customer.subscription.created",
    data: { object: { id: "sub_9", metadata, status, cancel_at_period_end: false, current_period_start: 1000, current_period_end: 2000, items: { data: priceId ? [{ price: { id: priceId } }] : [] } } },
  }) as unknown as Stripe.Event

const subDeleted = (metadata: any) =>
  ({ type: "customer.subscription.deleted", data: { object: { id: "sub_9", metadata } } }) as unknown as Stripe.Event

const paymentFailed = (subscription: string) =>
  ({ type: "invoice.payment_failed", data: { object: { subscription } } }) as unknown as Stripe.Event

const asPro = (pid?: string | null) => (pid === "price_pro" ? "pro" : null)

describe("metaUser", () => {
  it("accepte userId ET supabase_user_id", () => {
    expect(metaUser({ userId: "u1" } as any)).toBe("u1")
    expect(metaUser({ supabase_user_id: "u2" } as any)).toBe("u2")
    expect(metaUser({} as any)).toBeUndefined()
    expect(metaUser(null)).toBeUndefined()
  })
})

describe("resolveStripeEvent — checkout.session.completed", () => {
  it("active le plan quand userId + plan présents", () => {
    const o = resolveStripeEvent(checkout({ userId: "u1", plan: "pro", priceId: "price_pro", billing: "monthly" }))
    expect(o).toEqual({ type: "checkout_completed", userId: "u1", plan: "pro", customerId: "cus_1", subscriptionId: "sub_1", priceId: "price_pro", billing: "monthly" })
  })
  it("résout l'utilisateur via supabase_user_id", () => {
    const o = resolveStripeEvent(checkout({ supabase_user_id: "u2", plan: "starter" }))
    expect(o.type).toBe("checkout_completed")
    if (o.type === "checkout_completed") expect(o.userId).toBe("u2")
  })
  it("noop si plan manquant", () => {
    expect(resolveStripeEvent(checkout({ userId: "u1" })).type).toBe("noop")
  })
  it("noop si userId manquant", () => {
    expect(resolveStripeEvent(checkout({ plan: "pro" })).type).toBe("noop")
  })
})

describe("resolveStripeEvent — customer.subscription.updated", () => {
  it("mappe le plan pour un price connu", () => {
    const o = resolveStripeEvent(subUpdated({ userId: "u1" }, "price_pro"), asPro)
    expect(o.type).toBe("subscription_updated")
    if (o.type === "subscription_updated") { expect(o.plan).toBe("pro"); expect(o.status).toBe("active"); expect(o.subId).toBe("sub_9") }
  })
  it("NE rétrograde PAS sur un price inconnu (plan = null)", () => {
    const o = resolveStripeEvent(subUpdated({ userId: "u1" }, "price_mystere"), asPro)
    expect(o.type).toBe("subscription_updated")
    if (o.type === "subscription_updated") expect(o.plan).toBeNull()
  })
  it("propage période et cancel_at_period_end", () => {
    const o = resolveStripeEvent(subUpdated({ userId: "u1" }, "price_pro", "past_due", true), asPro)
    if (o.type === "subscription_updated") {
      expect(o.periodStart).toBe(1000); expect(o.periodEnd).toBe(2000); expect(o.cancelAtEnd).toBe(true); expect(o.status).toBe("past_due")
    }
  })
  it("noop si userId manquant", () => {
    expect(resolveStripeEvent(subUpdated({}, "price_pro"), asPro).type).toBe("noop")
  })
})

describe("resolveStripeEvent — subscription.deleted / payment_failed", () => {
  it("deleted -> plan free (userId + subId)", () => {
    const o = resolveStripeEvent(subDeleted({ userId: "u1" }))
    expect(o).toEqual({ type: "subscription_deleted", userId: "u1", subId: "sub_9" })
  })
  it("deleted noop si userId manquant", () => {
    expect(resolveStripeEvent(subDeleted({})).type).toBe("noop")
  })
  it("payment_failed -> past_due avec subId", () => {
    expect(resolveStripeEvent(paymentFailed("sub_x"))).toEqual({ type: "payment_failed", subId: "sub_x" })
  })
})

describe("le second abonnement a disparu", () => {
  // « QR Dynamique » était un DEUXIÈME abonnement Stripe, avec ses propres paliers
  // « Pro » et « Business » à d'autres prix, routé vers profiles.dyn_*. Deux grilles
  // homonymes : personne ne pouvait dire lequel il payait. Le quota de QR modifiables
  // vient maintenant du plan principal, et metadata.product n'est plus lu.
  it("un événement marqué product=dynamic suit le chemin normal", () => {
    const o = resolveStripeEvent(checkout({ userId: "u1", plan: "pro", product: "dynamic", priceId: "price_pro" }), asPro)
    expect(o.type).toBe("checkout_completed")
  })

  it("aucune issue ne parle encore de dyn_", () => {
    for (const e of [checkout({ userId: "u1", plan: "pro", priceId: "price_pro" }), subUpdated({ userId: "u1" }, "price_pro"), subDeleted({ userId: "u1" })]) {
      expect(resolveStripeEvent(e, asPro).type.startsWith("dyn_")).toBe(false)
    }
  })

  it("un événement SANS product reste sur le chemin QRowg (non-régression)", () => {
    expect(resolveStripeEvent(checkout({ userId: "u1", plan: "pro", priceId: "price_pro" })).type).toBe("checkout_completed")
    expect(resolveStripeEvent(subDeleted({ userId: "u1" })).type).toBe("subscription_deleted")
  })
})

describe("le checkout ne decide pas du statut", () => {
  // Le statut etait ecrit « trialing » en dur : un commercant qui venait de payer
  // 19 EUR etait enregistre comme non payant. Le deduire de `payment_status` ne
  // suffisait pas non plus — un essai gratuit et une remise de 100 % valent tous
  // deux « no_payment_required ». Seuls les evenements d'abonnement savent.
  it("l'issue du checkout ne porte aucun statut", () => {
    for (const ps of ["paid", "no_payment_required", undefined]) {
      const o = resolveStripeEvent(checkout({ userId: "u1", plan: "pro", priceId: "price_pro" }, "cus_1", "sub_1", ps as any), asPro)
      expect(o.type).toBe("checkout_completed")
      expect(Object.prototype.hasOwnProperty.call(o, "status")).toBe(false)
    }
  })

  it("le statut vient de l'abonnement, tel que Stripe le donne", () => {
    for (const etat of ["active", "trialing", "past_due", "unpaid"]) {
      const o = resolveStripeEvent(subCreated({ userId: "u1" }, "price_pro", etat), asPro)
      if (o.type === "subscription_updated") expect(o.status).toBe(etat)
      else throw new Error("issue inattendue")
    }
  })
})

describe("customer.subscription.created", () => {
  // Seul `updated` etait ecoute. Les dates de periode d'un abonnement tout neuf
  // n'etaient donc ecrites qu'au premier renouvellement, un mois plus tard.
  it("est traite comme une mise a jour, avec les dates de periode", () => {
    const o = resolveStripeEvent(subCreated({ userId: "u1" }, "price_pro"), asPro)
    expect(o.type).toBe("subscription_updated")
    if (o.type === "subscription_updated") {
      expect(o.plan).toBe("pro"); expect(o.periodStart).toBe(1000); expect(o.periodEnd).toBe(2000)
      expect(o.subId).toBe("sub_9"); expect(o.priceId).toBe("price_pro")
    }
  })

  it("noop si userId manquant", () => {
    expect(resolveStripeEvent(subCreated({}, "price_pro"), asPro).type).toBe("noop")
  })

  it("le priceId remonte aussi sur updated (pour reparer une ligne manquante)", () => {
    const o = resolveStripeEvent(subUpdated({ userId: "u1" }, "price_pro"), asPro)
    if (o.type === "subscription_updated") expect(o.priceId).toBe("price_pro")
  })
})

describe("resolveStripeEvent — événement non géré", () => {
  it("noop", () => {
    expect(resolveStripeEvent({ type: "customer.created", data: { object: {} } } as any).type).toBe("noop")
  })
})
