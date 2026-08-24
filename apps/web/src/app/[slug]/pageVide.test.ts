import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { BLOCK_DEFS } from "../dashboard/builder/blockDefs"

const page = readFileSync(join(__dirname, "PublicPageClient.tsx"), "utf8")

// Ce que voit le CLIENT qui scanne, quand le commerçant a ajouté un bloc sans le
// remplir. Constaté en rendant les 178 types de blocs un par un, tels qu'ils
// sortent de la bibliothèque : cinq d'entre eux envoyaient leur texte d'exemple
// sur la page d'un vrai commerce — « Mon titre », « Jean Dupont, Fondateur & CEO »,
// « React, Design, Marketing »…
//
// Les exemples ont leur place : dans le `placeholder` du champ, côté éditeur.
// Jamais dans le contenu par défaut, qui part tel quel en ligne.

/** Mots qui trahissent un texte d'exemple laissé dans un contenu par défaut. */
const DEMO = /jean dupont|marie |sophie |mon titre|titre principal|sous-titre accrocheur|bienvenue sur ma page|lorem|react, design|mes competences|votre texte|texte ici/i

describe("aucun texte d'exemple ne part chez le client", () => {
  it("les contenus par défaut n'en contiennent aucun", () => {
    const coupables: string[] = []
    for (const [type, def] of Object.entries(BLOCK_DEFS)) {
      for (const [champ, valeur] of Object.entries(def.defaultContent || {})) {
        if (typeof valeur === "string" && DEMO.test(valeur)) coupables.push(`${type}.${champ} = « ${valeur} »`)
      }
    }
    expect(coupables, "à déplacer dans le placeholder du champ").toEqual([])
  })

  it("les exemples restent disponibles là où ils servent : dans l'éditeur", () => {
    // On n'a rien perdu au passage : ces cinq blocs guident toujours la saisie.
    for (const t of ["bio", "skills", "heading", "hero_banner", "founder_message"]) {
      const champs = (BLOCK_DEFS[t]?.fields || []) as any[]
      expect(champs.some(f => f.placeholder), `${t} n'a plus aucun exemple de saisie`).toBe(true)
    }
  })

  it("la page publique n'invente aucun nom ni aucun poste", () => {
    // « {c.name || "Jean Dupont"} » affichait un faux fondateur sur une vraie page.
    expect(page).not.toMatch(/\|\| "Jean Dupont"/)
    expect(page).not.toMatch(/\|\| "Fondateur/)
    expect(page).not.toMatch(/\|\| "Titre"/)
  })
})

describe("un bloc vide ne laisse pas de trou dans la page", () => {
  it("la présentation disparaît si elle est vide", () => {
    expect(page).toContain('case "bio":\n      if (!c.text) return null')
  })

  it("les compétences aussi, titre compris", () => {
    expect(page).toContain("if (!tags.length && !c.title) return null")
  })

  it("les blocs déjà protégés le restent", () => {
    for (const garde of ['if (!c.text) return null', "return (c.message || c.name) ?", "return (c.title || c.bg_image) ?"]) {
      expect(page, `garde-fou disparu : ${garde}`).toContain(garde)
    }
  })
})
