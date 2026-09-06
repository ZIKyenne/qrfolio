import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { motifDeFond, themeBackgroundStyle } from "./types"

// Relevé le 6 septembre, en découpant BuilderV4.tsx (3 119 lignes) : le motif de
// fond d'une page était calculé à TROIS endroits, différemment.
//
//   · la pastille que le commerçant clique      (builderPanels : getPatternCSS)
//   · l'aperçu de l'éditeur                     (BuilderV4 : bgStyle)
//   · la page que voit le visiteur              (types : themeBackgroundStyle)
//
// Les points faisaient 1,5 px sur la pastille et 1 px ailleurs ; lignes et
// diagonales étaient espacées selon la taille choisie sur la pastille et fixes
// ailleurs ; les hexagones n'en étaient que sur la pastille. Et surtout : Vagues,
// Carrés et Étoiles étaient proposés au choix, montrés dans l'aperçu, puis
// remplacés par des points une fois la page en ligne.

const ICI = __dirname
const lire = (p: string) => readFileSync(join(ICI, p), "utf8")

/** Les dix motifs offerts au commerçant, lus dans le panneau lui-même. */
function motifsOfferts(): string[] {
  const src = lire("builderPanels.tsx")
  const i = src.indexOf("const PATTERNS_LIST = [")
  expect(i).toBeGreaterThan(-1)
  const bloc = src.slice(i, src.indexOf("]", i))
  return [...bloc.matchAll(/\{ id: "([a-z]+)"/g)].map(m => m[1])
}

describe("un seul calcul du motif, pour les trois endroits qui l'affichent", () => {
  it("le panneau et l'éditeur appellent la définition partagée", () => {
    expect(lire("builderPanels.tsx")).toContain("const getPatternCSS = motifDeFond")
    expect(lire("BuilderV4.tsx")).toContain("backgroundImage: motifDeFond(t.bgPattern")
    expect(lire("types.ts")).toContain("const bgImg = motifDeFond(t.bgPattern")
  })

  it("plus aucune copie de la formule ailleurs", () => {
    for (const f of ["builderPanels.tsx", "BuilderV4.tsx"]) {
      expect(lire(f), `${f} recalcule un motif`).not.toContain("radial-gradient(circle, ${c}")
    }
  })
})

describe("chaque motif offert au choix arrive vraiment sur la page publiée", () => {
  const offerts = motifsOfferts()

  it("le panneau en propose bien dix", () => {
    expect(offerts).toEqual(["dots", "grid", "lines", "waves", "diagonals", "hexagons", "squares", "circles", "zigzag", "stars"])
  })

  for (const id of ["waves", "squares", "stars"]) {
    it(`« ${id} » n'est plus silencieusement remplacé par des points`, () => {
      const points = motifDeFond("dots", "#C9A84C", 20, 0.15)
      expect(motifDeFond(id, "#C9A84C", 20, 0.15)).not.toBe(points)
    })
  }

  it("aucun des dix ne retombe sur le motif par défaut", () => {
    const points = motifDeFond("dots", "#C9A84C", 20, 0.15)
    const retombent = offerts.filter(id => id !== "dots" && motifDeFond(id, "#C9A84C", 20, 0.15) === points)
    expect(retombent).toEqual([])
  })

  it("chacun produit un dessin distinct des neuf autres", () => {
    const rendus = offerts.map(id => motifDeFond(id, "#C9A84C", 20, 0.15))
    // « grid » et « squares » sont volontairement le même quadrillage : le panneau
    // les propose sous deux noms. Les huit autres doivent différer.
    expect(new Set(rendus).size).toBe(offerts.length - 1)
  })
})

describe("la couleur et la taille choisies sont respectées", () => {
  it("l'opacité devient un canal alpha en hexadécimal", () => {
    expect(motifDeFond("dots", "#C9A84C", 20, 1)).toContain("#C9A84Cff")
    expect(motifDeFond("dots", "#C9A84C", 20, 0.15)).toContain("#C9A84C26")
  })

  it("une opacité de zéro reste zéro — elle ne repasse pas à 15 %", () => {
    // `|| 0.15` transformait 0 en 0,15 : le commerçant réglait l'opacité à zéro
    // et le motif restait visible.
    expect(motifDeFond("dots", "#C9A84C", 20, 0)).toContain("#C9A84C00")
    expect(lire("builderPanels.tsx")).not.toContain("pattern_opacity||0.15")
  })

  it("la taille espace le motif là où elle a un sens", () => {
    const petit = motifDeFond("lines", "#FFFFFF", 10, 0.5)
    const grand = motifDeFond("lines", "#FFFFFF", 40, 0.5)
    expect(petit).toContain("transparent 10px")
    expect(grand).toContain("transparent 40px")
    expect(petit).not.toBe(grand)
  })

  it("le fond publié porte le motif, sa taille et la couleur de fond", () => {
    const style = themeBackgroundStyle({ bg: "#101010", bgMode: "pattern", bgPattern: "stars", pattern_size: 24, pattern_color: "#FF0000", pattern_opacity: 0.5 } as any)
    expect(style.background).toBe("#101010")
    expect(style.backgroundSize).toBe("24px 24px")
    expect(String(style.backgroundImage)).toContain("#FF000080")
    expect(style.backgroundImage).toBe(motifDeFond("stars", "#FF0000", 24, 0.5))
  })
})
