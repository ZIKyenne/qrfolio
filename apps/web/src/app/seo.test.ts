import { describe, it, expect } from "vitest"
import { readFileSync, existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { VERTICALS, VERTICAL_ORDER } from "./qr-code/verticals"
import { GUIDES, GUIDE_ORDER } from "./guides/guides"

// Le SEO est le seul canal d'acquisition gratuit : on le verrouille par des tests
// plutôt que par la vigilance. Chaque règle ci-dessous correspond à un défaut
// qui était réellement en production.

const APP = join(__dirname)
const read = (p: string) => readFileSync(join(APP, p), "utf8")

const SUFFIX = " | QRowg"        // ajouté par title.template du layout racine
const MAX_TITLE = 60             // au-delà, la SERP tronque
const MIN_DESC = 110
const MAX_DESC = 160

/** Pages publiques et le fichier qui porte leurs metadata. */
const PUBLIC_PAGES: { route: string; file: string }[] = [
  { route: "/", file: "page.tsx" },
  { route: "/creer", file: "creer/page.tsx" },
  { route: "/contact", file: "contact/layout.tsx" },
  { route: "/examples", file: "examples/layout.tsx" },
  { route: "/features", file: "features/layout.tsx" },
  { route: "/upgrade", file: "upgrade/layout.tsx" },
  { route: "/legal", file: "legal/page.tsx" },
  { route: "/privacy", file: "privacy/page.tsx" },
  { route: "/terms", file: "terms/page.tsx" },
  { route: "/security", file: "security/page.tsx" },
  { route: "/qr-code", file: "qr-code/page.tsx" },
  { route: "/guides", file: "guides/page.tsx" },
  { route: "/generateur-qr-code", file: "generateur-qr-code/page.tsx" },
  { route: "/generateur-qr-code-wifi", file: "generateur-qr-code-wifi/page.tsx" },
  { route: "/outils/testeur-qr-code", file: "outils/testeur-qr-code/page.tsx" },
]

/** Résout `title: MA_CONSTANTE` en remontant à `const MA_CONSTANTE = "…"`. */
function deref(src: string, v: string | undefined): string | undefined {
  if (!v || v.startsWith('"')) return v?.replace(/^"|"$/g, "")
  const m = src.match(new RegExp(`const ${v}\\s*=\\s*"(.*?)"`))
  return m?.[1]
}
const titleOf = (src: string) => deref(src, src.match(/\n\s{2}title: ("[^"]*"|[A-Z_][A-Z0-9_]*),/)?.[1])
const descOf = (src: string) => deref(src, src.match(/\n\s{2}description:\s*\n?\s*("[^"]*"|[A-Z_][A-Z0-9_]*),/)?.[1])

describe("titres — le gabarit racine ajoute déjà « | QRowg »", () => {
  it("le layout racine applique bien le gabarit", () => {
    expect(read("layout.tsx")).toContain('template: "%s | QRowg"')
  })

  it("aucune page ne remet le suffixe à la main", () => {
    const coupables: string[] = []
    for (const { route, file } of PUBLIC_PAGES) {
      const t = titleOf(read(file))
      if (t && t.endsWith(SUFFIX)) coupables.push(`${route} (${file})`)
    }
    for (const s of VERTICAL_ORDER) if (VERTICALS[s].metaTitle.endsWith(SUFFIX)) coupables.push(`/qr-code/${s}`)
    for (const s of GUIDE_ORDER) if (GUIDES[s].metaTitle.endsWith(SUFFIX)) coupables.push(`/guides/${s}`)
    expect(coupables, "ces pages afficheraient « … | QRowg | QRowg »").toEqual([])
  })

  it("aucun titre rendu ne dépasse la fenêtre de la SERP", () => {
    const longs: string[] = []
    const check = (route: string, t: string) => {
      const rendu = t.endsWith(SUFFIX) ? t : t + SUFFIX
      if (rendu.length > MAX_TITLE) longs.push(`${route} — ${rendu.length} car. : ${rendu}`)
    }
    for (const { route, file } of PUBLIC_PAGES) { const t = titleOf(read(file)); if (t) check(route, t) }
    for (const s of VERTICAL_ORDER) check(`/qr-code/${s}`, VERTICALS[s].metaTitle)
    for (const s of GUIDE_ORDER) check(`/guides/${s}`, GUIDES[s].metaTitle)
    expect(longs).toEqual([])
  })
})

describe("descriptions", () => {
  it("le cluster SEO tient dans la fenêtre utile", () => {
    const hors: string[] = []
    const check = (route: string, d: string) => {
      if (d.length < MIN_DESC || d.length > MAX_DESC) hors.push(`${route} — ${d.length} car.`)
    }
    for (const s of VERTICAL_ORDER) check(`/qr-code/${s}`, VERTICALS[s].metaDescription)
    for (const s of GUIDE_ORDER) check(`/guides/${s}`, GUIDES[s].metaDescription)
    expect(hors).toEqual([])
  })

  it("chaque page publique en déclare une", () => {
    const sans = PUBLIC_PAGES.filter(p => p.route !== "/" && !descOf(read(p.file))).map(p => p.route)
    expect(sans).toEqual([])
  })

  it("aucune description n'est dupliquée d'une page à l'autre", () => {
    const vues = new Map<string, string>()
    const doublons: string[] = []
    const add = (route: string, d: string) => {
      const prev = vues.get(d)
      if (prev) doublons.push(`${route} = ${prev}`)
      else vues.set(d, route)
    }
    for (const s of VERTICAL_ORDER) add(`/qr-code/${s}`, VERTICALS[s].metaDescription)
    for (const s of GUIDE_ORDER) add(`/guides/${s}`, GUIDES[s].metaDescription)
    expect(doublons).toEqual([])
  })
})

describe("canoniques", () => {
  it("chaque page publique en déclare une", () => {
    const sans = PUBLIC_PAGES.filter(p => !read(p.file).includes("alternates: { canonical")).map(p => p.route)
    expect(sans, "sans canonique, les variantes ?utm_* sont indexées séparément").toEqual([])
  })

  it("aucune n'est codée en dur (sinon les previews se canonisent vers la prod)", () => {
    const dures = PUBLIC_PAGES
      .filter(p => /canonical: "https:\/\//.test(read(p.file)))
      .map(p => p.route)
    expect(dures).toEqual([])
  })

  it("l'accueil en a une — c'est la page la plus exposée aux variantes d'URL", () => {
    const src = read("page.tsx")
    expect(src).toContain("alternates: { canonical: APP }")
  })
})

describe("cartes de partage", () => {
  it("chaque page publique déclare son propre openGraph", () => {
    const sans = PUBLIC_PAGES.filter(p => p.route !== "/" && !read(p.file).includes("openGraph:")).map(p => p.route)
    expect(sans, "sinon elles publient l'og:url et l'og:title de l'accueil").toEqual([])
  })

  it("og:title et twitter:title disent la même chose", () => {
    const divergents: string[] = []
    for (const { route, file } of PUBLIC_PAGES) {
      const src = read(file)
      const og = src.match(/openGraph: \{ title: [`"](.*?)[`"],/)?.[1]
      const tw = src.match(/twitter: \{ card: "summary_large_image", title: [`"](.*?)[`"],/)?.[1]
      if (og && tw && og !== tw) divergents.push(`${route} : « ${og} » ≠ « ${tw} »`)
    }
    expect(divergents).toEqual([])
  })

  it("openGraph et twitter vont de pair", () => {
    const bancales = PUBLIC_PAGES
      .filter(p => p.route !== "/")   // l'accueil hérite des deux du layout racine
      .filter(p => { const s = read(p.file); return s.includes("openGraph:") && !s.includes("twitter:") })
      .map(p => p.route)
    expect(bancales).toEqual([])
  })
})

describe("robots & sitemap", () => {
  it("les zones privées et les bancs d'essai sont bloqués", () => {
    const src = read("robots.ts")
    for (const d of ["/dashboard/", "/auth/", "/api/", "/e2e-harness/"]) expect(src).toContain(`"${d}"`)
  })

  it("le sitemap ne prétend pas que tout a été modifié à l'instant", () => {
    const src = read("sitemap.ts")
    expect(src).not.toMatch(/lastModified: new Date\(\),/)
  })

  it("toutes les pages publiques figurent au sitemap", () => {
    const src = read("sitemap.ts")
    for (const { route } of PUBLIC_PAGES) {
      if (route === "/") { expect(src).toContain("url: baseUrl,"); continue }
      expect(src, `${route} absent du sitemap`).toContain(`\${baseUrl}${route}`)
    }
    expect(src).toContain("VERTICAL_ORDER.map")
    expect(src).toContain("GUIDE_ORDER.map")
  })
})

describe("accessibilité aux moteurs", () => {
  // Googlebot n'est jamais connecté. Une page du sitemap qui redirige les visiteurs
  // anonymes vers l'inscription ne peut pas être indexée — c'était le cas de
  // /generateur-qr-code-wifi, pourtant canonique, balisée FAQ et au sitemap.
  const INDEXABLES = [
    "generateur-qr-code/page.tsx", "generateur-qr-code-wifi/page.tsx",
    "qr-code/page.tsx", "qr-code/[usage]/page.tsx",
    "guides/page.tsx", "guides/[slug]/page.tsx",
    "security/page.tsx", "legal/page.tsx", "privacy/page.tsx", "terms/page.tsx",
  ]

  it("aucune page indexable ne renvoie un visiteur anonyme vers l'inscription", () => {
    const murees = INDEXABLES.filter(f => /if \(!user\)\s*redirect\(/.test(read(f)))
    expect(murees).toEqual([])
  })

  it("aucune page indexable ne se met en noindex", () => {
    const cachees = INDEXABLES.filter(f => /index:\s*false/.test(read(f)))
    expect(cachees).toEqual([])
  })
})

describe("maillage interne du cluster", () => {
  it("les deux hubs renvoient l'un vers l'autre et vers les guides", () => {
    for (const f of ["qr-code/page.tsx", "generateur-qr-code/page.tsx"]) {
      expect(read(f), `${f} ne lie pas /guides`).toContain('href="/guides"')
    }
    expect(read("guides/page.tsx")).toContain('href="/qr-code"')
  })

  it("chaque guide pointe vers des usages, et réciproquement", () => {
    for (const s of GUIDE_ORDER) expect(GUIDES[s].relatedUsages.length, `guide ${s}`).toBeGreaterThan(0)
    expect(read("qr-code/[usage]/page.tsx")).toContain("/guides/")
  })
})

describe("pages publiques des utilisateurs", () => {
  it("le titre est borné avant de recevoir le suffixe", () => {
    expect(read("[slug]/page.tsx")).toContain("clampTitle(")
  })

  it("la description de repli est accentuée et pas famélique", () => {
    const src = read("[slug]/page.tsx")
    expect(src).not.toContain("Decouvre la page de")
    const m = src.match(/\|\| `\$\{who\} (.*?)`\.slice/)
    expect(m?.[1] && m[1].length).toBeGreaterThan(60)
  })

  it("un seul <h1>, toujours présent", () => {
    const client = read("[slug]/PublicPageClient.tsx")
    expect(client).toContain("const h1Owner = blocks.find")
    expect(client).toContain("h1Owner === block.id")
    // Repli quand aucun bloc profil n'est nommé : le titre de la page.
    expect(client).toContain("{!h1Owner &&")
    const h1s = client.match(/<h1 /g) || []   // les « <h1> » des commentaires ne comptent pas
    expect(h1s.length, "un h1 pour le profil, un pour le repli").toBe(2)
  })

  it("aucun bloc du rendu partagé n'émet de <h1> concurrent", () => {
    const dir = join(__dirname, "dashboard/builder/shared-renderer/blocks")
    const fautifs: string[] = []
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.tsx$/.test(e.name) && !/\.test\./.test(e.name) && /<h1[ >]/.test(readFileSync(p, "utf8"))) fautifs.push(e.name)
      }
    }
    if (existsSync(dir)) walk(dir)
    expect(fautifs).toEqual([])
  })
})

describe("données structurées", () => {
  it("une seule entité logicielle : même @id partout", () => {
    expect(read("layout.tsx")).toContain('"@id": `${APP_URL}/#software`')
    expect(readFileSync(join(__dirname, "../lib/landingJsonLd.ts"), "utf8")).toContain('"@id": `${APP_URL}/#software`')
  })

  it("les outils gratuits sont des entités distinctes et identifiées", () => {
    for (const f of ["generateur-qr-code/page.tsx", "generateur-qr-code-wifi/page.tsx"]) {
      expect(read(f), f).toContain('"@id": `${URL}/#tool`')
    }
  })
})

describe("www", () => {
  it("redirige en permanence vers l'apex", () => {
    const src = readFileSync(join(__dirname, "../middleware.ts"), "utf8")
    expect(src).toContain("www.${APP_DOMAIN}")
    expect(src).toContain("NextResponse.redirect(url, 308)")
  })
})
