import { describe, it, expect } from "vitest"
import { buildSupportFunnel, supportTotals, defaultSupportLabel } from "./supportFunnel"

const qrs = [
  { id: "q1", short_code: "AAA", label: "Vitrine" },
  { id: "q2", short_code: "BBB", label: "" }, // pas de label -> défaut
]

describe("buildSupportFunnel", () => {
  it("attribue scan (par qr_code_id) et vue/clic/conv (par qr_source) au bon support", () => {
    const rows = buildSupportFunnel({
      qrs,
      scans: [{ qr_code_id: "q1" }, { qr_code_id: "q1" }, { qr_code_id: "q2" }],
      views: [{ qr_source: "AAA" }, { qr_source: "BBB" }, { qr_source: null }], // null ignoré
      clicks: [{ qr_source: "AAA" }],
      conversions: [{ qr_source: "AAA" }],
    })
    const v = rows.find(r => r.id === "q1")!
    expect(v.label).toBe("Vitrine")
    expect([v.scans, v.views, v.clicks, v.conversions]).toEqual([2, 1, 1, 1])
    expect(v.viewRate).toBeCloseTo(0.5) // 1 vue / 2 scans
    expect(v.clickRate).toBe(1)         // 1 clic / 1 vue
    expect(v.convRate).toBe(1)          // 1 conv / 1 clic

    const b = rows.find(r => r.id === "q2")!
    expect(b.label).toBe(defaultSupportLabel("BBB"))
    expect([b.scans, b.views, b.clicks]).toEqual([1, 1, 0])
    expect(b.clickRate).toBe(0)   // 0 clic / 1 vue
    expect(b.convRate).toBeNull() // 0 clic -> taux conv indéfini
  })

  it("ignore les qr_source inconnus (support supprimé / trafic direct)", () => {
    const rows = buildSupportFunnel({ qrs, scans: [], views: [{ qr_source: "ZZZ" }, { qr_source: null }], clicks: [], conversions: [] })
    expect(rows.every(r => r.views === 0)).toBe(true)
  })

  it("trie par scans décroissants", () => {
    const rows = buildSupportFunnel({ qrs, scans: [{ qr_code_id: "q2" }, { qr_code_id: "q2" }, { qr_code_id: "q1" }], views: [], clicks: [], conversions: [] })
    expect(rows[0].id).toBe("q2")
  })

  it("supportTotals agrège toutes les lignes", () => {
    const rows = buildSupportFunnel({
      qrs,
      scans: [{ qr_code_id: "q1" }, { qr_code_id: "q2" }],
      views: [{ qr_source: "AAA" }, { qr_source: "BBB" }],
      clicks: [{ qr_source: "AAA" }],
      conversions: [],
    })
    const t = supportTotals(rows)
    expect([t.scans, t.views, t.clicks, t.conversions]).toEqual([2, 2, 1, 0])
    expect(t.viewRate).toBe(1)     // 2 vues / 2 scans
    expect(t.clickRate).toBe(0.5)  // 1 clic / 2 vues
    expect(t.convRate).toBe(0)     // 0 conv / 1 clic
  })
})
