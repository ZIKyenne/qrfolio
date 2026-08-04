import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { safeMediaSrc } from "./models/mediaUrl"
import { imageViewModel } from "./models/image"
import { portfolioWorkViewModel } from "./models/portfolioWork"
import { favoriteLinksViewModel } from "./models/favoriteLinks"
import { concertsViewModel } from "./models/concerts"
import { merchViewModel } from "./models/merch"
import { appDownloadViewModel } from "./models/appDownload"
import { EditorImage } from "./blocks/image/EditorImage"
import { PublicImage } from "./blocks/image/PublicImage"
import { EditorPortfolioWork } from "./blocks/portfolio_work/EditorPortfolioWork"
import { PublicPortfolioWork } from "./blocks/portfolio_work/PublicPortfolioWork"
import { EditorFavoriteLinks } from "./blocks/favorite_links/EditorFavoriteLinks"
import { PublicFavoriteLinks } from "./blocks/favorite_links/PublicFavoriteLinks"
import { EditorConcerts } from "./blocks/concerts/EditorConcerts"
import { PublicConcerts } from "./blocks/concerts/PublicConcerts"
import { EditorMerch } from "./blocks/merch/EditorMerch"
import { PublicMerch } from "./blocks/merch/PublicMerch"
import { EditorAppDownload } from "./blocks/app_download/EditorAppDownload"
import { PublicAppDownload } from "./blocks/app_download/PublicAppDownload"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

