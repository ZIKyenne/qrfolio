import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { hasPublishableContent } from "../blockEmptyState"
import { processStepsViewModel } from "./models/processSteps"
import { onSiteServicesViewModel } from "./models/onSiteServices"
import { engagementsViewModel } from "./models/engagements"
import { trustBadgeViewModel } from "./models/trustBadge"
import { statsBlockViewModel } from "./models/statsBlock"
import { eventProgramViewModel } from "./models/eventProgram"
import { EditorProcessSteps } from "./blocks/process_steps/EditorProcessSteps"
import { PublicProcessSteps } from "./blocks/process_steps/PublicProcessSteps"
import { EditorOnSiteServices } from "./blocks/on_site_services/EditorOnSiteServices"
import { PublicOnSiteServices } from "./blocks/on_site_services/PublicOnSiteServices"
import { EditorEngagements } from "./blocks/engagements/EditorEngagements"
import { PublicEngagements } from "./blocks/engagements/PublicEngagements"
import { EditorTrustBadge } from "./blocks/trust_badge/EditorTrustBadge"
import { PublicTrustBadge } from "./blocks/trust_badge/PublicTrustBadge"
import { EditorStatsBlock } from "./blocks/stats_block/EditorStatsBlock"
import { PublicStatsBlock } from "./blocks/stats_block/PublicStatsBlock"
import { EditorEventProgram } from "./blocks/event_program/EditorEventProgram"
import { PublicEventProgram } from "./blocks/event_program/PublicEventProgram"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

