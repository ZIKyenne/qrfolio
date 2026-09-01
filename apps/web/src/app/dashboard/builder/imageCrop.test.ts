import { describe, it, expect } from "vitest"
import { coverBaseScale, displaySize, clampOffset, computeCropRect, outputSize } from "./imageCrop"

describe("imageCrop — maths pures de recadrage", () => {
  it("coverBaseScale : couvre le cadre (max des ratios)", () => {
    // image 1000x500, cadre 200x200 → scale = max(200/1000, 200/500) = 0.4
    expect(coverBaseScale({ w: 1000, h: 500 }, { w: 200, h: 200 })).toBeCloseTo(0.4)
  })
  it("displaySize : image ≥ cadre à zoom=1", () => {
    const d = displaySize({ w: 1000, h: 500 }, { w: 200, h: 200 }, 1)
    expect(d.w).toBeGreaterThanOrEqual(200)
    expect(d.h).toBeGreaterThanOrEqual(200)
  })
  it("clampOffset : borne pour toujours couvrir le cadre", () => {
    const disp = { w: 400, h: 200 }, frame = { w: 200, h: 200 }
    expect(clampOffset({ x: 100, y: 0 }, disp, frame)).toEqual({ x: 0, y: 0 }) // pas de trou à gauche
    expect(clampOffset({ x: -999, y: 0 }, disp, frame)).toEqual({ x: -200, y: 0 }) // pas de trou à droite
  })
  it("computeCropRect : carré centré sur image carrée = image entière (zoom 1, offset 0)", () => {
    const r = computeCropRect({ w: 800, h: 800 }, { w: 200, h: 200 }, 1, { x: 0, y: 0 })
    expect(r.sx).toBeCloseTo(0); expect(r.sy).toBeCloseTo(0)
    expect(r.sw).toBeCloseTo(800); expect(r.sh).toBeCloseTo(800)
  })
  it("computeCropRect : cadre carré sur image paysage = bande centrale (source plus étroite)", () => {
    const r = computeCropRect({ w: 1000, h: 500 }, { w: 200, h: 200 }, 1, { x: 0, y: 0 })
    // cadre carré, image 2:1 → le carré source fait 500x500 (hauteur limitante)
    expect(r.sh).toBeCloseTo(500)
    expect(r.sw).toBeCloseTo(500)
  })
  it("computeCropRect : ne sort jamais de l'image", () => {
    const r = computeCropRect({ w: 640, h: 480 }, { w: 300, h: 200 }, 2.5, { x: -50, y: -30 })
    expect(r.sx).toBeGreaterThanOrEqual(0)
    expect(r.sy).toBeGreaterThanOrEqual(0)
    expect(r.sx + r.sw).toBeLessThanOrEqual(640 + 0.01)
    expect(r.sy + r.sh).toBeLessThanOrEqual(480 + 0.01)
  })
  it("outputSize : borne le plus grand côté", () => {
    expect(outputSize({ sx: 0, sy: 0, sw: 4000, sh: 2000 }, 1600)).toEqual({ w: 1600, h: 800 })
    expect(outputSize({ sx: 0, sy: 0, sw: 800, sh: 800 }, 1600)).toEqual({ w: 800, h: 800 })
  })
})

import { cadreMax, largeurModale, CADRE_MIN, CADRE_MAX, MARGE_MODALE, CHROME_MODALE } from "./imageCrop"

// Le cadre était figé à 280 px : sur un téléphone de 390 × 844, une zone de
// recadrage de 280 × 135 flottant au milieu du noir. On cadre la photo de son
// commerce à travers un timbre-poste, et le résultat s'affiche ensuite en grand
// sur la page publiée.
describe("taille du cadre de recadrage", () => {
  it("un téléphone gagne un cadre plus grand que les 280 px d'avant", () => {
    expect(cadreMax(390, 844)).toBeGreaterThan(280)
    expect(cadreMax(375, 667)).toBeGreaterThan(280)
  })

  it("le cadre ne déborde jamais de l'écran, largeur ou hauteur", () => {
    for (const [l, h] of [[320, 568], [375, 667], [390, 844], [430, 932], [844, 390], [1440, 900]]) {
      const c = cadreMax(l, h)
      if (c > CADRE_MIN) {
        expect(c).toBeLessThanOrEqual(l - MARGE_MODALE)
        expect(c).toBeLessThanOrEqual(h - CHROME_MODALE)
      }
    }
  })

  it("un écran couché est limité par la HAUTEUR, pas par la largeur", () => {
    // 844 × 390 : de la largeur à revendre, mais seulement 90 px sous le chrome.
    expect(cadreMax(844, 390)).toBe(CADRE_MIN)
  })

  it("reste borné : jamais minuscule, jamais démesuré", () => {
    expect(cadreMax(200, 300)).toBe(CADRE_MIN)
    expect(cadreMax(3000, 3000)).toBe(CADRE_MAX)
    for (const [l, h] of [[0, 0], [NaN, NaN], [-10, -10]]) {
      const c = cadreMax(l as number, h as number)
      expect(Number.isFinite(c)).toBe(true)
      expect(c).toBeGreaterThanOrEqual(CADRE_MIN)
    }
  })

  it("la fenêtre occupe la largeur utile du téléphone, sans coller aux bords", () => {
    expect(largeurModale(390)).toBe(366)
    expect(largeurModale(375)).toBe(351)
    expect(largeurModale(1440)).toBe(560)   // plafonnée sur grand écran
    expect(largeurModale(0)).toBeGreaterThanOrEqual(300)
  })
})

describe("le composant utilise vraiment la place disponible", () => {
  it("plus de taille de cadre figée dans la modale", async () => {
    const { readFileSync } = await import("node:fs")
    const { join, dirname } = await import("node:path")
    const { fileURLToPath } = await import("node:url")
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ImageCropModal.tsx"), "utf-8")
    expect(src, "la constante figée est revenue").not.toMatch(/const FRAME_MAX = \d+/)
    expect(src).toContain("cadreMax(ecran.l, ecran.h)")
    expect(src).toContain("largeurModale(ecran.l)")
    // ...et le cadre se recalcule quand l'écran change (rotation, barre d'URL).
    expect(src).toContain("orientationchange")
  })
})
