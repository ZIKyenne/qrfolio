import { describe, it, expect } from "vitest"
import {
  calculerTaille, distanceMaximaleCm, modulesDeLaVersion, versionPourContenu,
  support, SUPPORTS, MODULE_MINIMUM_MM, COTE_PLANCHER_MM, RAPPORT_DISTANCE,
} from "./taille"

describe("la règle du dixième", () => {
  it("un code lu à 30 cm fait 3 cm de côté", () => {
    expect(calculerTaille(30, 25).coteMm).toBe(30)
  })
  it("un code lu à 3 m fait 30 cm de côté", () => {
    expect(calculerTaille(300, 25).coteMm).toBe(300)
  })
  it("l'inverse redonne la distance", () => {
    expect(distanceMaximaleCm(30)).toBe(30)
    expect(distanceMaximaleCm(300)).toBe(300)
  })
  it("le rapport est bien de un pour dix", () => {
    expect(RAPPORT_DISTANCE).toBe(10)
  })
})

describe("le plancher", () => {
  it("on ne descend jamais sous 2 cm, même collé au nez", () => {
    const c = calculerTaille(5, 21)
    expect(c.coteMm).toBe(COTE_PLANCHER_MM)
    expect(c.contrainte).toBe("plancher")
    expect(c.explication).toMatch(/2 cm/)
  })
  it("une distance absurde ne casse pas le calcul", () => {
    expect(calculerTaille(0, 25).coteMm).toBeGreaterThanOrEqual(COTE_PLANCHER_MM)
    expect(calculerTaille(-40, 25).coteMm).toBeGreaterThanOrEqual(COTE_PLANCHER_MM)
  })
})

describe("quand c'est le contenu qui commande, pas la distance", () => {
  it("une longue adresse impose une carte de visite plus grande que la règle du dixième", () => {
    // 20 cm de lecture → 20 mm par la distance. Mais un code de 77 carrés
    // (version 15) a besoin de 77 × 0,4 = 30,8 mm pour rester imprimable.
    const c = calculerTaille(20, modulesDeLaVersion(15))
    expect(c.contrainte).toBe("definition")
    expect(c.coteMm).toBe(31)
    expect(c.explication).toMatch(/quantité de contenu/)
  })
  it("un code court à la même distance suit la règle du dixième", () => {
    // À 20 cm, la règle du dixième donne exactement 20 mm, soit le plancher.
    // Les deux disent la même chose ; on annonce la distance, plus parlante.
    const c = calculerTaille(20, 21)
    expect(c.coteMm).toBe(20)
    expect(c.contrainte).toBe("distance")
  })
  it("aucun carré ne descend jamais sous le seuil d'impression", () => {
    for (const d of [10, 20, 30, 60, 100, 200, 300, 500]) {
      for (const v of [1, 5, 10, 15, 25, 40]) {
        const c = calculerTaille(d, modulesDeLaVersion(v))
        expect(c.moduleMm, `${d} cm / version ${v}`).toBeGreaterThanOrEqual(MODULE_MINIMUM_MM)
      }
    }
  })
})

describe("modules et versions", () => {
  it("version 1 = 21 carrés, version 40 = 177", () => {
    expect(modulesDeLaVersion(1)).toBe(21)
    expect(modulesDeLaVersion(40)).toBe(177)
  })
  it("une version hors bornes est ramenée dans les bornes", () => {
    expect(modulesDeLaVersion(0)).toBe(21)
    expect(modulesDeLaVersion(99)).toBe(177)
  })
  it("plus le contenu est long, plus la version monte", () => {
    let precedente = 0
    for (const n of [10, 30, 60, 100, 200, 400, 900]) {
      const v = versionPourContenu(n)
      expect(v).toBeGreaterThanOrEqual(precedente)
      precedente = v
    }
  })
  it("une adresse courte tient dans une petite version", () => {
    expect(versionPourContenu("https://qrowg.com/marcel".length)).toBeLessThanOrEqual(3)
  })
  it("un contenu vide ou négatif ne plante pas", () => {
    expect(versionPourContenu(0)).toBe(1)
    expect(versionPourContenu(-5)).toBe(1)
  })
})

describe("les supports", () => {
  it("chaque support a une distance plausible et une note", () => {
    for (const s of SUPPORTS) {
      expect(s.distanceCm).toBeGreaterThan(0)
      expect(s.distanceCm).toBeLessThanOrEqual(500)
      expect(s.note.length).toBeGreaterThan(10)
    }
  })
  it("les clés sont uniques", () => {
    expect(new Set(SUPPORTS.map(s => s.cle)).size).toBe(SUPPORTS.length)
  })
  it("les supports sont classés du plus proche au plus lointain", () => {
    const d = SUPPORTS.map(s => s.distanceCm)
    expect([...d].sort((a, b) => a - b)).toEqual(d)
  })
  it("on retrouve un support par sa clé, et rien pour une clé inconnue", () => {
    expect(support("menu")?.nom).toBe("Menu ou chevalet de table")
    expect(support("inconnu")).toBeUndefined()
  })
  it("une carte de visite reste raisonnable, une affiche devient grande", () => {
    expect(calculerTaille(support("carte")!.distanceCm, 29).coteMm).toBeLessThanOrEqual(25)
    expect(calculerTaille(support("affiche")!.distanceCm, 29).coteMm).toBeGreaterThanOrEqual(200)
  })
})

describe("ce qui est affiché", () => {
  it("chaque contrainte a son explication, sans jargon", () => {
    const vus = new Set<string>()
    for (const [d, m] of [[5, 21], [300, 25], [20, 77]] as [number, number][]) {
      const c = calculerTaille(d, m)
      vus.add(c.contrainte)
      expect(c.explication.length).toBeGreaterThan(40)
      for (const mot of ["ISO", "px", "DPI", "quiet zone", "version"]) {
        expect(c.explication).not.toContain(mot)
      }
    }
    expect(vus.size).toBe(3)
  })
  it("le côté rendu est un entier de millimètres, jamais arrondi vers le bas", () => {
    const c = calculerTaille(23, 25)
    expect(Number.isInteger(c.coteMm)).toBe(true)
    expect(c.coteMm).toBeGreaterThanOrEqual(23)
  })
})
