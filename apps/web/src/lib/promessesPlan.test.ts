import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PLANS, PLAN_COMPARISON, getPlan } from "./plans"

// Le plan gratuit annonçait TROIS choses différentes sur la même page d'accueil :
// « Un QR code dynamique », « 1 QR statique permanent + 2 dynamiques » dans la
// FAQ, et « 3 statiques + 2 dyn./mois » dans le tableau comparatif. Un seul de
// ces trois textes était juste. Un visiteur qui lit la page en entier voit la
// contradiction avant même de créer un compte.
//
// Depuis la fusion des deux abonnements, le gratuit donne 3 QR autonomes dont
// 1 modifiable après impression, sans essai ni expiration.
const accueil = readFileSync(join(__dirname, "../app/HomeClient.tsx"), "utf8")

describe("le plan gratuit annonce partout ce que la source de vérité contient", () => {
  const free = getPlan("free")

  it("la source de vérité dit bien 3 QR", () => {
    expect(free.limits.qr).toBe(3)
    expect(free.limits.pages).toBe(3)
    expect(free.limits.views).toBe(200)
  })

  it("la FAQ ne dit plus « 1 QR statique »", () => {
    expect(accueil, "la FAQ contredit limits.qr = 3").not.toMatch(/1 QR statique permanent/)
  })

  it("la carte de l'accueil annonce le même nombre que le tableau comparatif", () => {
    const ligneQr = PLAN_COMPARISON.find(l => l.feature === "QR autonomes")
    expect(ligneQr?.free).toBe("3")
    expect(accueil, "la carte gratuite doit citer les 3 QR").toMatch(/3 QR codes?, dont 1 modifiable/)
  })

  it("l'accueil ne promet plus d'essai mensuel de QR dynamique", () => {
    // « 3 QR statiques permanents + 2 dynamiques / mois » sur la carte, et la même
    // promesse dans la FAQ : deux endroits à corriger, donc deux endroits surveillés.
    expect(accueil).not.toMatch(/2 dynamiques ?\/ ?mois/)
    expect(accueil).not.toMatch(/essai de 30 jours par lien/)
  })

  it("le sous-quota de QR modifiables est annoncé, et vaut 1", () => {
    expect(free.limits.dyn).toBe(1)
    const ligne = PLAN_COMPARISON.find(l => l.feature.includes("modifiables après impression"))
    expect(ligne?.free).toBe("1")
  })

  it("plus aucun plan ne promet un essai de 30 jours ni une limite mensuelle", () => {
    // L'essai par lien tuait un QR déjà collé sur une table. Il n'existe plus :
    // aucune promesse de plan ne doit continuer à en parler.
    for (const p of Object.values(PLANS)) {
      const texte = JSON.stringify(p.features) + JSON.stringify(p.perks)
      expect(texte, `${p.label} parle encore d'essai ou d'expiration`).not.toMatch(/essai|expir|30 j|dyn\./i)
    }
  })

  it("aucune annonce ne promet un QR dynamique permanent en gratuit", () => {
    // Les dynamiques du plan gratuit sont mensuels, avec un essai par lien :
    // les présenter comme acquis est la promesse la plus coûteuse à tenir.
    expect(accueil).not.toMatch(/Un QR code dynamique prêt à imprimer/)
  })

  it("le nombre de modèles gratuits annoncé correspond au catalogue", () => {
    // 7 modèles curés gratuits + 20 modèles partagés, tous gratuits.
    const texte = JSON.stringify(free.features) + JSON.stringify(free.perks)
    expect(texte, "l'ancien « 6 templates gratuits » sous-estimait de plus de quatre fois").not.toMatch(/6 templates/)
    expect(texte).toMatch(/27 modèles gratuits/)
  })
})

describe("l'essai de 7 jours n'est annoncé qu'à qui en a un", () => {
  const webhook = readFileSync(join(__dirname, "../app/api/webhooks/stripe/route.ts"), "utf8")
  const checkout = readFileSync(join(__dirname, "../app/api/stripe/checkout/route.ts"), "utf8")

  it("seul le plan Starter ouvre un essai à la commande", () => {
    expect(checkout).toMatch(/plan === "starter" \? \{ trial_period_days: 7/)
  })

  it("l'email d'abonnement suit la même règle", () => {
    // Sinon un client Pro qui paie immédiatement reçoit « votre essai gratuit
    // de 7 jours vient de commencer ».
    expect(webhook, "trialDays: 7 posé pour tous les plans").not.toMatch(/trialDays: 7\b/)
    expect(webhook).toMatch(/trialDays: plan === "starter" \? 7 : 0/)
  })
})

describe("les plans restent cohérents entre eux", () => {
  it("chaque plan comparé existe vraiment", () => {
    for (const p of ["free", "starter", "pro", "business"] as const) {
      expect(PLANS[p], `plan ${p} absent`).toBeTruthy()
    }
  })
})
