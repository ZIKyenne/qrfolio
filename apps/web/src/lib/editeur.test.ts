import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { EDITEUR, identiteRenseignee, siretValide } from "./editeur"

// /legal affichait « [ Nom société ] », « [ Numéro SIRET ] » — des crochets à la
// place de l'éditeur, sur une page indexée. Tant que l'identité n'est pas
// renseignée, la page reste hors index et n'affiche aucun crochet.

const ici = dirname(fileURLToPath(import.meta.url))
const page = readFileSync(join(ici, "..", "app", "legal", "page.tsx"), "utf8")

describe("mentions légales", () => {
  it("plus aucun crochet dans la page", () => {
    expect(page).not.toMatch(/\[ ?(Nom|Numéro|Adresse|SAS)/)
    expect(page).not.toContain('className="lph"')
  })

  it("hors index tant que l'identité manque, indexable ensuite", () => {
    expect(page).toContain("...(COMPLETE ? {} : { robots: { index: false, follow: true } })")
    const sitemap = readFileSync(join(ici, "..", "app", "sitemap.ts"), "utf8")
    expect(sitemap).toContain("identiteRenseignee() ? [{ url: `${baseUrl}/legal`")
  })

  it("identiteRenseignee refuse le vide et les crochets", () => {
    expect(identiteRenseignee({ raisonSociale: null, formeJuridique: null, siret: null, siege: null, directeurPublication: null })).toBe(false)
    expect(identiteRenseignee({ raisonSociale: "[ Nom société ]", formeJuridique: "SAS", siret: "12345678901234", siege: "1 rue X", directeurPublication: "A B" })).toBe(false)
    expect(identiteRenseignee({ raisonSociale: "QRowg SAS", formeJuridique: "SAS", siret: "12345678901234", siege: "1 rue X, 75001 Paris", directeurPublication: "A B" })).toBe(true)
  })

  it("si l'identité est renseignée, le SIRET est valide", () => {
    if (identiteRenseignee()) expect(siretValide(EDITEUR.siret)).toBe(true)
    expect(siretValide("123 456 789 00012")).toBe(true)
    expect(siretValide("1234")).toBe(false)
  })
})
