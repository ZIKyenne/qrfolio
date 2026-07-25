import { describe, it, expect } from "vitest"
import { resolveOverrideDest, detectDevice, escapeHtml } from "./qrResolve"

describe("resolveOverrideDest", () => {
  it("url : ajoute https:// si le schema manque", () => {
    expect(resolveOverrideDest({ type: "url", url: "exemple.fr" })).toBe("https://exemple.fr")
    expect(resolveOverrideDest({ type: "url", url: "https://exemple.fr" })).toBe("https://exemple.fr")
    expect(resolveOverrideDest({ type: "url", url: "http://exemple.fr" })).toBe("http://exemple.fr")
  })
  it("file : meme regle que url", () => {
    expect(resolveOverrideDest({ type: "file", value: "cdn.fr/doc.pdf" })).toBe("https://cdn.fr/doc.pdf")
  })
  it("email : prefixe mailto: si absent", () => {
    expect(resolveOverrideDest({ type: "email", value: "a@b.fr" })).toBe("mailto:a@b.fr")
    expect(resolveOverrideDest({ type: "email", value: "mailto:a@b.fr" })).toBe("mailto:a@b.fr")
  })
  it("phone : prefixe tel: si absent", () => {
    expect(resolveOverrideDest({ type: "phone", value: "+33600000000" })).toBe("tel:+33600000000")
    expect(resolveOverrideDest({ type: "phone", value: "tel:+33600000000" })).toBe("tel:+33600000000")
  })
  it("whatsapp : destination brute", () => {
    expect(resolveOverrideDest({ type: "whatsapp", url: "https://wa.me/33600000000" })).toBe("https://wa.me/33600000000")
  })
  it("url a la priorite sur value", () => {
    expect(resolveOverrideDest({ type: "url", url: "a.fr", value: "b.fr" })).toBe("https://a.fr")
  })
  it("page / type inconnu -> null (gere ailleurs)", () => {
    expect(resolveOverrideDest({ type: "page", value: "uuid" })).toBeNull()
    expect(resolveOverrideDest({ type: "mystere", url: "x.fr" })).toBeNull()
  })
  it("robustesse : override vide ou destination manquante -> null (pas de crash)", () => {
    expect(resolveOverrideDest(null)).toBeNull()
    expect(resolveOverrideDest(undefined)).toBeNull()
    expect(resolveOverrideDest({})).toBeNull()
    expect(resolveOverrideDest({ type: "url" })).toBeNull()      // pas d'url ni value
    expect(resolveOverrideDest({ type: "whatsapp" })).toBeNull() // idem
  })
})

describe("detectDevice", () => {
  it("mobile", () => {
    expect(detectDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148")).toBe("mobile")
    expect(detectDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("mobile")
  })
  it("tablette (iPad hors regex mobile)", () => {
    expect(detectDevice("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet")
  })
  it("desktop par defaut", () => {
    expect(detectDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop")
    expect(detectDevice("")).toBe("desktop")
  })
})

describe("escapeHtml (anti-XSS pause_message)", () => {
  it("neutralise une balise script", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    )
  })
  it("echappe guillemets, apostrophes et esperluette", () => {
    expect(escapeHtml(`a & b "c" 'd'`)).toBe("a &amp; b &quot;c&quot; &#39;d&#39;")
  })
  it("neutralise une evasion d'attribut / de balise style", () => {
    expect(escapeHtml('"><img src=x onerror=alert(1)>')).toBe(
      "&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"
    )
  })
  it("laisse un texte normal intact", () => {
    expect(escapeHtml("Revenez demain à 9h")).toBe("Revenez demain à 9h")
  })
})
