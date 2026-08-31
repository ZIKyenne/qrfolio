import { describe, it, expect } from "vitest"
import { jugerCompte, comptesARelancer, ageEnHeures, fenetreInscription, prenom, AGE_MIN_H, AGE_MAX_H, type Compte } from "./relance"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const MAINTENANT = new Date("2026-08-30T09:00:00.000Z")
const ilYA = (h: number) => new Date(MAINTENANT.getTime() - h * 3_600_000).toISOString()
const compte = (o: Partial<Compte> = {}): Compte => ({
  id: "u1", email: "marcel@exemple.fr", inscritLe: ilYA(50), nom: "Marcel Dupont", nbPages: 0, ...o,
})

describe("la fenêtre : ni trop tôt, ni deux fois", () => {
  it("un compte de deux jours sans page est relancé", () => {
    expect(jugerCompte(compte(), MAINTENANT).relancer).toBe(true)
  })
  it("un compte d'hier est trop récent : on laisse passer la nuit", () => {
    const v = jugerCompte(compte({ inscritLe: ilYA(20) }), MAINTENANT)
    expect(v.relancer).toBe(false)
    expect(v).toMatchObject({ motif: "trop_recent" })
  })
  it("un compte de la semaine dernière n'est plus relancé", () => {
    expect(jugerCompte(compte({ inscritLe: ilYA(200) }), MAINTENANT)).toMatchObject({ relancer: false, motif: "trop_ancien" })
  })
  it("les bornes sont fermées à gauche, ouvertes à droite", () => {
    expect(jugerCompte(compte({ inscritLe: ilYA(AGE_MIN_H) }), MAINTENANT).relancer).toBe(true)
    expect(jugerCompte(compte({ inscritLe: ilYA(AGE_MAX_H) }), MAINTENANT).relancer).toBe(false)
  })

  // Le point qui remplace une colonne de suivi : quel que soit le jour du
  // passage quotidien, un même compte ne peut être retenu qu'une seule fois.
  it("un passage par jour n'envoie jamais deux fois au même compte", () => {
    const inscription = ilYA(0)
    let retenus = 0
    for (let jour = 0; jour <= 10; jour++) {
      const passage = new Date(MAINTENANT.getTime() + jour * 24 * 3_600_000)
      if (jugerCompte(compte({ inscritLe: inscription }), passage).relancer) retenus++
    }
    expect(retenus).toBe(1)
  })

  it("même à heure décalée, un passage quotidien ne double pas", () => {
    // Le cron peut glisser de quelques minutes d'un jour à l'autre.
    const inscription = ilYA(0)
    let retenus = 0
    for (let jour = 0; jour <= 10; jour++) {
      const derive = (jour % 3) * 7 * 60_000
      const passage = new Date(MAINTENANT.getTime() + jour * 24 * 3_600_000 + derive)
      if (jugerCompte(compte({ inscritLe: inscription }), passage).relancer) retenus++
    }
    expect(retenus).toBe(1)
  })
})

describe("qui est écarté", () => {
  it("quelqu'un qui a déjà créé une page, même en brouillon", () => {
    expect(jugerCompte(compte({ nbPages: 1 }), MAINTENANT)).toMatchObject({ relancer: false, motif: "a_deja_cree" })
  })
  it("un compte sans email exploitable", () => {
    expect(jugerCompte(compte({ email: null }), MAINTENANT)).toMatchObject({ relancer: false, motif: "sans_email" })
    expect(jugerCompte(compte({ email: "pas-un-email" }), MAINTENANT)).toMatchObject({ relancer: false, motif: "sans_email" })
  })
  it("une date d'inscription illisible n'envoie rien et ne plante pas", () => {
    expect(jugerCompte(compte({ inscritLe: "n'importe quoi" }), MAINTENANT)).toMatchObject({ relancer: false, motif: "date_illisible" })
    expect(jugerCompte(compte({ inscritLe: null }), MAINTENANT).relancer).toBe(false)
  })
  it("l'âge est calculé, ou null, jamais NaN", () => {
    expect(ageEnHeures(ilYA(50), MAINTENANT)).toBeCloseTo(50, 5)
    expect(ageEnHeures("bidon", MAINTENANT)).toBeNull()
    expect(ageEnHeures(null, MAINTENANT)).toBeNull()
  })
})

describe("la requête envoyée à la base", () => {
  it("encadre exactement la fenêtre, pour ne pas ramener tous les comptes", () => {
    const f = fenetreInscription(MAINTENANT)
    expect(jugerCompte(compte({ inscritLe: f.jusqua }), MAINTENANT).relancer).toBe(true)
    expect(jugerCompte(compte({ inscritLe: f.depuis }), MAINTENANT).relancer).toBe(false)
    expect(Date.parse(f.depuis)).toBeLessThan(Date.parse(f.jusqua))
  })
})

