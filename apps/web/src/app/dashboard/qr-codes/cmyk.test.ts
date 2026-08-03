import { describe, it, expect } from "vitest"
import { rgbToCmyk, cmykToRgb, outOfCmykGamut, countOutOfGamut } from "./cmyk"

describe("rgbToCmyk", () => {
  it("noir -> k=1", () => expect(rgbToCmyk(0, 0, 0)).toEqual({ c: 0, m: 0, y: 0, k: 1 }))
  it("blanc -> tout à 0", () => expect(rgbToCmyk(255, 255, 255)).toEqual({ c: 0, m: 0, y: 0, k: 0 }))
  it("rouge pur -> c=0, m=1, y=1, k=0", () => {
    const c = rgbToCmyk(255, 0, 0)
    expect(c.c).toBeCloseTo(0, 5); expect(c.m).toBeCloseTo(1, 5); expect(c.y).toBeCloseTo(1, 5); expect(c.k).toBeCloseTo(0, 5)
  })
})

describe("cmykToRgb (roundtrip)", () => {
  it("préserve approximativement une couleur", () => {
    const rgb = cmykToRgb(rgbToCmyk(20, 130, 200))
    expect(rgb.r).toBeCloseTo(20, -1); expect(rgb.g).toBeCloseTo(130, -1); expect(rgb.b).toBeCloseTo(200, -1)
  })
})

describe("outOfCmykGamut (heuristique)", () => {
  it("couleurs vives = à risque", () => {
    expect(outOfCmykGamut("#00FF41")).toBe(true) // vert néon
    expect(outOfCmykGamut("#00F2EA")).toBe(true) // cyan électrique
  })
  it("couleurs sûres = OK", () => {
    expect(outOfCmykGamut("#000000")).toBe(false) // noir
    expect(outOfCmykGamut("#FFFFFF")).toBe(false) // blanc (saturation 0)
    expect(outOfCmykGamut("#14274E")).toBe(false) // navy foncé
    expect(outOfCmykGamut("#B91C1C")).toBe(false) // rouge sombre (valeur pas assez haute)
  })
  it("hex invalide -> false", () => expect(outOfCmykGamut("nope")).toBe(false))
})

describe("countOutOfGamut", () => {
  it("compte les couleurs à risque, ignore vides/invalides", () => {
    expect(countOutOfGamut(["#00FF41", "#000000", undefined, "", "#00F2EA", "bad"])).toBe(2)
  })
})
