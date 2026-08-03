import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { dividerViewModel } from "./models/divider"
import { spacerViewModel } from "./models/spacer"
import { bioViewModel } from "./models/bio"
import { skillsViewModel } from "./models/skills"
import { languagesViewModel } from "./models/languages"
import { advantagesViewModel } from "./models/advantages"
import { EditorDivider } from "./blocks/divider/EditorDivider"
import { PublicDivider } from "./blocks/divider/PublicDivider"
import { EditorSpacer } from "./blocks/spacer/EditorSpacer"
import { PublicSpacer } from "./blocks/spacer/PublicSpacer"
import { EditorBio } from "./blocks/bio/EditorBio"
import { PublicBio } from "./blocks/bio/PublicBio"
import { EditorSkills } from "./blocks/skills/EditorSkills"
import { PublicSkills } from "./blocks/skills/PublicSkills"
import { EditorLanguages } from "./blocks/languages/EditorLanguages"
import { PublicLanguages } from "./blocks/languages/PublicLanguages"
import { EditorAdvantages } from "./blocks/advantages/EditorAdvantages"
import { PublicAdvantages } from "./blocks/advantages/PublicAdvantages"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

const theme: any = { fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const eCtx: EditorRenderCtx = { theme, primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190", accent: "#39FF8F", surfaceStyle: { background: "#080808" }, canEdit: false, edit: () => () => {} }
const pCtx: PublicRenderCtx = { theme, G: "#C9A84C", TEXT: "#F5F0E8", MUTED: "#A8A190", FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: () => {} }
const H = (el: any) => renderToStaticMarkup(el)
const noMut = (fn: () => void, obj: any) => { const s = JSON.stringify(obj); fn(); expect(JSON.stringify(obj)).toBe(s) }

describe("wave1 — modèles purs", () => {
  it("divider : style défaut gold, valeur conservée, non-mutation", () => {
    expect(dividerViewModel({}).style).toBe("gold")
    expect(dividerViewModel({ style: "stars" }).style).toBe("stars")
    const c = { style: "line" }; noMut(() => dividerViewModel(c), c)
  })
  it("spacer : taille défaut md", () => {
    expect(spacerViewModel({}).size).toBe("md")
    expect(spacerViewModel({ size: "xl" }).size).toBe("xl")
  })
  it("bio : texte + alignement défaut left", () => {
    expect(bioViewModel({}).align).toBe("left")
    expect(bioViewModel({ text: "X", align: "center" })).toMatchObject({ text: "X", align: "center" })
    expect(bioViewModel({ text: 5 } as any).text).toBe("")
  })
  it("skills : split virgules, vides filtrés", () => {
    expect(skillsViewModel({ tags: "React, TS ,, Node" }).tags).toEqual(["React", "TS", "Node"])
    expect(skillsViewModel({}).tags).toEqual([])
    expect(skillsViewModel({ tags: " , ,  " }).tags).toEqual([])
  })
  it("languages : visible/items + fallback conservé au rendu", () => {
    expect(languagesViewModel({}).visible).toBe(false)
    const vm = languagesViewModel({ lang_1_name: "FR", lang_1_level: "Natif", lang_2_name: "EN" })
    expect(vm.visible).toBe(true); expect(vm.items.map(i => i.name)).toEqual(["FR", "EN"])
  })
  it("advantages : visible/items (adv{i})", () => {
    expect(advantagesViewModel({}).visible).toBe(false)
    expect(advantagesViewModel({ adv1: "A", adv2: "B" }).items).toEqual(["A", "B"])
  })
})

describe("wave1 — parité de rendu (éditeur)", () => {
  it("divider gold : gradient primary, padding éditeur", () => {
    const out = H(createElement(EditorDivider, { content: { style: "gold" }, ctx: eCtx }))
    expect(out).toContain("#C9A84C60"); expect(out).toContain("padding:6px 16px")
  })
  it("spacer md : hauteur 24 (échelle éditeur)", () => {
    expect(H(createElement(EditorSpacer, { content: { size: "md" }, ctx: eCtx }))).toContain("height:24px")
  })
  it("bio : <p> texte, font-size 13, padding éditeur", () => {
    const out = H(createElement(EditorBio, { content: { text: "Salut" }, ctx: eCtx }))
    expect(out).toContain("font-size:13px"); expect(out).toContain("padding:12px 16px"); expect(out).toContain("Salut")
  })
  it("skills : chips (radius 20) + titre", () => {
    const out = H(createElement(EditorSkills, { content: { title: "Comp", tags: "A,B" }, ctx: eCtx }))
    expect(out).toContain("Comp"); expect(out).toContain("border-radius:20px")
    expect((out.match(/border-radius:20px/g) || []).length).toBe(2)
  })
  it("languages : hint « Ajoutez vos langues » si vide, sinon lignes", () => {
    expect(H(createElement(EditorLanguages, { content: {}, ctx: eCtx }))).toContain("Ajoutez vos langues")
    expect(H(createElement(EditorLanguages, { content: { lang_1_name: "FR" }, ctx: eCtx }))).toContain("FR")
  })
  it("advantages : hint « Ajoutez vos avantages » si vide, sinon lignes", () => {
    expect(H(createElement(EditorAdvantages, { content: {}, ctx: eCtx }))).toContain("Ajoutez vos avantages")
    expect(H(createElement(EditorAdvantages, { content: { adv1: "Rapide" }, ctx: eCtx }))).toContain("Rapide")
  })
})

describe("wave1 — parité de rendu (public)", () => {
  it("divider gold : gradient G, padding public", () => {
    const out = H(createElement(PublicDivider, { content: { style: "gold" }, ctx: pCtx }))
    expect(out).toContain("#C9A84C60"); expect(out).toContain("padding:10px 24px")
  })
  it("spacer md : hauteur 28 (échelle public)", () => {
    expect(H(createElement(PublicSpacer, { content: { size: "md" }, ctx: pCtx }))).toContain("height:28px")
  })
  it("bio : <p> font-size 15, padding public", () => {
    const out = H(createElement(PublicBio, { content: { text: "Salut" }, ctx: pCtx }))
    expect(out).toContain("font-size:15px"); expect(out).toContain("padding:6px 24px 16px"); expect(out).toContain("Salut")
  })
  it("skills : chips font-size 12", () => {
    const out = H(createElement(PublicSkills, { content: { tags: "A,B" }, ctx: pCtx }))
    expect(out).toContain("font-size:12px"); expect((out.match(/border-radius:20px/g) || []).length).toBe(2)
  })
  it("languages : null si vide, sinon lignes + niveau fallback « Courant »", () => {
    expect(H(createElement(PublicLanguages, { content: {}, ctx: pCtx }))).toBe("")
    const out = H(createElement(PublicLanguages, { content: { lang_1_name: "FR" }, ctx: pCtx }))
    expect(out).toContain("FR"); expect(out).toContain("Courant")
  })
  it("advantages : null si vide, sinon lignes", () => {
    expect(H(createElement(PublicAdvantages, { content: {}, ctx: pCtx }))).toBe("")
    expect(H(createElement(PublicAdvantages, { content: { adv1: "Rapide" }, ctx: pCtx }))).toContain("Rapide")
  })
})
