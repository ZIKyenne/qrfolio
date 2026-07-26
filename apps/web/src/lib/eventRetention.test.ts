import { describe, it, expect } from "vitest"
import { EVENT_TABLES, RETENTION_DAYS, retentionCutoffISO } from "./eventRetention"

describe("eventRetention", () => {
  it("le cutoff est bien `days` avant `now`", () => {
    const now = new Date("2026-07-26T12:00:00.000Z")
    const cutoff = retentionCutoffISO(now, 10)
    expect(cutoff).toBe("2026-07-16T12:00:00.000Z")
  })

  it("utilise RETENTION_DAYS par défaut", () => {
    const now = new Date("2026-07-26T00:00:00.000Z")
    const expected = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString()
    expect(retentionCutoffISO(now)).toBe(expected)
  })

  it("couvre les 4 tables d'events avec la bonne colonne temporelle", () => {
    const map = Object.fromEntries(EVENT_TABLES.map(t => [t.table, t.column]))
    expect(map).toEqual({
      scans: "scanned_at",
      page_views: "viewed_at",
      block_clicks: "clicked_at",
      page_events: "created_at",
    })
  })

  it("RETENTION_DAYS est généreux (>= 1 an)", () => {
    expect(RETENTION_DAYS).toBeGreaterThanOrEqual(365)
  })
})
