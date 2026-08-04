import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { safeAvSrc } from "./models/mediaUrl"
import { videoLocalViewModel } from "./models/videoLocal"
import { audioPlayerViewModel } from "./models/audioPlayer"
import { pdfViewerViewModel } from "./models/pdfViewer"
import { spotifyEmbedViewModel } from "./models/spotifyEmbed"
import { spotifyPlayerViewModel } from "./models/spotifyPlayer"
import { beforeAfterViewModel } from "./models/beforeAfter"
import { EditorVideoLocal } from "./blocks/video_local/EditorVideoLocal"
import { PublicVideoLocal } from "./blocks/video_local/PublicVideoLocal"
import { EditorAudioPlayer } from "./blocks/audio_player/EditorAudioPlayer"
import { PublicAudioPlayer } from "./blocks/audio_player/PublicAudioPlayer"
import { EditorPdfViewer } from "./blocks/pdf_viewer/EditorPdfViewer"
import { PublicPdfViewer } from "./blocks/pdf_viewer/PublicPdfViewer"
import { EditorSpotifyEmbed } from "./blocks/spotify_embed/EditorSpotifyEmbed"
import { PublicSpotifyEmbed } from "./blocks/spotify_embed/PublicSpotifyEmbed"
import { EditorSpotifyPlayer } from "./blocks/spotify_player/EditorSpotifyPlayer"
import { PublicSpotifyPlayer } from "./blocks/spotify_player/PublicSpotifyPlayer"
import { EditorBeforeAfter } from "./blocks/before_after/EditorBeforeAfter"
import { PublicBeforeAfter } from "./blocks/before_after/PublicBeforeAfter"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

