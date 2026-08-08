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
