import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { resolveStripeEvent } from "@/lib/webhookLogic"
import { buildSubscriptionEmail } from "@/lib/subscriptionEmail"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { serverError } from "@/lib/apiError"
import { dynQrLimit } from "@/lib/dynamicPlans"
import { planDynamicReconcile } from "@/lib/dynamicReconcile"

// Réconcilie les liens dynamiques d'un utilisateur avec son quota « QR Dynamique » :
// promeut les essais en permanents (souscription), met en pause les excédents
// (downgrade/résiliation), réactive les liens re-couverts par le quota. Best-effort.
async function reconcileDynamicLinks(userId: string, dynPlan: string) {
  const { data: links } = await supabase
    .from("instant_qrs")
    .select("id, status, expires_at")
    .eq("user_id", userId).eq("dynamic", true)
    .order("created_at", { ascending: true })
  if (!links?.length) return
  const ops = planDynamicReconcile(links as any, dynQrLimit(dynPlan), Date.now())
  for (const op of ops) {
    await supabase.from("instant_qrs").update(op.patch).eq("id", op.id)
  }
}

// Email de bienvenue abonnement (essai/achat) — fire-and-forget, n'echoue jamais.
async function sendSubscriptionEmail(userId: string, plan: string, billing?: string | null) {
  try {
    if (!process.env.RESEND_API_KEY) return
    const { data: prof } = await supabase.from("profiles").select("email, full_name").eq("id", userId).single()
    if (!prof?.email) return
    const { subject, html } = buildSubscriptionEmail({ name: prof.full_name, plan, billing, trialDays: 7 })
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from: EMAIL_FROM, to: prof.email, subject, html })
  } catch (e) {
    console.warn("[stripe webhook] email abonnement non envoye:", (e as any)?.message)
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e: any) {
    console.error("Webhook signature error:", e.message)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  try {
    // Décision pure (testée : lib/webhookLogic.test.ts), puis application des effets.
    const outcome = resolveStripeEvent(event)

    switch (outcome.type) {
      case "checkout_completed":
        await supabase.from("profiles").update({
          plan: outcome.plan,
          stripe_customer_id: outcome.customerId,
        }).eq("id", outcome.userId)
        await supabase.from("subscriptions").upsert({
          user_id: outcome.userId,
          stripe_subscription_id: outcome.subscriptionId,
          stripe_price_id: outcome.priceId,
          plan: outcome.plan,
          status: "trialing",
        }, { onConflict: "user_id" })
        // Email de bienvenue (essai/achat) — ne bloque pas la reponse au webhook
        await sendSubscriptionEmail(outcome.userId, outcome.plan, outcome.billing)
        break

      case "subscription_updated":
        if (!outcome.plan) console.warn("[stripe webhook] price non mappe, plan inchange")
        if (outcome.plan) await supabase.from("profiles").update({ plan: outcome.plan }).eq("id", outcome.userId)
        await supabase.from("subscriptions").update({
          ...(outcome.plan ? { plan: outcome.plan } : {}),
          status: outcome.status,
          current_period_start: new Date(outcome.periodStart * 1000).toISOString(),
          current_period_end: new Date(outcome.periodEnd * 1000).toISOString(),
          cancel_at_period_end: outcome.cancelAtEnd,
        }).eq("stripe_subscription_id", outcome.subId)
        break

      case "subscription_deleted":
        await supabase.from("profiles").update({ plan: "free" }).eq("id", outcome.userId)
        await supabase.from("subscriptions").update({
          plan: "free",
          status: "canceled",
          canceled_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", outcome.subId)
        break

      case "payment_failed":
        await supabase.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", outcome.subId)
        // Best-effort : couvre aussi un abonnement « QR Dynamique » (aucun effet sinon).
        await supabase.from("profiles").update({ dyn_status: "past_due" }).eq("dyn_stripe_subscription_id", outcome.subId)
        break

      // ── Abonnement DÉDIÉ « QR Dynamique » (profiles.dyn_*) ──────────────────
      case "dyn_checkout_completed":
        await supabase.from("profiles").update({
          dyn_plan: outcome.dynPlan,
          dyn_status: "active",
          dyn_stripe_subscription_id: outcome.subscriptionId,
          dyn_current_period_end: outcome.periodEnd ? new Date(outcome.periodEnd * 1000).toISOString() : null,
          dyn_cancel_at_end: false,
          stripe_customer_id: outcome.customerId,
        }).eq("id", outcome.userId)
        // Les liens d'essai actifs deviennent permanents dans la limite du quota.
        await reconcileDynamicLinks(outcome.userId, outcome.dynPlan)
        break

      case "dyn_subscription_updated":
        await supabase.from("profiles").update({
          ...(outcome.dynPlan ? { dyn_plan: outcome.dynPlan } : {}),
          dyn_status: outcome.status,
          dyn_current_period_end: new Date(outcome.periodEnd * 1000).toISOString(),
          dyn_cancel_at_end: outcome.cancelAtEnd,
        }).eq("dyn_stripe_subscription_id", outcome.subId)
        // Changement de palier confirmé -> réconcilie le quota (pause/upgrade).
        if (outcome.dynPlan) await reconcileDynamicLinks(outcome.userId, outcome.dynPlan)
        break

      case "dyn_subscription_deleted":
        await supabase.from("profiles").update({
          dyn_plan: "none",
          dyn_status: "canceled",
          dyn_cancel_at_end: false,
          dyn_stripe_subscription_id: null,
        }).eq("id", outcome.userId)
        // Plus d'abonnement -> quota 0 : tous les liens permanents passent en pause.
        await reconcileDynamicLinks(outcome.userId, "none")
        break
    }
  } catch (e: any) {
    return serverError("stripe/webhook", e)
  }

  return NextResponse.json({ received: true })
}
