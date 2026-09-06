import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// L'éditeur est un WYSIWYG : ce que le commerçant compose est ce que son client
// verra. Cinquante-cinq blocs sur cent quarante-deux sont encore rendus DEUX fois
// — une fois par l'aperçu de l'éditeur (builderPreview.tsx), une fois par la page
// publiée (PublicPageClient.tsx). Chaque écart entre les deux est un mensonge fait
// au commerçant, et il ne le découvre qu'après avoir imprimé son QR.
//
// Le 6 septembre, le motif de fond en a fourni la preuve : trois motifs sur dix
// étaient proposés au choix, affichés dans l'aperçu, et remplacés par des points
// une fois la page en ligne. Ce test cherche la même chose bloc par bloc.

const ICI = __dirname
const lire = (p: string) => readFileSync(join(ICI, p), "utf8")

/** Le corps de chaque `case "x":` du grand aiguillage d'un renderer. */
function casParBloc(src: string): Record<string, string> {
  const i = src.indexOf("switch (block.type)")
  expect(i, "aiguillage introuvable").toBeGreaterThan(-1)
  const corps = src.slice(i)
  const positions = [...corps.matchAll(/\n\s+case "([a-z_0-9]+)":/g)].map(m => [m.index!, m[1]] as const)
  const finSwitch = corps.indexOf("\n      default:") >= 0 ? corps.indexOf("\n      default:") : corps.length
  const out: Record<string, string> = {}
  positions.forEach(([pos, nom], k) => {
    out[nom] = corps.slice(pos, k + 1 < positions.length ? positions[k + 1][0] : finSwitch)
  })
  return out
}

/** Le corps d'un composant de blocsPublics.tsx, pour suivre la délégation. */
function corpsComposant(src: string, nom: string): string {
  const m = new RegExp(`export function ${nom}\\b`).exec(src)
  if (!m) return ""
  let k = src.indexOf("(", m.index + m[0].length), n = 0, finParams = k
  for (let j = k; j < src.length; j++) {
    if (src[j] === "(") n++
    else if (src[j] === ")") { n--; if (n === 0) { finParams = j; break } }
  }
  const debut = src.indexOf("{", finParams)
  n = 0
  for (let j = debut; j < src.length; j++) {
    if (src[j] === "{") n++
    else if (src[j] === "}") { n--; if (n === 0) return src.slice(debut, j) }
  }
  return ""
}

const editeur = casParBloc(lire("builderPreview.tsx"))
const publique = casParBloc(lire("../../[slug]/PublicPageClient.tsx"))
const blocsPublics = lire("../../[slug]/blocsPublics.tsx")
const defs = lire("blockDefs.ts")

/** Les blocs déjà passés au renderer partagé : une seule source, aucun écart possible. */
const partages = (() => {
  const src = lire("shared-renderer/architecture.ts")
  const i = src.indexOf("SHARED_RENDERER_BLOCKS")
  return new Set([...src.slice(i, src.indexOf("])", i)).matchAll(/"([a-z_0-9]+)"/g)].map(m => m[1]))
})()

const legacy = Object.keys(editeur).filter(t => t in publique && !partages.has(t))

