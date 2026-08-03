import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { hasPublishableContent } from "../blockEmptyState"
import { testimonialsViewModel } from "./models/testimonials"
import { businessStatsViewModel } from "./models/businessStats"
import { brandsViewModel } from "./models/brands"
import { lineupViewModel } from "./models/lineup"
import { reassuranceViewModel } from "./models/reassurance"
import { timelineViewModel } from "./models/timeline"
import { EditorTestimonials } from "./blocks/testimonials/EditorTestimonials"
import { PublicTestimonials } from "./blocks/testimonials/PublicTestimonials"
import { EditorBusinessStats } from "./blocks/business_stats/EditorBusinessStats"
import { PublicBusinessStats } from "./blocks/business_stats/PublicBusinessStats"
import { EditorBrands } from "./blocks/brands/EditorBrands"
import { PublicBrands } from "./blocks/brands/PublicBrands"
import { EditorLineup } from "./blocks/lineup/EditorLineup"
import { PublicLineup } from "./blocks/lineup/PublicLineup"
import { EditorReassurance } from "./blocks/reassurance/EditorReassurance"
import { PublicReassurance } from "./blocks/reassurance/PublicReassurance"
import { EditorTimeline } from "./blocks/timeline/EditorTimeline"
import { PublicTimeline } from "./blocks/timeline/PublicTimeline"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

