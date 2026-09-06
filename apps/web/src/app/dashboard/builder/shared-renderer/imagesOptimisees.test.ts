import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Mesuré le 4 septembre : les aperçus de l'éditeur rendaient des <img> bruts. Sur
// téléphone, l'auteur téléchargeait l'original pleine taille — une photo de 1600 px
// pour une vignette de 52 px — à chaque ouverture d'un bloc. Le rendu public passait
// déjà par SmartImage ; les deux chemins suivent maintenant la même route.
// SmartImage retombe sur un <img> natif identique dès que la source n'est pas
// optimisable (data:, hôte tiers) : aucun cas ne régresse.

const ICI = __dirname

function fichiers(dossier: string): string[] {
  const out: string[] = []
  const marcher = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) marcher(p)
      else if (/\.tsx$/.test(n) && !/\.test\./.test(n)) out.push(p)
    }
  }
  marcher(join(ICI, dossier))
  return out
}

describe("aucun <img> brut dans le rendu partagé", () => {
  it("blocs et primitives passent tous par SmartImage", () => {
    const fautifs: string[] = []
    for (const f of [...fichiers("blocks"), ...fichiers("primitives"), ...fichiers("views")]) {
      for (const [i, l] of readFileSync(f, "utf8").split("\n").entries()) {
        if (l.trim().startsWith("//")) continue          // les commentaires en parlent
        if (/<img[\s/>]/.test(l)) fautifs.push(`${f.replace(ICI, "")}:${i + 1}`)
      }
    }
    expect(fautifs).toEqual([])
  })
})

describe("chaque image dit la taille qu'elle occupe", () => {
  // Sans `sizes`, le navigateur suppose la pleine largeur et redemande la plus
  // grosse variante : l'optimisation ne sert alors à rien.
  it("tout SmartImage du rendu partagé porte width, height et sizes", () => {
    const fautifs: string[] = []
    for (const f of [...fichiers("blocks"), ...fichiers("primitives"), ...fichiers("views")]) {
      const src = readFileSync(f, "utf8")
      for (const m of src.matchAll(/<(?:SmartImage|PublicSharedImage|EditorSharedImage)\b[\s\S]*?\/>/g)) {
        const balise = m[0]
        const manque = ["width=", "height=", "sizes="].filter(a => !balise.includes(a))
        if (manque.length) fautifs.push(`${f.replace(ICI, "")} → manque ${manque.join(", ")}`)
      }
    }
    expect(fautifs).toEqual([])
  })
})

describe("la primitive éditeur", () => {
  const src = readFileSync(join(ICI, "primitives/EditorImage.tsx"), "utf8")

  it("rend SmartImage, avec des dimensions par défaut", () => {
    expect(src).toContain('import SmartImage from "@/components/SmartImage"')
    expect(src).toContain("width = 160, height = 160")
  })

  it("garde ses deux comportements : rien sans source, masquée en cas d'erreur", () => {
    expect(src).toContain("if (!model.src) return null")
    expect(src).toContain('e.currentTarget.style.display = "none"')
  })
})
