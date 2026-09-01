import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { resolveStripeEvent } from "@/lib/webhookLogic"
import { buildSubscriptionEmail } from "@/lib/subscriptionEmail"
import { EMAIL_FROM } from "@/lib/emailFrom"
import { serverError } from "@/lib/apiError"
import { dynLimit } from "@/lib/plans"
import { planDynamicReconcile } from "@/lib/dynamicReconcile"

// Réconcilie les QR modifiables d'un utilisateur avec le sous-quota de son plan :
// promeut les anciens essais en permanents, met en pause les excédents après un
// changement de plan vers le bas, réactive ceux que le quota re-couvre. Best-effort.
// Appelée sur CHAQUE changement de plan : le quota des QR modifiables vient
// désormais du plan principal, il doit bouger avec lui.
async function reconcileDynamicLinks(userId: string, plan: string) {
  const { data: links } = await supabase
    .from("instant_qrs")
    .select("id, status, expires_at")
    .eq("user_id", userId).eq("dynamic", true)
    .order("created_at", { ascending: true })
  if (!links?.length) return
  const ops = planDynamicReconcile(links as any, dynLimit(plan), Date.now())
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
    // L'essai de 7 jours n'est ouvert QUE sur le plan Starter (voir stripe/checkout,
    // qui ne pose trial_period_days que pour lui). Annoncer « votre essai gratuit
    // de 7 jours » à tous revenait à écrire à un client Pro qui vient de payer
    // qu'il ne paie pas encore.
    const { subject, html, planConnu } = buildSubscriptionEmail({ name: prof.full_name, plan, billing, trialDays: 0 })
    // Un plan que le code ne connaît pas : l'email reste sobre (voir subscriptionEmail),
    // mais il faut le savoir — c'est le signe d'un tarif renommé chez Stripe.
    if (!planConnu) console.error("[stripe] plan inconnu dans l'email d'abonnement :", plan)
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

  // supabase-js NE LEVE PAS d'exception : une écriture refusée renvoie un objet
  // { error } que personne ne lisait. Le webhook répondait donc « received: true »
  // à Stripe sans avoir rien écrit, et l'événement était perdu pour de bon.
  // Ici chaque écriture est vérifiée ; s'il en rate une, on répond 500 et Stripe
  // rejoue l'événement (il réessaie pendant 3 jours).
  const echecs: string[] = []
  const ecrire = async (quoi: string, ecriture: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await ecriture
    if (error) {
      echecs.push(quoi)
      console.error(`[stripe webhook] ECHEC ECRITURE ${quoi} (${event.type}) :`, error.message)
    }
    return !error
  }

  try {
    // Décision pure (testée : lib/webhookLogic.test.ts), puis application des effets.
    const outcome = resolveStripeEvent(event)

    switch (outcome.type) {
      case "checkout_completed":
        await ecrire("profiles.plan", supabase.from("profiles").update({
          plan: outcome.plan,
          stripe_customer_id: outcome.customerId,
        }).eq("id", outcome.userId))
        // `status` est volontairement ABSENT de cette charge utile. Un upsert ne
        // met a jour que les colonnes qu'on lui donne : a la creation la colonne
        // prend son defaut (`active`, et le client vient bien de payer), et si la
        // ligne existe deja son statut n'est PAS ecrase. Le vrai statut vient des
        // evenements `customer.subscription.*`, qui peuvent arriver AVANT celui-ci
        // — Stripe ne garantit pas l'ordre. Ecrire un statut ici, c'est risquer
        // d'ecraser la verite par une supposition.
        await ecrire("subscriptions.upsert", supabase.from("subscriptions").upsert({
          user_id: outcome.userId,
          stripe_subscription_id: outcome.subscriptionId,
          stripe_price_id: outcome.priceId,
          plan: outcome.plan,
        }, { onConflict: "user_id" }))
        // Le plan porte aussi le quota de QR modifiables : le faire suivre.
        await reconcileDynamicLinks(outcome.userId, outcome.plan)
        // Email de bienvenue (essai/achat) — ne bloque pas la reponse au webhook
        await sendSubscriptionEmail(outcome.userId, outcome.plan, outcome.billing)
        break

      case "subscription_updated":
        if (!outcome.plan) console.warn("[stripe webhook] price non mappe, plan inchange")
        if (outcome.plan) await ecrire("profiles.plan", supabase.from("profiles").update({ plan: outcome.plan }).eq("id", outcome.userId))
        // UPSERT et non UPDATE : si l'événement `checkout.session.completed` a été
        // manqué (rejeu, panne, ordre d'arrivée), un UPDATE ne touchait aucune ligne
        // et l'abonnement n'existait nulle part. L'upsert répare la ligne manquante.
        await ecrire("subscriptions.upsert", supabase.from("subscriptions").upsert({
          user_id: outcome.userId,
          stripe_subscription_id: outcome.subId,
          ...(outcome.priceId ? { stripe_price_id: outcome.priceId } : {}),
          ...(outcome.plan ? { plan: outcome.plan } : {}),
          status: outcome.status,
          // Dates ecrites SEULEMENT si Stripe les a fournies. Les convertir a
          // l'aveugle levait « Invalid time value » et faisait repondre 500 :
          // l'annulation n'etait jamais enregistree.
          ...(outcome.periodStart ? { current_period_start: new Date(outcome.periodStart * 1000).toISOString() } : {}),
          ...(outcome.periodEnd ? { current_period_end: new Date(outcome.periodEnd * 1000).toISOString() } : {}),
          cancel_at_period_end: outcome.cancelAtEnd,
        }, { onConflict: "user_id" }))
        if (outcome.plan) await reconcileDynamicLinks(outcome.userId, outcome.plan)
        break

      case "subscription_deleted":
        await ecrire("profiles.plan", supabase.from("profiles").update({ plan: "free" }).eq("id", outcome.userId))
        await ecrire("subscriptions.annulation", supabase.from("subscriptions").update({
          plan: "free",
          status: "canceled",
          canceled_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", outcome.subId))
        // Retour au gratuit : les QR modifiables au-delà du quota passent en pause.
        await reconcileDynamicLinks(outcome.userId, "free")
        break

      case "payment_failed":
        await ecrire("subscriptions.past_due", supabase.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", outcome.subId))
        break

    }
  } catch (e: any) {
    return serverError("stripe/webhook", e)
  }

  if (echecs.length) {
    return NextResponse.json({ error: `ecritures refusees: ${echecs.join(", ")}` }, { status: 500 })
  }
  return NextResponse.json({ received: true })
}
