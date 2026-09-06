import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { ogFor, titreSocial, descriptionHorsFenetre, DESC_MIN, DESC_MAX } from "./seoMeta"
import { REVISIONS, jour, enFrancais } from "./datesContenu"
import { nomAffiche, typeEntite, typeOg, descriptionRepli, jsonLdPage } from "./identitePageSeo"

const APP = join(__dirname, "../app")

/** Toutes les pages/layouts qui déclarent des métadonnées. */
function pagesAvecMetadata(): string[] {
  const out: string[] = []
  const marcher = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) { if (n !== "e2e-harness" && n !== "api") marcher(p) }
      else if (n === "page.tsx" || n === "layout.tsx") {
        const src = readFileSync(p, "utf8")
        if (/export const metadata|export async function generateMetadata/.test(src)) out.push(p)
      }
    }
  }
  marcher(APP)
  return out
}

describe("ogFor", () => {
  it("pose la langue, le site et le type sur chaque page", () => {
    const m = ogFor({ url: "https://qrowg.com/features", title: "Fonctionnalités", description: "x" })
    expect(m.openGraph).toMatchObject({ locale: "fr_FR", siteName: "QRowg", type: "website", url: "https://qrowg.com/features" })
    expect(m.twitter).toMatchObject({ card: "summary_large_image" })
  })
  it("n'ajoute « | QRowg » qu'une fois", () => {
    expect(titreSocial("Contact")).toBe("Contact | QRowg")
    expect(titreSocial("Contact | QRowg")).toBe("Contact | QRowg")
  })
  it("un article porte son image et ses dates", () => {
    const m = ogFor({ url: "u", title: "t", description: "d", type: "article", image: "https://i/og", publishedTime: "2026-08-11", modifiedTime: "2026-08-11" })
    expect(m.openGraph).toMatchObject({ type: "article", publishedTime: "2026-08-11", modifiedTime: "2026-08-11" })
    expect((m.openGraph as { images?: unknown[] }).images).toHaveLength(1)
  })
  it("une page sans image n'en déclare pas une vide", () => {
    expect((ogFor({ url: "u", title: "t", description: "d" }).openGraph as Record<string, unknown>).images).toBeUndefined()
  })
})

// `openGraph` défini par une page REMPLACE celui du layout racine : `locale`
// y était posé une fois et disparaissait des 14 sous-pages qui déclarent le leur.
describe("plus aucune page ne perd og:locale", () => {
  const fichiers = pagesAvecMetadata()
  it("il y a bien des pages à surveiller", () => {
    expect(fichiers.length).toBeGreaterThan(12)
  })
  it("aucune ne construit son openGraph à la main", () => {
    const fautifs = fichiers
      .filter(f => !f.endsWith(`app${require("node:path").sep}layout.tsx`))
      .filter(f => {
        const src = readFileSync(f, "utf8")
        return /openGraph:\s*\{/.test(src) && !/locale/.test(src)
      })
      .map(f => f.replace(APP, ""))
    expect(fautifs).toEqual([])
  })
  it("le layout racine reste la seule définition écrite à la main", () => {
    expect(readFileSync(join(APP, "layout.tsx"), "utf8")).toContain('locale: "fr_FR"')
  })
})

describe("descriptions dans la fenêtre de la SERP", () => {
  it("la règle", () => {
    expect(descriptionHorsFenetre("a".repeat(DESC_MIN - 1))).toBe(true)
    expect(descriptionHorsFenetre("a".repeat(DESC_MAX + 1))).toBe(true)
    expect(descriptionHorsFenetre("a".repeat(140))).toBe(false)
  })
  it("chaque page statique s'y tient", () => {
    const hors: string[] = []
    for (const f of pagesAvecMetadata()) {
      const src = readFileSync(f, "utf8")
      const m = src.match(/\n  description:\s*\n?\s*"((?:[^"\\]|\\.)*)"/)
      if (!m) continue
      if (descriptionHorsFenetre(m[1])) hors.push(`${f.replace(APP, "")} (${m[1].length})`)
    }
    expect(hors).toEqual([])
  })
  it("les titres génériques portent un mot-clé", () => {
    for (const [f, attendu] of [["features/layout.tsx", /QR|statistiques/], ["examples/layout.tsx", /QR|métier/], ["contact/layout.tsx", /QRowg/], ["upgrade/layout.tsx", /QRowg|plan/]] as const) {
      const src = readFileSync(join(APP, f), "utf8")
      const t = src.match(/\n  title: "([^"]*)"/)?.[1] ?? ""
      expect(t, f).toMatch(attendu)
      expect(t.length, `${f} : titre trop long`).toBeLessThanOrEqual(60)
    }
  })
})

