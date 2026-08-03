import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { menuSectionViewModel } from "./models/menuSection"
import { servicesListViewModel } from "./models/servicesList"
import { promoBannerViewModel } from "./models/promoBanner"
import { giftCardViewModel } from "./models/giftCard"
import { eventInfoViewModel } from "./models/eventInfo"
import { eventTicketingViewModel } from "./models/eventTicketing"
import { EditorMenuSection } from "./blocks/menu_section/EditorMenuSection"
import { PublicMenuSection } from "./blocks/menu_section/PublicMenuSection"
import { EditorServicesList } from "./blocks/services_list/EditorServicesList"
import { PublicServicesList } from "./blocks/services_list/PublicServicesList"
import { EditorPromoBanner } from "./blocks/promo_banner/EditorPromoBanner"
import { PublicPromoBanner } from "./blocks/promo_banner/PublicPromoBanner"
import { EditorGiftCard } from "./blocks/gift_card/EditorGiftCard"
import { PublicGiftCard } from "./blocks/gift_card/PublicGiftCard"
import { EditorEventInfo } from "./blocks/event_info/EditorEventInfo"
import { PublicEventInfo } from "./blocks/event_info/PublicEventInfo"
import { EditorEventTicketing } from "./blocks/event_ticketing/EditorEventTicketing"
import { PublicEventTicketing } from "./blocks/event_ticketing/PublicEventTicketing"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

