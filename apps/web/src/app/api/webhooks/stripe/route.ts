import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { resolveStripeEvent } from "@/lib/webhookLogic"
import { buildSubscriptionEmail } from "@/lib/subscriptionEmail"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { serverError } from "@/lib/apiError"

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
        break
    }
  } catch (e: any) {
    return serverError("stripe/webhook", e)
  }

  return NextResponse.json({ received: true })
}
