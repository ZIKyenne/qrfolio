import { describe, it, expect } from "vitest"
import { formatDay, buildDailyData, buildDeviceData, buildSourceData, buildScrollFunnel, buildBlockImpressions, blockCtr, buildBlockDwell, buildFunnel, buildTapGrid, buildTapsByBlock, countTaps, type PageEvent } from "./analyticsAgg"

// now fixe pour des fenetres glissantes deterministes : 2026-07-07T12:00:00Z
const NOW = Date.parse("2026-07-07T12:00:00Z")

describe("formatDay", () => {
  it("formate jour/mois sans zero", () => {
    expect(formatDay("2026-07-05")).toBe("5/7")
    expect(formatDay("2026-12-25")).toBe("25/12")
  })
})

describe("buildDailyData", () => {
  it("renvoie exactement 30 jours, du plus ancien au plus recent", () => {
    const d = buildDailyData([], [], NOW)
    expect(d).toHaveLength(30)
    // dernier bucket = aujourd'hui (07/07)
    expect(d[29].date).toBe("7/7")
    // premier bucket = il y a 29 jours (08/06)
    expect(d[0].date).toBe("8/6")
  })
  it("jours sans evenement -> 0 (pas de trous)", () => {
    const d = buildDailyData([], [], NOW)
    expect(d.every(p => p.scans === 0 && p.views === 0)).toBe(true)
  })
  it("compte scans et vues dans le bon bucket", () => {
    const scans = [{ scanned_at: "2026-07-07T09:00:00Z" }, { scanned_at: "2026-07-07T10:00:00Z" }, { scanned_at: "2026-07-06T10:00:00Z" }]
    const views = [{ viewed_at: "2026-07-07T08:00:00Z" }]
    const d = buildDailyData(scans, views, NOW)
    const today = d[29], yday = d[28]
    expect(today.scans).toBe(2)
    expect(today.views).toBe(1)
    expect(yday.scans).toBe(1)
    expect(yday.views).toBe(0)
  })
  it("ignore les evenements hors fenetre (plus de 30 jours)", () => {
    const scans = [{ scanned_at: "2026-01-01T00:00:00Z" }]
    const d = buildDailyData(scans, [], NOW)
    expect(d.reduce((a, p) => a + p.scans, 0)).toBe(0)
  })
})

describe("buildDeviceData", () => {
  it("compte par appareil", () => {
    const r = buildDeviceData([{ scanned_at: "x", device: "mobile" }, { scanned_at: "x", device: "mobile" }, { scanned_at: "x", device: "desktop" }])
    expect(r).toContainEqual({ name: "mobile", value: 2 })
    expect(r).toContainEqual({ name: "desktop", value: 1 })
  })
  it("appareil manquant -> 'unknown'", () => {
    const r = buildDeviceData([{ scanned_at: "x" }, { scanned_at: "x", device: null }])
    expect(r).toContainEqual({ name: "unknown", value: 2 })
  })
  it("liste vide -> []", () => {
    expect(buildDeviceData([])).toEqual([])
  })
})

describe("buildSourceData", () => {
  // Le graphique affiche `name` tel quel : l'agrégation rend donc le nom LISIBLE.
  // Avant, le commerçant lisait « qr_scan » et « direct » sur son tableau de bord,
  // parce que les libellés français vivaient dans un composant que plus rien ne montait.
  it("compte par source, et rend un nom lisible", () => {
    const r = buildSourceData([{ viewed_at: "x", source: "instagram" }, { viewed_at: "x", source: "instagram" }, { viewed_at: "x", source: "google" }])
    expect(r).toContainEqual({ name: "Instagram", value: 2 })
    expect(r).toContainEqual({ name: "Google", value: 1 })
  })
  it("un scan de QR code est nommé en toutes lettres", () => {
    const r = buildSourceData([{ viewed_at: "x", source: "qr_scan" }])
    expect(r).toContainEqual({ name: "QR Scan", value: 1 })
  })
  it("le trafic venu du site lui-même est nommé pour le client, pas pour nous", () => {
    const r = buildSourceData([{ viewed_at: "x", source: "interne" }])
    expect(r).toContainEqual({ name: "Votre site", value: 1 })
  })
  it("la source la plus fréquente arrive en tête", () => {
    const r = buildSourceData([
      { viewed_at: "x", source: "google" },
      { viewed_at: "x", source: "qr_scan" }, { viewed_at: "x", source: "qr_scan" },
    ])
    expect(r[0]).toEqual({ name: "QR Scan", value: 2 })
  })
  it("source absente/vide -> 'direct'", () => {
    const r = buildSourceData([{ viewed_at: "x" }, { viewed_at: "x", source: "" }, { viewed_at: "x", source: null }])
    expect(r).toContainEqual({ name: "Direct", value: 3 })
  })
})

