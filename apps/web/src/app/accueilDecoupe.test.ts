import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Mesuré le 4 septembre : l'accueil était un seul composant client de 3 976 lignes.
// Tout le contenu — jusqu'à la FAQ, tout en bas — était téléchargé et analysé avant
// que le héros ne s'affiche, et six sections écrites puis retirées de la page
// voyageaient avec, sans qu'aucun visiteur ne les voie jamais.
// Après découpe : 132 ko → 56 ko pour le morceau de la page (build du 6 septembre).

const APP = __dirname
const lire = (p: string) => readFileSync(join(APP, p), "utf8")
const accueil = lire("HomeClient.tsx")

const SECTIONS = ["HowItWorks", "Features", "Templates", "Analytics", "UseCases", "Pricing", "Faq", "QRStudioLive"]

describe("les sections vivent dans leurs propres fichiers", () => {
  it("chacune existe et exporte son composant", () => {
    const manquants = SECTIONS.filter(s => {
      try { return !/export function [A-Za-z]+/.test(lire(`homeSections/${s}.tsx`)) }
      catch { return true }
    })
    expect(manquants).toEqual([])
  })

  it("la page ne les importe pas statiquement : elle les charge à la demande", () => {
    for (const s of SECTIONS) {
      expect(accueil, `${s} devrait être chargée par dynamic()`).toContain(`import("./homeSections/${s}")`)
      expect(accueil, `${s} ne doit pas être importée en haut du fichier`).not.toMatch(
        new RegExp(`^import .*homeSections/${s}"`, "m"))
    }
  })

  it("la page a fondu : elle tient sous 1 500 lignes", () => {
    expect(accueil.split("\n").length).toBeLessThan(1500)
  })
})

describe("le texte reste dans le HTML : rien de ce que lit Google ne part au client seul", () => {
  // `dynamic()` sans option rend quand même côté serveur ; `ssr: false` non. Une
  // section de contenu passée en ssr:false disparaîtrait des résultats de recherche.
  const CONTENU = ["HowItWorks", "Features", "Templates", "Analytics", "UseCases", "Pricing", "Faq"]

  for (const s of CONTENU) {
    it(`${s} est rendue côté serveur`, () => {
      const i = accueil.indexOf(`import("./homeSections/${s}")`)
      expect(i).toBeGreaterThan(-1)
      // La déclaration s'arrête à la fin de sa ligne, ou à l'accolade d'options.
      const decl = accueil.slice(i, accueil.indexOf("\n", i) + 1)
      expect(decl).not.toContain("ssr: false")
    })
  }

  it("seule la démo interactive s'en dispense, avec une place réservée", () => {
    const i = accueil.indexOf('import("./homeSections/QRStudioLive")')
    const decl = accueil.slice(i, i + 400)
    expect(decl).toContain("ssr: false")
    expect(decl).toContain("minHeight: 520")   // pas de saut de page au chargement
  })

  it("les questions de la FAQ restent lisibles par le JSON-LD de la page", () => {
    expect(accueil).toContain('import { FAQ_ITEMS } from "./homeSections/faqData"')
    expect(accueil).toContain("landingJsonLd(FAQ_ITEMS)")
  })
})

describe("les sections mises de côté ne pèsent plus rien", () => {
  it("elles sont conservées, hors de la page", () => {
    const retirees = lire("homeSectionsRetirees.tsx")
    for (const n of ["BrandProSection", "BuilderSection", "QRDynamicSection", "StoryFlow", "ComparisonSection", "PrintStudioSection", "ProofStrip"]) {
      expect(retirees, `${n} devrait être conservé`).toContain(`function ${n}`)
    }
  })

  it("et personne ne les importe — sans quoi elles reviendraient dans le bundle", () => {
    const importateurs: string[] = []
    const marcher = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n)
        if (statSync(p).isDirectory()) marcher(p)
        else if (/\.tsx?$/.test(n) && !/\.test\./.test(n) && readFileSync(p, "utf8").includes("homeSectionsRetirees")) {
          importateurs.push(p.replace(APP, ""))
        }
      }
    }
    marcher(APP)
    expect(importateurs).toEqual([])
  })
})
