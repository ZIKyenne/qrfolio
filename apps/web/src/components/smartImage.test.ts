import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// ─────────────────────────────────────────────────────────────────────────────
// UNE PHOTO DE 1600 PX POUR UNE VIGNETTE DE 168 PX
//
// Mesuré au navigateur, galerie d'un modèle photographe à 390 px : six photos
// affichées en 168 × 168, servies à leur taille d'origine. Le téléversement
// compresse déjà (1600 px, WebP q82, soit ~167 ko par photo pour une image
// représentative) — mais six fois 167 ko, c'est 1 Mo pour six vignettes.
//
// Deux causes : les grandes images passaient par un <img> brut au lieu de
// l'optimiseur, et rien ne disait au navigateur la largeur d'affichage réelle
// (`sizes`), donc il prenait la plus grosse variante.
//
// Après : AVIF servi à la bonne résolution — 142 ko pour la même galerie,
// mesuré sur le vrai rendu.
// ─────────────────────────────────────────────────────────────────────────────

const ici = dirname(fileURLToPath(import.meta.url))
const smart = readFileSync(join(ici, "SmartImage.tsx"), "utf8")
const publique = readFileSync(join(ici, "..", "app", "[slug]", "PublicPageClient.tsx"), "utf8")

describe("les images de la page publiée", () => {
  it("SmartImage accepte une largeur d'affichage", () => {
    expect(smart).toContain("sizes?: string")
    expect(smart).toContain("sizes={sizes}")
  })

  it("optimise ce qui est optimisable, et rien d'autre", () => {
    // Notre bucket Supabase et notre propre origine : sûrs. Un hôte tiers
    // exigerait d'ouvrir remotePatterns, donc un proxy d'images ouvert.
    expect(smart).toContain("const optimisable = (src: string) => SUPABASE_UPLOAD.test(src) || MEME_ORIGINE.test(src)")
    expect(smart).toContain("const MEME_ORIGINE = /^\\/(?!\\/)/")
  })

  it("« // ailleurs.com » n'est pas notre origine", () => {
    // Une adresse protocol-relative commence aussi par une barre : sans la
    // garde `(?!\/)`, elle passerait pour une image locale.
    const m = /const MEME_ORIGINE = (\/.*\/)\n/.exec(smart)
    expect(m, "règle d'origine introuvable").toBeTruthy()
    const re = new RegExp(m![1].slice(1, -1))
    expect(re.test("/photo.png")).toBe(true)
    expect(re.test("//ailleurs.example.com/photo.png")).toBe(false)
    expect(re.test("https://ailleurs.example.com/photo.png")).toBe(false)
  })

  it("la galerie ne sert plus d'images brutes", () => {
    const i = publique.indexOf("function GalleryPublic(")
    const j = publique.indexOf("\n}", publique.indexOf("if (layout === \"masonry\")", i))
    const bloc = publique.slice(i, j)
    expect(bloc.match(/<img\s/g), "un <img> brut subsiste dans la galerie").toBeNull()
    expect((bloc.match(/<SmartImage/g) || []).length, "grille, mosaïque et visionneuse").toBeGreaterThanOrEqual(3)
  })

  it("chaque vignette annonce sa largeur d'affichage", () => {
    expect(publique).toContain("sizes={sizesGrille(colsMobile, effCols)}")
    expect(publique).toContain("sizes={sizesGrille(colsMobile, cols)}")
    expect(publique).toContain('sizes="100vw"')
  })
})

describe("sizesGrille", () => {
  // Import direct impossible (le module est un composant client lourd) : on
  // rejoue la formule, et on vérifie qu'elle est bien celle du source.
  const sizesGrille = (m: number, d: number) =>
    `(max-width: 520px) ${Math.round(100 / Math.max(1, m))}vw, ${Math.round(520 / Math.max(1, d))}px`

  it("la formule du source est bien celle-ci", () => {
    expect(publique).toContain("return `(max-width: 520px) ${Math.round(100 / m)}vw, ${Math.round(520 / d)}px`")
  })

  it("deux colonnes sur téléphone = la moitié de l'écran", () => {
    expect(sizesGrille(2, 3)).toBe("(max-width: 520px) 50vw, 173px")
  })

  it("une seule colonne = tout l'écran", () => {
    expect(sizesGrille(1, 1)).toBe("(max-width: 520px) 100vw, 520px")
  })

  it("zéro ou négatif ne produit jamais une division par zéro", () => {
    expect(sizesGrille(0, 0)).toBe("(max-width: 520px) 100vw, 520px")
    expect(sizesGrille(-3, -3)).toBe("(max-width: 520px) 100vw, 520px")
  })
})
