import { describe, it, expect } from "vitest"
import { parseDevice, aggregateScanEvents, countryFlag, type ScanEvent } from "./scanStats"

describe("parseDevice", () => {
  it("détecte les mobiles", () => {
    expect(parseDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit Mobile")).toBe("mobile")
    expect(parseDevice("Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile Safari")).toBe("mobile")
  })
  it("détecte les tablettes (iPad, Android sans mobile)", () => {
    expect(parseDevice("Mozilla/5.0 (iPad; CPU OS 17_0) AppleWebKit Safari")).toBe("tablet")
    expect(parseDevice("Mozilla/5.0 (Linux; Android 13; SM-X200) Safari")).toBe("tablet") // pas de "mobile"
  })
  it("détecte les ordinateurs", () => {
    expect(parseDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome Safari")).toBe("desktop")
    expect(parseDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari")).toBe("desktop")
  })
  it("détecte les robots", () => {
    expect(parseDevice("Googlebot/2.1")).toBe("bot")
    expect(parseDevice("facebookexternalhit/1.1")).toBe("bot")
  })
  it("UA vide -> unknown", () => {
    expect(parseDevice("")).toBe("unknown")
    expect(parseDevice(null)).toBe("unknown")
  })
})

describe("aggregateScanEvents", () => {
  const DAY = 86400000
  const NOW = Date.parse("2026-08-11T12:00:00.000Z")
  const at = (dayOffset: number, h = 10) => new Date(NOW - dayOffset * DAY).toISOString().slice(0, 11) + `${String(h).padStart(2, "0")}:00:00.000Z`

  it("total = nombre d'événements", () => {
    const ev: ScanEvent[] = [{ scanned_at: at(0) }, { scanned_at: at(1) }, { scanned_at: at(2) }]
    expect(aggregateScanEvents(ev, 7, NOW).total).toBe(3)
  })

  it("byDay couvre exactement `days` jours en ordre chronologique, comptes corrects", () => {
    const ev: ScanEvent[] = [{ scanned_at: at(0) }, { scanned_at: at(0) }, { scanned_at: at(2) }]
    const s = aggregateScanEvents(ev, 7, NOW)
    expect(s.byDay).toHaveLength(7)
    // ordre croissant de date
    const dates = s.byDay.map(d => d.date)
    expect([...dates].sort()).toEqual(dates)
    // aujourd'hui = 2 scans, avant-hier = 1
    expect(s.byDay[s.byDay.length - 1]).toEqual({ date: "2026-08-11", count: 2 })
    expect(s.byDay[s.byDay.length - 3]).toEqual({ date: "2026-08-09", count: 1 })
  })

  it("ignore les scans hors fenêtre pour byDay mais les compte dans total", () => {
    const ev: ScanEvent[] = [{ scanned_at: at(0) }, { scanned_at: at(30) }]
    const s = aggregateScanEvents(ev, 7, NOW)
    expect(s.total).toBe(2)
    expect(s.byDay.reduce((n, d) => n + d.count, 0)).toBe(1) // seul le récent est dans la fenêtre de 7 j
  })

  it("byDevice trié décroissant, normalise les valeurs inconnues", () => {
    const ev: ScanEvent[] = [
      { scanned_at: at(0), device: "mobile" }, { scanned_at: at(0), device: "mobile" },
      { scanned_at: at(1), device: "desktop" }, { scanned_at: at(1), device: "martien" as any },
    ]
    const s = aggregateScanEvents(ev, 7, NOW)
    expect(s.byDevice[0]).toEqual({ device: "mobile", count: 2 })
    expect(s.byDevice.find(d => d.device === "unknown")?.count).toBe(1) // "martien" -> unknown
  })

  it("byCountry trié décroissant, inconnu -> ??", () => {
    const ev: ScanEvent[] = [
      { scanned_at: at(0), country: "fr" }, { scanned_at: at(0), country: "FR" },
      { scanned_at: at(1), country: "BE" }, { scanned_at: at(1) },
    ]
    const s = aggregateScanEvents(ev, 7, NOW)
    expect(s.byCountry[0]).toEqual({ country: "FR", count: 2 }) // casse normalisée
    expect(s.byCountry.find(c => c.country === "??")?.count).toBe(1)
  })

  it("peakDay = jour le plus actif (null si aucun scan)", () => {
    const ev: ScanEvent[] = [{ scanned_at: at(2) }, { scanned_at: at(2) }, { scanned_at: at(0) }]
    expect(aggregateScanEvents(ev, 7, NOW).peakDay).toEqual({ date: "2026-08-09", count: 2 })
    expect(aggregateScanEvents([], 7, NOW).peakDay).toBeNull()
  })
})

describe("countryFlag", () => {
  it("code ISO-2 -> drapeau emoji", () => {
    expect(countryFlag("FR")).toBe("🇫🇷")
    expect(countryFlag("be")).toBe("🇧🇪")
  })
  it("invalide -> globe", () => {
    expect(countryFlag("??")).toBe("🌍")
    expect(countryFlag("")).toBe("🌍")
  })
})