describe("buildScrollFunnel", () => {
  const ev = (ref: string) => ({ kind: "scroll" as const, ref })
  it("compte les jalons et calcule le pct relatif au 1er (25%)", () => {
    // 4 sessions atteignent 25, 3 atteignent 50, 2 -> 75, 1 -> 100
    const events = [
      ev("25"), ev("50"), ev("75"), ev("100"),
      ev("25"), ev("50"), ev("75"),
      ev("25"), ev("50"),
      ev("25"),
    ]
    const f = buildScrollFunnel(events)
    expect(f.map(s => s.count)).toEqual([4, 3, 2, 1])
    expect(f.map(s => s.depth)).toEqual(["25%", "50%", "75%", "100%"])
    expect(f[0].pct).toBe(100)
    expect(f[3].pct).toBe(25)
  })
  it("aucun scroll -> tout a 0 (pas de division par zero)", () => {
    const f = buildScrollFunnel([{ kind: "impression", ref: "b1" }])
    expect(f.every(s => s.count === 0 && s.pct === 0)).toBe(true)
  })
})

describe("buildBlockImpressions", () => {
  it("compte les impressions par block_id (ignore le scroll)", () => {
    const counts = buildBlockImpressions([
      { kind: "impression", ref: "b1" },
      { kind: "impression", ref: "b1" },
      { kind: "impression", ref: "b2" },
      { kind: "scroll", ref: "50" },
    ])
    expect(counts).toEqual({ b1: 2, b2: 1 })
  })
  it("fenetre `since` : ne compte que les impressions posterieures a la borne (P2-25)", () => {
    const since = new Date("2026-07-15T00:00:00Z").getTime()
    const counts = buildBlockImpressions([
      { kind: "impression", ref: "b1", created_at: "2026-07-20T10:00:00Z" }, // dans la fenetre
      { kind: "impression", ref: "b1", created_at: "2026-07-10T10:00:00Z" }, // avant -> ignore
      { kind: "impression", ref: "b2", created_at: "2026-07-15T00:00:00Z" }, // borne incluse
    ], since)
    expect(counts).toEqual({ b1: 1, b2: 1 })
  })
  it("sans `since`, comptage inchange (retro-compat)", () => {
    const evs: PageEvent[] = [
      { kind: "impression", ref: "b1", created_at: "2020-01-01T00:00:00Z" },
      { kind: "impression", ref: "b1" },
    ]
    expect(buildBlockImpressions(evs)).toEqual({ b1: 2 })
  })
})

describe("blockCtr", () => {
  it("clics/impressions en %, borne a 100, null si 0 impression", () => {
    expect(blockCtr(3, 12)).toBe(25)
    expect(blockCtr(0, 10)).toBe(0)
    expect(blockCtr(5, 0)).toBeNull()
    expect(blockCtr(20, 10)).toBe(100) // borne
  })
})

describe("buildBlockDwell", () => {
  it("moyenne des durees par block_id (ignore autres kinds / valeurs nulles)", () => {
    const avg = buildBlockDwell([
      { kind: "dwell", ref: "b1", value: 10 },
      { kind: "dwell", ref: "b1", value: 20 },
      { kind: "dwell", ref: "b2", value: 5 },
      { kind: "impression", ref: "b1" },
      { kind: "dwell", ref: "b3", value: null },
    ])
    expect(avg).toEqual({ b1: 15, b2: 5 })
  })
  it("aucun dwell -> objet vide", () => {
    expect(buildBlockDwell([{ kind: "scroll", ref: "50" }])).toEqual({})
  })
  it("fenetre `since` : moyenne calculee uniquement sur la periode (P2-25)", () => {
    const since = new Date("2026-07-15T00:00:00Z").getTime()
    const avg = buildBlockDwell([
      { kind: "dwell", ref: "b1", value: 30, created_at: "2026-07-20T10:00:00Z" }, // dans la fenetre
      { kind: "dwell", ref: "b1", value: 10, created_at: "2026-07-01T10:00:00Z" }, // avant -> ignore
    ], since)
    expect(avg).toEqual({ b1: 30 })
  })
})

