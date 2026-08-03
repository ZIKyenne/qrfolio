import { describe, it, expect } from "vitest"
import {
  exportWidthPx, exportHeightPx, qualityLabel, canExportType,
  exportBlockedReason, exportFilename, recommendedDpi, exportPlan,
} from "./exportPlan"

describe("dimensions pixels", () => {
  it("largeur a 300 DPI = exportW", () => {
    expect(exportWidthPx(2480, 300)).toBe(2480)
  })
  it("largeur a 150 DPI = moitie", () => {
    expect(exportWidthPx(2480, 150)).toBe(1240)
  })
  it("largeur a 72 DPI", () => {
    expect(exportWidthPx(2480, 72)).toBe(595)
  })
  it("hauteur depuis ratio largeur/hauteur (A4 portrait)", () => {
    const w = exportWidthPx(2480, 300)
    // ratio a4 = 210/297 -> hauteur = 2480 / (210/297) = 3507,4 -> 3507
    expect(exportHeightPx(w, 210 / 297)).toBe(3507)
  })
  it("jamais < 1 px", () => {
    expect(exportWidthPx(0, 0)).toBe(1)
    expect(exportHeightPx(0, 1)).toBe(1)
  })
})

describe("qualite", () => {
  it("300+ = impression pro", () => expect(qualityLabel(300)).toMatch(/pro/i))
  it("150 = bon", () => expect(qualityLabel(150)).toMatch(/bon/i))
  it("72 = ecran", () => expect(qualityLabel(72)).toMatch(/[eé]cran/i))
})

describe("disponibilite type", () => {
  it("PNG/JPG toujours autorises", () => {
    expect(canExportType("png", false)).toBe(true)
    expect(canExportType("jpeg", false)).toBe(true)
  })
  it("PDF autorise seulement en Pro", () => {
    expect(canExportType("pdf", false)).toBe(false)
    expect(canExportType("pdf", true)).toBe(true)
  })
  it("raison de blocage PDF non-pro", () => {
    expect(exportBlockedReason("pdf", false)).toMatch(/Pro/)
    expect(exportBlockedReason("pdf", true)).toBeNull()
    expect(exportBlockedReason("png", false)).toBeNull()
  })
})

describe("nom de fichier", () => {
  it("jpeg -> extension jpg", () => {
    expect(exportFilename("a4", 300, "jpeg")).toBe("qrowg-a4-300dpi.jpg")
  })
  it("png/pdf", () => {
    expect(exportFilename("carte", 150, "png")).toBe("qrowg-carte-150dpi.png")
    expect(exportFilename("flyer", 300, "pdf")).toBe("qrowg-flyer-300dpi.pdf")
  })
})

describe("dpi conseille", () => {
  it("format physique -> 300", () => expect(recommendedDpi(210)).toBe(300))
  it("format ecran (mm=0) -> 72", () => expect(recommendedDpi(0)).toBe(72))
})

describe("exportPlan — agregat", () => {
  it("A4 300dpi PDF en Pro", () => {
    const p = exportPlan({ format: "a4", exportW: 2480, ratio: 210 / 297, widthMm: 210, dpi: 300, type: "pdf", isPro: true })
    expect(p.widthPx).toBe(2480)
    expect(p.heightPx).toBe(3507)
    expect(p.widthMm).toBe(210)
    expect(p.heightMm).toBe(297)
    expect(p.allowed).toBe(true)
    expect(p.blockedReason).toBeNull()
    expect(p.quality).toMatch(/pro/i)
    expect(p.filename).toBe("qrowg-a4-300dpi.pdf")
  })
  it("PDF non-pro => bloque avec raison", () => {
    const p = exportPlan({ format: "a4", exportW: 2480, ratio: 210 / 297, widthMm: 210, dpi: 300, type: "pdf", isPro: false })
    expect(p.allowed).toBe(false)
    expect(p.blockedReason).toMatch(/Pro/)
  })
  it("format ecran (Story) => heightMm 0", () => {
    const p = exportPlan({ format: "story", exportW: 1080, ratio: 1080 / 1920, widthMm: 0, dpi: 72, type: "png", isPro: false })
    expect(p.widthMm).toBe(0)
    expect(p.heightMm).toBe(0)
    expect(p.quality).toMatch(/[eé]cran/i)
  })
})
