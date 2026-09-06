import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
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
// L'accueil n'est plus un seul fichier : ses sections sont chargées à part pour
// alléger le premier affichage. On les lit toutes — une promesse fausse ment autant
// depuis un fichier de section que depuis la page.
const dossierSections = join(__dirname, "../app/homeSections")
const accueil = [
  readFileSync(join(__dirname, "../app/HomeClient.tsx"), "utf8"),
  ...readdirSync(dossierSections).map(f => readFileSync(join(dossierSections, f), "utf8")),
].join("\n")
const contact = readFileSync(join(__dirname, "../app/contact/page.tsx"), "utf8")
const generateur = readFileSync(join(__dirname, "../app/generateur-qr-code/GeneratorClient.tsx"), "utf8")

// Relevé du 4 septembre : trois textes mentaient encore, hors du périmètre de ce
// test. Il les couvre désormais.
describe("les promesses fausses relevées le 4 septembre ne reviennent pas", () => {
  it("l'accueil n'annonce ni « vues par mois » ni quota de vues avec alerte", () => {
    expect(accueil).not.toMatch(/\d+ vues par mois/)
    expect(accueil).not.toMatch(/quota de vues/)
    expect(accueil).not.toMatch(/prévenons par email à 80/)
  })
  it("l'accueil lit le plan gratuit dans plans.ts, pas dans une phrase figée", () => {
    expect(accueil).toContain("${PLANS_DEF.free.limits.pages} page")
    expect(accueil).toContain("${PLANS_DEF.free.limits.qr} QR codes")
  })
  it("Contact ne connaît plus « Free », « 200 vues/mois » ni « 2 QR dynamiques/mois »", () => {
    expect(contact).not.toMatch(/plan Free/)
    expect(contact).not.toMatch(/vues\/mois/)
    expect(contact).not.toMatch(/dynamiques\/mois/)
    expect(contact).toContain("${PLANS.free.limits.qr} QR codes")
  })
  it("les noms de plans viennent de plans.ts sur l'accueil (plus de « Pro » / « Business » en dur)", () => {
    expect(accueil).not.toMatch(/dès le plan Pro\)/)
    expect(accueil).not.toContain('cta: "Choisir Pro"')
    expect(accueil).not.toContain('cta: "Choisir Business"')
  })
  it("les générateurs n'exigent plus un « compte gratuit » qu'ils n'exigent pas", () => {
    for (const f of ["generateur-qr-code", "generateur-qr-code-wifi"]) {
      const page = readFileSync(join(__dirname, `../app/${f}/page.tsx`), "utf8")
      expect(page, f).not.toMatch(/[Cc]ompte gratuit/)
      expect(page, f).toMatch(/[Ss]ans compte/)
    }
  })
  it("le générateur ne ressuscite pas un essai « 30 j (2/mois) »", () => {
    expect(generateur).not.toMatch(/30 ?j/)
    expect(generateur).not.toMatch(/2\/mois/)
  })
})

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
    for (const [nom, src] of [["app/upgrade/page.tsx", readFileSync(join(__dirname, "../app/upgrade/page.tsx"), "utf8")], ["l'accueil", accueil]] as const) {
      expect(src, `${nom} promet encore un essai`).not.toMatch(/essai gratuit/i)
    }
  })
})

// Relevé du 4 septembre, suite : les plans s'appelaient « Pro » et « Business »
// dans les textes alors que plans.ts les nomme « Établissement » et « Multi-sites » ;
// les statistiques détaillées étaient « dans tous les plans » ; les guides disaient
// que le QR dynamique « nécessite un abonnement » ; Exemples promettait « tous les
// templates inclus » ; Fonctionnalités inventait « 5 styles visuels ».
describe("les libellés de plans viennent de plans.ts, partout", () => {
  const fichiers = {
    accueil,
    fonctionnalites: readFileSync(join(__dirname, "../app/features/page.tsx"), "utf8"),
    exemples: readFileSync(join(__dirname, "../app/examples/page.tsx"), "utf8"),
    offres: readFileSync(join(__dirname, "../app/upgrade/page.tsx"), "utf8"),
  }

  // Un « Pro » ou « Business » lu par l'utilisateur : dans du texte JSX (entre > et <),
  // dans une chaîne affichée (text=, label:, tag:, plan:) — pas dans un identifiant.
  const visible = (src: string) => [...src.matchAll(/(>[^<{\n]*\b(Pro|Business)\b[^<{\n]*<)|((text|label|tag|plan|cta|sub)\s*[:=]\s*"[^"\n]*\b(Pro|Business)\b[^"\n]*")/g)]
    .map(m => m[0]).filter(t => !/Freelance Pro|Fraunces/.test(t))

  for (const [nom, src] of Object.entries(fichiers)) {
    it(`${nom} n'écrit plus « Pro » ni « Business » en dur`, () => {
      expect(visible(src)).toEqual([])
    })
  }

  it("les noms réels sont bien Établissement et Multi-sites", () => {
    expect(PLANS.pro.label).toBe("Établissement")
    expect(PLANS.business.label).toBe("Multi-sites")
  })
})

describe("ce que Fonctionnalités et Exemples promettent existe", () => {
  const fonctionnalites = readFileSync(join(__dirname, "../app/features/page.tsx"), "utf8")
  const exemples = readFileSync(join(__dirname, "../app/examples/page.tsx"), "utf8")
  const guides = readFileSync(join(__dirname, "../app/guides/guides.ts"), "utf8")

  it("les statistiques détaillées ne sont plus « dans tous les plans »", () => {
    expect(fonctionnalites).not.toContain("inclus dans tous les plans")
    expect(PLANS.free.caps.dynStatsDetaillees).toBe(false)
    expect(fonctionnalites).toContain("détail par appareil dès ${PLANS.pro.label}")
  })

  it("plus de « 5 styles visuels » inventés ; l'export SVG/PDF est daté du bon plan", () => {
    expect(fonctionnalites).not.toContain("5 styles visuels")
    expect(PLANS.free.caps.exportFormats).toEqual(["png"])
    expect(fonctionnalites).toContain("SVG et PDF pour l'impression dès ${PLANS.pro.label}")
  })

  it("Exemples ne promet plus « tous les templates inclus »", () => {
    expect(exemples).not.toContain("Tous les templates inclus")
    expect(exemples).toContain('e.plan === "free"')
  })

  it("le guide ne dit plus que le QR dynamique nécessite un abonnement", () => {
    expect(guides).not.toContain("nécessite un abonnement")
    expect(PLANS.free.limits.dyn).toBeGreaterThan(0)
    expect(guides).toContain("${PLANS.free.limits.dyn}")
  })
})

describe("les CGU décrivent la résiliation telle qu'elle se passe", () => {
  const cgu = readFileSync(join(__dirname, "../app/terms/page.tsx"), "utf8")
  it("ni « Free », ni purge à 30 jours qui n'existe pas", () => {
    expect(cgu).not.toContain("passe en Free")
    expect(cgu).not.toContain("conservées 30 jours avant suppression")
    expect(cgu).toContain("passe au plan {PLANS.free.label}")
    expect(cgu).toContain("{PLANS.free.limits.pages} page active")
  })
})
