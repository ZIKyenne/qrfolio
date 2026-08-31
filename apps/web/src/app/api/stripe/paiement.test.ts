import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")
const checkout = lire("checkout/route.ts")
const upgrade = lire("../../upgrade/page.tsx")

// Le chemin du paiement est le seul endroit où de l'argent change de mains, et le
// seul que personne n'a jamais parcouru en vrai : QRowg n'a aucun abonné. Ces tests
// figent ce qui doit rester vrai le jour du premier.

describe("on ne peut pas se faire attribuer le plan de quelqu'un d'autre", () => {
  it("l'identité vient de la session, jamais du corps de la requête", () => {
    // Sans cela, n'importe qui pouvait ouvrir une session de paiement rattachée à
    // un compte arbitraire et faire attribuer un plan via les métadonnées.
    expect(checkout).toContain("const userId = user.id")
    expect(checkout).not.toMatch(/const\s*\{[^}]*userId[^}]*\}\s*=\s*await req\.json\(\)/)
  })

  it("aucune session de paiement n'est ouverte sans être connecté", () => {
    const iAuth = checkout.indexOf('return NextResponse.json({ error: "Non authentifié" }, { status: 401 })')
    const iSession = checkout.indexOf("stripe.checkout.sessions.create")
    expect(iAuth).toBeGreaterThan(0)
    expect(iAuth, "le contrôle doit précéder toute création de session").toBeLessThan(iSession)
  })

  it("le plan attribué voyage dans les métadonnées de l'abonnement, pas seulement de la session", () => {
    // Le webhook lit `subscription_data.metadata` lors des renouvellements.
    // On vérifie les DEUX emplacements plutôt que de compter les occurrences :
    // le compte tombait à 3 dès qu'on retirait un second tunnel de paiement.
    expect(checkout).toMatch(/metadata:\s*\{[^}]*\bplan\b[^}]*\}/)
    expect(checkout).toMatch(/subscription_data:\s*\{\s*\n\s*metadata:/)
  })
})

describe("quand le paiement ne peut pas démarrer, ça se voit", () => {
  it("un tarif non configuré n'est plus confondu avec un plan inexistant", () => {
    // « Plan invalide » laissait croire au client qu'il avait mal cliqué, alors que
    // la cause était une variable d'environnement manquante côté Vercel.
    expect(checkout).toContain("tarif non configuré pour le plan")
    expect(checkout).toContain("NEXT_PUBLIC_STRIPE_*_PRICE_ID")
    expect(checkout).toContain("n'est pas encore disponible à la souscription")
  })

  it("le cas est journalisé côté serveur : c'est une configuration à corriger", () => {
    const i = checkout.indexOf("tarif non configuré")
    expect(checkout.slice(Math.max(0, i - 60), i)).toContain("console.error")
  })

  it("le bouton d'abonnement affiche l'erreur au lieu de tourner dans le vide", () => {
    expect(upgrade).toContain("onError=")
    expect(upgrade).toContain("setPayErr(")
    expect(upgrade).toContain("CheckoutErrorBanner")
  })

  it("et il remonte le message du serveur, pas un texte générique", () => {
    expect(upgrade).toContain('throw new Error(data.error || "Le paiement n\'a pas pu démarrer. Réessayez.")')
  })
})

describe("l'essai et la facturation annoncés correspondent à ce qui est facturé", () => {
  it("l'annuel n'est choisi que si un tarif annuel existe vraiment", () => {
    // Sinon on facturait au mois quelqu'un à qui on avait annoncé l'année.
    expect(checkout).toContain('const billing = (annual && ANNUAL_PRICE_IDS[plan]) ? "annual" : "monthly"')
  })

  it("aucun plan n'ouvre d'essai de 7 jours", () => {
    // Annoncer « votre essai gratuit » à un client qui vient d'être débité est la
    // promesse la plus coûteuse à démentir. L'essai vivait sur le palier
    // « Starter », retiré : c'est le plan gratuit qui tient ce rôle, sans durée.
    expect((checkout.match(/trial_period_days/g) || []).length).toBe(0)
  })

  it("il n'y a plus qu'un seul tunnel de paiement", () => {
    // Un second existait pour l'abonnement « QR Dynamique », avec ses propres
    // paliers « Pro » et « Business » à d'autres prix.
    expect(checkout).not.toContain('product === "dynamic"')
    expect((checkout.match(/stripe\.checkout\.sessions\.create/g) || []).length).toBe(1)
  })
})