const theme: any = { fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const eCtx: EditorRenderCtx = { theme, primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190", accent: "#39FF8F", surfaceStyle: { background: "#080808" }, canEdit: false, edit: () => () => {} }
const pCtx: PublicRenderCtx = { theme, G: "#C9A84C", TEXT: "#F5F0E8", MUTED: "#A8A190", FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: () => {} }
const H = (el: any) => renderToStaticMarkup(el)

describe("wave3 — modèles répétiteurs", () => {
  it("vide → visible false, 0 item (tous)", () => {
    expect(processStepsViewModel({}).visible).toBe(false)
    expect(onSiteServicesViewModel({}).items).toEqual([])
    expect(engagementsViewModel({}).visible).toBe(false)
    expect(trustBadgeViewModel({}).items).toEqual([])
    expect(statsBlockViewModel({}).visible).toBe(false)
    expect(eventProgramViewModel({}).items).toEqual([])
  })
  it("visible == hasPublishableContent (parité éditeur)", () => {
    const cases: [string, any, any][] = [
      ["process_steps", processStepsViewModel, { s1_title: "A" }],
      ["on_site_services", onSiteServicesViewModel, { s1_label: "Wifi" }],
      ["engagements", engagementsViewModel, { e1: "X" }],
      ["trust_badge", trustBadgeViewModel, { b1_label: "OK" }],
      ["stats_block", statsBlockViewModel, { s1_value: "500" }],
      ["event_program", eventProgramViewModel, { s1_title: "Accueil" }],
    ]
    for (const [type, vm, c] of cases) expect(vm(c).visible).toBe(hasPublishableContent(type, c))
  })
  it("liste mixte : items vides ignorés, ordre + index préservés", () => {
    const vm = processStepsViewModel({ s1_title: "", s2_title: "Deux", s3_title: "Trois" })
    expect(vm.items.map(x => x.title)).toEqual(["Deux", "Trois"])
    expect(vm.items.map(x => x.i)).toEqual([2, 3])
  })
  it("espaces seuls → non visible (pas de carte fantôme)", () => {
    expect(statsBlockViewModel({ s1_value: "   " }).visible).toBe(false)
  })
  it("limites : engagements plafonné à 6, répéteurs indexés à 50", () => {
    const eng: Record<string, string> = {}; for (let i = 1; i <= 8; i++) eng[`e${i}`] = "x"
    expect(engagementsViewModel(eng).items.length).toBe(6)
    const st: Record<string, string> = {}; for (let i = 1; i <= 60; i++) st[`s${i}_value`] = "v"
    expect(statsBlockViewModel(st).items.length).toBe(50)
  })
  it("non-mutation", () => {
    const c = { s1_title: "A", s2_title: "B" }; const s = JSON.stringify(c)
    processStepsViewModel(c); eventProgramViewModel(c); expect(JSON.stringify(c)).toBe(s)
  })
})

describe("wave3 — parité éditeur (emptyHint / cartes)", () => {
  const cases: [string, any, any, string][] = [
    ["process_steps", EditorProcessSteps, { s1_title: "Étape A" }, "Étape A"],
    ["on_site_services", EditorOnSiteServices, { s1_label: "Wifi" }, "Wifi"],
    ["engagements", EditorEngagements, { e1: "Sans engagement" }, "Sans engagement"],
    ["trust_badge", EditorTrustBadge, { b1_label: "Certifié" }, "Certifié"],
    ["stats_block", EditorStatsBlock, { s1_value: "500+" }, "500+"],
    ["event_program", EditorEventProgram, { s1_title: "Accueil" }, "Accueil"],
  ]
  for (const [name, Comp, content, needle] of cases) {
    it(`${name} : vide → état vide (role note + invisible) ; rempli → contenu`, () => {
      const empty = H(createElement(Comp, { content: {}, ctx: eCtx }))
      expect(empty).toContain('role="note"')
      expect(empty).toContain("Invisible en ligne tant qu")
      expect(H(createElement(Comp, { content, ctx: eCtx }))).toContain(needle)
    })
  }
})

describe("wave3 — parité public (null / items)", () => {
  const cases: [string, any, any, string][] = [
    ["process_steps", PublicProcessSteps, { s1_title: "Étape A" }, "Étape A"],
    ["on_site_services", PublicOnSiteServices, { s1_label: "Wifi" }, "Wifi"],
    ["engagements", PublicEngagements, { e1: "Sans engagement" }, "Sans engagement"],
    ["trust_badge", PublicTrustBadge, { b1_label: "Certifié" }, "Certifié"],
    ["stats_block", PublicStatsBlock, { s1_value: "500+" }, "500+"],
    ["event_program", PublicEventProgram, { s1_title: "Accueil" }, "Accueil"],
  ]
  for (const [name, Comp, content, needle] of cases) {
    it(`${name} : vide → null ; rempli → items`, () => {
      expect(H(createElement(Comp, { content: {}, ctx: pCtx }))).toBe("")
      expect(H(createElement(Comp, { content, ctx: pCtx }))).toContain(needle)
    })
  }
  it("stats_block : 3 cartes pour 3 stats réelles (public)", () => {
    const out = H(createElement(PublicStatsBlock, { content: { s1_value: "1", s2_value: "2", s3_value: "3" }, ctx: pCtx }))
    expect((out.match(/border-radius:13px/g) || []).length).toBe(3)
  })
  it("stats_block : styles publics (radius 13, padding 16px 10px)", () => {
    const out = H(createElement(PublicStatsBlock, { content: { s1_value: "1" }, ctx: pCtx }))
    expect(out).toContain("border-radius:13px"); expect(out).toContain("padding:16px 10px")
  })
})

describe("wave3 — parité de LIMITE éditeur/public", () => {
  it("engagements : même plafond (6) des deux côtés", () => {
    const eng: Record<string, string> = {}; for (let i = 1; i <= 8; i++) eng[`e${i}`] = `E${i}`
    const ed = H(createElement(EditorEngagements, { content: eng, ctx: eCtx }))
    const pub = H(createElement(PublicEngagements, { content: eng, ctx: pCtx }))
    expect(ed.includes("E6")).toBe(true); expect(ed.includes("E7")).toBe(false)
    expect(pub.includes("E6")).toBe(true); expect(pub.includes("E7")).toBe(false)
  })
})
