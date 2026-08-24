import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { buildSubscriptionEmail } from "./subscriptionEmail"

// Cet email n'a encore jamais été reçu par personne : QRowg n'a aucun abonné.
// C'est exactement le genre de message qu'on découvre cassé le jour du premier
// paiement — le plus mauvais moment.

describe("l'email d'abonnement dit vrai", () => {
  it("annonce le bon plan et le bon prix", () => {
    const pro = buildSubscriptionEmail({ name: "Émilien", plan: "pro", billing: "monthly" })
    expect(pro.subject).toBe("Votre abonnement QRowg Pro est actif")
    expect(pro.planConnu).toBe(true)
    expect(pro.html).toContain("Bienvenue dans QRowg Pro")
  })

  it("distingue un essai d'un abonnement en cours", () => {
    const essai = buildSubscriptionEmail({ name: "Émilien", plan: "starter", billing: "monthly", trialDays: 7 })
    expect(essai.subject).toContain("essai")
    expect(essai.html).toContain("7&nbsp;jours")
    expect(essai.html).toContain("sauf annulation")
  })

  it("le cycle annuel n'affiche pas le prix mensuel", () => {
    const mensuel = buildSubscriptionEmail({ name: "", plan: "pro", billing: "monthly" })
    const annuel = buildSubscriptionEmail({ name: "", plan: "pro", billing: "annual" })
    expect(annuel.html).not.toBe(mensuel.html)
  })

  it("un nom vide ne laisse pas « Bonjour , »", () => {
    expect(buildSubscriptionEmail({ name: "", plan: "pro" }).html).toContain("Bonjour,")
    expect(buildSubscriptionEmail({ name: null, plan: "pro" }).html).not.toContain("Bonjour ,")
  })
})

describe("un plan que le code ne connaît pas", () => {
  // getPlan retombe silencieusement sur « free ». Quelqu'un qui vient de payer
  // recevait « Bienvenue dans QRowg Gratuit », avec les limites du plan gratuit.
  const inconnu = buildSubscriptionEmail({ name: "Émilien", plan: "pro_2027_promo", billing: "monthly" })

  it("ne prétend plus que la personne est sur le plan gratuit", () => {
    expect(inconnu.html).not.toContain("Gratuit")
    expect(inconnu.html).not.toContain("200 vues")
    expect(inconnu.subject).not.toContain("Gratuit")
  })

  it("ne cite aucune limite ni aucun prix qu'il ne connaît pas", () => {
    expect(inconnu.html).not.toMatch(/€/)
    expect(inconnu.html).not.toContain("CE QUI EST INCLUS")
  })

  it("reste utile : l'abonnement est confirmé, et on sait où regarder", () => {
    expect(inconnu.subject).toBe("Votre abonnement QRowg est actif")
    expect(inconnu.html).toContain("dashboard/profile")
    expect(inconnu.html).toContain("Répondez à cet email")
    expect(inconnu.planConnu).toBe(false)
  })

  it("le cas est signalé côté serveur, pas seulement corrigé côté texte", () => {
    const webhook = readFileSync(join(__dirname, "../app/api/webhooks/stripe/route.ts"), "utf8")
    expect(webhook).toContain("if (!planConnu)")
    expect(webhook).toContain("plan inconnu")
  })

  it("les quatre plans réels, eux, restent reconnus", () => {
    for (const p of ["free", "starter", "pro", "business"]) {
      expect(buildSubscriptionEmail({ plan: p }).planConnu, p).toBe(true)
    }
  })
})