describe("dates de révision : une seule source", () => {
  it("le sitemap ne porte plus de date en dur", () => {
    const s = readFileSync(join(APP, "sitemap.ts"), "utf8")
    expect(s).not.toContain("CONTENT_REVISED")
    expect(s).toContain('from "@/lib/datesContenu"')
    expect(s).toContain("dateGuide(slug)")
  })
  it("les pages lisent la même table que le sitemap", () => {
    for (const f of ["security/page.tsx", "legal/page.tsx", "privacy/page.tsx", "terms/page.tsx"]) {
      expect(readFileSync(join(APP, f), "utf8"), f).toContain("REVISIONS.")
    }
  })
  it("chaque date est un jour valide, à midi UTC (jamais de décalage de jour)", () => {
    for (const [cle, iso] of Object.entries(REVISIONS)) {
      expect(iso, cle).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(jour(iso).toISOString(), cle).toContain(iso)
    }
    expect(enFrancais("2026-06-15")).toBe("15 juin 2026")
  })
})

describe("un guide est un Article complet", () => {
  const src = readFileSync(join(APP, "guides/[slug]/page.tsx"), "utf8")
  it("il a une image (sinon Google refuse le rich result)", () => {
    expect(src).toContain("image: [imageGuide(g.slug, APP)]")
    expect(readdirSync(join(APP, "guides/[slug]"))).toContain("opengraph-image.tsx")
  })
  it("ses dates viennent du guide, pas d'une constante commune", () => {
    expect(src).toContain("datePublished: reviseLe(g.slug), dateModified: reviseLe(g.slug)")
    expect(src).not.toContain("GUIDES_UPDATED")
  })
  it("le fil d'Ariane nomme la page, pas une deuxième fois la catégorie", () => {
    expect(src).toContain("position: 3, name: g.h1, item: url")
  })
})

// P2-4 · l'extrait Google d'une brasserie annonçait « Jean Dupont sur QRowg »,
// et le JSON-LD déclarait `Person` pour toute page publiée.
describe("une page publiée parle de ce qu'elle présente", () => {
  it("le nom lu est celui de la page, le compte en dernier recours", () => {
    expect(nomAffiche({ titre: "Brasserie du Port", nomProprietaire: "Jean Dupont" })).toBe("Brasserie du Port")
    expect(nomAffiche({ titre: "  ", nomProprietaire: "Jean Dupont" })).toBe("Jean Dupont")
    expect(nomAffiche({})).toBe("Cette page")
  })
  it("le type d'entité suit le modèle d'origine", () => {
    expect(typeEntite("resto_bistrot")).toBe("LocalBusiness")
    expect(typeEntite("commerce_boutique")).toBe("LocalBusiness")
    expect(typeEntite("freelance_dev")).toBe("Person")
    expect(typeEntite("creatif_photo")).toBe("Person")
    expect(typeEntite(null)).toBe("Organization")
    expect(typeEntite("modele_inconnu")).toBe("Organization")
  })
  it("og:type « profile » ne vaut que pour une personne", () => {
    expect(typeOg("resto_bistrot")).toBe("website")
    expect(typeOg("freelance_dev")).toBe("profile")
  })
  it("la description de repli ne cite pas le titulaire du compte", () => {
    const d = descriptionRepli({ titre: "Brasserie du Port", nomProprietaire: "Jean Dupont" })
    expect(d).toContain("Brasserie du Port")
    expect(d).not.toContain("Jean Dupont")
    expect(d.length).toBeLessThanOrEqual(158)
  })
  it("le JSON-LD d'un restaurant est un établissement, pas une personne", () => {
    const ld = jsonLdPage({ titre: "Brasserie du Port", nomProprietaire: "Jean Dupont", templateId: "resto_bistrot", url: "https://qrowg.com/brasserie" })
    expect(ld["@type"]).toBe("WebPage")
    expect((ld.mainEntity as Record<string, unknown>)["@type"]).toBe("LocalBusiness")
    expect((ld.mainEntity as Record<string, unknown>).name).toBe("Brasserie du Port")
  })
  it("la route l'utilise vraiment", () => {
    const src = readFileSync(join(APP, "[slug]/page.tsx"), "utf8")
    expect(src).toContain("jsonLdPage({")
    expect(src).toContain("type: typeOg((page as any).template_id)")
    expect(src).not.toContain('"@type": "Person"')
    expect(src).not.toContain('type: "profile",')
  })
})

describe("couleur de barre système", () => {
  it("le manifeste et la balise annoncent la même", () => {
    expect(readFileSync(join(APP, "layout.tsx"), "utf8")).toContain("themeColor: FOND_APP")
    expect(readFileSync(join(APP, "manifest.ts"), "utf8")).toContain("theme_color: FOND_APP")
  })
})

describe("plus de marque d'ordre d'octets (BOM) dans les sources", () => {
  it("aucun fichier TypeScript n'en porte", () => {
    const avecBom: string[] = []
    const marcher = (d: string) => {
      for (const n of readdirSync(d).sort()) {
        const p = join(d, n)
        if (statSync(p).isDirectory()) marcher(p)
        else if (/\.tsx?$/.test(n) && readFileSync(p).subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) avecBom.push(p.replace(APP, ""))
      }
    }
    marcher(join(__dirname, ".."))
    expect(avecBom).toEqual([])
  })
})
