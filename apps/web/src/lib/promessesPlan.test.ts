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
    expect(free.limits.pages).toBe(1)
    // Une limite de vues sur un QR IMPRIMÉ, c'est promettre au commerçant que son
    // sticker s'arrêtera s'il marche trop bien. Aucun plan n'en a plus.
    for (const p of Object.values(PLANS)) expect(p.limits.views, p.label).toBeNull()
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
      // « expiration d'un lien » est une FONCTION vendue (on la programme soi-même),
      // pas une promesse d'essai qui s'éteint. On ne traque que les essais.
      expect(texte, `${p.label} promet encore un essai`).not.toMatch(/essai|30 j|dyn\./i)
      expect(texte, `${p.label} annonce une limite mensuelle de vues`).not.toMatch(/vues ?\/ ?mois|vues par mois/i)
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
    // Le décompte vit maintenant dans le tableau comparatif, pas dans la carte.
    const ligne = PLAN_COMPARISON.find(l => l.feature === "Modèles")
    expect(ligne?.free).toMatch(/27 gratuits/)
  })
})

describe("l'essai de 7 jours n'est annoncé qu'à qui en a un", () => {
  const webhook = readFileSync(join(__dirname, "../app/api/webhooks/stripe/route.ts"), "utf8")
  const checkout = readFileSync(join(__dirname, "../app/api/stripe/checkout/route.ts"), "utf8")

  it("aucun plan n'ouvre d'essai à la commande", () => {
    // L'essai de 7 jours appartenait au palier « Starter », retiré. Il n'est pas
    // remplacé : le plan GRATUIT est l'essai — un support réel, sans durée, sans
    // carte. Deux chemins gratuits en parallèle n'auraient servi qu'à embrouiller.
    expect(checkout, "un essai subsiste dans le tunnel de paiement").not.toMatch(/trial_period_days/)
  })

  it("l'email d'abonnement suit la même règle", () => {
    // Sinon un client Pro qui paie immédiatement reçoit « votre essai gratuit
    // de 7 jours vient de commencer ».
    expect(webhook, "trialDays: 7 posé pour tous les plans").not.toMatch(/trialDays: 7\b/)
    expect(webhook).toMatch(/trialDays: 0/)
  })
})

describe("les plans restent cohérents entre eux", () => {
  it("chaque plan comparé existe vraiment", () => {
    for (const p of ["free", "pro", "business"] as const) {
      expect(PLANS[p], `plan ${p} absent`).toBeTruthy()
    }
  })
})


describe("plus aucune page ne promet un essai de 7 jours", () => {
  // Il appartenait au palier « Starter », retiré. Le laisser écrit, c'est faire
  // payer quelqu'un qui croyait essayer.
  it("ni la page des plans, ni l'accueil", () => {
    for (const f of ["app/upgrade/page.tsx", "app/HomeClient.tsx"]) {
      const src = readFileSync(join(__dirname, "..", f), "utf8")
      expect(src, `${f} promet encore un essai`).not.toMatch(/essai gratuit/i)
    }
  })
})
