import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Mesuré au navigateur le 4 septembre :
//  · éditeur à 1440 px — nom de la page 160×15, « Focus » 60×23, flèches 22×22 ;
//  · site public — « Tarifs », « Connexion », « ← Retour » entre 15 et 19 px de
//    haut sur toutes les pages secondaires. Corrects à la souris, sous le
//    minimum de la règle WCAG 2.5.8 (24 px), pénibles au doigt.

const SRC = join(__dirname, "..")
const lire = (p: string) => readFileSync(join(SRC, p), "utf8")

const BALISES = /^(?:button|input|select|textarea|a|p|div|span|ul|li|table)(?::[\w-]+)?$/

/**
 * Les sélecteurs d'un <style> d'écran qui visent une BALISE sans être bornés par
 * une classe : ils s'appliquent alors à toute l'application dès que l'écran est
 * monté. On découpe sur `}` puis on lit la partie avant `{`.
 */
export function selecteursGlobaux(src: string): string[] {
  const out: string[] = []
  for (const bloc of src.matchAll(/<style>\{`([\s\S]*?)`\}<\/style>/g)) {
    for (const regle of bloc[1].split("}")) {
      const i = regle.indexOf("{")
      if (i < 0) continue
      for (const sel of regle.slice(0, i).split(",")) {
        const s = sel.trim()
        if (s && BALISES.test(s)) out.push(s)
      }
    }
  }
  return out
}

describe("barre du haut de l'éditeur", () => {
  const src = lire("app/dashboard/builder/BuilderV4.tsx")

  it("les flèches Annuler / Rétablir font 32 px sur PC", () => {
    expect(src).toContain('width: isMobile ? 40 : 32, height: isMobile ? 40 : 32')
    expect(src).not.toContain('width: isMobile ? 40 : 28, height: isMobile ? 40 : 28')
  })

  it("le nom de la page se vise, et « Modèles » et « Focus » aussi", () => {
    expect(src).toContain('{ width: 180, minHeight: 32, padding: "0 6px", borderRadius: 6 }')
    expect(src).toContain('minHeight: isMobile ? 40 : 32')   // Modèles
    expect(src).toContain('padding: "0 12px", minHeight: 32')  // Focus
  })
})

describe("barres d'en-tête du site public", () => {
  const css = lire("app/globals.css")

  it("la règle existe et vise 24 px", () => {
    const i = css.indexOf(".qf-entete a,")
    expect(i).toBeGreaterThan(-1)
    expect(css.slice(i, i + 220)).toContain("min-height: 24px")
  })

  it("chaque barre publique la porte", () => {
    const attendus = [
      "app/features/page.tsx", "app/examples/page.tsx", "app/contact/page.tsx",
      "app/guides/page.tsx", "app/qr-code/page.tsx", "app/outils/page.tsx",
      "app/generateur-qr-code/page.tsx", "app/security/page.tsx", "app/creer/layout.tsx",
    ]
    const sans = attendus.filter(f => !lire(f).includes("qf-entete"))
    expect(sans).toEqual([])
  })

  it("les écrans internes ne l'empruntent pas : c'est une règle du site public", () => {
    expect(lire("app/dashboard/print-studio/PrintStudioClient.tsx")).not.toContain("qf-entete")
  })
})

describe("le CSS d'un écran ne déborde pas sur les autres", () => {
  const src = lire("app/dashboard/qr-codes/QRStudio.tsx")

  it("les règles de QR de pages sont bornées à sa grille", () => {
    // `button:active` et `input:focus !important` s'appliquaient à TOUT le
    // tableau de bord dès que cet écran était monté.
    expect(src).toContain(".qr-grid button:active")
    expect(src).toContain(".qr-grid input:focus")
    expect(selecteursGlobaux(src)).toEqual([])
  })

  it("et ne forcent plus la main aux autres écrans", () => {
    const i = src.indexOf(".qr-grid input:focus")
    expect(src.slice(i, i + 300)).not.toContain("!important")
  })
})

describe("aucun <style> d'écran n'écrit de règle globale sur les balises", () => {
  it("balayage du tableau de bord", () => {
    const fautifs: string[] = []
    const marcher = (d: string) => {
      for (const n of readdirSync(d).sort()) {
        const p = join(d, n)
        if (statSync(p).isDirectory()) marcher(p)
        else if (/\.tsx$/.test(n) && !/\.test\./.test(n)) {
          const src = readFileSync(p, "utf8")
          for (const sel of selecteursGlobaux(src)) fautifs.push(`${p.replace(SRC, "")} → « ${sel} »`)
        }
      }
    }
    marcher(join(SRC, "app/dashboard"))
    expect(fautifs).toEqual([])
  })
})
