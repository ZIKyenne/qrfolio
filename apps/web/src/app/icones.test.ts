import { describe, it, expect } from "vitest"
import { readFileSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// Le favicon pesait 47 ko : une image de 1024 × 1024 pixels, téléchargée à
// CHAQUE ouverture de page — y compris à chaque scan d'un QR, dans un
// restaurant, en 4G — pour être affichée dans un onglet à 16 pixels de côté.
// 45 ko de trop sur toutes les pages du site.

const ici = dirname(fileURLToPath(import.meta.url))

/** Dimensions d'un PNG, lues dans son en-tête (13 octets de IHDR). */
function dimensionsPng(chemin: string): { l: number; h: number } {
  const b = readFileSync(chemin)
  expect(b.subarray(0, 8).toString("hex"), `${chemin} n'est pas un PNG`).toBe("89504e470d0a1a0a")
  return { l: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

describe("les icônes ne plombent pas chaque page", () => {
  it("le favicon reste sous 8 ko", () => {
    const o = statSync(join(ici, "icon.png")).size
    expect(`favicon: ${Math.round(o / 1024)} ko`).toBe(`favicon: ${Math.min(Math.round(o / 1024), 8)} ko`)
  })

  it("l'icône iOS reste sous 12 ko", () => {
    const o = statSync(join(ici, "apple-icon.png")).size
    expect(o).toBeLessThan(12 * 1024)
  })

  it("aucune icône n'est démesurée en pixels", () => {
    // 1024 × 1024 pour un onglet de navigateur : le navigateur redimensionne,
    // l'utilisateur paie le transfert.
    const f = dimensionsPng(join(ici, "icon.png"))
    expect(f.l).toBeLessThanOrEqual(192)
    expect(f.l).toBe(f.h)
    const a = dimensionsPng(join(ici, "apple-icon.png"))
    expect(a.l).toBeLessThanOrEqual(180)   // taille d'écran d'accueil iOS
    expect(a.l).toBe(a.h)
  })

  it("...mais elles restent assez grandes pour un écran d'accueil", () => {
    // Trop petite, elle serait floue une fois épinglée sur un téléphone.
    expect(dimensionsPng(join(ici, "icon.png")).l).toBeGreaterThanOrEqual(96)
    expect(dimensionsPng(join(ici, "apple-icon.png")).l).toBeGreaterThanOrEqual(120)
  })
})