describe("buildFunnel", () => {
  it("pct relatif au top + taux d'abandon par etape", () => {
    const f = buildFunnel([
      { label: "Vues", count: 100 },
      { label: "Engages", count: 40 },
      { label: "Clics", count: 10 },
    ])
    expect(f.map(s => s.pctOfTop)).toEqual([100, 40, 10])
    expect(f[0].dropFromPrev).toBe(0)
    expect(f[1].dropFromPrev).toBe(60) // 100 -> 40 = -60%
    expect(f[2].dropFromPrev).toBe(75) // 40 -> 10 = -75%
  })
  it("clics > engages -> drop borne a 0, pct borne a 100 (pas de valeurs absurdes)", () => {
    const f = buildFunnel([{ label: "Vues", count: 10 }, { label: "Engages", count: 3 }, { label: "Clics", count: 5 }])
    expect(f[2].dropFromPrev).toBe(0)
    expect(f[2].pctOfTop).toBe(50)
  })
  it("aucune vue -> tout a 0 (pas de division par zero)", () => {
    const f = buildFunnel([{ label: "Vues", count: 0 }, { label: "Clics", count: 0 }])
    expect(f.every(s => s.pctOfTop === 0 && s.dropFromPrev === 0)).toBe(true)
  })
})

describe("buildTapGrid", () => {
  const tap = (x: number, y: number): PageEvent => ({ kind: "tap", ref: "-", x, y })
  it("normalise l'intensité par le max (cellule la plus dense = 1)", () => {
    const g = buildTapGrid([tap(0.1, 0.1), tap(0.1, 0.1), tap(0.9, 0.9)], 2, 2)
    expect(g[0][0]).toBe(1)      // 2 taps -> max
    expect(g[1][1]).toBe(0.5)    // 1 tap -> moitié
    expect(g[0][1]).toBe(0)
  })
  it("borne les coordonnées à la dernière cellule (x=1 -> dernière colonne)", () => {
    const g = buildTapGrid([tap(1, 1)], 3, 3)
    expect(g[2][2]).toBe(1)
  })
  it("ignore les taps hors bornes, NaN ou sans coordonnées", () => {
    const g = buildTapGrid([
      { kind: "tap", ref: "-", x: 1.5, y: 0.5 },
      { kind: "tap", ref: "-", x: 0.5, y: -0.1 },
      { kind: "tap", ref: "-", x: NaN, y: 0.5 },
      { kind: "tap", ref: "-" },
      { kind: "impression", ref: "b1", x: 0.5, y: 0.5 },
    ], 2, 2)
    expect(g.flat().every(v => v === 0)).toBe(true)
  })
  it("grille vide si aucun tap (que des zéros, dimensions respectées)", () => {
    const g = buildTapGrid([], 4, 6)
    expect(g.length).toBe(6)
    expect(g[0].length).toBe(4)
    expect(g.flat().every(v => v === 0)).toBe(true)
  })
})

describe("buildTapsByBlock / countTaps", () => {
  const evs: PageEvent[] = [
    { kind: "tap", ref: "b1", x: 0.1, y: 0.1 },
    { kind: "tap", ref: "b1", x: 0.2, y: 0.2 },
    { kind: "tap", ref: "b2", x: 0.3, y: 0.3 },
    { kind: "tap", ref: "-", x: 0.4, y: 0.4 },   // hors bloc -> ignoré par byBlock
    { kind: "impression", ref: "b1" },
  ]
  it("compte les taps par bloc, ignore '-' et les non-taps", () => {
    expect(buildTapsByBlock(evs)).toEqual({ b1: 2, b2: 1 })
  })
  it("countTaps compte tous les taps (y compris hors bloc)", () => {
    expect(countTaps(evs)).toBe(4)
  })
})
