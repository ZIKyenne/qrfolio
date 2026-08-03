import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { EditorHeading } from "./blocks/heading/EditorHeading"
import { PublicHeading } from "./blocks/heading/PublicHeading"
import { EditorValues } from "./blocks/values/EditorValues"
import { PublicValues } from "./blocks/values/PublicValues"
import { EditorPricing } from "./blocks/pricing/EditorPricing"
import { PublicPricing } from "./blocks/pricing/PublicPricing"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

// VALIDATION OBJECTIVE de parité (déterministe, sans navigateur). On rend les adapters
// shared en HTML statique (react-dom/server, sans jsdom) et on vérifie les valeurs de
// style/texte/CTA lues INDÉPENDAMMENT dans le source legacy (builderPreview / PublicPageClient).
// Un écart de copie adapter↔legacy fait échouer un test. La parité PIXEL navigateur (polices,
// antialiasing, responsive au runtime) reste une QA humaine — voir PILOT-VALIDATION.md.

const theme: any = { fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const editorCtx: EditorRenderCtx = { theme, primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190", accent: "#39FF8F", surfaceStyle: { background: "#080808" }, canEdit: false, edit: () => () => {} }
const publicCtx: PublicRenderCtx = { theme, G: "#C9A84C", TEXT: "#F5F0E8", MUTED: "#A8A190", FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: () => {} }

const html = (el: any) => renderToStaticMarkup(el)

// ── HEADING ─────────────────────────────────────────────────────────────────
describe("parité rendu — heading", () => {
  it("public : h2, taille medium=24, padding public, texte", () => {
    const out = html(createElement(PublicHeading, { content: { text: "Bonjour" }, ctx: publicCtx }))
    expect(out).toContain("<h2")
    expect(out).toContain("font-size:24px")
    expect(out).toContain("padding:12px 24px 6px")
    expect(out).toContain("line-height:1.2")
    expect(out).toContain("Bonjour")
  })
  it("public : texte vide → fallback « Titre »", () => {
    expect(html(createElement(PublicHeading, { content: {}, ctx: publicCtx }))).toContain("Titre")
  })
  it("public : sous-titre rendu quand présent, absent sinon", () => {
    expect(html(createElement(PublicHeading, { content: { text: "T", subtitle: "Sub" }, ctx: publicCtx }))).toContain("Sub")
    expect(html(createElement(PublicHeading, { content: { text: "T" }, ctx: publicCtx }))).not.toContain("<p")
  })
  it("public : alignement + taille xl + couleur primary=G", () => {
    const out = html(createElement(PublicHeading, { content: { text: "T", align: "left", size: "xl", color: "primary" }, ctx: publicCtx }))
    expect(out).toContain("text-align:left")
    expect(out).toContain("font-size:42px")
    expect(out).toContain("color:#C9A84C")
  })
  it("éditeur : h2, taille medium=20 (échelle canvas), padding éditeur", () => {
    const out = html(createElement(EditorHeading, { content: { text: "Bonjour" }, ctx: editorCtx }))
    expect(out).toContain("<h2")
    expect(out).toContain("font-size:20px")
    expect(out).toContain("padding:14px 16px")
    expect(out).toContain("Bonjour")
  })
})

// ── VALUES ──────────────────────────────────────────────────────────────────
describe("parité rendu — values", () => {
  const items = { v1_label: "Qualité", v1_desc: "Top", v2_label: "Écoute" }
  it("public : null si vide", () => {
    expect(html(createElement(PublicValues, { content: {}, ctx: publicCtx }))).toBe("")
  })
  it("public : grille + cartes (radius 13, padding public), labels + desc", () => {
    const out = html(createElement(PublicValues, { content: items, ctx: publicCtx }))
    expect(out).toContain("grid-template-columns:1fr 1fr")
    expect(out).toContain("border-radius:13px")
    expect(out).toContain("padding:14px 11px")
    expect(out).toContain("Qualité"); expect(out).toContain("Écoute"); expect(out).toContain("Top")
  })
  it("public : 2 cartes pour 2 items réels (pas de fantôme)", () => {
    const out = html(createElement(PublicValues, { content: { v1_label: "A", v3_label: "C" }, ctx: publicCtx }))
    expect((out.match(/border-radius:13px/g) || []).length).toBe(2)
  })
  it("éditeur : état vide (role=note + mention invisible) si vide", () => {
    const out = html(createElement(EditorValues, { content: {}, ctx: editorCtx }))
    expect(out).toContain('role="note"')
    expect(out).toContain("Invisible en ligne tant qu")
  })
  it("éditeur : cartes (radius 12, padding éditeur) si rempli", () => {
    const out = html(createElement(EditorValues, { content: items, ctx: editorCtx }))
    expect(out).toContain("border-radius:12px")
    expect(out).toContain("padding:12px 10px")
    expect(out).toContain("Qualité")
  })
})

// ── PRICING ─────────────────────────────────────────────────────────────────
describe("parité rendu — pricing", () => {
  const plans = { title1: "Free", price1: "0€", title2: "Pro", price2: "9€", cta_label: "Choisir", cta_url: "https://ex.com/pay" }
  it("public : null si vide", () => {
    expect(html(createElement(PublicPricing, { content: {}, ctx: publicCtx }))).toBe("")
  })
  it("public : cartes (radius 13, padding public), prix, CTA = <a> href sûr", () => {
    const out = html(createElement(PublicPricing, { content: plans, ctx: publicCtx }))
    expect(out).toContain("border-radius:13px")
    expect(out).toContain("padding:16px 12px")
    expect(out).toContain("Free"); expect(out).toContain("9€")
    expect(out).toContain('<a href="https://ex.com/pay"')
    expect(out).toContain("Choisir")
  })
  it("public : CTA sans URL → href=# ; CTA absent si pas de libellé", () => {
    expect(html(createElement(PublicPricing, { content: { title1: "P", price1: "1€", cta_label: "Go" }, ctx: publicCtx }))).toContain('<a href="#"')
    expect(html(createElement(PublicPricing, { content: { title1: "P", price1: "1€" }, ctx: publicCtx }))).not.toContain("<a ")
  })
  it("public : javascript: neutralisé dans le href", () => {
    const out = html(createElement(PublicPricing, { content: { title1: "P", price1: "1€", cta_label: "X", cta_url: "javascript:alert(1)" }, ctx: publicCtx }))
    expect(out).not.toContain('href="javascript:')
  })
  it("éditeur : CTA NON navigable (aria-disabled), aucun <a>, radius 9 + padding éditeur", () => {
    const out = html(createElement(EditorPricing, { content: plans, ctx: editorCtx }))
    expect(out).toContain("aria-disabled")
    expect(out).not.toContain("<a ")
    expect(out).toContain("border-radius:9px")
    expect(out).toContain("padding:12px 8px")
    expect(out).toContain("Choisir")
  })
  it("public : 2 cartes pour 2 offres", () => {
    const out = html(createElement(PublicPricing, { content: plans, ctx: publicCtx }))
    expect((out.match(/transform 0\.15s/g) || []).length).toBe(2)
  })
})