const theme: any = { fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const eCtx: EditorRenderCtx = { theme, primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190", accent: "#39FF8F", surfaceStyle: { background: "#080808" }, canEdit: false, edit: () => () => {} }
const pCtx: PublicRenderCtx = { theme, G: "#C9A84C", TEXT: "#F5F0E8", MUTED: "#A8A190", FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: () => {} }
const H = (el: any) => renderToStaticMarkup(el)

describe("wave6 — safeMediaSrc (sécurité URL média)", () => {
  it("neutralise les schémas dangereux → null", () => {
    for (const bad of ["javascript:alert(1)", "vbscript:x", "file:///etc/passwd", "data:text/html,<script>", ""]) {
      expect(safeMediaSrc(bad)).toBeNull()
    }
  })
  it("rejette les types non-chaîne", () => {
    expect(safeMediaSrc({} as any)).toBeNull()
    expect(safeMediaSrc([] as any)).toBeNull()
    expect(safeMediaSrc(123 as any)).toBeNull()
    expect(safeMediaSrc(null)).toBeNull()
  })
  it("rejette une URL anormalement longue", () => {
    expect(safeMediaSrc("https://x.co/" + "a".repeat(3000))).toBeNull()
  })
  it("accepte http(s), data:image, chemin interne, CDN/domaine", () => {
    expect(safeMediaSrc("https://cdn.x.co/a.jpg")).toBe("https://cdn.x.co/a.jpg")
    expect(safeMediaSrc("http://x.co/a.png")).toBe("http://x.co/a.png")
    expect(safeMediaSrc("/uploads/a.webp")).toBe("/uploads/a.webp")
    expect(safeMediaSrc("data:image/png;base64,iVBOR")).toBe("data:image/png;base64,iVBOR")
    expect(safeMediaSrc("  https://x.co/a.jpg  ")).toBe("https://x.co/a.jpg")
  })
})

describe("wave6 — modèles média", () => {
  it("image : hasMedia/visible, alt fallback, ratio, lien durci", () => {
    expect(imageViewModel({}).hasMedia).toBe(false)
    expect(imageViewModel({}).visible).toBe(false)
    const vm = imageViewModel({ src: "https://x.co/a.jpg", caption: "Légende", ratio: "16:9" })
    expect(vm.hasMedia).toBe(true); expect(vm.aspectRatio).toBe("16/9"); expect(vm.alt).toBe("Légende")
    expect(imageViewModel({ src: "https://x.co/a.jpg", alt: "Alt réel", caption: "Cap" }).alt).toBe("Alt réel")
    expect(imageViewModel({ src: "x", rounded: "circle" }).isCircle).toBe(true)
    expect(imageViewModel({ src: "x", rounded: "circle" }).aspectRatio).toBe("1")
    // src dangereux → pas de média (placeholder), pas de src exécutable
    expect(imageViewModel({ src: "javascript:alert(1)" }).hasMedia).toBe(false)
    // lien durci
    expect(imageViewModel({ src: "x", link: "javascript:alert(1)" }).link.href?.startsWith("javascript:")).toBe(false)
    expect(imageViewModel({ src: "x", link: "https://x.co" }).link.visible).toBe(true)
  })
  it("portfolio_work : filtre title, image safe, cta lien", () => {
    const vm = portfolioWorkViewModel({ work1_title: "", work2_title: "Projet", work2_img: "https://x.co/a.jpg", cta_label: "Voir", cta_url: "https://x.co" })
    expect(vm.items.map(w => w.title)).toEqual(["Projet"])
    expect(vm.items[0].img).toBe("https://x.co/a.jpg")
    expect(vm.link.visible).toBe(true); expect(vm.link.trackTarget).toBe("https://x.co")
    expect(portfolioWorkViewModel({ work1_title: "T", work1_img: "javascript:x" }).items[0].img).toBeNull()
  })
  it("favorite_links : filtre label, lien par item (href durci, cible)", () => {
    const vm = favoriteLinksViewModel({ link_1_label: "Site", link_1_url: "https://x.co", link_2_url: "https://y.co" })
    expect(vm.items.length).toBe(1)
    expect(vm.items[0].link.trackTarget).toBe("https://x.co")
    expect(favoriteLinksViewModel({ link_1_label: "X", link_1_url: "javascript:x" }).items[0].link.href?.startsWith("javascript:")).toBe(false)
    expect(favoriteLinksViewModel({ link_1_label: "X" }).items[0].link.trackTarget).toBe("link")
  })
  it("concerts : filtre city, visible=hasPublishableContent, lien billetterie par date", () => {
    const vm = concertsViewModel({ c1_city: "Paris", c1_date: "12/09", c1_url: "https://t.co", c2_venue: "orphelin" })
    expect(vm.items.map(s => s.city)).toEqual(["Paris"])
    expect(vm.items[0].link.visible).toBe(true)
    expect(concertsViewModel({ c1_city: "Lyon" }).items[0].link.visible).toBe(false)
  })
  it("merch : 3 produits filtrés sur name, image safe, prix brut", () => {
    const vm = merchViewModel({ name1: "Tshirt", price1: "25€", img1: "https://x.co/a.jpg", name3: "Cap", price3: "0" })
    expect(vm.items.map(p => p.name)).toEqual(["Tshirt", "Cap"])
    expect(vm.items[1].price).toBe("0")
    expect(vm.items[0].img).toBe("https://x.co/a.jpg")
  })
  it("app_download : liens stores, visible si au moins un", () => {
    expect(appDownloadViewModel({}).visible).toBe(false)
    expect(appDownloadViewModel({ ios_url: "https://apps.apple.com/x" }).visible).toBe(true)
    expect(appDownloadViewModel({ android_url: "https://play.google.com/x" }).android?.trackTarget).toBe("https://play.google.com/x")
    expect(appDownloadViewModel({ ios_url: "javascript:x" }).ios?.href?.startsWith("javascript:")).toBe(false)
  })
  it("limites : portfolio_work/favorite_links/concerts plafonnés à 50", () => {
    const pw: Record<string, string> = {}; for (let i = 1; i <= 55; i++) pw[`work${i}_title`] = `W${i}`
    expect(portfolioWorkViewModel(pw).items.length).toBe(50)
    const fl: Record<string, string> = {}; for (let i = 1; i <= 55; i++) fl[`link_${i}_label`] = `L${i}`
    expect(favoriteLinksViewModel(fl).items.length).toBe(50)
  })
  it("aucune mutation du contenu source", () => {
    const c = { src: "x", work1_title: "A", link_1_label: "B", c1_city: "P", name1: "N", ios_url: "u" }; const snap = JSON.stringify(c)
    imageViewModel(c); portfolioWorkViewModel(c); favoriteLinksViewModel(c); concertsViewModel(c); merchViewModel(c); appDownloadViewModel(c)
    expect(JSON.stringify(c)).toBe(snap)
  })
})

describe("wave6 — parité éditeur (placeholder / neutralisation)", () => {
  it("image vide → placeholder « Aucune image », sans <img> ni <a>", () => {
    const out = H(createElement(EditorImage, { content: {}, ctx: eCtx }))
    expect(out).toContain("Aucune image"); expect(out).not.toContain("<img"); expect(out).not.toContain("<a ")
  })
  it("image avec média → <img> mais AUCUN lien (neutralisé) même si link défini", () => {
    const out = H(createElement(EditorImage, { content: { src: "https://x.co/a.jpg", link: "https://x.co" }, ctx: eCtx }))
    expect(out).toContain("<img"); expect(out).not.toContain("<a ")
  })
  it("concerts/merch vides → état vide (role note), favorite_links vide → placeholder texte", () => {
    expect(H(createElement(EditorConcerts, { content: {}, ctx: eCtx }))).toContain('role="note"')
    expect(H(createElement(EditorMerch, { content: {}, ctx: eCtx }))).toContain('role="note"')
    expect(H(createElement(EditorFavoriteLinks, { content: {}, ctx: eCtx }))).toContain("Ajoutez vos liens favoris")
  })
  it("CTA/liens éditeur neutralisés (aucun <a>) sur portfolio_work/favorite_links/merch/app_download", () => {
    expect(H(createElement(EditorPortfolioWork, { content: { work1_title: "T", cta_label: "Voir", cta_url: "https://x.co" }, ctx: eCtx }))).not.toContain("<a ")
    expect(H(createElement(EditorFavoriteLinks, { content: { link_1_label: "S", link_1_url: "https://x.co" }, ctx: eCtx }))).not.toContain("<a ")
    expect(H(createElement(EditorMerch, { content: { name1: "T", cta_label: "Acheter", cta_url: "https://x.co" }, ctx: eCtx }))).not.toContain("<a ")
    expect(H(createElement(EditorAppDownload, { content: { ios_url: "https://x.co" }, ctx: eCtx }))).not.toContain("<a ")
  })
})

describe("wave6 — parité public (null / média / liens / lazy / sécurité)", () => {
  it("image vide → null ; avec média → <img loading=lazy> ; lien → <a>", () => {
    expect(H(createElement(PublicImage, { content: {}, ctx: pCtx }))).toBe("")
    const out = H(createElement(PublicImage, { content: { src: "https://x.co/a.jpg" }, ctx: pCtx }))
    expect(out).toContain("<img"); expect(out).toContain('loading="lazy"')
    expect(H(createElement(PublicImage, { content: { src: "https://x.co/a.jpg", link: "https://x.co" }, ctx: pCtx }))).toContain("<a ")
  })
  it("image src dangereux → null (aucun <img>, aucun schéma exécutable)", () => {
    const out = H(createElement(PublicImage, { content: { src: "javascript:alert(1)" }, ctx: pCtx }))
    expect(out).toBe("")
  })
  it("image lien dangereux → href non exécutable", () => {
    const out = H(createElement(PublicImage, { content: { src: "https://x.co/a.jpg", link: "javascript:alert(1)" }, ctx: pCtx }))
    expect(out).not.toContain('href="javascript:')
  })
  const nullCases: [string, any][] = [
    ["portfolio_work", PublicPortfolioWork], ["favorite_links", PublicFavoriteLinks],
    ["concerts", PublicConcerts], ["merch", PublicMerch], ["app_download", PublicAppDownload],
  ]
  for (const [name, Comp] of nullCases) {
    it(`${name} : vide → null`, () => { expect(H(createElement(Comp, { content: {}, ctx: pCtx }))).toBe("") })
  }
  it("liens publics réels (<a>) + alt image portfolio/merch", () => {
    expect(H(createElement(PublicPortfolioWork, { content: { work1_title: "T", cta_label: "Voir", cta_url: "https://x.co" }, ctx: pCtx }))).toContain("<a ")
    expect(H(createElement(PublicFavoriteLinks, { content: { link_1_label: "S", link_1_url: "https://x.co" }, ctx: pCtx }))).toContain("<a ")
    expect(H(createElement(PublicConcerts, { content: { c1_city: "Paris", c1_url: "https://t.co" }, ctx: pCtx }))).toContain("<a ")
    expect(H(createElement(PublicMerch, { content: { name1: "T", img1: "https://x.co/a.jpg" }, ctx: pCtx }))).toContain('loading="lazy"')
    expect(H(createElement(PublicAppDownload, { content: { ios_url: "https://apps.apple.com/x" }, ctx: pCtx }))).toContain("<a ")
  })
  it("merch/app_download href dangereux neutralisé", () => {
    expect(H(createElement(PublicAppDownload, { content: { ios_url: "javascript:alert(1)" }, ctx: pCtx }))).not.toContain('href="javascript:')
    expect(H(createElement(PublicMerch, { content: { name1: "T", cta_label: "X", cta_url: "javascript:alert(1)" }, ctx: pCtx }))).not.toContain('href="javascript:')
  })
})

describe("wave6 — parité de LIMITE éditeur/public", () => {
  it("portfolio_work : item50 présent des deux côtés, item51 absent", () => {
    const pw: Record<string, string> = {}; for (let i = 1; i <= 55; i++) pw[`work${i}_title`] = `W${i}`
    const ed = H(createElement(EditorPortfolioWork, { content: pw, ctx: eCtx }))
    const pub = H(createElement(PublicPortfolioWork, { content: pw, ctx: pCtx }))
    expect(ed.includes("W50")).toBe(true); expect(ed.includes("W51")).toBe(false)
    expect(pub.includes("W50")).toBe(true); expect(pub.includes("W51")).toBe(false)
  })
})
