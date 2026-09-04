import { describe, it, expect } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// ─────────────────────────────────────────────────────────────────────────────
// LES POLICES DES THÈMES DOIVENT EXISTER POUR DE VRAI
//
// Mesuré au navigateur sur une page publiée : des 14 familles que réclament les
// 48 thèmes, une seule arrivait. « Playfair Display » et onze autres n'avaient
// aucune @font-face et retombaient sur la police par défaut de l'appareil du
// visiteur. La typographie qui distingue une carte de bistrot d'une page de
// startup — une part entière de ce qui est vendu — ne partait pas en production.
//
// Vérifié après correction, sans rien forcer : resto_bistrot télécharge
// inter-latin (47 ko) + playfair-display-latin (38 ko), et rien d'autre. Le
// navigateur ne va chercher une famille que si un texte la demande.
//
// DEUX ALIAS ASSUMÉS : « DM Sans » et « Fraunces » pointent volontairement vers
// Inter. 279 endroits de l'interface les nomment ; les dé-aliaser changerait la
// typographie de tout le produit. C'est une décision de design à prendre à part,
// pas un défaut à corriger au passage.
// ─────────────────────────────────────────────────────────────────────────────

const ici = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(ici, "globals.css"), "utf8")
const B = join(ici, "dashboard", "builder")

const ALIAS_ASSUMES = new Set(["DM Sans", "Fraunces"])

/** Familles nommées par au moins un thème, tous registres confondus. */
function famillesDesThemes(): string[] {
  const out = new Set<string>()
  for (const f of ["page-templates.ts", "themes.ts", "templatesStudio.ts"]) {
    const src = readFileSync(join(B, f), "utf8")
    for (const m of src.matchAll(/font(?:Display|Body|_display|_body):\s*["']([^"']+)["']/g)) {
      out.add(m[1].split(",")[0].trim())
    }
  }
  return [...out].sort()
}

/** Fichier déclaré pour une famille, ou null si aucune @font-face. */
function fichierDe(famille: string): string | null {
  const re = new RegExp(`@font-face \\{ font-family:'${famille.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}';[^}]*?src:url\\('([^']+)'\\)`, "s")
  const m = re.exec(css)
  return m ? m[1] : null
}

describe("les polices des thèmes", () => {
  const familles = famillesDesThemes()

  it("les registres de thèmes sont bien lus", () => {
    expect(familles.length).toBeGreaterThanOrEqual(12)
    expect(familles).toContain("Playfair Display")
    expect(familles).toContain("DM Sans")
  })

  it("chaque famille nommée par un thème a une @font-face", () => {
    const sans = familles.filter(f => !fichierDe(f))
    expect(sans, "familles sans déclaration — elles retombent sur la police du visiteur").toEqual([])
  })

  it("chaque fichier déclaré existe vraiment sur le disque", () => {
    const manquants: string[] = []
    for (const f of familles) {
      const url = fichierDe(f)
      if (!url) continue
      const chemin = join(ici, "..", "..", "public", url.replace(/^\//, ""))
      if (!existsSync(chemin)) manquants.push(`${f} -> ${url}`)
    }
    expect(manquants).toEqual([])
  })

  it("aucune famille n'est un alias vers Inter, sauf les deux assumées", () => {
    const deguisees = familles
      .filter(f => f !== "Inter" && !ALIAS_ASSUMES.has(f))
      .filter(f => (fichierDe(f) || "").includes("inter-"))
    expect(deguisees, "une police de thème qui sert en réalité de l'Inter").toEqual([])
  })

  it("les deux alias assumés le sont toujours — sinon c'est un choix de design, pas un accident", () => {
    for (const f of ALIAS_ASSUMES) expect(fichierDe(f), f).toContain("inter-")
  })

  it("les licences des polices auto-hébergées sont documentées", () => {
    const lic = join(ici, "..", "..", "public", "fonts", "LICENCES.md")
    expect(existsSync(lic), "public/fonts/LICENCES.md manquant").toBe(true)
    const texte = readFileSync(lic, "utf8")
    for (const f of familles) {
      if (ALIAS_ASSUMES.has(f) || f === "Inter") continue
      expect(texte, `${f} absente des licences`).toContain(f)
    }
  })
})
