import { describe, it, expect } from "vitest"
import { embedVideoUrl, mapEmbedUrl } from "../types"
import { videoEmbedModel, mapEmbedModel } from "./models/embed"
import { sharedImageModel } from "./models/sharedImage"
import { albumBlockCtaModel } from "./models/albumBlockCta"
import { beforeAfterModel } from "./models/beforeAfterShared"
import { SHARED_RENDERER_BLOCKS } from "./architecture"

// ══════════════════════════════════════════════════════════════════════════════
// Chantier A — embeds strictement allowlistés (aucune iframe arbitraire)
// ══════════════════════════════════════════════════════════════════════════════
describe("B09.11 A — embedVideoUrl : providers stricts", () => {
  it("YouTube (watch/court/shorts/embed/nocookie) → embed canonique", () => {
    expect(embedVideoUrl("https://youtube.com/watch?v=abc123&t=5")).toBe("https://www.youtube-nocookie.com/embed/abc123")
    expect(embedVideoUrl("https://youtu.be/xyz789")).toBe("https://www.youtube-nocookie.com/embed/xyz789")
    expect(embedVideoUrl("https://www.youtube.com/shorts/s01")).toBe("https://www.youtube-nocookie.com/embed/s01")
    expect(embedVideoUrl("https://www.youtube-nocookie.com/embed/abc123")).toBe("https://www.youtube-nocookie.com/embed/abc123")
  })
  it("Vimeo → player canonique", () => {
    expect(embedVideoUrl("https://vimeo.com/123456789")).toBe("https://player.vimeo.com/video/123456789")
    expect(embedVideoUrl("https://player.vimeo.com/video/123456789")).toBe("https://player.vimeo.com/video/123456789")
  })
  it("domaines ressemblants / arbitraires / schémas dangereux → vide", () => {
    for (const bad of [
      "https://youtube.com.evil.com/watch?v=x", "https://youtu.be.evil.com/x", "https://evil-youtube.com/watch?v=x",
      "https://evil.com/video", "https://evil.com/embed/x", "javascript:alert(1)", "data:text/html,<script>",
      "vbscript:x", "file:///etc", "blob:https://x", "",
    ]) {
      expect(embedVideoUrl(bad)).toBe("")
    }
  })
})

describe("B09.11 A — mapEmbedUrl : Google Maps uniquement", () => {
  it("adresse → carte canonique output=embed", () => {
    expect(mapEmbedUrl("Paris")).toBe("https://maps.google.com/maps?q=Paris&z=15&output=embed")
  })
  it("embed personnalisé Google Maps conservé", () => {
    const ok = "https://www.google.com/maps/embed?pb=xyz"
    expect(mapEmbedUrl("Paris", ok)).toBe(ok)
    const ok2 = "https://maps.google.fr/maps?q=x&output=embed"
    expect(mapEmbedUrl("", ok2)).toBe(ok2)
  })
  it("embed arbitraire / faux domaine → ignoré (repli adresse ou vide)", () => {
    expect(mapEmbedUrl("", "https://evil.com/maps")).toBe("")
    expect(mapEmbedUrl("", "https://google.com.evil.com/maps")).toBe("")
    expect(mapEmbedUrl("", "javascript:alert(1)")).toBe("")
    expect(mapEmbedUrl("Lyon", "https://evil.com/x")).toBe("https://maps.google.com/maps?q=Lyon&z=15&output=embed")
  })
})

