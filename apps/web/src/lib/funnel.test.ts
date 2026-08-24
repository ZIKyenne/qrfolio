import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { FUNNEL, origine, etiquette } from "./funnel"

const read = (p: string) => readFileSync(join(__dirname, p), "utf8")

describe("d'où vient la personne", () => {
  const site = "https://qrowg.com"

  it("garde le chemin interne : c'est la page d'entrée qui travaille", () => {
    expect(origine("https://qrowg.com/qr-code/restaurant", site)).toBe("/qr-code/restaurant")
    expect(origine("https://qrowg.com/", site)).toBe("/")
  })

  it("ne garde JAMAIS les paramètres d'une adresse interne", () => {
    // ?ref=… est un code de parrainage, ?lien=… l'adresse du site de la personne.
    expect(origine("https://qrowg.com/creer?ref=emilien&lien=https://monsite.fr", site)).toBe("/creer")
  })

  it("réduit un référent externe à son domaine", () => {
    expect(origine("https://www.facebook.com/quelquechose/12345", site)).toBe("facebook.com")
    expect(origine("https://www.google.com/search?q=qr+code+restaurant", site)).toBe("google.com")
  })

  it("sait dire qu'il n'y a pas de référent", () => {
    expect(origine("", site)).toBe("direct")
    expect(origine(null, site)).toBe("direct")
    expect(origine(undefined, site)).toBe("direct")
    expect(origine("pas une adresse", site)).toBe("inconnu")
  })
})

describe("étiquettes", () => {
  it("borne la longueur et remplace le vide", () => {
    expect(etiquette("Restaurant")).toBe("Restaurant")
    expect(etiquette("")).toBe("autre")
    expect(etiquette(null)).toBe("autre")
    expect(etiquette(42)).toBe("autre")
    expect(etiquette("x".repeat(90))).toHaveLength(40)
  })
})

describe("les repères sont posés où il faut", () => {
  const galerie = read("../app/dashboard/templates/page.tsx")
  const editeur = read("../app/dashboard/builder/BuilderV4.tsx")

  it("l'arrivée, seulement pour quelqu'un sans compte, et une seule fois", () => {
    expect(galerie).toContain("marque(FUNNEL.essaiVu")
    expect(galerie).toContain("if (!vuRef.current)")
    // Le repère est DANS la branche « pas d'utilisateur ».
    const i = galerie.indexOf("marque(FUNNEL.essaiVu")
    expect(galerie.slice(0, i)).toContain("if (!user) {")
  })

  it("le modèle choisi, au moment où la page existe vraiment", () => {
    expect(galerie).toContain("marque(FUNNEL.modeleChoisi")
    expect(galerie).toContain("invite: true")
  })

  it("la page modifiée, une seule fois, et seulement si l'écriture a réussi", () => {
    expect(editeur).toContain("if (r.ok === true && !modifRef.current)")
    expect(editeur).toContain("marque(FUNNEL.pageModifiee")
  })

  it("le clic sur Publier sans compte, AVANT la redirection", () => {
    const i = editeur.indexOf("marque(FUNNEL.publierSansCompte")
    expect(i).toBeGreaterThan(0)
    const j = editeur.indexOf("/auth/signup?redirect=")
    expect(i, "le repère doit précéder le départ vers l'inscription").toBeLessThan(j)
  })

  it("le bout du parcours : compte créé et brouillon retrouvé", () => {
    expect(editeur).toContain("marque(FUNNEL.brouillonRepris")
  })
})

describe("ce qu'on ne mesure pas", () => {
  it("aucun repère ne transporte de contenu saisi", () => {
    const src = read("./funnel.ts")
    const interdits = ["email", "url:", "value", "content", "password", "pageName"]
    for (const mot of interdits) {
      expect(src.toLowerCase(), `${mot} n'a rien à faire dans une mesure`).not.toContain(mot.toLowerCase() + " =")
    }
  })

  it("une mesure qui échoue ne casse jamais la page", () => {
    const src = read("./funnel.ts")
    // Deux filets : autour de l'import, et autour de l'appel lui-même.
    expect((src.match(/catch/g) || []).length).toBeGreaterThanOrEqual(4)
    expect(src).toContain('if (typeof window === "undefined") return')
  })

  it("les noms des repères sont stables et courts", () => {
    for (const nom of Object.values(FUNNEL)) {
      expect(nom).toMatch(/^[a-z_]+$/)
      expect(nom.length).toBeLessThanOrEqual(30)
    }
    expect(new Set(Object.values(FUNNEL)).size).toBe(Object.values(FUNNEL).length)
  })
})
