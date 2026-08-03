import { describe, it, expect } from "vitest"
import { headingViewModel } from "./models/heading"
import { valuesViewModel } from "./models/values"
import { pricingViewModel } from "./models/pricing"
import { hasPublishableContent } from "../blockEmptyState"
import { pricingCtaModel } from "../pricingCta"
import { BLOCK_FIXTURES } from "../blockFixtures"

// Parité des modèles PURS avec la logique legacy caractérisée + garanties de non-mutation.

describe("headingViewModel", () => {
  it("vide → visible, texte vide, défauts (center/medium/default)", () => {
    expect(headingViewModel({})).toEqual({ visible: true, text: "", align: "center", size: "medium", color: "default", subtitle: undefined })
  })
  it("titre + sous-titre + options", () => {
    const vm = headingViewModel({ text: "Bonjour", subtitle: "Sous", align: "left", size: "xl", color: "primary" })
    expect(vm).toMatchObject({ text: "Bonjour", subtitle: "Sous", align: "left", size: "xl", color: "primary" })
  })
  it("types invalides → défauts sûrs", () => {
    const vm = headingViewModel({ text: 42, align: 1, size: {}, color: [] } as any)
    expect(vm).toMatchObject({ text: "", align: "center", size: "medium", color: "default" })
  })
  it("ne mute pas l'entrée", () => {
    const c = { text: "x" }; const snap = JSON.stringify(c); headingViewModel(c); expect(JSON.stringify(c)).toBe(snap)
  })
})

describe("valuesViewModel (parité hasPublishableContent + filtre legacy)", () => {
  it("vide → invisible, 0 item", () => {
    const vm = valuesViewModel(BLOCK_FIXTURES.values.empty)
    expect(vm.visible).toBe(false); expect(vm.items).toEqual([])
  })
  it("espaces seuls → invisible (pas de carte fantôme)", () => {
    expect(valuesViewModel(BLOCK_FIXTURES.values.whitespace).visible).toBe(false)
  })
  it("1 item réel → visible + item conservé avec son index", () => {
    const vm = valuesViewModel(BLOCK_FIXTURES.values.minimal)
    expect(vm.visible).toBe(true); expect(vm.items).toEqual([{ i: 1, icon: undefined, label: "Qualité", desc: undefined }])
  })
  it("liste complète → ordre + index préservés", () => {
    const vm = valuesViewModel(BLOCK_FIXTURES.values.complete)
    expect(vm.items.map(x => x.label)).toEqual(["Qualité", "Écoute", "Rapidité"])
    expect(vm.items.map(x => x.i)).toEqual([1, 2, 3])
  })
  it("visible == hasPublishableContent(values) pour toutes les fixtures", () => {
    for (const key of Object.keys(BLOCK_FIXTURES.values)) {
      const c = (BLOCK_FIXTURES.values as any)[key]
      expect(valuesViewModel(c).visible).toBe(hasPublishableContent("values", c))
    }
  })
  it("ne mute pas l'entrée", () => {
    const c = { ...BLOCK_FIXTURES.values.complete }; const snap = JSON.stringify(c); valuesViewModel(c); expect(JSON.stringify(c)).toBe(snap)
  })
})

describe("pricingViewModel (parité filtre plans + pricingCtaModel)", () => {
  it("vide → invisible, 0 offre, CTA invisible", () => {
    const vm = pricingViewModel(BLOCK_FIXTURES.pricing.empty)
    expect(vm.visible).toBe(false); expect(vm.plans).toEqual([]); expect(vm.cta.visible).toBe(false)
  })
  it("1 offre → visible", () => {
    const vm = pricingViewModel(BLOCK_FIXTURES.pricing.minimal)
    expect(vm.plans).toHaveLength(1); expect(vm.plans[0]).toMatchObject({ title: "Starter", price: "0€" })
  })
  it("complète → 2 offres + CTA sûr", () => {
    const vm = pricingViewModel(BLOCK_FIXTURES.pricing.complete)
    expect(vm.plans).toHaveLength(2)
    expect(vm.cta).toEqual(pricingCtaModel(BLOCK_FIXTURES.pricing.complete))
    expect((vm.cta as any).href).toBe("https://ex.com/pay")
  })
  it("CTA javascript: neutralisé (via le modèle partagé)", () => {
    expect(((pricingViewModel(BLOCK_FIXTURES.pricing.invalidUrl).cta) as any).href.startsWith("javascript:")).toBe(false)
  })
  it("plafond 3 offres (title1..3)", () => {
    const c = { title1: "A", price1: "1", title2: "B", price2: "2", title3: "C", price3: "3", title4: "D" }
    expect(pricingViewModel(c).plans).toHaveLength(3)
  })
  it("ne mute pas l'entrée", () => {
    const c = { ...BLOCK_FIXTURES.pricing.complete }; const snap = JSON.stringify(c); pricingViewModel(c); expect(JSON.stringify(c)).toBe(snap)
  })
})

describe("performance logique — 100 blocs, déterministe et sans mutation", () => {
  it("300 modèles (100×3) calculés sans erreur ni mutation", () => {
    const hc = { text: "T", subtitle: "S" }
    const vc = BLOCK_FIXTURES.values.complete
    const pc = BLOCK_FIXTURES.pricing.complete
    const hSnap = JSON.stringify(hc), vSnap = JSON.stringify(vc), pSnap = JSON.stringify(pc)
    for (let i = 0; i < 100; i++) { headingViewModel(hc); valuesViewModel(vc); pricingViewModel(pc) }
    expect(JSON.stringify(hc)).toBe(hSnap)
    expect(JSON.stringify(vc)).toBe(vSnap)
    expect(JSON.stringify(pc)).toBe(pSnap)
  })
})
