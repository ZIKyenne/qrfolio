import { describe, it, expect } from "vitest"
import {
  PRINT_SUPPORTS,
  supportById,
  supportsByCategory,
  exportWFor,
  idealExportW300,
  bleedPx,
  supportExportInput,
  supportPreflightBaseline,
  legacyFormats,
  legacyFormatMm,
} from "./printSupports"
import { exportPlan } from "./exportPlan"

describe("printSupports — intégrité du catalogue", () => {
  it("n'a pas d'ID en double", () => {
    const ids = PRINT_SUPPORTS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("chaque support a des valeurs cohérentes", () => {
    for (const s of PRINT_SUPPORTS) {
      expect(s.label.length).toBeGreaterThan(0)
      expect(s.ratio).toBeGreaterThan(0)
      expect(s.exportW).toBeGreaterThan(0)
      expect(s.mm).toBeGreaterThanOrEqual(0)
      expect(s.bleedMm).toBeGreaterThanOrEqual(0)
      expect(s.safeMarginMm).toBeGreaterThanOrEqual(0)
      expect(s.dpi).toBeGreaterThan(0)
      expect(s.hint.length).toBeGreaterThan(0)
    }
  })

  it("écran <=> mm 0 (cohérence isScreen / physique)", () => {
    for (const s of PRINT_SUPPORTS) {
      if (s.isScreen) {
        expect(s.mm).toBe(0)
        expect(s.bleedMm).toBe(0)
      } else {
        expect(s.mm).toBeGreaterThan(0)
      }
    }
  })

  it("les supports d'impression n'explosent pas la mémoire (< 4000 px à 300 DPI)", () => {
    for (const s of PRINT_SUPPORTS) {
      expect(s.exportW).toBeLessThanOrEqual(4000)
    }
  })
})

describe("printSupports — zéro régression sur les 6 formats historiques", () => {
  // Valeurs figées telles qu'elles étaient codées en dur dans PrintStudio.
  const HIST: Record<string, { ratio: number; exportW: number; mm: number }> = {
    a4:     { ratio: 210 / 297,   exportW: 2480, mm: 210 },
    square: { ratio: 1,           exportW: 2000, mm: 100 },
    story:  { ratio: 1080 / 1920, exportW: 1080, mm: 0 },
    carte:  { ratio: 85 / 55,     exportW: 1004, mm: 85 },
    flyer:  { ratio: 148 / 210,   exportW: 1748, mm: 148 },
    table:  { ratio: 100 / 70,    exportW: 1181, mm: 100 },
  }

  it("les 6 formats existent avec des valeurs identiques", () => {
    for (const [id, v] of Object.entries(HIST)) {
      const s = supportById(id)
      expect(s, id).toBeDefined()
      expect(s!.ratio).toBe(v.ratio)
      expect(s!.exportW).toBe(v.exportW)
      expect(s!.mm).toBe(v.mm)
    }
  })

  it("les 6 historiques sont en tête du catalogue et dans le même ordre", () => {
    const first6 = PRINT_SUPPORTS.slice(0, 6).map(s => s.id)
    expect(first6).toEqual(["a4", "square", "story", "carte", "flyer", "table"])
  })

  it("legacyFormats() reproduit la table FORMATS attendue", () => {
    const F = legacyFormats()
    expect(F.a4).toEqual({ label: "A4", ratio: 210 / 297, exportW: 2480 })
    expect(F.carte).toEqual({ label: "Carte", ratio: 85 / 55, exportW: 1004 })
    expect(Object.keys(F).slice(0, 6)).toEqual(["a4", "square", "story", "carte", "flyer", "table"])
  })

  it("legacyFormatMm() reproduit la table FORMAT_MM attendue", () => {
    const M = legacyFormatMm()
    expect(M.a4).toBe(210)
    expect(M.square).toBe(100)
    expect(M.story).toBe(0)
    expect(M.carte).toBe(85)
    expect(M.flyer).toBe(148)
    expect(M.table).toBe(100)
  })
})

describe("printSupports — exportW des supports d'impression = taille physique à 300 DPI", () => {
  it("exportW correspond à la largeur mm (à 1 px près) pour les formats print non-réseau", () => {
    // On exclut les formats écran/réseau dont exportW est un objectif de pixels
    // (square = 2000 px de qualité écran, story = 1080).
    const printish = PRINT_SUPPORTS.filter(s => !s.isScreen && s.category !== "reseau")
    for (const s of printish) {
      expect(Math.abs(s.exportW - idealExportW300(s.mm)), s.id).toBeLessThanOrEqual(1)
    }
  })
})

describe("printSupports — helpers purs", () => {
  const a4 = supportById("a4")!

  it("exportWFor scale avec le DPI", () => {
    expect(exportWFor(a4, 300)).toBe(2480)
    expect(exportWFor(a4, 150)).toBe(1240)
    expect(exportWFor(a4, 72)).toBe(Math.round(2480 * 72 / 300))
  })

  it("bleedPx reproduit le calcul de fond perdu (3 mm en A4 rendu à 2480 px)", () => {
    // 3 mm sur 210 mm de large, rendu à 2480 px -> ~35 px
    expect(bleedPx(a4, 2480)).toBe(Math.round(3 * (2480 / 210)))
  })

  it("bleedPx = 0 pour un format écran", () => {
    const story = supportById("story")!
    expect(bleedPx(story, 1080)).toBe(0)
  })

  it("supportExportInput alimente correctement exportPlan()", () => {
    const input = supportExportInput(a4, 300, "png", true)
    expect(input).toEqual({ format: "a4", exportW: 2480, ratio: 210 / 297, widthMm: 210, dpi: 300, type: "png", isPro: true })
    const plan = exportPlan(input)
    expect(plan.widthPx).toBe(2480)
    expect(plan.heightPx).toBe(Math.round(2480 / (210 / 297)))
    expect(plan.widthMm).toBe(210)
    expect(plan.allowed).toBe(true)
  })

  it("supportExportInput respecte le gating PDF (Pro)", () => {
    const plan = exportPlan(supportExportInput(a4, 300, "pdf", false))
    expect(plan.allowed).toBe(false)
    expect(plan.blockedReason).toBeTruthy()
  })

  it("supportPreflightBaseline expose dpi / marge / isScreen", () => {
    expect(supportPreflightBaseline(a4)).toEqual({ dpi: 300, edgeMarginMm: 5, isScreen: false })
    const story = supportById("story")!
    expect(supportPreflightBaseline(story).isScreen).toBe(true)
  })
})

describe("printSupports — lookups", () => {
  it("supportById renvoie undefined pour un ID inconnu", () => {
    expect(supportById("nope")).toBeUndefined()
  })

  it("supportsByCategory regroupe correctement", () => {
    const cartes = supportsByCategory("carte").map(s => s.id)
    expect(cartes).toContain("carte")
    expect(cartes).toContain("carte_portrait")
    const stickers = supportsByCategory("sticker").map(s => s.id)
    expect(stickers).toEqual(["sticker_square", "sticker_round"])
  })
})
