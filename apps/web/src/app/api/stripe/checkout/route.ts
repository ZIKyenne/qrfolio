import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { serverError } from "@/lib/apiError"
import { dynPriceId } from "@/lib/dynStripe"

const PRICE_IDS: Record<string, string> = {
  starter: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || "",
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "",
  business: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || "",
}
// Prix annuels (optionnels) — à créer dans Stripe pour que le toggle "Annuel" facture vraiment l'annuel
const ANNUAL_PRICE_IDS: Record<string, string> = {
  starter: process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID || "",
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || "",
  business: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_ANNUAL_PRICE_ID || "",
}

export async function POST(req: NextRequest) {
  try {
    // Auth OBLIGATOIRE : le userId est dérivé de la session, JAMAIS du body
    // (sinon n'importe qui pouvait créer une session Checkout rattachée à un
    // compte arbitraire et faire attribuer un plan via metadata).
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    const userId = user.id

    const { plan, annual, product } = await req.json()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

    // ── Abonnement DÉDIÉ « QR Dynamique » ──────────────────────────────────────
    // Distinct des plans QRowg. PAS de trial_period_days : l'essai est PAR LIEN (7 j),
    // pas au niveau de l'abonnement -> la souscription facture immédiatement.
    if (product === "dynamic") {
      const monthlyId = dynPriceId(plan, false)
      const annualId = dynPriceId(plan, true) // renvoie l'annuel s'il existe, sinon le mensuel
      const useAnnual = !!annual && annualId !== monthlyId
      const priceId = useAnnual ? annualId : monthlyId
      if (!priceId) return NextResponse.json({ error: "Palier invalide" }, { status: 400 })
      const billing = useAnnual ? "annual" : "monthly"
      const meta = { userId, product: "dynamic", dynPlan: plan, priceId, billing }
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard/qr-link?dyn_upgraded=true`,
        cancel_url: `${appUrl}/dashboard/qr-dynamique?canceled=true`,
        metadata: meta,
        subscription_data: { metadata: meta },
        allow_promotion_codes: true,
      })
      return NextResponse.json({ url: session.url })
    }

    // Annuel si demandé ET si un prix annuel est configuré, sinon mensuel
    const priceId = (annual && ANNUAL_PRICE_IDS[plan]) ? ANNUAL_PRICE_IDS[plan] : PRICE_IDS[plan]
    if (!priceId) return NextResponse.json({ error: "Plan invalide" }, { status: 400 })
    const billing = (annual && ANNUAL_PRICE_IDS[plan]) ? "annual" : "monthly"

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/upgrade?canceled=true`,
      metadata: { userId, plan, priceId, billing },
      subscription_data: {
        metadata: { userId, plan, priceId, billing },
        trial_period_days: 7,
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    return serverError("stripe/checkout", e)
  }
}
