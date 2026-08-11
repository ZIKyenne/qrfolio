import { describe, it, expect } from "vitest"
import { resolveStripeEvent, metaUser } from "./webhookLogic"
import type Stripe from "stripe"

// Fabriques d'événements minimaux (cast : on ne teste que les champs lus).
const checkout = (metadata: any, customer = "cus_1", subscription = "sub_1") =>
  ({ type: "checkout.session.completed", data: { object: { metadata, customer, subscription } } }) as unknown as Stripe.Event

const subUpdated = (metadata: any, priceId: string | undefined, status = "active", cancelAtEnd = false) =>
  ({
    type: "customer.subscription.updated",
    data: { object: { id: "sub_9", metadata, status, cancel_at_period_end: cancelAtEnd, current_period_start: 1000, current_period_end: 2000, items: { data: priceId ? [{ price: { id: priceId } }] : [] } } },
  }) as unknown as Stripe.Event

const subDeleted = (metadata: any) =>
  ({ type: "customer.subscription.deleted", data: { object: { id: "sub_9", metadata } } }) as unknown as Stripe.Event

const paymentFailed = (subscription: string) =>
  ({ type: "invoice.payment_failed", data: { object: { subscription } } }) as unknown as Stripe.Event

const asPro = (pid?: string | null) => (pid === "price_pro" ? "pro" : null)
const asDynPro = (pid?: string | null) => (pid === "price_dyn_pro" ? "pro" : null)

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

describe("resolveStripeEvent — abonnement « QR Dynamique » (product=dynamic)", () => {
  it("checkout dynamique -> dyn_checkout_completed (palier via prix)", () => {
    const o = resolveStripeEvent(checkout({ userId: "u1", product: "dynamic", priceId: "price_dyn_pro", billing: "monthly" }), asPro, asDynPro)
    expect(o).toEqual({ type: "dyn_checkout_completed", userId: "u1", dynPlan: "pro", customerId: "cus_1", subscriptionId: "sub_1", priceId: "price_dyn_pro", billing: "monthly" })
  })
  it("checkout dynamique : repli sur metadata.dynPlan si prix inconnu", () => {
    const o = resolveStripeEvent(checkout({ userId: "u1", product: "dynamic", dynPlan: "basique", priceId: "price_x" }), asPro, asDynPro)
    if (o.type === "dyn_checkout_completed") expect(o.dynPlan).toBe("basique")
    else throw new Error("attendu dyn_checkout_completed")
  })
  it("checkout dynamique : noop si userId manquant", () => {
    expect(resolveStripeEvent(checkout({ product: "dynamic", priceId: "price_dyn_pro" }), asPro, asDynPro).type).toBe("noop")
  })
  it("subscription.updated dynamique -> dyn_subscription_updated (sans periodStart)", () => {
    const o = resolveStripeEvent(subUpdated({ userId: "u1", product: "dynamic" }, "price_dyn_pro"), asPro, asDynPro)
    expect(o).toEqual({ type: "dyn_subscription_updated", userId: "u1", dynPlan: "pro", status: "active", periodEnd: 2000, cancelAtEnd: false, subId: "sub_9" })
  })
  it("subscription.updated dynamique : prix inconnu -> dynPlan null (pas de rétrogradation)", () => {
    const o = resolveStripeEvent(subUpdated({ userId: "u1", product: "dynamic" }, "price_inconnu"), asPro, asDynPro)
    if (o.type === "dyn_subscription_updated") expect(o.dynPlan).toBeNull()
    else throw new Error("attendu dyn_subscription_updated")
  })
  it("subscription.deleted dynamique -> dyn_subscription_deleted", () => {
    const o = resolveStripeEvent(subDeleted({ userId: "u1", product: "dynamic" }), asPro, asDynPro)
    expect(o).toEqual({ type: "dyn_subscription_deleted", userId: "u1", subId: "sub_9" })
  })
  it("un événement SANS product reste sur le chemin QRowg (non-régression)", () => {
    expect(resolveStripeEvent(checkout({ userId: "u1", plan: "pro", priceId: "price_pro" })).type).toBe("checkout_completed")
    expect(resolveStripeEvent(subDeleted({ userId: "u1" })).type).toBe("subscription_deleted")
  })
})

describe("resolveStripeEvent — événement non géré", () => {
  it("noop", () => {
    expect(resolveStripeEvent({ type: "customer.created", data: { object: {} } } as any).type).toBe("noop")
  })
})
