import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Relevé du 4 septembre : bouton 26×26 sans nom sur toutes les pages (replier la
// barre), quatre liens de la barre réduite sans texte ni aria-label, corbeilles
// et actions icône-seule sans nom. Un lecteur d'écran lit « bouton ».

const fichiers: string[] = []
const marcher = (d: string) => { for (const n of readdirSync(d).sort()) { const p = join(d, n); if (statSync(p).isDirectory()) { if (n !== "shared-renderer") marcher(p) } else if (/\.tsx$/.test(n) && !/\.test\.tsx$/.test(n)) fichiers.push(p) } }
marcher(__dirname)
marcher(join(__dirname, "../../components"))

// Un bouton dont le SEUL contenu est une icône (composant lucide auto-fermant ou <svg>).
const ICONE_SEULE = /<button\b([^>]*)>\s*(?:\{[^{}]*\}\s*)?<(?:[A-Z][A-Za-z0-9]*|svg)\b[^>]*(?:\/>|>[\s\S]*?<\/svg>)\s*<\/button>/g

function sansNom(src: string): string[] {
  const out: string[] = []
  for (const m of src.matchAll(ICONE_SEULE)) {
    const attrs = m[1]
    if (/aria-label|title=|aria-labelledby/.test(attrs)) continue
    const ligne = src.slice(0, m.index).split("\n").length
    out.push(`${ligne}: ${m[0].replace(/\s+/g, " ").slice(0, 100)}`)
  }
  return out
}

describe("chaque bouton icône-seule a un nom", () => {
  it("il y a bien des boutons à surveiller", () => {
    expect(fichiers.length).toBeGreaterThan(20)
  })
  for (const f of fichiers) {
    const src = readFileSync(f, "utf8")
    if (!ICONE_SEULE.test(src)) continue
    ICONE_SEULE.lastIndex = 0
    it(f.replace(__dirname, "dashboard"), () => {
      expect(sansNom(src)).toEqual([])
    })
  }
})

describe("la barre latérale repliée garde ses noms", () => {
  const shell = readFileSync(join(__dirname, "DashboardShell.tsx"), "utf8")
  it("le bouton replier/déployer est nommé et fait 32 px", () => {
    expect(shell).toContain('aria-label={collapsed ? "Déployer le menu" : "Replier le menu"}')
    expect(shell).not.toMatch(/setCollapsed\(p => !p\)\}[^\n]*\n\s*style=\{\{ width: 26/)
  })
  it("chaque lien de la barre réduite porte un aria-label", () => {
    expect(shell).toContain('aria-label={collapsed ? label : undefined}')
    for (const l of ['"Créer mon compte"', '"Voir les offres"', '"Mon profil"']) expect(shell).toContain(`aria-label={collapsed ? ${l} : undefined}`)
  })
})
