import { describe, it, expect } from "vitest"
import { VERTICALS, VERTICAL_SLUGS, VERTICAL_ORDER, getVertical } from "./verticals"

describe("verticals — intégrité des données", () => {
  it("la clé de l'objet == le slug de chaque vertical", () => {
    for (const [key, v] of Object.entries(VERTICALS)) expect(v.slug).toBe(key)
  })

  it("VERTICAL_ORDER couvre exactement les slugs existants", () => {
    expect([...VERTICAL_ORDER].sort()).toEqual([...VERTICAL_SLUGS].sort())
  })

  it("chaque vertical a les champs requis non vides", () => {
    for (const v of Object.values(VERTICALS)) {
      expect(v.metaTitle.length).toBeGreaterThan(10)
      expect(v.metaDescription.length).toBeGreaterThan(50)
      expect(v.metaDescription.length).toBeLessThanOrEqual(165) // limite raisonnable SERP
      expect(v.h1.length).toBeGreaterThan(5)
      expect(v.intro.length).toBeGreaterThan(20)
      expect(v.problems.length).toBeGreaterThanOrEqual(2)
      expect(v.features.length).toBeGreaterThanOrEqual(3)
      expect(v.steps.length).toBeGreaterThanOrEqual(3)
      expect(v.faq.length).toBeGreaterThanOrEqual(3)
      expect(v.ctaTitle.length).toBeGreaterThan(5)
    }
  })

  it("les slugs liés (related) existent tous et ne se pointent pas eux-mêmes", () => {
    for (const v of Object.values(VERTICALS)) {
      for (const r of v.related) {
        expect(VERTICAL_SLUGS).toContain(r)
        expect(r).not.toBe(v.slug)
      }
    }
  })

  it("chaque entrée FAQ a une question et une réponse non vides", () => {
    for (const v of Object.values(VERTICALS)) {
      for (const f of v.faq) {
        expect(f.q.trim().length).toBeGreaterThan(5)
        expect(f.a.trim().length).toBeGreaterThan(10)
      }
    }
  })

  it("getVertical renvoie le bon vertical ou undefined", () => {
    expect(getVertical("restaurant")?.slug).toBe("restaurant")
    expect(getVertical("inexistant")).toBeUndefined()
  })
})