const theme: any = { fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const eCtx: EditorRenderCtx = { theme, primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190", accent: "#39FF8F", surfaceStyle: { background: "#080808" }, canEdit: false, edit: () => () => {} }
const pCtx: PublicRenderCtx = { theme, G: "#C9A84C", TEXT: "#F5F0E8", MUTED: "#A8A190", FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: () => {} }
const H = (el: any) => renderToStaticMarkup(el)

describe("wave7 — safeAvSrc (sécurité source audio/vidéo)", () => {
  it("neutralise schémas dangereux (dont blob:) → null", () => {
    for (const bad of ["javascript:x", "vbscript:x", "file:///x", "blob:https://x", "data:text/html,x", ""]) {
      expect(safeAvSrc(bad)).toBeNull()
    }
  })
  it("rejette non-chaîne / trop long", () => {
    expect(safeAvSrc({} as any)).toBeNull(); expect(safeAvSrc([] as any)).toBeNull()
    expect(safeAvSrc("https://x.co/" + "a".repeat(3000))).toBeNull()
  })
  it("accepte http(s), data:video, data:audio, chemin interne", () => {
    expect(safeAvSrc("https://x.co/v.mp4")).toBe("https://x.co/v.mp4")
    expect(safeAvSrc("/media/a.mp3")).toBe("/media/a.mp3")
    expect(safeAvSrc("data:video/mp4;base64,AAA")).toBe("data:video/mp4;base64,AAA")
    expect(safeAvSrc("data:audio/mpeg;base64,AAA")).toBe("data:audio/mpeg;base64,AAA")
  })
})

describe("wave7 — modèles média interactifs", () => {
  it("video_local : visible via src, options normalisées, src dangereux → invisible", () => {
    expect(videoLocalViewModel({}).visible).toBe(false)
    const vm = videoLocalViewModel({ src: "https://x.co/v.mp4", ratio: "9:16", autoplay: "yes", loop: "yes" })
    expect(vm.visible).toBe(true); expect(vm.aspectRatio).toBe("9/16"); expect(vm.vertical).toBe(true)
    expect(vm.autoplay).toBe(true); expect(vm.loop).toBe(true); expect(vm.muted).toBe(true)
    expect(videoLocalViewModel({ src: "https://x.co/v.mp4", muted: "no" }).muted).toBe(false)
    expect(videoLocalViewModel({ src: "javascript:alert(1)" }).visible).toBe(false)
  })
  it("audio_player : visible via src, titre défaut, download opt-in", () => {
    expect(audioPlayerViewModel({}).visible).toBe(false)
    expect(audioPlayerViewModel({ src: "https://x.co/a.mp3" }).title).toBe("Écouter")
    expect(audioPlayerViewModel({ src: "https://x.co/a.mp3", show_download: "yes" }).showDownload).toBe(true)
    expect(audioPlayerViewModel({ src: "blob:https://x" }).visible).toBe(false)
  })
  it("pdf_viewer : visible via url||title, href durci, meta", () => {
    expect(pdfViewerViewModel({}).visible).toBe(false)
    expect(pdfViewerViewModel({ title: "Doc" }).visible).toBe(true)
    expect(pdfViewerViewModel({ url: "javascript:alert(1)" }).href?.startsWith("javascript:")).toBe(false)
    expect(pdfViewerViewModel({ url: "https://x.co/f.pdf" }).trackTarget).toBe("https://x.co/f.pdf")
  })
  it("spotify_embed : URL d'embed stricte, providers non reconnus → invisible", () => {
    expect(spotifyEmbedViewModel({ url: "https://open.spotify.com/track/abc123" }).src).toContain("open.spotify.com/embed/track/abc123")
    expect(spotifyEmbedViewModel({ url: "https://evil.com/track/x" }).visible).toBe(false)
    expect(spotifyEmbedViewModel({ url: "javascript:alert(1)" }).visible).toBe(false)
    expect(spotifyEmbedViewModel({ url: "spotify:album:xyz" }).src).toContain("open.spotify.com/embed/album/xyz")
    expect(spotifyEmbedViewModel({ size: "lg", url: "https://open.spotify.com/track/x" }).height).toBe(352)
  })
  it("spotify_player : lien durci, carte toujours visible", () => {
    expect(spotifyPlayerViewModel({}).title).toBe("Ma musique")
    expect(spotifyPlayerViewModel({ url: "https://open.spotify.com/x" }).link.visible).toBe(true)
    expect(spotifyPlayerViewModel({}).link.visible).toBe(false)
    expect(spotifyPlayerViewModel({ url: "javascript:x" }).link.href?.startsWith("javascript:")).toBe(false)
  })
  it("before_after : visible si une image, images sécurisées", () => {
    expect(beforeAfterViewModel({}).visible).toBe(false)
    expect(beforeAfterViewModel({ before_img: "https://x.co/a.jpg" }).visible).toBe(true)
    expect(beforeAfterViewModel({ before_img: "javascript:x", after_img: "https://x.co/b.jpg" }).beforeImg).toBeNull()
    expect(beforeAfterViewModel({ after_img: "x" }).afterLabel).toBe("Après")
  })
  it("aucune mutation du contenu source", () => {
    const c = { src: "https://x.co/v.mp4", url: "https://x.co/f.pdf", before_img: "x", title: "T" }; const snap = JSON.stringify(c)
    videoLocalViewModel(c); audioPlayerViewModel(c); pdfViewerViewModel(c); spotifyEmbedViewModel(c); spotifyPlayerViewModel(c); beforeAfterViewModel(c)
    expect(JSON.stringify(c)).toBe(snap)
  })
})

describe("wave7 — parité + interactions (contrôles / autoplay / iframe)", () => {
  it("video_local : public <video controls> ; autoplay conservé en public, JAMAIS en éditeur", () => {
    const content = { src: "https://x.co/v.mp4", autoplay: "yes" }
    const pub = H(createElement(PublicVideoLocal, { content, ctx: pCtx }))
    const ed = H(createElement(EditorVideoLocal, { content, ctx: eCtx }))
    expect(pub).toContain("<video"); expect(pub).toContain("controls")
    expect(pub).toContain("autoplay")        // public conserve l'autoplay legacy
    expect(ed).toContain("<video"); expect(ed).not.toContain("autoplay")  // éditeur : jamais d'autoplay
  })
  it("video_local : public null si pas de source ; éditeur placeholder", () => {
    expect(H(createElement(PublicVideoLocal, { content: {}, ctx: pCtx }))).toBe("")
    expect(H(createElement(EditorVideoLocal, { content: {}, ctx: eCtx }))).toContain("Ajoutez l")
  })
  it("audio_player : public <audio controls> ; éditeur carte sans <audio> ; null si pas de src", () => {
    const content = { src: "https://x.co/a.mp3", title: "Titre" }
    expect(H(createElement(PublicAudioPlayer, { content, ctx: pCtx }))).toContain("<audio")
    expect(H(createElement(PublicAudioPlayer, { content, ctx: pCtx }))).toContain("controls")
    expect(H(createElement(EditorAudioPlayer, { content, ctx: eCtx }))).not.toContain("<audio")
    expect(H(createElement(PublicAudioPlayer, { content: {}, ctx: pCtx }))).toBe("")
  })
  it("pdf_viewer : public liens (aucune iframe) ; éditeur aucun <a>", () => {
    const content = { title: "Doc", url: "https://x.co/f.pdf" }
    const pub = H(createElement(PublicPdfViewer, { content, ctx: pCtx }))
    expect(pub).toContain("<a "); expect(pub).not.toContain("<iframe")
    expect(H(createElement(EditorPdfViewer, { content, ctx: eCtx }))).not.toContain("<a ")
  })
  it("spotify_embed : iframe sûre (title + allow + loading) ; garbage → null", () => {
    const pub = H(createElement(PublicSpotifyEmbed, { content: { url: "https://open.spotify.com/track/abc" }, ctx: pCtx }))
    expect(pub).toContain("<iframe"); expect(pub).toContain('title="Lecteur Spotify"'); expect(pub).toContain('loading="lazy"')
    expect(pub).toContain("open.spotify.com/embed/track/abc")
    expect(H(createElement(PublicSpotifyEmbed, { content: { url: "https://evil.com/x" }, ctx: pCtx }))).toBe("")
    expect(H(createElement(PublicSpotifyEmbed, { content: {}, ctx: pCtx }))).toBe("")
  })
  it("spotify_player : public <a> Play si url ; éditeur aucun <a>", () => {
    expect(H(createElement(PublicSpotifyPlayer, { content: { url: "https://open.spotify.com/x" }, ctx: pCtx }))).toContain("<a ")
    expect(H(createElement(PublicSpotifyPlayer, { content: {}, ctx: pCtx }))).not.toContain("<a ")
    expect(H(createElement(EditorSpotifyPlayer, { content: { url: "https://open.spotify.com/x" }, ctx: eCtx }))).not.toContain("<a ")
  })
  it("before_after : grille (2 images), null si vide, aucune iframe/slider", () => {
    const out = H(createElement(PublicBeforeAfter, { content: { before_img: "https://x.co/a.jpg", after_img: "https://x.co/b.jpg" }, ctx: pCtx }))
    expect((out.match(/<img/g) || []).length).toBe(2); expect(out).not.toContain("<iframe")
    expect(H(createElement(PublicBeforeAfter, { content: {}, ctx: pCtx }))).toBe("")
    expect(H(createElement(EditorBeforeAfter, { content: { before_img: "https://x.co/a.jpg" }, ctx: eCtx }))).toContain("<img")
  })
})

describe("wave7 — sécurité (aucun schéma dangereux dans src/href/iframe)", () => {
  it("video src dangereux → public null (aucune balise video)", () => {
    expect(H(createElement(PublicVideoLocal, { content: { src: "javascript:alert(1)" }, ctx: pCtx }))).toBe("")
  })
  it("pdf href dangereux neutralisé", () => {
    const out = H(createElement(PublicPdfViewer, { content: { title: "D", url: "javascript:alert(1)" }, ctx: pCtx }))
    expect(out).not.toContain('href="javascript:')
  })
  it("spotify_embed : faux domaine ressemblant → aucune iframe", () => {
    // "open.spotify.com.evil.com/track/x" : pas de slash après ".com" → ne matche pas l'allowlist → vide.
    expect(H(createElement(PublicSpotifyEmbed, { content: { url: "https://open.spotify.com.evil.com/track/x" }, ctx: pCtx }))).toBe("")
    expect(H(createElement(PublicSpotifyEmbed, { content: { url: "https://notspotify.com/track/x" }, ctx: pCtx }))).toBe("")
  })
})
