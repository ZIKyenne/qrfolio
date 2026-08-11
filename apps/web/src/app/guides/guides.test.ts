import { describe, it, expect } from "vitest"
import { GUIDES, GUIDE_SLUGS, GUIDE_ORDER, getGuide } from "./guides"
import { VERTICAL_SLUGS } from "../qr-code/verticals"

describe("guides — intégrité des données", () => {
  it("la clé == le slug de chaque guide", () => {
    for (const [key, g] of Object.entries(GUIDES)) expect(g.slug).toBe(key)
  })

  it("GUIDE_ORDER couvre exactement les slugs existants", () => {
    expect([...GUIDE_ORDER].sort()).toEqual([...GUIDE_SLUGS].sort())
  })

  it("champs requis non vides + méta dans les limites SERP", () => {
    for (const g of Object.values(GUIDES)) {
      expect(g.metaTitle.length).toBeGreaterThan(10)
      expect(g.metaDescription.length).toBeGreaterThan(50)
      expect(g.metaDescription.length).toBeLessThanOrEqual(165)
      expect(g.h1.length).toBeGreaterThan(5)
      expect(g.lede.length).toBeGreaterThan(20)
      expect(g.tldr.length).toBeGreaterThan(40) // réponse directe substantielle (GEO)
      expect(g.sections.length).toBeGreaterThanOrEqual(3)
      expect(g.faq.length).toBeGreaterThanOrEqual(3)
      expect(g.cta.length).toBeGreaterThan(5)
    }
  })

  it("chaque section a un titre et au moins un contenu (body/bullets/table)", () => {
    for (const g of Object.values(GUIDES)) {
      for (const s of g.sections) {
        expect(s.h2.trim().length).toBeGreaterThan(3)
        const hasContent = (s.body?.length || 0) + (s.bullets?.length || 0) + (s.table ? 1 : 0)
        expect(hasContent).toBeGreaterThan(0)
        if (s.table) {
          expect(s.table.head.length).toBeGreaterThan(1)
          for (const row of s.table.rows) expect(row.length).toBe(s.table.head.length)
        }
      }
    }
  })

  it("guides liés (related) valides et non auto-référencés", () => {
    for (const g of Object.values(GUIDES)) {
      for (const r of g.related) {
        expect(GUIDE_SLUGS).toContain(r)
        expect(r).not.toBe(g.slug)
      }
    }
  })

  it("relatedUsages pointent tous vers de vraies verticales /qr-code", () => {
    for (const g of Object.values(GUIDES)) {
      for (const u of g.relatedUsages) expect(VERTICAL_SLUGS).toContain(u)
    }
  })

  it("getGuide renvoie le bon guide ou undefined", () => {
    expect(getGuide("qr-code-scannable")?.slug).toBe("qr-code-scannable")
    expect(getGuide("inexistant")).toBeUndefined()
  })
})
