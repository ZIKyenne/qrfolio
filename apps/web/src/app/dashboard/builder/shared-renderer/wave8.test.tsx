import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { videoBlockViewModel } from "./models/videoBlock"
import { googleMapsEmbedViewModel } from "./models/googleMapsEmbed"
import { albumBlockViewModel } from "./models/albumBlock"
import { discographyViewModel } from "./models/discography"
import { podcastLinksViewModel } from "./models/podcastLinks"
import { productCatalogViewModel } from "./models/productCatalog"
import { EditorVideo } from "./blocks/video/EditorVideo"
import { PublicVideo } from "./blocks/video/PublicVideo"
import { EditorGoogleMapsEmbed } from "./blocks/google_maps_embed/EditorGoogleMapsEmbed"
import { PublicGoogleMapsEmbed } from "./blocks/google_maps_embed/PublicGoogleMapsEmbed"
import { EditorAlbumBlock } from "./blocks/album_block/EditorAlbumBlock"
import { PublicAlbumBlock } from "./blocks/album_block/PublicAlbumBlock"
import { EditorDiscography } from "./blocks/discography/EditorDiscography"
import { PublicDiscography } from "./blocks/discography/PublicDiscography"
import { EditorPodcastLinks } from "./blocks/podcast_links/EditorPodcastLinks"
import { PublicPodcastLinks } from "./blocks/podcast_links/PublicPodcastLinks"
import { EditorProductCatalog } from "./blocks/product_catalog/EditorProductCatalog"
import { PublicProductCatalog } from "./blocks/product_catalog/PublicProductCatalog"
import { BLOCS_ACTIFS_ATTENDUS } from "./blocsActifs.recensement"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

