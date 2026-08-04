import { describe, it, expect } from "vitest"
import { BUILDER_UI, toneColor } from "./builderUi"

// Garde-fou des tokens visuels centralisés (C07). Vérifie la cohérence, pas des pixels.

describe("BUILDER_UI tokens", () => {
  it("expose les familles attendues", () => {
    for (const k of ["surface", "border", "text", "radius", "space", "tone", "font", "motion"]) {
      expect(BUILDER_UI, k).toHaveProperty(k)
    }
  })
  it("rayons croissants et cohérents", () => {
    expect(BUILDER_UI.radius.sm).toBeLessThan(BUILDER_UI.radius.md)
    expect(BUILDER_UI.radius.md).toBeLessThan(BUILDER_UI.radius.lg)
    expect(BUILDER_UI.radius.pill).toBe(999)
  })
  it("échelle d'espacement croissante", () => {
    const s = BUILDER_UI.space
    expect([s.xs, s.sm, s.md, s.lg, s.xl]).toEqual([...[s.xs, s.sm, s.md, s.lg, s.xl]].sort((a, b) => a - b))
  })
  it("cibles tactiles : mobile ≥ 44 px", () => {
    expect(BUILDER_UI.tap.mobile).toBeGreaterThanOrEqual(44)
  })
  it("muted canonique = valeur historique (adoption value-preserving)", () => {
    expect(BUILDER_UI.text.muted).toBe("#8A8478")
    expect(BUILDER_UI.text.ink).toContain("--ink")
    expect(BUILDER_UI.text.accent).toBe("var(--accent)")
  })
  it("le doré passe par des tokens (pas de surfaces dorées pleines)", () => {
    // les fonds accent sont des mélanges transparents, jamais du doré plein
    expect(BUILDER_UI.accentBg.soft).toContain("transparent")
    expect(BUILDER_UI.accentBg.chip).toContain("transparent")
  })
  it("toneColor mappe les tons + repli muted", () => {
    expect(toneColor("success")).toBe("var(--success)")
    expect(toneColor("danger")).toBe("var(--danger)")
    expect(toneColor("inconnu")).toBe(BUILDER_UI.text.muted)
  })
  it("durées de motion courtes (≤ 220 ms)", () => {
    expect(parseInt(BUILDER_UI.motion.base)).toBeLessThanOrEqual(220)
    expect(parseInt(BUILDER_UI.motion.fast)).toBeLessThanOrEqual(220)
  })
})
