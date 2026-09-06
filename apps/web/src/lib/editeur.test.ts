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

describe("une seule phrase d'hébergement, sans zone géographique tant qu'elle n'est pas vérifiée", () => {
  it("phraseHebergement ne promet une région que si elle est renseignée", async () => {
    const { phraseHebergement, HEBERGEMENT } = await import("./editeur")
    const p = phraseHebergement()
    expect(p).toContain("Supabase")
    expect(p).toContain("Vercel")
    if (HEBERGEMENT.region === null) {
      expect(p).not.toMatch(/Europe|Union européenne|région/)
    } else {
      expect(p).toContain(HEBERGEMENT.region)
    }
  })

  it("Sécurité, Confidentialité et le guide RGPD la reprennent, et n'inventent plus", () => {
    const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")
    const securite = lire("../app/security/page.tsx")
    const confidentialite = lire("../app/privacy/page.tsx")
    const guide = lire("../app/guides/guides.ts")
    for (const src of [securite, confidentialite, guide]) expect(src).toContain("phraseHebergement()")
    expect(securite).not.toContain("Sauvegardes automatiques")
    expect(securite).not.toContain("migrations de durcissement")
    expect(securite).not.toContain("Hébergement des données en Europe")
    expect(guide).not.toContain("chiffrés au stockage")
    expect(guide).not.toContain('Dans l\'Union européenne.')
    // La liste du guide est celle de la politique : ville, navigateur, empreinte hachée.
    expect(guide).toContain("le pays et la ville approximatifs")
    expect(guide).toContain("empreinte hachée")
  })
})