const theme: any = { fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const eCtx: EditorRenderCtx = { theme, primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190", accent: "#39FF8F", surfaceStyle: { background: "#080808" }, canEdit: false, edit: () => () => {} }
const pCtx: PublicRenderCtx = { theme, G: "#C9A84C", TEXT: "#F5F0E8", MUTED: "#A8A190", FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: () => {} }
const H = (el: any) => renderToStaticMarkup(el)

describe("wave8 — modèles", () => {
  it("video : provider allowlisté → visible ; sinon invisible", () => {
    expect(videoBlockViewModel({ url: "https://youtu.be/abc123" }).visible).toBe(true)
    expect(videoBlockViewModel({ url: "https://youtube.com.evil.com/watch?v=x" }).visible).toBe(false)
    expect(videoBlockViewModel({ url: "javascript:alert(1)" }).visible).toBe(false)
    expect(videoBlockViewModel({}).visible).toBe(false)
  })
  it("google_maps_embed : adresse → embed google ; embed arbitraire → src null", () => {
    expect(googleMapsEmbedViewModel({ address: "Paris" }).embed.src).toContain("maps.google.com/maps")
    expect(googleMapsEmbedViewModel({ embed_url: "https://evil.com/x" }).embed.src).toBeNull()
    expect(googleMapsEmbedViewModel({ address: "Paris" }).directionsHref).toContain("destination=Paris")
  })
  it("album_block : cover SharedImageModel, plateformes durcies, cta parité", () => {
    const vm = albumBlockViewModel({ title: "Al", cover: "https://x.co/c.jpg", spotify_url: "https://open.spotify.com/album/x" })
    expect(vm.cover.src).toBe("https://x.co/c.jpg"); expect(vm.cover.decorative).toBe(true)
    expect(vm.platforms[0].trackTarget).toBe("https://open.spotify.com/album/x")
    expect(vm.cta.visible).toBe(false) // plateforme présente
    expect(albumBlockViewModel({ cta_label: "Écouter" }).cta.visible).toBe(true) // aucune plateforme
    expect(albumBlockViewModel({ cover: "javascript:x", title: "Al" }).cover.src).toBeNull()
  })
  it("discography : filtre title, limite 50, cover via contrat image", () => {
    const vm = discographyViewModel({ a1_title: "A", a2_title: "", a2_cover: "x" })
    expect(vm.items.map(x => x.title)).toEqual(["A"])
    const big: Record<string, string> = {}; for (let i = 1; i <= 55; i++) big[`a${i}_title`] = `T${i}`
    expect(discographyViewModel(big).items.length).toBe(50)
  })
  it("podcast_links : visible (plateforme||nom), cover via contrat", () => {
    expect(podcastLinksViewModel({}).visible).toBe(false)
    expect(podcastLinksViewModel({ podcast_name: "P" }).visible).toBe(true)
    expect(podcastLinksViewModel({ spotify_url: "https://open.spotify.com/show/x" }).platforms.length).toBe(1)
  })
  it("product_catalog : filtre name, lien produit durci, image via contrat", () => {
    const vm = productCatalogViewModel({ p1_name: "Prod", p1_img: "https://x.co/a.jpg", p1_url: "https://x.co", cta_label: "Voir" })
    expect(vm.items[0].name).toBe("Prod"); expect(vm.items[0].img.src).toBe("https://x.co/a.jpg")
    expect(vm.items[0].link.trackTarget).toBe("https://x.co"); expect(vm.ctaLabel).toBe("Voir")
    expect(productCatalogViewModel({ p1_name: "X", p1_img: "javascript:x" }).items[0].img.src).toBeNull()
  })
  it("aucune mutation", () => {
    const c = { url: "https://youtu.be/x", address: "Paris", title: "T", cover: "x", a1_title: "A", podcast_name: "P", p1_name: "N" }
    const snap = JSON.stringify(c)
    videoBlockViewModel(c); googleMapsEmbedViewModel(c); albumBlockViewModel(c); discographyViewModel(c); podcastLinksViewModel(c); productCatalogViewModel(c)
    expect(JSON.stringify(c)).toBe(snap)
  })
})

describe("wave8 — embeds sécurisés (parité + sécurité)", () => {
  it("video : public iframe canonique ; éditeur placeholder (aucune iframe)", () => {
    const pub = H(createElement(PublicVideo, { content: { url: "https://youtu.be/abc123" }, ctx: pCtx }))
    expect(pub).toContain("<iframe"); expect(pub).toContain("youtube-nocookie.com/embed/abc123"); expect(pub).toContain('loading="lazy"')
    const ed = H(createElement(EditorVideo, { content: { url: "https://youtu.be/abc123", title: "T" }, ctx: eCtx }))
    expect(ed).not.toContain("<iframe"); expect(ed).toContain("T")
  })
  it("video : URL non allowlistée/dangereuse → public null (aucune iframe brute)", () => {
    expect(H(createElement(PublicVideo, { content: { url: "https://evil.com/v" }, ctx: pCtx }))).toBe("")
    expect(H(createElement(PublicVideo, { content: { url: "javascript:alert(1)" }, ctx: pCtx }))).toBe("")
  })
  it("google_maps : public iframe google + itinéraire <a> ; éditeur itinéraire NEUTRALISÉ (aucun <a>)", () => {
    const pub = H(createElement(PublicGoogleMapsEmbed, { content: { address: "Paris", label: "Ici" }, ctx: pCtx }))
    expect(pub).toContain("<iframe"); expect(pub).toContain("maps.google.com/maps"); expect(pub).toContain("<a ")
    const ed = H(createElement(EditorGoogleMapsEmbed, { content: { address: "Paris" }, ctx: eCtx }))
    expect(ed).toContain("<iframe"); expect(ed).not.toContain("<a ")
  })
  it("google_maps : embed_url arbitraire → aucune iframe (placeholder), aucune URL evil", () => {
    const pub = H(createElement(PublicGoogleMapsEmbed, { content: { embed_url: "https://evil.com/maps" }, ctx: pCtx }))
    expect(pub).not.toContain("<iframe"); expect(pub).not.toContain("evil.com")
  })
})

describe("wave8 — contrat image + CTA + parité", () => {
  it("album : public SmartImage(<img>) cover + plateformes <a> ; éditeur aucun <a>", () => {
    const content = { title: "Al", cover: "https://x.co/c.jpg", spotify_url: "https://open.spotify.com/album/x" }
    const pub = H(createElement(PublicAlbumBlock, { content, ctx: pCtx }))
    expect(pub).toContain("<img"); expect(pub).toContain("<a ")
    const ed = H(createElement(EditorAlbumBlock, { content, ctx: eCtx }))
    expect(ed).toContain("<img"); expect(ed).not.toContain("<a ") // plateformes = badges non navigables
  })
  it("album : CTA sans plateforme = libellé non navigable des DEUX côtés (aucun <a>)", () => {
    const content = { title: "Al", cta_label: "Écouter" }
    expect(H(createElement(PublicAlbumBlock, { content, ctx: pCtx }))).toContain("Écouter")
    expect(H(createElement(PublicAlbumBlock, { content, ctx: pCtx }))).not.toContain("<a ")
    expect(H(createElement(EditorAlbumBlock, { content, ctx: eCtx }))).not.toContain("<a ")
  })
  it("album : cover dangereuse → placeholder 💿 (aucun img avec javascript)", () => {
    const out = H(createElement(PublicAlbumBlock, { content: { title: "Al", cover: "javascript:x" }, ctx: pCtx }))
    expect(out).not.toContain("javascript:"); expect(out).toContain("💿")
  })
  it("discography : éditeur vide → état vide ; public null ; rempli → rows + lien", () => {
    expect(H(createElement(EditorDiscography, { content: {}, ctx: eCtx }))).toContain('role="note"')
    expect(H(createElement(PublicDiscography, { content: {}, ctx: pCtx }))).toBe("")
    expect(H(createElement(PublicDiscography, { content: { a1_title: "Alb", a1_url: "https://x.co" }, ctx: pCtx }))).toContain("<a ")
  })
  it("podcast_links : public plateformes <a> ; éditeur placeholder si vide", () => {
    expect(H(createElement(PublicPodcastLinks, { content: { podcast_name: "P", spotify_url: "https://open.spotify.com/show/x" }, ctx: pCtx }))).toContain("<a ")
    expect(H(createElement(PublicPodcastLinks, { content: {}, ctx: pCtx }))).toBe("")
    expect(H(createElement(EditorPodcastLinks, { content: { podcast_name: "P" }, ctx: eCtx }))).toContain("Ajoutez vos plateformes")
  })
  it("product_catalog : public carte <a> + img ; éditeur aucun <a> ; null si vide", () => {
    const content = { p1_name: "Prod", p1_img: "https://x.co/a.jpg", p1_url: "https://x.co" }
    expect(H(createElement(PublicProductCatalog, { content, ctx: pCtx }))).toContain("<a ")
    expect(H(createElement(PublicProductCatalog, { content, ctx: pCtx }))).toContain("<img")
    expect(H(createElement(EditorProductCatalog, { content, ctx: eCtx }))).not.toContain("<a ")
    expect(H(createElement(PublicProductCatalog, { content: {}, ctx: pCtx }))).toBe("")
  })
})

describe("wave8 — méta : blocs shared au recensement, aucun bloc exclu activé", () => {
  it("exactement blocs shared au recensement actifs", () => {
    expect(SHARED_RENDERER_BLOCKS.size).toBe(BLOCS_ACTIFS_ATTENDUS.length)
  })
  it("les 6 nouveaux sont actifs", () => {
    for (const t of ["video", "google_maps_embed", "album_block", "discography", "podcast_links", "product_catalog"]) {
      expect(SHARED_RENDERER_BLOCKS.has(t)).toBe(true)
    }
  })
  it("les blocs exclus restent legacy", () => {
    for (const t of ["embed_block", "media_before_after", "latest_release", "playlist_block", "presave"]) {
      expect(SHARED_RENDERER_BLOCKS.has(t)).toBe(false)
    }
  })
})
