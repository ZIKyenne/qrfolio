import { describe, it, expect } from "vitest"
import { TEMPLATES, TEMPLATE_BY_ID, filterTemplates } from "./templates"
import { STYLE_BY_ID, LAYOUT_BY_ID, ITEM_BY_ID } from "./catalog"

// Compositions connues (définies côté client PrintStudioClient) — garde-fou : un `comp` de template doit exister.
const KNOWN_COMPS = ["scannez", "avis", "wifi", "suivre", "reserver", "fidelite"]
const ACCENTS = ["auto", "or", "rouge", "corail", "vert", "bleu", "violet", "rose"]

describe("Print Studio — moteur de templates", () => {
  it("au moins 10 modèles, ids uniques", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(10)
    const ids = new Set(TEMPLATES.map(t => t.id))
    expect(ids.size).toBe(TEMPLATES.length)
  })

  it("chaque look référence un style et une mise en page valides", () => {
    for (const t of TEMPLATES) {
      expect(STYLE_BY_ID[t.look.style], `style ${t.look.style} (${t.id})`).toBeTruthy()
      expect(LAYOUT_BY_ID[t.look.layout], `layout ${t.look.layout} (${t.id})`).toBeTruthy()
      expect(ACCENTS).toContain(t.look.accent)
    }
  })

  it("chaque support recommandé est un item existant", () => {
    for (const t of TEMPLATES) {
      expect(t.supports.length).toBeGreaterThan(0)
      for (const s of t.supports) expect(ITEM_BY_ID[s], `support ${s} (${t.id})`).toBeTruthy()
    }
  })

  it("chaque variante référence un style/accent valide et une couleur hex", () => {
    for (const t of TEMPLATES) {
      for (const v of t.variants || []) {
        if (v.style) expect(STYLE_BY_ID[v.style], `variant style ${v.style} (${t.id})`).toBeTruthy()
        if (v.accent) expect(ACCENTS).toContain(v.accent)
        expect(v.hex).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    }
  })

  it("chaque composition référencée existe", () => {
    for (const t of TEMPLATES) if (t.comp) expect(KNOWN_COMPS, `comp ${t.comp} (${t.id})`).toContain(t.comp)
  })

  it("taxonomie non vide (business, objectif, orientation)", () => {
    for (const t of TEMPLATES) {
      expect(t.business.length).toBeGreaterThan(0)
      expect(t.objective.length).toBeGreaterThan(0)
      expect(["portrait", "paysage", "carré"]).toContain(t.orientation)
    }
  })

  it("contenu : un titre par défaut", () => {
    for (const t of TEMPLATES) expect(typeof t.content.title).toBe("string")
  })

  it("filterTemplates : renvoie tous les modèles, pertinents d'abord", () => {
    const all = filterTemplates(null)
    expect(all.length).toBe(TEMPLATES.length)
    const menuItem = ITEM_BY_ID["i11"]           // porte-menu A4
    const sorted = filterTemplates(menuItem)
    expect(sorted.length).toBe(TEMPLATES.length)
    // « Menu · Luxe » recommande i11 -> doit remonter en tête.
    expect(sorted[0].id).toBe("menu-luxe")
    expect(TEMPLATE_BY_ID["menu-luxe"]).toBeTruthy()
  })
})
