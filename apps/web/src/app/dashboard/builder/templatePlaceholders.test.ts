import { describe, it, expect } from "vitest"
import { photoPlaceholder, placeholderGallery, coverPlaceholder } from "./templatePlaceholders"

describe("placeholders d'images (T4)", () => {
  it("photoPlaceholder = data-URI SVG valide, sans réseau", () => {
    const p = photoPlaceholder()
    expect(p.startsWith("data:image/svg+xml,")).toBe(true)
    expect(p).not.toMatch(/https?:\/\//) // aucune ressource distante
    expect(decodeURIComponent(p)).toContain("<svg")
  })
  it("le libellé est intégré (échappé dans l'URI)", () => {
    expect(decodeURIComponent(photoPlaceholder("Ajoutez une photo"))).toContain("Ajoutez une photo")
  })
  it("les teintes varient selon l'index (galerie non répétitive)", () => {
    expect(photoPlaceholder("x", 0)).not.toBe(photoPlaceholder("x", 1))
    // borné / cyclique, jamais d'erreur
    expect(typeof photoPlaceholder("x", 99)).toBe("string")
    expect(typeof photoPlaceholder("x", -3)).toBe("string")
  })
  it("placeholderGallery produit img1..imgN", () => {
    const g = placeholderGallery(6)
    expect(Object.keys(g)).toEqual(["img1", "img2", "img3", "img4", "img5", "img6"])
    expect(Object.values(g).every(v => v.startsWith("data:image/svg+xml,"))).toBe(true)
  })
  it("coverPlaceholder = data-URI", () => {
    expect(coverPlaceholder().startsWith("data:image/svg+xml,")).toBe(true)
  })
})