/** Les champs qu'un texte lit dans le contenu du bloc. */
function champsLus(texte: string): { directs: Set<string>; prefixes: Set<string> } {
  return {
    directs: new Set([...texte.matchAll(/\bc\.([a-z_0-9]+)/g)].map(m => m[1])),
    // accès calculés : c[`img${n}`] — on retient le préfixe
    prefixes: new Set([...texte.matchAll(/c\[`([a-z_]+)\$\{/g)].map(m => m[1])),
  }
}

/** Le rendu public d'un bloc, délégation comprise. */
function texteePublic(type: string): string {
  let t = publique[type]
  for (const nom of new Set([...t.matchAll(/<([A-Z][A-Za-z]*Public)\b/g)].map(m => m[1]))) {
    t += "\n" + corpsComposant(blocsPublics, nom)
  }
  return t
}

/** Les réglages réellement proposés au commerçant pour ce bloc. */
function champsOfferts(type: string): Set<string> {
  const m = new RegExp(`\\n  ${type}: \\{`).exec(defs)
  if (!m) return new Set()
  const bloc = defs.slice(m.index, defs.indexOf("\n  },", m.index))
  return new Set([...bloc.matchAll(/key: "([a-z_0-9]+)"/g)].map(m2 => m2[1]))
}

// ─────────────────────────────────────────────────────────────────────────────
// Relevé du 6 septembre. Chaque ligne est un réglage que le commerçant peut
// remplir, qu'il voit appliqué dans son aperçu, et que son client ne verra jamais.
// Elles attendent un arbitrage : soit la page publiée honore le réglage, soit le
// panneau cesse de le proposer. Aucune ne doit s'ajouter d'ici là.
const ECARTS_CONNUS: Record<string, string[]> = {
  about:            ["collapsible"],   // « Lire la suite » : bouton visible dans l'aperçu, absent en ligne
  add_to_calendar:  ["cta_label"],     // libellé de bouton — aucun bouton public
  booking_button:   ["description"],   // description affichée dans l'aperçu seulement
  embed_block:      ["type"],          // le type d'intégration ne change rien publiquement
  instagram_feed:   ["username"],      // le @pseudo n'est montré que dans l'aperçu (choix assumé : pas de faux feed)
  latest_release:   ["cta_label"],     // idem : bouton dans l'aperçu, pas en ligne
  offer_comparison: ["cta_label"],     // le tableau d'offres n'a AUCUN bouton en ligne — et il a pourtant un cta_url
  playlist_block:   ["cta_label"],
  presave:          ["cta_label"],
  qr_code_block:    ["label", "show_url", "size"],  // le bloc entier ne rend rien en ligne (voir plus bas)
  rich_text:        ["size"],          // petit/normal/grand dans l'aperçu, taille fixe en ligne
}

describe("l'aperçu de l'éditeur ne promet rien que la page publiée ne tienne", () => {
  it("les deux renderers couvrent le même nombre de blocs", () => {
    expect(Object.keys(editeur).length).toBe(Object.keys(publique).length)
    expect(legacy.length).toBeGreaterThan(30)   // sinon ce test ne garde presque rien
  })

  it("aucun nouveau réglage visible seulement dans l'éditeur", () => {
    const trouves: Record<string, string[]> = {}
    for (const type of legacy) {
      const e = champsLus(editeur[type])
      const p = champsLus(texteePublic(type))
      const offerts = champsOfferts(type)
      const seuls = [...e.directs]
        .filter(f => !p.directs.has(f))
        .filter(f => ![...p.prefixes].some(pref => f.startsWith(pref)))
        .filter(f => offerts.has(f))     // seulement ce que le commerçant peut vraiment régler
        .sort()
      if (seuls.length) trouves[type] = seuls
    }
    expect(trouves).toEqual(ECARTS_CONNUS)
  })
})

describe("un bloc proposé dans la bibliothèque arrive sur la page publiée", () => {
  // `qr_code_block` : proposé dans la catégorie « Mise en page », configurable
  // (taille, label, afficher l'URL), dessiné dans l'aperçu — et la page publiée
  // rend `null`. Le commerçant l'ajoute, le voit, publie, et son client ne voit
  // rien. En attente d'arbitrage : l'afficher en ligne, ou le retirer du panneau.
  const EXCEPTIONS = ["qr_code_block"]

  it("aucun autre bloc ne rend `null` sans condition en ligne", () => {
    const muets = legacy.filter(t => /case "[a-z_0-9]+": return null\s*$/m.test(publique[t].trim()))
    expect(muets.sort()).toEqual(EXCEPTIONS.sort())
  })

  it("celui qui reste est bien offert au choix — ce n'est pas un bloc oublié", () => {
    expect(champsOfferts("qr_code_block").size).toBeGreaterThan(0)
    expect(defs).toContain('label: "Bloc QR Code"')
  })
})