const theme: any = { fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const eCtx: EditorRenderCtx = { theme, primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190", accent: "#39FF8F", surfaceStyle: { background: "#080808" }, canEdit: false, edit: () => () => {} }
let tracked: string[] = []
const pCtx: PublicRenderCtx = { theme, G: "#C9A84C", TEXT: "#F5F0E8", MUTED: "#A8A190", FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: (t) => { tracked.push(t) } }
const H = (el: any) => renderToStaticMarkup(el)

describe("wave5 — modèles commerce/événement", () => {
  it("vide → visibilité fidèle au legacy", () => {
    expect(menuSectionViewModel({}).visible).toBe(true)       // legacy : conteneur toujours rendu
    expect(menuSectionViewModel({}).items).toEqual([])
    expect(servicesListViewModel({}).visible).toBe(false)     // public null si vide
    expect(giftCardViewModel({}).visible).toBe(false)         // (title||amount1)
    expect(eventTicketingViewModel({}).visible).toBe(false)   // (event_name||url)
  })
  it("gate rempli → visible", () => {
    expect(servicesListViewModel({ s1_name: "Wifi" }).visible).toBe(true)
    expect(giftCardViewModel({ amount1: "50€" }).visible).toBe(true)
    expect(giftCardViewModel({ title: "Bon" }).visible).toBe(true)
    expect(eventTicketingViewModel({ event_name: "Concert" }).visible).toBe(true)
    expect(eventTicketingViewModel({ url: "https://x.co" }).visible).toBe(true)
  })
  it("filtres métier + ordre + index préservés", () => {
    const m = menuSectionViewModel({ item1_name: "", item2_name: "Pizza", item3_name: "Pasta" })
    expect(m.items.map(x => x.name)).toEqual(["Pizza", "Pasta"])
    const s = servicesListViewModel({ s1_name: "A", s2_name: "", s3_name: "C" })
    expect(s.items.map(x => x.name)).toEqual(["A", "C"])
  })
  it("event_info : lignes filtrées (date/heure/lieu/prix), ordre stable", () => {
    const vm = eventInfoViewModel({ date: "12/09", location: "Paris" })
    expect(vm.rows.map(r => r.val)).toEqual(["12/09", "Paris"])
    expect(vm.rows[0].icon).toBe("📅"); expect(vm.rows[1].icon).toBe("📍")
  })
  it("gift_card : montants filtrés (Boolean), '0' conservé, vides ignorés", () => {
    expect(giftCardViewModel({ amount1: "0", amount2: "", amount3: "50€" }).amounts).toEqual(["0", "50€"])
  })
  it("event_ticketing : libellé composé avec plateforme (hors 'URL personnalisée')", () => {
    expect(eventTicketingViewModel({ label: "Billets", platform: "Weezevent" }).ctaText).toBe("Billets — Weezevent")
    expect(eventTicketingViewModel({ label: "Billets", platform: "URL personnalisée" }).ctaText).toBe("Billets")
    expect(eventTicketingViewModel({}).ctaText).toBe("Réserver ma place")
  })
  it("prix conservés bruts (menu_section), aucun reformatage", () => {
    for (const p of ["0", "12.50", "12,50 €", "Gratuit", "1 234 567 €"]) {
      expect(menuSectionViewModel({ item1_name: "x", item1_price: p }).items[0].price).toBe(p)
    }
  })
  it("limites : répéteurs plafonnés à 50", () => {
    const m: Record<string, string> = {}; for (let i = 1; i <= 55; i++) m[`item${i}_name`] = `I${i}`
    const vm = menuSectionViewModel(m)
    expect(vm.items.length).toBe(50)
    expect(vm.items[49].name).toBe("I50")
    expect(vm.items.find(x => x.name === "I51")).toBeUndefined()
  })
  it("URLs sécurisées (extHref) : schéma javascript: neutralisé (préfixé https://)", () => {
    // extHref préfixe https:// à tout schéma non autorisé → le lien n'est plus exécutable.
    expect(promoBannerViewModel({ cta_label: "X", cta_url: "javascript:alert(1)" }).link.href?.startsWith("javascript:")).toBe(false)
    expect(giftCardViewModel({ title: "T", cta_label: "X", cta_url: "javascript:alert(1)" }).link.href?.startsWith("javascript:")).toBe(false)
    expect(promoBannerViewModel({ cta_label: "X", cta_url: "javascript:alert(1)" }).link.href?.startsWith("https://")).toBe(true)
  })
  it("external : http(s) → true (gift_card/ticketing), sinon false ; promo/event_info toujours false", () => {
    expect(giftCardViewModel({ title: "T", cta_label: "X", cta_url: "https://x.co" }).link.external).toBe(true)
    expect(giftCardViewModel({ title: "T", cta_label: "X", cta_url: "mailto:a@b.c" }).link.external).toBe(false)
    expect(promoBannerViewModel({ cta_label: "X", cta_url: "https://x.co" }).link.external).toBe(false)
    expect(eventInfoViewModel({ cta_label: "X", cta_url: "https://x.co" }).link.external).toBe(false)
  })
  it("cibles de tracking fidèles au legacy", () => {
    expect(promoBannerViewModel({ cta_label: "X" }).link.trackTarget).toBe("promo_banner")
    expect(eventInfoViewModel({ cta_label: "X" }).link.trackTarget).toBe("event_info")
    expect(giftCardViewModel({ title: "T", cta_label: "X" }).link.trackTarget).toBe("giftcard")
    expect(eventTicketingViewModel({ event_name: "E" }).link.trackTarget).toBe("ticket")
    expect(eventTicketingViewModel({ url: "https://x.co" }).link.trackTarget).toBe("https://x.co")
  })
  it("aucune mutation du contenu source", () => {
    const c = { item1_name: "A", s1_name: "B", cta_url: "https://x.co", amount1: "10" }; const snap = JSON.stringify(c)
    menuSectionViewModel(c); servicesListViewModel(c); promoBannerViewModel(c); giftCardViewModel(c); eventInfoViewModel(c); eventTicketingViewModel(c)
    expect(JSON.stringify(c)).toBe(snap)
  })
})

describe("wave5 — parité éditeur (contenu + CTA neutralisé)", () => {
  const filled: [string, any, any, string][] = [
    ["menu_section", EditorMenuSection, { item1_name: "Pizza", item1_price: "12€" }, "Pizza"],
    ["services_list", EditorServicesList, { s1_name: "Wifi gratuit" }, "Wifi gratuit"],
    ["promo_banner", EditorPromoBanner, { text: "Soldes -50%" }, "Soldes -50%"],
    ["gift_card", EditorGiftCard, { title: "Carte cadeau" }, "Carte cadeau"],
    ["event_info", EditorEventInfo, { name: "Vernissage" }, "Vernissage"],
    ["event_ticketing", EditorEventTicketing, { event_name: "Festival" }, "Festival"],
  ]
  for (const [name, Comp, content, needle] of filled) {
    it(`${name} : contenu rendu`, () => {
      expect(H(createElement(Comp, { content, ctx: eCtx }))).toContain(needle)
    })
  }
  it("CTA éditeur neutralisé (aria-disabled, aucun <a>) pour les blocs à CTA", () => {
    const cases: [any, any][] = [
      [EditorPromoBanner, { text: "T", cta_label: "Acheter", cta_url: "https://x.co" }],
      [EditorGiftCard, { title: "T", cta_label: "Offrir", cta_url: "https://x.co" }],
      [EditorEventInfo, { name: "N", cta_label: "Réserver", cta_url: "https://x.co" }],
      [EditorEventTicketing, { event_name: "E", label: "Billets", url: "https://x.co" }],
    ]
    for (const [Comp, content] of cases) {
      const out = H(createElement(Comp, { content, ctx: eCtx }))
      expect(out).toContain('aria-disabled="true"')
      expect(out).not.toContain("<a ")
    }
  })
})

describe("wave5 — parité public (null / items / lien réel)", () => {
  it("services_list/gift_card/event_ticketing : null si vide", () => {
    expect(H(createElement(PublicServicesList, { content: {}, ctx: pCtx }))).toBe("")
    expect(H(createElement(PublicGiftCard, { content: {}, ctx: pCtx }))).toBe("")
    expect(H(createElement(PublicEventTicketing, { content: {}, ctx: pCtx }))).toBe("")
  })
  it("menu_section/promo_banner/event_info : conteneur rendu même vide (fidèle legacy)", () => {
    expect(H(createElement(PublicMenuSection, { content: {}, ctx: pCtx }))).not.toBe("")
    expect(H(createElement(PublicPromoBanner, { content: {}, ctx: pCtx }))).not.toBe("")
    expect(H(createElement(PublicEventInfo, { content: {}, ctx: pCtx }))).not.toBe("")
  })
  const filled: [string, any, any, string][] = [
    ["menu_section", PublicMenuSection, { item1_name: "Pizza", item1_price: "12€" }, "Pizza"],
    ["services_list", PublicServicesList, { s1_name: "Wifi" }, "Wifi"],
    ["promo_banner", PublicPromoBanner, { text: "Soldes" }, "Soldes"],
    ["gift_card", PublicGiftCard, { title: "Carte" }, "Carte"],
    ["event_info", PublicEventInfo, { name: "Vernissage" }, "Vernissage"],
    ["event_ticketing", PublicEventTicketing, { event_name: "Festival" }, "Festival"],
  ]
  for (const [name, Comp, content, needle] of filled) {
    it(`${name} : contenu rendu`, () => {
      expect(H(createElement(Comp, { content, ctx: pCtx }))).toContain(needle)
    })
  }
  it("CTA public = vrai <a> pour les blocs à CTA", () => {
    expect(H(createElement(PublicPromoBanner, { content: { text: "T", cta_label: "Acheter", cta_url: "https://x.co" }, ctx: pCtx }))).toContain("<a ")
    expect(H(createElement(PublicGiftCard, { content: { title: "T", cta_label: "Offrir", cta_url: "https://x.co" }, ctx: pCtx }))).toContain("<a ")
    expect(H(createElement(PublicEventInfo, { content: { name: "N", cta_label: "R", cta_url: "https://x.co" }, ctx: pCtx }))).toContain("<a ")
    expect(H(createElement(PublicEventTicketing, { content: { event_name: "E", label: "B", url: "https://x.co" }, ctx: pCtx }))).toContain("<a ")
  })
  it("event_ticketing/gift_card https → target=_blank ; promo_banner/event_info → aucun target", () => {
    expect(H(createElement(PublicEventTicketing, { content: { event_name: "E", url: "https://x.co" }, ctx: pCtx }))).toContain('target="_blank"')
    expect(H(createElement(PublicGiftCard, { content: { title: "T", cta_label: "X", cta_url: "https://x.co" }, ctx: pCtx }))).toContain('target="_blank"')
    expect(H(createElement(PublicPromoBanner, { content: { text: "T", cta_label: "X", cta_url: "https://x.co" }, ctx: pCtx }))).not.toContain('target="_blank"')
    expect(H(createElement(PublicEventInfo, { content: { name: "N", cta_label: "X", cta_url: "https://x.co" }, ctx: pCtx }))).not.toContain('target="_blank"')
  })
  it("URL dangereuse neutralisée dans le rendu public (schéma non exécutable)", () => {
    const out = H(createElement(PublicPromoBanner, { content: { text: "T", cta_label: "X", cta_url: "javascript:alert(1)" }, ctx: pCtx }))
    expect(out).not.toContain('href="javascript:')  // schéma exécutable absent
    expect(out).toContain('href="https://javascript:alert(1)"')  // neutralisé en https (fidèle legacy)
  })
})

describe("wave5 — parité de LIMITE éditeur/public (menu_section 50)", () => {
  it("item50 présent des deux côtés, item51 absent", () => {
    const m: Record<string, string> = {}; for (let i = 1; i <= 55; i++) m[`item${i}_name`] = `I${i}`
    const ed = H(createElement(EditorMenuSection, { content: m, ctx: eCtx }))
    const pub = H(createElement(PublicMenuSection, { content: m, ctx: pCtx }))
    expect(ed.includes("I50")).toBe(true); expect(ed.includes("I51")).toBe(false)
    expect(pub.includes("I50")).toBe(true); expect(pub.includes("I51")).toBe(false)
  })
})