describe("le tri d'une liste", () => {
  it("ne garde que les comptes éligibles", () => {
    const liste = [
      compte({ id: "neuf", inscritLe: ilYA(3) }),
      compte({ id: "bon" }),
      compte({ id: "actif", nbPages: 4 }),
      compte({ id: "vieux", inscritLe: ilYA(500) }),
      compte({ id: "bon2", inscritLe: ilYA(60) }),
    ]
    expect(comptesARelancer(liste, MAINTENANT).map(c => c.id)).toEqual(["bon", "bon2"])
  })
  it("une liste vide ne pose pas de problème", () => {
    expect(comptesARelancer([], MAINTENANT)).toEqual([])
  })
})

describe("le prénom", () => {
  it("garde le premier mot, borné", () => {
    expect(prenom("Marcel Dupont")).toBe("Marcel")
    expect(prenom("  Léa  ")).toBe("Léa")
    expect(prenom("x".repeat(80)).length).toBe(40)
  })
  it("rend une chaîne vide plutôt que d'inventer", () => {
    expect(prenom(null)).toBe("")
    expect(prenom("   ")).toBe("")
  })
})

// Les trois seuls comptes que compte la base, avec leurs vraies dates
// d'inscription (identités anonymisées : on ne met pas l'adresse d'une personne
// réelle dans un dépôt). C'est le cas d'usage entier du produit à ce jour.
describe("confrontation aux comptes réels", () => {
  const REELS: Compte[] = [
    { id: "proprio", email: "a@exemple.fr", nom: "Le propriétaire", inscritLe: "2026-06-15T18:50:29.739Z", nbPages: 12 },
    { id: "test", email: "b@exemple.fr", nom: null, inscritLe: "2026-08-04T16:30:36.204Z", nbPages: 0 },
    { id: "inscrit", email: "c@exemple.fr", nom: "L'inscrit", inscritLe: "2026-08-24T11:01:07.438Z", nbPages: 0 },
  ]
  const passageDu = (jour: string) => comptesARelancer(REELS, new Date(`${jour}T09:00:00.000Z`)).map(c => c.id)

  it("le seul vrai inscrit est retenu, et une seule fois", () => {
    expect(passageDu("2026-08-25")).toEqual([])
    expect(passageDu("2026-08-26")).toEqual([])
    expect(passageDu("2026-08-27")).toEqual(["inscrit"])
    expect(passageDu("2026-08-28")).toEqual([])
    expect(passageDu("2026-08-30")).toEqual([])
  })

  it("le propriétaire n'est jamais relancé : il a douze pages", () => {
    const v = jugerCompte(REELS[0], new Date("2026-06-17T09:00:00.000Z"))
    expect(v).toMatchObject({ relancer: false, motif: "a_deja_cree" })
  })

  it("un compte de test créé pour la QA reste éligible s'il tombe dans la fenêtre", () => {
    // Rien ne le distingue d'un vrai compte : c'est au propriétaire de faire
    // le ménage, pas à ce module de deviner.
    expect(jugerCompte(REELS[1], new Date("2026-08-07T09:00:00.000Z")).relancer).toBe(true)
  })
})

// Le lien entre la décision et son application : sans cron déclaré, le module
// le mieux testé du monde ne s'exécute jamais.
describe("la relance est réellement programmée", () => {
  it("le cron quotidien est déclaré et vise la bonne route", () => {
    const conf = JSON.parse(readFileSync(join(__dirname, "../../../../vercel.json"), "utf8"))
    const relance = (conf.crons ?? []).find((c: { path: string }) => c.path.startsWith("/api/cron/relance"))
    expect(relance, "aucun cron /api/cron/relance dans vercel.json").toBeTruthy()
    // Quotidien : la fenêtre de 48-72 h suppose un passage par jour. Un passage
    // hebdomadaire raterait la plupart des inscrits.
    expect(relance.schedule).toMatch(/^\S+ \S+ \* \* \*$/)
  })

  it("la route refuse sans secret, comme les autres crons", () => {
    const src = readFileSync(join(__dirname, "../app/api/cron/relance/route.ts"), "utf8")
    // Le contrôle est commun aux cinq tâches (lib/gardeCron) : mêmes messages, et
    // surtout un refus TRACÉ dans le journal — sinon un CRON_SECRET absent laisse
    // exactement la même trace qu'une tâche jamais déclenchée : aucune.
    expect(src).toContain("gardeCron(req, TACHE")
    // Le 401 est rendu par la garde commune ; c'est elle qui doit le prouver.
    const garde = readFileSync(join(__dirname, "./gardeCron.ts"), "utf8")
    expect(garde).toMatch(/status: 401/)
    expect(garde, "une clé d'envoi absente n'est pas une panne du serveur").toMatch(/status: 503/)
  })

  it("la route n'interroge que la fenêtre, jamais toute la table", () => {
    const src = readFileSync(join(__dirname, "../app/api/cron/relance/route.ts"), "utf8")
    expect(src).toContain("fenetreInscription")
    expect(src).toMatch(/\.gte\("created_at", depuis\)/)
    expect(src).toMatch(/\.lt\("created_at", jusqua\)/)
  })
})
