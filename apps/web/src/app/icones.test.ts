import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
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

// Le build a échoué là-dessus le 6 septembre : « Page /guides/[slug]/opengraph-image
// cannot use both export const runtime = 'edge' and export generateStaticParams ».
// Next 16 refuse la combinaison, et rien ne la signale avant le build de production.
describe("images de partage : runtime et pré-génération ne se contredisent pas", () => {
  const routes: string[] = []
  const marcher = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) { if (n !== "node_modules") marcher(p) }
      else if (/^(opengraph|twitter)-image\.tsx$/.test(n)) routes.push(p)
    }
  }
  marcher(ici)

  it("au moins une route image existe (sinon ce test ne garde rien)", () => {
    expect(routes.length).toBeGreaterThan(0)
  })

  for (const r of routes) {
    it(`${r.replace(ici, "")} : pas d'edge ET de generateStaticParams`, () => {
      const src = readFileSync(r, "utf8")
      const edge = /^export const runtime = ["']edge["']/m.test(src)
      const statiques = /export (async )?function generateStaticParams/.test(src)
      expect(edge && statiques).toBe(false)
    })
  }
})
