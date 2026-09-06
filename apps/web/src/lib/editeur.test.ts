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
  it("phraseHebergement ne promet une zone que si elle est renseignée", async () => {
    const { phraseHebergement, HEBERGEMENT } = await import("./editeur")
    const p = phraseHebergement()
    expect(p).toContain("Supabase")
    expect(p).toContain("Vercel")
    for (const zone of [HEBERGEMENT.donnees, HEBERGEMENT.application]) {
      if (zone) expect(p).toContain(zone)
    }
    if (!HEBERGEMENT.donnees && !HEBERGEMENT.application) {
      expect(p).not.toMatch(/Europe|Union européenne|États-Unis|région|située/)
    }
  })

  it("les données et l'application sont nommées SÉPARÉMENT", async () => {
    // Relevé le 6 septembre : la base est en eu-west-1 (Irlande), les fonctions
    // Vercel en iad1 (Washington). L'ancienne forme de la phrase ne savait dire
    // qu'une seule région et aurait appliqué celle des données à l'application —
    // une affirmation fausse sur une page qui parle de RGPD.
    const { phraseHebergement, HEBERGEMENT } = await import("./editeur")
    expect(HEBERGEMENT).toHaveProperty("donnees")
    expect(HEBERGEMENT).toHaveProperty("application")
    expect(HEBERGEMENT).not.toHaveProperty("region")
    const p = phraseHebergement()
    if (HEBERGEMENT.donnees && HEBERGEMENT.application && HEBERGEMENT.donnees !== HEBERGEMENT.application) {
      // Les deux zones doivent apparaître, et la phrase doit dire laquelle est laquelle.
      expect(p).toMatch(/base de données est située/)
      expect(p).toMatch(/application est servie depuis/)
      expect(p.indexOf(HEBERGEMENT.donnees)).toBeLessThan(p.indexOf(HEBERGEMENT.application))
    }
  })

  it("chaque zone renseignée nomme une région vérifiable, pas un continent vague", async () => {
    // « en Europe » sans région ne veut rien dire pour quelqu'un qui doit
    // répondre à une question RGPD. On exige le code de région du fournisseur —
    // et les deux fournisseurs ne l'écrivent pas pareil : AWS dit « eu-west-1 »,
    // Vercel dit « iad1 ». Une première version de ce test n'acceptait que la
    // forme AWS et refusait donc la région réelle de l'application.
    const CODE_REGION = /\b([a-z]{2}-[a-z]+-\d|[a-z]{3}\d)\b/
    const { HEBERGEMENT } = await import("./editeur")
    for (const [nom, zone] of Object.entries(HEBERGEMENT)) {
      if (!zone) continue
      expect(zone, `${nom} doit nommer une région (ex. eu-west-1, iad1)`).toMatch(CODE_REGION)
    }
    expect(CODE_REGION.test("en Europe"), "un continent n'est pas une région").toBe(false)
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
