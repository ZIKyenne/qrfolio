import { describe, it, expect } from "vitest"
import { destinationApresConnexion, demandeInterne, CREER_SA_PAGE, TABLEAU_DE_BORD, ECHAPPE } from "./atterrissage"
import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("où atterrit un compte neuf", () => {
  it("aucune page → on l'emmène créer sa page", () => {
    expect(destinationApresConnexion({ nbPages: 0 })).toBe(CREER_SA_PAGE)
  })
  it("au moins une page, même en brouillon → le tableau de bord a du sens", () => {
    expect(destinationApresConnexion({ nbPages: 1 })).toBeNull()
    expect(destinationApresConnexion({ nbPages: 12 })).toBeNull()
  })
})

describe("on ne détourne jamais une intention exprimée", () => {
  it("une destination demandée l'emporte, même sur un compte vide", () => {
    expect(destinationApresConnexion({ nbPages: 0, demande: "/dashboard/analytics" })).toBe("/dashboard/analytics")
    expect(destinationApresConnexion({ nbPages: 0, demande: "/dashboard/settings" })).toBe("/dashboard/settings")
  })
  it("demander le tableau de bord lui-même n'est pas une redirection", () => {
    expect(destinationApresConnexion({ nbPages: 0, demande: TABLEAU_DE_BORD })).toBeNull()
  })
  it("une adresse externe n'est pas une demande recevable", () => {
    // Sans cela, ?next=//exemple.fr enverrait chez quelqu'un d'autre.
    expect(demandeInterne("//exemple.fr")).toBeNull()
    expect(demandeInterne("https://exemple.fr")).toBeNull()
    expect(demandeInterne("exemple.fr")).toBeNull()
    expect(destinationApresConnexion({ nbPages: 0, demande: "//exemple.fr" })).toBe(CREER_SA_PAGE)
  })
  it("un chemin interne est accepté tel quel", () => {
    expect(demandeInterne("/dashboard/qr-codes")).toBe("/dashboard/qr-codes")
  })
})

describe("personne ne reste enfermé", () => {
  it("quelqu'un déjà orienté n'y est pas renvoyé en boucle", () => {
    expect(destinationApresConnexion({ nbPages: 0, dejaOriente: true })).toBeNull()
  })
  it("un compte qui a tout supprimé peut revenir au tableau de bord", () => {
    // Il sera bien réorienté une fois, mais le garde-fou lui laisse la sortie.
    expect(destinationApresConnexion({ nbPages: 0, dejaOriente: true })).toBeNull()
  })
})

describe("valeurs de destination", () => {
  it("les deux destinations sont des chemins internes du site", () => {
    for (const d of [CREER_SA_PAGE, TABLEAU_DE_BORD]) {
      expect(d.startsWith("/")).toBe(true)
      expect(d.startsWith("//")).toBe(false)
    }
  })
  it("on emmène vers l'écran de création par objectif, pas vers un éditeur vide", () => {
    // /dashboard/builder/new sans contexte redonne une page blanche : c'est
    // exactement l'écran qu'on cherche à éviter.
    expect(CREER_SA_PAGE).toBe("/dashboard/onboarding")
  })
})

// Garde-fou de branchement. Le raisonnement pur ci-dessus ne vaut que si les
// deux bouts sont réellement câblés : l'entrée du tableau de bord doit appliquer
// la règle, et le bouton « Retour » de l'écran de création doit porter la
// sortie. S'il la perd, un compte neuf se retrouve enfermé dans une boucle.
describe("les deux bouts sont câblés", () => {
  const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")

  it("l'entrée du tableau de bord applique la règle", () => {
    const src = lire("./page.tsx")
    expect(src).toContain("destinationApresConnexion")
    expect(src).toMatch(/redirect\(versCreation\)/)
  })

  it("le bouton « Retour » de l'écran de création porte la sortie", () => {
    const src = lire("./onboarding/OnboardingClient.tsx")
    expect(src, "le Retour doit pointer vers /dashboard?vue=1").toContain(`href="/dashboard?${ECHAPPE}=1"`)
    expect(src, "aucun Retour ne doit pointer vers /dashboard nu").not.toMatch(/href="\/dashboard"/)
  })

  it("la redirection se décide avant le calcul des statistiques", () => {
    // Sinon on ferait travailler la base pour un écran que personne ne verra.
    const src = lire("./page.tsx")
    expect(src.indexOf("redirect(versCreation)")).toBeLessThan(src.indexOf("monthViews"))
  })
})
