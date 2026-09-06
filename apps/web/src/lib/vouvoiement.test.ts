import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// QRowg vouvoie. Trois pages publiques tutoyaient — Fonctionnalités, Exemples,
// Contact — alors que la méta-description de la MÊME page vouvoyait ; et
// plusieurs écrans du tableau de bord faisaient de même. On s'adresse à un
// commerçant qu'on ne connaît pas : le vouvoiement, partout.

const SRC = join(__dirname, "..")

// Marqueurs SANS ambiguïté : les pronoms et possessifs de la 2ᵉ personne du
// singulier. Les impératifs (« Vérifie… ») sont volontairement exclus : ils se
// confondent avec la 3ᵉ personne (« l'outil vérifie »).
const TUTOIEMENT = new RegExp(
  // `\b` est ASCII en JavaScript : il voyait un début de mot dans « ê|tes », et
  // « vous êtes » passait pour du tutoiement. On borne donc sur \p{L} (drapeau u).
  String.raw`(?:^|[^\p{L}'’])(?:` +
    // « ton / ta / tes » suivis d'un mot — sauf précédés d'un déterminant ou d'un
    // ordinal, qui en font un nom commun (« le 2ᵉ ton de la palette »).
    String.raw`(?<!(?:le|la|les|un|une|du|des|ce|cet|cette|mon|ma|mes|son|sa|ses|votre|vos|notre|nos|leur|leurs|[0-9](?:ᵉ|er|e))\s)(?:ton|ta|tes)\s+[a-zà-ÿ]` +
    String.raw`|tu\s+[a-zà-ÿ]|toi(?!\p{L})|t'(?:as|es)(?!\p{L})` +
  String.raw`)`,
  "iu",
)

// Fichiers dont le texte n'est PAS lu par l'utilisateur.
const EXCLUS = [
  // Consigne envoyée au modèle : le tutoiement s'y adresse au modèle, pas au commerçant.
  "app/dashboard/builder/ai-generate.ts",
  // Contenu de démonstration des modèles : ce sont les mots du commerçant fictif
  // (« Change selon les jours — voir Instagram » sur une ardoise de bistrot).
  "app/dashboard/builder/templateStructures.extra.ts",
  "app/dashboard/builder/page-templates.ts",
  "app/dashboard/builder/templatesStudio.ts",
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

/** Les chaînes et textes JSX d'une ligne — jamais les commentaires ni le code. */
function textesLus(ligne: string): string[] {
  const l = ligne.trim()
  if (l.startsWith("//") || l.startsWith("*") || l.startsWith("/*")) return []
  const out: string[] = []
  for (const m of ligne.matchAll(/"((?:[^"\\\n]|\\.){4,})"|'((?:[^'\\\n]|\\.){4,})'/g)) {
    const v = m[1] ?? m[2] ?? ""
    if (v.includes(" ") && !v.startsWith("http")) out.push(v)
  }
  // Texte JSX : entre deux balises, et sans « : » (qui trahit un objet de style).
  for (const m of ligne.matchAll(/>([^<>{}\n]{6,})</g)) {
    if (!m[1].includes(":")) out.push(m[1])
  }
  return out
}

describe("QRowg vouvoie, partout", () => {
  const trouves: string[] = []
  for (const f of fichiers()) {
    const lignes = readFileSync(f, "utf8").split("\n")
    for (const [i, ligne] of lignes.entries()) {
      for (const t of textesLus(ligne)) {
        const m = t.match(TUTOIEMENT)
        if (m) trouves.push(`${f.replace(SRC, "")}:${i + 1} → « ${t.slice(0, 80)} »`)
      }
    }
  }

  it("le détecteur voit un tutoiement quand il y en a un", () => {
    // Contrôle de l'instrument : sans lui, un test toujours vert ne prouve rien.
    for (const phrase of ["Crée ta page", "Décris ton activité", "Merci pour ton message", "reviendrons vers toi", "pendant que tu édites", "Ton nom", "Tes pages restent en ligne"]) {
      expect(TUTOIEMENT.test(phrase), phrase).toBe(true)
    }
  })

  it("et ne se déclenche pas sur ce qui n'en est pas", () => {
    for (const phrase of ["Le 2ᵉ ton de la palette", "Badge — tons sémantiques", "Pages avec statut Publié", "Vérifie qu'un QR code passera l'impression", "la totalité", "Vous êtes autonome", "X-Content-Type-Options"]) {
      expect(TUTOIEMENT.test(phrase), phrase).toBe(false)
    }
  })

  it("aucun écran ne tutoie", () => {
    expect(trouves).toEqual([])
  })
})