describe("B09.11 A — SafeEmbedModel", () => {
  it("videoEmbedModel : valide → visible + attributs iframe sûrs", () => {
    const vm = videoEmbedModel({ url: "https://youtu.be/abc123", title: "Démo" })
    expect(vm.visible).toBe(true); expect(vm.provider).toBe("youtube"); expect(vm.title).toBe("Démo")
    expect(vm.src).toContain("youtube-nocookie.com/embed/abc123")
    expect(vm.allowFullScreen).toBe(true); expect(vm.loading).toBe("lazy"); expect(vm.referrerPolicy).toBeTruthy()
  })
  it("videoEmbedModel : vimeo ok, invalide/objet/tableau → invisible", () => {
    expect(videoEmbedModel({ url: "https://vimeo.com/1" }).provider).toBe("vimeo")
    expect(videoEmbedModel({ url: "https://evil.com/x" }).visible).toBe(false)
    expect(videoEmbedModel({ url: {} as any }).visible).toBe(false)
    expect(videoEmbedModel({ url: [] as any }).visible).toBe(false)
    expect(videoEmbedModel({}).visible).toBe(false)
  })
  it("mapEmbedModel : provider google-maps, jamais confondu avec vidéo", () => {
    const m = mapEmbedModel({ address: "Paris" })
    expect(m.visible).toBe(true); expect(m.provider).toBe("google-maps"); expect(m.allowFullScreen).toBe(false)
    expect(mapEmbedModel({ embed_url: "https://evil.com/x" }).visible).toBe(false)
    expect(videoEmbedModel({ url: "https://youtu.be/x" }).provider).not.toBe("google-maps")
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Chantier B — contrat d'image partagé
// ══════════════════════════════════════════════════════════════════════════════
describe("B09.11 B — sharedImageModel (12 cas)", () => {
  it("source valide http/interne/CDN/Supabase → src conservée, visible", () => {
    expect(sharedImageModel("https://x.co/a.jpg").visible).toBe(true)
    expect(sharedImageModel("/u/a.webp").src).toBe("/u/a.webp")
    expect(sharedImageModel("https://cdn.x.co/a.png").src).toBe("https://cdn.x.co/a.png")
    expect(sharedImageModel("https://proj.supabase.co/storage/x.jpg").visible).toBe(true)
  })
  it("source vide / dangereuse / mauvais type → src null, invisible", () => {
    expect(sharedImageModel("").visible).toBe(false)
    expect(sharedImageModel("javascript:alert(1)").src).toBeNull()
    expect(sharedImageModel({} as any).src).toBeNull()
    expect(sharedImageModel(["x"] as any).src).toBeNull()
  })
  it("alt explicite conservé ; décorative → alt vide ; jamais l'URL en alt", () => {
    expect(sharedImageModel("https://x.co/a.jpg", { alt: "Photo produit" }).alt).toBe("Photo produit")
    expect(sharedImageModel("https://x.co/a.jpg", { alt: "X", decorative: true }).alt).toBe("")
    expect(sharedImageModel("https://x.co/a.jpg").alt).toBe("")
  })
  it("ratio, object-fit, fallback exposés", () => {
    const m = sharedImageModel("https://x.co/a.jpg", { aspectRatio: "16/9", objectFit: "contain", fallback: "placeholder" })
    expect(m.aspectRatio).toBe("16/9"); expect(m.objectFit).toBe("contain"); expect(m.fallback).toBe("placeholder")
    expect(sharedImageModel("https://x.co/a.jpg").objectFit).toBe("cover")
    expect(sharedImageModel("https://x.co/a.jpg").fallback).toBe("hide")
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Chantier C — parité CTA album_block
// ══════════════════════════════════════════════════════════════════════════════
describe("B09.11 C — albumBlockCtaModel (10 cas)", () => {
  it("label + aucune plateforme → visible (parité éditeur)", () => {
    expect(albumBlockCtaModel({ cta_label: "Écouter" }).visible).toBe(true)
    expect(albumBlockCtaModel({ cta_label: "Écouter" }).label).toBe("Écouter")
  })
  it("plateforme présente → CTA masqué (les liens plateformes priment)", () => {
    expect(albumBlockCtaModel({ cta_label: "Écouter", spotify_url: "https://open.spotify.com/x" }).visible).toBe(false)
    expect(albumBlockCtaModel({ cta_label: "Écouter", apple_url: "u" }).visible).toBe(false)
    expect(albumBlockCtaModel({ cta_label: "Écouter", deezer_url: "u" }).visible).toBe(false)
  })
  it("sans label → invisible ; label non-chaîne → invisible", () => {
    expect(albumBlockCtaModel({}).visible).toBe(false)
    expect(albumBlockCtaModel({ cta_label: "" }).visible).toBe(false)
    expect(albumBlockCtaModel({ cta_label: 42 as any }).visible).toBe(false)
  })
  it("label long conservé ; aucune mutation", () => {
    const long = "A".repeat(200)
    expect(albumBlockCtaModel({ cta_label: long }).label).toBe(long)
    const c = { cta_label: "X", spotify_url: "u" }; const snap = JSON.stringify(c)
    albumBlockCtaModel(c); expect(JSON.stringify(c)).toBe(snap)
  })
  it("pas de champ href/url exposé (pas de faux lien : album_block n'a pas de cta_url)", () => {
    expect((albumBlockCtaModel({ cta_label: "X" }) as any).href).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Chantier D — contrat avant/après
// ══════════════════════════════════════════════════════════════════════════════
describe("B09.11 D — beforeAfterModel (10 cas)", () => {
  it("aucune image → invisible ; une image → visible", () => {
    expect(beforeAfterModel({}).visible).toBe(false)
    expect(beforeAfterModel({ before_img: "https://x.co/a.jpg" }).visible).toBe(true)
    expect(beforeAfterModel({ after_img: "https://x.co/b.jpg" }).visible).toBe(true)
  })
  it("deux images sécurisées + alt Avant/Après", () => {
    const m = beforeAfterModel({ before_img: "https://x.co/a.jpg", after_img: "https://x.co/b.jpg" })
    expect(m.before?.src).toBe("https://x.co/a.jpg"); expect(m.before?.alt).toBe("Avant")
    expect(m.after?.alt).toBe("Après")
  })
  it("URL dangereuse → src null mais bloc visible (repli placeholder legacy)", () => {
    const m = beforeAfterModel({ before_img: "javascript:x", after_img: "https://x.co/b.jpg" })
    expect(m.visible).toBe(true); expect(m.before?.src).toBeNull()
  })
  it("labels personnalisés / vides (défaut)", () => {
    expect(beforeAfterModel({ before_img: "x", before_label: "T0", after_label: "T1" }).beforeLabel).toBe("T0")
    expect(beforeAfterModel({ before_img: "x" }).afterLabel).toBe("Après")
  })
  it("position bornée [0..100] ; hors limites clampée ; défaut 50", () => {
    expect(beforeAfterModel({ before_img: "x", initial_position: "0" }).initialPosition).toBe(0)
    expect(beforeAfterModel({ before_img: "x", initial_position: "100" }).initialPosition).toBe(100)
    expect(beforeAfterModel({ before_img: "x", initial_position: "999" }).initialPosition).toBe(100)
    expect(beforeAfterModel({ before_img: "x", initial_position: "-10" }).initialPosition).toBe(0)
    expect(beforeAfterModel({ before_img: "x" }).initialPosition).toBe(50)
  })
  it("mode statique par défaut ; slider détecté ; aucune mutation", () => {
    expect(beforeAfterModel({ before_img: "x" }).mode).toBe("static")
    expect(beforeAfterModel({ before_img: "x", mode: "slider" }).mode).toBe("slider")
    const c = { before_img: "x", mode: "slider" }; const snap = JSON.stringify(c)
    beforeAfterModel(c); expect(JSON.stringify(c)).toBe(snap)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Métadonnées — AUCUN bloc activé par cette mission
// ══════════════════════════════════════════════════════════════════════════════
describe("B09.11 — aucune migration de bloc", () => {
  it("toujours exactement 45 blocs shared actifs", () => {
    expect(SHARED_RENDERER_BLOCKS.size).toBe(45)
  })
  it("les blocs corrigés/caractérisés restent LEGACY (non activés)", () => {
    for (const t of ["video", "google_maps_embed", "embed_block", "album_block", "media_before_after",
      "latest_release", "discography", "playlist_block", "presave", "podcast_links", "product_catalog"]) {
      expect(SHARED_RENDERER_BLOCKS.has(t)).toBe(false)
    }
  })
  it("before_after (déjà shared en vague 7) reste actif", () => {
    expect(SHARED_RENDERER_BLOCKS.has("before_after")).toBe(true)
  })
})
