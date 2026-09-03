import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// ─────────────────────────────────────────────────────────────────────────────
// LE TEXTE QUE LIT LE CLIENT QUI SCANNE
//
// Relevé au navigateur sur les 20 modèles de la galerie, à 360 et 390 px, via
// le harness /e2e-harness/public-page : les DESCRIPTIONS — celles d'un plat,
// d'une prestation, d'une étape, le rôle d'un membre de l'équipe — étaient
// rendues entre 10,5 et 12 px. C'est le texte qu'on lit à table, au téléphone,
// souvent en lumière basse, souvent après 40 ans.
//
// Règle retenue : une description est du texte de lecture, jamais moins de 13 px.
// Ce qui reste volontairement plus petit : les sur-titres en majuscules
// (« NOS PRESTATIONS »), les pastilles courtes (« 🔥 le plus vendu ») et la
// mention « Créé avec QRowg ». Ce sont des repères, pas de la lecture.
// ─────────────────────────────────────────────────────────────────────────────

const ici = dirname(fileURLToPath(import.meta.url))
const racine = join(ici, "..", "dashboard", "builder", "shared-renderer")

/** Lignes qui rendent une description en dessous de 13 px. */
function tropPetit(src: string, fichier: string): string[] {
  const cible = />\{[a-zA-Z]*\.?(?:desc|description|role)\}</
  const petit = /fontSize: (?:fs\()?(\d+(?:\.\d+)?)/
  return src.split("\n")
    .map((l, i) => [i + 1, l] as const)
    .filter(([, l]) => cible.test(l))
    .filter(([, l]) => { const m = l.match(petit); return !!m && parseFloat(m[1]) < 13 })
    .map(([n, l]) => `${fichier}:${n} → ${l.trim().slice(0, 90)}`)
}

describe("les descriptions de la page publiée se lisent", () => {
  it("aucune description sous 13 px dans le renderer historique", () => {
    expect(tropPetit(readFileSync(join(ici, "PublicPageClient.tsx"), "utf8"), "PublicPageClient.tsx")).toEqual([])
  })

  it("aucune description sous 13 px dans les renderers publics partagés", () => {
    const fautifs: string[] = []
    const parcourir = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name)
        if (e.isDirectory()) { parcourir(p); continue }
        if (!/^Public.*\.tsx$/.test(e.name)) continue
        fautifs.push(...tropPetit(readFileSync(p, "utf8"), e.name))
      }
    }
    parcourir(join(racine, "blocks"))
    expect(fautifs).toEqual([])
  })

  it("la description d'un plat, elle, se lit vraiment", () => {
    // Le menu est LE cas d'usage phare : une carte lue à table.
    const src = readFileSync(join(racine, "primitives", "MenuItemList.tsx"), "utf8")
    const tailles = [...src.matchAll(/\{it\.desc && <p style=\{\{ color: muted, fontSize: fs\((\d+(?:\.\d+)?)\)/g)].map(m => parseFloat(m[1]))
    expect(tailles.length, "les deux dispositions du menu").toBe(2)
    for (const t of tailles) expect(t).toBeGreaterThanOrEqual(13)
  })

  it("« use client » reste la première ligne de MenuItemList", () => {
    const src = readFileSync(join(racine, "primitives", "MenuItemList.tsx"), "utf8")
    expect(src.split("\n")[0]).toBe('"use client"')
  })
})
