import { describe, it, expect, vi } from "vitest"
import { rateLimit, ipOf } from "./rateLimit"

// Sans UPSTASH_* dans l'env de test, rateLimit utilise le repli mémoire.
// On garde des clés uniques par test pour éviter que les compteurs se croisent.

describe("rateLimit (repli mémoire)", () => {
  it("laisse passer les `max` premiers appels puis bloque", async () => {
    const key = "test:basic:" + Math.random()
    expect(await rateLimit(key, 3, 60_000)).toBe(true)
    expect(await rateLimit(key, 3, 60_000)).toBe(true)
    expect(await rateLimit(key, 3, 60_000)).toBe(true)
    expect(await rateLimit(key, 3, 60_000)).toBe(false) // 4e bloqué
    expect(await rateLimit(key, 3, 60_000)).toBe(false)
  })

  it("compte les clés indépendamment", async () => {
    const a = "test:indep:a:" + Math.random()
    const b = "test:indep:b:" + Math.random()
    expect(await rateLimit(a, 1, 60_000)).toBe(true)
    expect(await rateLimit(a, 1, 60_000)).toBe(false)
    // b n'est pas affecté par la saturation de a
    expect(await rateLimit(b, 1, 60_000)).toBe(true)
  })

  it("réautorise après expiration de la fenêtre", async () => {
    vi.useFakeTimers()
    try {
      const key = "test:window:" + Math.random()
      expect(await rateLimit(key, 1, 1_000)).toBe(true)
      expect(await rateLimit(key, 1, 1_000)).toBe(false)
      vi.advanceTimersByTime(1_001)
      expect(await rateLimit(key, 1, 1_000)).toBe(true) // nouvelle fenêtre
    } finally {
      vi.useRealTimers()
    }
  })
})

describe("ipOf", () => {
  it("prend la première IP de x-forwarded-for", () => {
    const req = new Request("https://x.test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    })
    expect(ipOf(req)).toBe("1.2.3.4")
  })
  it("retombe sur 'unknown' sans en-tête", () => {
    expect(ipOf(new Request("https://x.test"))).toBe("unknown")
  })
})