const theme: any = { fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const eCtx: EditorRenderCtx = { theme, primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190", accent: "#39FF8F", surfaceStyle: { background: "#080808" }, canEdit: false, edit: () => () => {} }
const pCtx: PublicRenderCtx = { theme, G: "#C9A84C", TEXT: "#F5F0E8", MUTED: "#A8A190", FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: () => {} }
const H = (el: any) => renderToStaticMarkup(el)

describe("wave4 — modèles répétiteurs métier", () => {
  it("vide → visible false, 0 item (tous)", () => {
    expect(testimonialsViewModel({}).visible).toBe(false)
    expect(businessStatsViewModel({}).items).toEqual([])
    expect(brandsViewModel({}).visible).toBe(false)
    expect(lineupViewModel({}).items).toEqual([])
    expect(reassuranceViewModel({}).visible).toBe(false)
    expect(timelineViewModel({}).items).toEqual([])
  })
  it("rempli → visible true", () => {
    expect(testimonialsViewModel({ name1: "Alice" }).visible).toBe(true)
    expect(businessStatsViewModel({ stat1_value: "500" }).visible).toBe(true)
    expect(brandsViewModel({ brand1_name: "Nike" }).visible).toBe(true)
    expect(lineupViewModel({ a1_name: "DJ" }).visible).toBe(true)
    expect(reassuranceViewModel({ g1_label: "Garanti" }).visible).toBe(true)
    expect(timelineViewModel({ e1_title: "Fondation" }).visible).toBe(true)
  })
  it("lineup : visible == hasPublishableContent (in DETECTORS)", () => {
    expect(lineupViewModel({ a1_name: "DJ" }).visible).toBe(hasPublishableContent("lineup", { a1_name: "DJ" }))
    expect(lineupViewModel({ a1_name: "   " }).visible).toBe(hasPublishableContent("lineup", { a1_name: "   " }))
  })
  it("testimonials : index i conservé malgré le filtre, ordre préservé", () => {
    const vm = testimonialsViewModel({ name1: "", name2: "Bob", name3: "Cléo" })
    expect(vm.items.map(x => x.name)).toEqual(["Bob", "Cléo"])
    expect(vm.items.map(x => x.i)).toEqual([2, 3])
  })
  it("timeline : filtre title||date, index i conservé, layout horizontal détecté", () => {
    const vm = timelineViewModel({ e1_date: "2020", e2_title: "Étape", e3_desc: "orphelin", layout: "Horizontale" })
    expect(vm.items.map(x => x.i)).toEqual([1, 2])
    expect(vm.horizontal).toBe(true)
  })
  it("timeline : icône trim (espaces → vide)", () => {
    expect(timelineViewModel({ e1_title: "X", e1_icon: "  " }).items[0].icon).toBe("")
  })
  it("business_stats/reassurance/brands : filtres métier respectifs", () => {
    expect(businessStatsViewModel({ stat1_icon: "🚀" }).items).toEqual([]) // pas de value → ignoré
    expect(reassuranceViewModel({ g1_icon: "✅" }).items).toEqual([]) // pas de label → ignoré
    expect(brandsViewModel({ brand1_icon: "🍎" }).items).toEqual([]) // pas de name → ignoré
  })
  it("limites : testimonials plafonné à 3, lineup à 4, indexés à 50", () => {
    const t: Record<string, string> = {}; for (let i = 1; i <= 5; i++) t[`name${i}`] = "x"
    expect(testimonialsViewModel(t).items.length).toBe(3)
    const l: Record<string, string> = {}; for (let i = 1; i <= 6; i++) l[`a${i}_name`] = "x"
    expect(lineupViewModel(l).items.length).toBe(4)
    const b: Record<string, string> = {}; for (let i = 1; i <= 60; i++) b[`brand${i}_name`] = "x"
    expect(brandsViewModel(b).items.length).toBe(50)
  })
  it("non-mutation du contenu source", () => {
    const c = { name1: "A", stat1_value: "1", e1_title: "T" }; const s = JSON.stringify(c)
    testimonialsViewModel(c); businessStatsViewModel(c); timelineViewModel(c)
    expect(JSON.stringify(c)).toBe(s)
  })
})

describe("wave4 — parité éditeur (état vide lineup/timeline ; contenu tous)", () => {
  it("lineup vide → état vide (role note + invisible)", () => {
    const out = H(createElement(EditorLineup, { content: {}, ctx: eCtx }))
    expect(out).toContain('role="note"')
    expect(out).toContain("Invisible en ligne tant qu")
  })
  it("timeline vide → état vide (role note, SANS mention invisible, fidèle au legacy)", () => {
    const out = H(createElement(EditorTimeline, { content: {}, ctx: eCtx }))
    expect(out).toContain('role="note"')
    expect(out).toContain("Ajoutez une étape")
    expect(out).not.toContain("Invisible en ligne tant qu")
  })
  it("testimonials/business_stats/brands/reassurance : vide → conteneur sans état vide (legacy)", () => {
    for (const Comp of [EditorTestimonials, EditorBusinessStats, EditorBrands, EditorReassurance]) {
      expect(H(createElement(Comp, { content: {}, ctx: eCtx }))).not.toContain('role="note"')
    }
  })
  const filled: [string, any, any, string][] = [
    ["testimonials", EditorTestimonials, { name1: "Alice", text1: "Génial", stars1: "5" }, "Alice"],
    ["business_stats", EditorBusinessStats, { stat1_value: "500+", stat1_label: "Clients" }, "500+"],
    ["brands", EditorBrands, { brand1_name: "Nike" }, "Nike"],
    ["lineup", EditorLineup, { a1_name: "DJ Snake" }, "DJ Snake"],
    ["reassurance", EditorReassurance, { g1_label: "Satisfait ou remboursé" }, "Satisfait ou remboursé"],
    ["timeline", EditorTimeline, { e1_title: "Création" }, "Création"],
  ]
  for (const [name, Comp, content, needle] of filled) {
    it(`${name} : rempli → contenu rendu`, () => {
      expect(H(createElement(Comp, { content, ctx: eCtx }))).toContain(needle)
    })
  }
})

describe("wave4 — parité public (null si vide / items sinon)", () => {
  const cases: [string, any, any, string][] = [
    ["testimonials", PublicTestimonials, { name1: "Alice", text1: "Génial" }, "Alice"],
    ["business_stats", PublicBusinessStats, { stat1_value: "500+" }, "500+"],
    ["brands", PublicBrands, { brand1_name: "Nike" }, "Nike"],
    ["lineup", PublicLineup, { a1_name: "DJ Snake" }, "DJ Snake"],
    ["reassurance", PublicReassurance, { g1_label: "Garanti" }, "Garanti"],
    ["timeline", PublicTimeline, { e1_title: "Création" }, "Création"],
  ]
  for (const [name, Comp, content, needle] of cases) {
    it(`${name} : vide → null ; rempli → items`, () => {
      expect(H(createElement(Comp, { content: {}, ctx: pCtx }))).toBe("")
      expect(H(createElement(Comp, { content, ctx: pCtx }))).toContain(needle)
    })
  }
  it("testimonials : étoiles par défaut 5 si stars absent", () => {
    const out = H(createElement(PublicTestimonials, { content: { name1: "Alice" }, ctx: pCtx }))
    expect((out.match(/★/g) || []).length).toBe(5)
  })
  it("lineup : badge HEADLINER si headliner=yes", () => {
    const out = H(createElement(PublicLineup, { content: { a1_name: "Star", a1_headliner: "yes" }, ctx: pCtx }))
    expect(out).toContain("HEADLINER")
  })
  it("reassurance : icône par défaut ✅ si absente", () => {
    expect(H(createElement(PublicReassurance, { content: { g1_label: "X" }, ctx: pCtx }))).toContain("✅")
  })
  it("timeline horizontale : scroll-snap actif", () => {
    const out = H(createElement(PublicTimeline, { content: { e1_title: "A", layout: "Horizontale" }, ctx: pCtx }))
    expect(out).toContain("scroll-snap-align")
  })
})

describe("wave4 — parité de LIMITE éditeur/public", () => {
  it("testimonials : même plafond (3) des deux côtés", () => {
    const t: Record<string, string> = {}; for (let i = 1; i <= 5; i++) t[`name${i}`] = `N${i}`
    const ed = H(createElement(EditorTestimonials, { content: t, ctx: eCtx }))
    const pub = H(createElement(PublicTestimonials, { content: t, ctx: pCtx }))
    expect(ed.includes("N3")).toBe(true); expect(ed.includes("N4")).toBe(false)
    expect(pub.includes("N3")).toBe(true); expect(pub.includes("N4")).toBe(false)
  })
  it("lineup : même plafond (4) des deux côtés", () => {
    const l: Record<string, string> = {}; for (let i = 1; i <= 6; i++) l[`a${i}_name`] = `A${i}`
    const ed = H(createElement(EditorLineup, { content: l, ctx: eCtx }))
    const pub = H(createElement(PublicLineup, { content: l, ctx: pCtx }))
    expect(ed.includes("A4")).toBe(true); expect(ed.includes("A5")).toBe(false)
    expect(pub.includes("A4")).toBe(true); expect(pub.includes("A5")).toBe(false)
  })
})
