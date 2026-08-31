import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { serverError } from "@/lib/apiError"

const PRICE_IDS: Record<string, string> = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "",
  business: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || "",
}
// Prix annuels (optionnels) — à créer dans Stripe pour que le toggle "Annuel" facture vraiment l'annuel
const ANNUAL_PRICE_IDS: Record<string, string> = {
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

    const { plan, annual } = await req.json()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

    // Annuel si demandé ET si un prix annuel est configuré, sinon mensuel
    const priceId = (annual && ANNUAL_PRICE_IDS[plan]) ? ANNUAL_PRICE_IDS[plan] : PRICE_IDS[plan]
    if (!priceId) {
      // Deux échecs très différents se cachaient derrière « Plan invalide ».
      //  · un plan qui n'existe pas : la requête est fautive ;
      //  · un plan qui existe mais dont l'identifiant de prix n'est pas configuré :
      //    c'est une variable d'environnement manquante côté Vercel, et le client,
      //    lui, n'y peut rien. Il ne doit pas croire qu'il a mal cliqué.
      const planConnu = Object.prototype.hasOwnProperty.call(PRICE_IDS, plan)
      if (planConnu) {
        console.error("[stripe] tarif non configuré pour le plan", plan, "— vérifier NEXT_PUBLIC_STRIPE_*_PRICE_ID")
        return NextResponse.json(
          { error: "Ce plan n'est pas encore disponible à la souscription. Écrivez-nous, on s'en occupe tout de suite." },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 })
    }
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
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    return serverError("stripe/checkout", e)
  }
}
