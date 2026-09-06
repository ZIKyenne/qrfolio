import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Le produit s'adresse à un artisan, pas à un développeur. Les noms retenus :
//   builder → éditeur · template → modèle · dashboard → tableau de bord
//   analytics → statistiques · print studio → atelier d'impression
//   drag & drop → glisser-déposer
// Ils étaient tenus dans la barre latérale mais pas dans la barre mobile, ni sur
// Fonctionnalités, Exemples, Contact, le pied de page, le JSON-LD et l'image de
// partage — où l'anglais réapparaissait.

const SRC = join(__dirname, "..")

const INTERDITS: [RegExp, string][] = [
  [/\bbuilders?\b/i, "éditeur"],
  [/\btemplates?\b/i, "modèle"],
  [/\bdashboards?\b/i, "tableau de bord"],
  [/\banalytics\b/i, "statistiques"],
  [/\bdrag ?(?:&|and) ?drop\b/i, "glisser-déposer"],
]

// Là où le mot anglais est une adresse, une clé technique ou un nom de fichier —
// pas un texte lu. Le chemin /dashboard/templates reste tel quel : le changer
// casserait les liens déjà imprimés sur des supports.
const EXCLUS_FICHIERS = [
  "app/dashboard/builder/ai-generate.ts",   // consigne au modèle
  "lib/motsDuProduit.test.ts",
]

function fichiers(): string[] {
  const out: string[] = []
  const marcher = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) { if (n !== "e2e-harness") marcher(p) }
      else if (/\.tsx?$/.test(n) && !/\.test\./.test(n)) out.push(p)
    }
  }
  marcher(SRC)
  return out.filter(f => !EXCLUS_FICHIERS.some(e => f.endsWith(e)))
}

/** Les textes lus par un humain : chaînes en français et texte JSX. */
export function textesLus(ligne: string): string[] {
  const l = ligne.trim()
  if (l.startsWith("//") || l.startsWith("*") || l.startsWith("/*")) return []
  const out: string[] = []
  for (const m of ligne.matchAll(/"((?:[^"\\\n]|\\.){4,})"|'((?:[^'\\\n]|\\.){4,})'/g)) {
    const v = m[1] ?? m[2] ?? ""
    // Une phrase : au moins deux mots, pas une URL, pas une classe CSS, pas une
    // clé d'objet, pas un chemin de route.
    if (!v.includes(" ")) continue
    if (estDuCode(v)) continue
    out.push(v)
  }
  for (const m of ligne.matchAll(/>([^<>{}\n]{6,})</g)) {
    if (!estDuCode(m[1]) && /[a-zà-ÿ]{3}/.test(m[1])) out.push(m[1])
  }
  return out
}

/** Reconnaît un fragment de code capturé par erreur : accès à une propriété,
 *  concaténation, morceau d'objet de style. Ce n'est jamais une phrase. */
function estDuCode(v: string): boolean {
  if (/[+=]|\$\{|\(\)|=>/.test(v)) return true          // concaténation, gabarit, appel
  if (/\b[a-z][\w]*\.[a-z]/.test(v)) return true         // template.color
  if (/^[\w-]+:\s/.test(v)) return true                  // clé: valeur
  if (/^https?:|^\//.test(v)) return true                 // adresse
  if (!/[A-ZÀ-Ýa-zà-ÿ]{3}/.test(v)) return true            // pas un mot
  return false
}

describe("les mots du produit sont français, partout", () => {
  const fautes: string[] = []
  for (const f of fichiers()) {
    for (const [i, ligne] of readFileSync(f, "utf8").split("\n").entries()) {
      // Ce qui n'est pas montré : adresses, journaux, mots-clés de recherche,
      // clé anglaise d'une table de traduction, contenu de démonstration d'un modèle.
      if (/href=|url:|pathname|startsWith\(|router\.(?:push|replace)|redirect\(|"\/dashboard/.test(ligne)) continue
      if (/console\.(?:log|warn|error)|keywords:|"type":"|TEMPLATE_BLOCKS/.test(ligne)) continue
      if (/^\s*"[^"]+":\s*"/.test(ligne)) continue   // table de traduction : la clé est l'anglais
      if (/Record<string\s*,\s*(?:string|React\.ReactNode)>/.test(ligne) || /^\s*\w+:"[^"]*",/.test(ligne)) continue  // table de correspondance technique
      for (const t of textesLus(ligne)) {
        for (const [re, attendu] of INTERDITS) {
          const m = t.match(re)
          if (m) fautes.push(`${f.replace(SRC, "")}:${i + 1} « ${m[0]} » → « ${attendu} » dans « ${t.slice(0, 70)} »`)
        }
      }
    }
  }

  it("le détecteur reconnaît un anglicisme lu par l'utilisateur", () => {
    expect(textesLus('  <span>Ouvrir le builder</span>')).toContain("Ouvrir le builder")
    expect(INTERDITS.some(([re]) => re.test("Ouvrir le builder"))).toBe(true)
    expect(INTERDITS.some(([re]) => re.test("Interface drag & drop"))).toBe(true)
  })

  it("et laisse tranquilles les adresses et les identifiants", () => {
    expect(textesLus('href="/dashboard/templates"')).toEqual([])
    expect(textesLus('const templateId = "resto_bistrot"')).toEqual([])
    expect(textesLus('style={{ background: template.color + "22" }}')).toEqual([])
  })

  it("aucun écran ne dit builder, template, dashboard, analytics ni drag & drop", () => {
    expect(fautes).toEqual([])
  })
})

describe("la barre mobile et la barre latérale donnent le même nom aux mêmes écrans", () => {
  const shell = readFileSync(join(SRC, "app/dashboard/DashboardShell.tsx"), "utf8")
  const mobile = readFileSync(join(SRC, "components/MobileNav.tsx"), "utf8")

  const libelles = (src: string, re: RegExp) =>
    new Map([...src.matchAll(re)].map(m => [m[1], m[2]] as const))

  it("chaque route commune porte le même libellé des deux côtés", () => {
    const pc = libelles(shell, /\{ href: "([^"]+)", glyph: "[^"]*", label: "([^"]+)"/g)
    const tel = new Map<string, string>([
      ...[...mobile.matchAll(/label: '([^']+)', href: '([^']+)'/g)].map(m => [m[2], m[1]] as const),
      ...[...mobile.matchAll(/href: '([^']+)', label: '([^']+)'/g)].map(m => [m[1], m[2]] as const),
    ])
    const divergents: string[] = []
    for (const [href, nomTel] of tel) {
      const nomPc = pc.get(href)
      if (nomPc && nomPc !== nomTel) divergents.push(`${href} : PC « ${nomPc} » ≠ téléphone « ${nomTel} »`)
    }
    expect(divergents).toEqual([])
  })
})
