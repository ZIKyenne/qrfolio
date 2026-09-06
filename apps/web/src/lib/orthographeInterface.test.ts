import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// « Domaine supprime », « Gerer la facturation », « Cle API creee », « Slug
// public », « WiFi » à côté de « Wi-Fi », « 24h » à côté de « 24 h ouvrées » :
// des mots français sans accent et du jargon montrés à un artisan.

const SRC = join(__dirname, "..")

// Mots qui n'existent JAMAIS sans accent en français : leur présence est une faute,
// jamais un homographe (contrairement à « il active », « elle modifie »…).
const SANS_ACCENT = [
  "cle", "cles", "reel", "reelle", "apercu", "parametres", "parametre", "securite",
  "numero", "reseau", "reseaux", "donnees", "acces", "succes", "derniere", "premiere",
  "categorie", "categories", "requete", "requetes", "resume", "resultat", "resultats",
  "elements", "element", "propriete", "etat", "telecharger", "telechargement",
  "necessaire", "verification", "abonnes", "abonne", "prete", "deja",
  // Participes passés FÉMININS ou PLURIELS : eux n'ont pas d'homographe au présent
  // (« il supprime » est correct, « supprimee » ne l'est jamais).
  "creee", "creees", "publiee", "publiees", "modifiee", "modifiees",
  "verifiee", "personnalisee", "selectionnee", "reservee", "activee", "desactivee",
]
const RE_ACCENT = new RegExp(String.raw`(?:^|[^\p{L}'’-])(?:${SANS_ACCENT.join("|")})(?![\p{L}-])`, "iu")

// Jargon : le mot de gauche ne doit plus être montré ; celui de droite le remplace.
const JARGON: [RegExp, string][] = [
  [/\bslug\b/i, "adresse de la page"],
  [/\bwifi\b/i, "Wi-Fi"],
  [/\bwebhooks?\b/i, "(fonction inexistante — ne pas annoncer)"],
  [/\bSDK\b/, "(fonction inexistante — ne pas annoncer)"],
  [/\b24h(?![\s/])/, "24 heures"],
]

const EXCLUS = [
  "app/dashboard/builder/ai-generate.ts",
  "lib/orthographeInterface.test.ts",
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
  return out.filter(f => !EXCLUS.some(e => f.endsWith(e)))
}

function textesLus(ligne: string): string[] {
  const l = ligne.trim()
  if (l.startsWith("//") || l.startsWith("*") || l.startsWith("/*") || l.includes("console.")) return []
  const out: string[] = []
  for (const m of ligne.matchAll(/"((?:[^"\\\n]|\\.){4,})"|'((?:[^'\\\n]|\\.){4,})'/g)) {
    const v = m[1] ?? m[2] ?? ""
    if (!v.includes(" ")) continue
    if (/[+=]|\$\{|=>|^https?:|^\//.test(v)) continue
    if (/\b[a-z][\w]*\.[a-z]/.test(v)) continue
    // Liste de colonnes Supabase (« *, pages(title, slug) ») : ce n'est pas une phrase.
    if (/^[\w*(),\s]+$/.test(v) && !/[éèêàçùôîû]/i.test(v) && v.split(/[\s,()]+/).every(w => !w || /^[\w*]+$/.test(w)) && /[(,]/.test(v)) continue
    // Tracé SVG (« M46 24h8M46 32h8 ») : des lettres de commande et des nombres.
    if (/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(v)) continue
    out.push(v)
  }
  for (const m of ligne.matchAll(/>([^<>{}\n]{6,})</g)) {
    if (!m[1].includes(":") && !/[+=]/.test(m[1])) out.push(m[1])
  }
  return out
}

function releve(re: RegExp): string[] {
  const out: string[] = []
  for (const f of fichiers()) {
    for (const [i, ligne] of readFileSync(f, "utf8").split("\n").entries()) {
      for (const t of textesLus(ligne)) {
        const m = t.match(re)
        if (m) out.push(`${f.replace(SRC, "")}:${i + 1} « ${m[0].trim()} » dans « ${t.slice(0, 70)} »`)
      }
    }
  }
  return out
}

describe("orthographe de l'interface", () => {
  it("le détecteur d'accents voit une faute, et pas un homographe", () => {
    for (const p of ["Page creee", "Cle API", "Apercu mobile", "Couleur personnalisee", "Page publiee"]) expect(RE_ACCENT.test(p), p).toBe(true)
    // Homographes : ces formes existent sans accent au présent de l'indicatif.
    for (const p of ["Il active le QR", "Cette question modifie", "on supprime la marge", "un accès direct", "déjà pris", "Une clé"]) expect(RE_ACCENT.test(p), p).toBe(false)
  })

  it("aucun mot français n'est montré sans son accent", () => {
    expect(releve(RE_ACCENT)).toEqual([])
  })
})

describe("jargon", () => {
  for (const [re, remplacement] of JARGON) {
    it(`« ${re.source} » → « ${remplacement} »`, () => {
      expect(releve(re)).toEqual([])
    })
  }

  it("le champ d'adresse s'appelle par son nom", () => {
    const src = readFileSync(join(SRC, "app/dashboard/templates/page.tsx"), "utf8")
    expect(src).toContain(">Adresse de la page</label>")
  })

  it("l'API n'annonce que ce qu'elle fait", () => {
    const src = readFileSync(join(SRC, "app/dashboard/profile/page.tsx"), "utf8")
    expect(src).toContain("Changer la destination d'un QR")
    expect(src).toContain("caps.apiAppelsMois")
  })
})
