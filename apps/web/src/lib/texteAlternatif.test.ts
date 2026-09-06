import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { altGalerie, altDe, legendeSaine } from "./texteAlternatif"

// La galerie de la page publiée rendait ses photos avec alt="" — et le bloc
// n'offrait aucun champ pour en écrire un. Sur une page dont les photos SONT le
// contenu, une personne aveugle n'entendait rien.

describe("texte alternatif d'une photo de galerie", () => {
  it("la légende de l'auteur passe avant tout", () => {
    expect(altGalerie("Tarte aux figues", "Nos desserts", 0, 6)).toBe("Tarte aux figues")
  })
  it("sans légende, le titre du bloc et le rang", () => {
    expect(altGalerie("", "Nos desserts", 1, 6)).toBe("Nos desserts — photo 2 sur 6")
    expect(altGalerie(undefined, "", 1, 6)).toBe("Photo 2 sur 6")
    expect(altGalerie(null, "", 0, 1)).toBe("Photo")
  })
  it("une légende est nettoyée et bornée", () => {
    expect(legendeSaine("  deux   lignes\n ici ")).toBe("deux lignes ici")
    expect(legendeSaine("a".repeat(400))).toHaveLength(160)
    expect(legendeSaine(42)).toBe("")
  })
  it("altDe reprend un nom existant, sinon le repli", () => {
    expect(altDe("Entrecôte")).toBe("Entrecôte")
    expect(altDe("  ", "Bannière")).toBe("Bannière")
  })
})

describe("la page publiée", () => {
  const src = ["PublicPageClient.tsx", "renduLegacy.tsx", "blocsPublics.tsx"].map(f => readFileSync(join(__dirname, "../app/[slug]/" + f), "utf8")).join("\n")
  const defs = readFileSync(join(__dirname, "../app/dashboard/builder/blockDefs.ts"), "utf8")

  it("les quatre rendus de galerie décrivent leurs photos", () => {
    expect(src.match(/alt=\{altGalerie\(/g) ?? []).toHaveLength(4)
  })
  it("les légendes suivent le même filtre que les photos", () => {
    // Retirer la photo 2 décalait sinon toutes les descriptions d'un cran.
    expect(src).toContain("const paires = [1,2,3,4,5,6,7,8,9,10,11,12].map(n => [c[`img${n}`], c[`img${n}_alt`]] as const).filter(([u]) => Boolean(u))")
    expect(src).not.toContain("const imgs = [c.img1, c.img2, c.img3, c.img4, c.img5, c.img6, c.img7, c.img8, c.img9, c.img10, c.img11, c.img12].filter(Boolean)")
  })
  it("le bloc galerie offre un champ description par photo", () => {
    for (let n = 1; n <= 6; n++) expect(defs, `img${n}_alt`).toContain(`{ key: "img${n}_alt", label: "Photo ${n} — description"`)
  })
  it("une bannière sans texte incrusté est décrite, avec texte elle se tait", () => {
    expect(src).toContain('alt={c.cover_title ? "" : altDe(c.title, "Bannière")}')
  })
  it("le choix de laisser des vignettes muettes est écrit noir sur blanc", () => {
    expect(src).toContain("WCAG H67")
  })
})
