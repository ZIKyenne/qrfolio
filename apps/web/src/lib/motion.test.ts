import { describe, it, expect } from "vitest"
import { DURATION, EASE, anim, transition } from "./motion"

describe("Motion System", () => {
  it("durées strictement croissantes (instant < fast < base < sheet < slow)", () => {
    const order: (keyof typeof DURATION)[] = ["instant", "fast", "base", "sheet", "slow"]
    for (let i = 1; i < order.length; i++) {
      expect(DURATION[order[i]]).toBeGreaterThan(DURATION[order[i - 1]])
    }
  })

  it("aligne fast/base/sheet sur les tokens mobile (T.motion)", () => {
    // Cohérence cross-plateforme : mêmes durées clés que components/mobile/designTokens.
    expect(DURATION.fast).toBe(120)
    expect(DURATION.base).toBe(250)
    expect(DURATION.sheet).toBe(300)
  })

  it("chaque easing est un cubic-bezier valide (4 paramètres)", () => {
    for (const v of Object.values(EASE)) {
      const m = v.match(/^cubic-bezier\(([^)]+)\)$/)
      expect(m, v).not.toBeNull()
      expect(m![1].split(",").length).toBe(4)
    }
  })

  it("anim() compose nom + durée + ease (+ extra)", () => {
    expect(anim("mo-fade-up")).toBe("mo-fade-up 250ms cubic-bezier(.2,.8,.2,1)")
    expect(anim("mo-spin", "fast", "standard", "infinite")).toBe(
      "mo-spin 120ms cubic-bezier(.2,.8,.2,1) infinite",
    )
    expect(anim("mo-pop-in", "slow", "spring")).toBe(
      "mo-pop-in 400ms cubic-bezier(.34,1.56,.64,1)",
    )
  })

  it("transition() gère une ou plusieurs propriétés", () => {
    expect(transition("transform")).toBe("transform 120ms cubic-bezier(.2,.8,.2,1)")
    expect(transition(["transform", "opacity"], "base", "emphasized")).toBe(
      "transform 250ms cubic-bezier(.4,0,.2,1), opacity 250ms cubic-bezier(.4,0,.2,1)",
    )
  })
})
