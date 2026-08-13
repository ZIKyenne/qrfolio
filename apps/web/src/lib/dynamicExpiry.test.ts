import { describe, it, expect } from "vitest"
import { daysUntil, expiryAlertStage, expiryHorizonIso, DAY_MS } from "./dynamicExpiry"

const now = new Date("2026-08-13T12:00:00.000Z")
const inDays = (d: number) => new Date(now.getTime() + d * DAY_MS).toISOString()

describe("daysUntil", () => {
  it("arrondit au jour supérieur", () => {
    expect(daysUntil(inDays(3), now)).toBe(3)
    expect(daysUntil(inDays(2.5), now)).toBe(3)
    expect(daysUntil(inDays(0.5), now)).toBe(1)
  })
  it("négatif si déjà expiré", () => {
    expect(daysUntil(inDays(-1), now)).toBe(-1)
  })
  it("null si date absente ou invalide", () => {
    expect(daysUntil(null, now)).toBeNull()
    expect(daysUntil(undefined, now)).toBeNull()
    expect(daysUntil("pas une date", now)).toBeNull()
  })
})

describe("expiryAlertStage", () => {
  it("J-3 -> d3, J-1 -> d1", () => {
    expect(expiryAlertStage(3)).toBe("d3")
    expect(expiryAlertStage(1)).toBe("d1")
  })
  it("aucune alerte hors paliers", () => {
    for (const d of [5, 4, 2, 0, -1]) expect(expiryAlertStage(d)).toBeNull()
    expect(expiryAlertStage(null)).toBeNull()
  })
  it("chaîne daysUntil -> stage sur des cas réels", () => {
    expect(expiryAlertStage(daysUntil(inDays(2.4), now))).toBe("d3") // ceil 3
    expect(expiryAlertStage(daysUntil(inDays(0.2), now))).toBe("d1") // ceil 1
    expect(expiryAlertStage(daysUntil(inDays(1.4), now))).toBeNull() // ceil 2
  })
})

describe("expiryHorizonIso", () => {
  it("borne > 3 jours pour couvrir le palier J-3", () => {
    const h = Date.parse(expiryHorizonIso(now))
    expect(h).toBeGreaterThan(now.getTime() + 3 * DAY_MS)
    expect(h).toBeLessThan(now.getTime() + 4 * DAY_MS)
  })
})
