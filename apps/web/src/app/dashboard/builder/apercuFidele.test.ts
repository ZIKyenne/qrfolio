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
  const m = new RegExp(`(?:export )?function ${nom}\\b`).exec(src)
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
const publique = casParBloc(lire("../../[slug]/renduLegacy.tsx"))
const blocsPublics = lire("../../[slug]/blocsPublics.tsx")
const defs = lire("blockDefs.ts")

/** Les blocs déjà passés au renderer partagé : une seule source, aucun écart possible. */
const partages = (() => {
  const src = lire("shared-renderer/architecture.ts")
  const i = src.indexOf("SHARED_RENDERER_BLOCKS")
  return new Set([...src.slice(i, src.indexOf("])", i)).matchAll(/"([a-z_0-9]+)"/g)].map(m => m[1]))
})()

/** Les blocs conservés mais retirés du choix : ils ne promettent plus rien. */
const masques = (() => {
  const i = defs.indexOf("BLOCS_MASQUES")
  return new Set([...defs.slice(i, defs.indexOf("])", i)).matchAll(/"([a-z_0-9]+)"/g)].map(m => m[1]))
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

/** Le rendu éditeur d'un bloc, délégation comprise.
 *  L'aperçu délègue lui aussi : `countdown` passe par <CountdownBox/>, défini
 *  dans builderPreview. Sans suivre cette délégation, le contrôle inverse
 *  ci-dessous accusait le compte à rebours d'ignorer sept réglages qu'il lit. */
function texteEditeur(type: string): string {
  let t = editeur[type]
  const preview = lire("builderPreview.tsx")
  for (const nom of new Set([...t.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)].map(m => m[1]))) {
    t += "\n" + corpsComposant(preview, nom) + "\n" + corpsComposant(blocsPublics, nom)
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
  // Le seul restant, et c'est un choix assumé : le bloc Instagram montre le @pseudo
  // dans l'aperçu pour que le commerçant se repère, mais la page publiée n'affiche
  // que le vrai bouton « Me suivre » — QRowg refuse de publier de fausses vignettes
  // de feed, qui feraient croire à une intégration qui n'existe pas.
  instagram_feed: ["username"],
}
// Réglés le 6 septembre, après arbitrage :
//  · offer_comparison — le bouton existe maintenant sur la page publiée, avec son
//    adresse et son suivi de clic ; c'est le seul des cinq qui avait un cta_url ;
//  · presave, latest_release, playlist_block, add_to_calendar — le champ « Bouton »
//    configurait un bouton sans destination possible : il est retiré du panneau, et
//    les trois « boutons » de l'aperçu qui n'étaient que des états vides gardent un
//    libellé fixe ;
//  · qr_code_block — retiré de la bibliothèque : il ne rendait rien en ligne.
//
// Puis le 6 septembre au soir, les quatre derniers :
//  · booking_button — la description écrite par le commerçant arrive en ligne ;
//  · rich_text — petit/normal/grand s'applique aussi sur la page publiée, sur une
//    échelle qui respecte le plancher de lisibilité de 12 px ;
//  · about (« Lire la suite ») et embed_block (« Type ») — deux réglages qui ne
//    configuraient rien publiquement : retirés du panneau, et l'aperçu cesse de
//    dessiner le bouton et le libellé qui n'existeraient jamais.

describe("l'aperçu de l'éditeur ne promet rien que la page publiée ne tienne", () => {
  it("les deux renderers couvrent le même nombre de blocs", () => {
    expect(Object.keys(editeur).length).toBe(Object.keys(publique).length)
    expect(legacy.length).toBeGreaterThan(30)   // sinon ce test ne garde presque rien
  })

  it("aucun nouveau réglage visible seulement dans l'éditeur", () => {
    const trouves: Record<string, string[]> = {}
    // Un bloc retiré du choix ne promet plus rien : il sort de la règle.
    for (const type of legacy.filter(t => !masques.has(t))) {
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
  it("aucun bloc encore proposé ne rend `null` sans condition en ligne", () => {
    const muets = legacy
      .filter(t => /case "[a-z_0-9]+": return null\s*$/m.test(publique[t].trim()))
      .filter(t => !masques.has(t))
    expect(muets.sort()).toEqual([])
  })

  it("qr_code_block est bien retiré du choix, mais sa définition est conservée", () => {
    // Les pages qui en contiennent déjà un continuent de fonctionner.
    expect(masques.has("qr_code_block")).toBe(true)
    expect(defs).toContain('label: "Bloc QR Code"')
  })

  it("rien d'autre n'a été masqué au passage", () => {
    expect([...masques]).toEqual(["qr_code_block"])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// L'AUTRE SENS — ce que la page publie et que l'aperçu ne montre pas.
//
// Le contrôle ci-dessus ne regardait qu'une direction : l'éditeur promet, le
// public ne tient pas. Écrit le 6 septembre au soir, en cherchant ce que ce
// contrôle ne pouvait pas voir. Le sens inverse existe aussi, et il est tout
// aussi contraire à la promesse d'un WYSIWYG : le commerçant publie alors du
// contenu qu'il n'a jamais vu. `call_button` en avait fourni la preuve — son
// sous-titre (« 7j/7 de 9h à 19h ») était servi au visiteur et absent de
// l'aperçu ; il a fallu le trouver à la main.
//
// Deux familles sont EXCLUES parce qu'elles sont voulues, pas subies :
//  · les destinations de lien (`url`, `cta_url`, `channel_url`…) : l'aperçu rend
//    des boutons inertes, il n'a donc aucune raison de lire l'adresse ;
//  · la logique propre à la page en ligne (`start_date`/`end_date` d'une annonce
//    programmée, `show_deadline` d'un formulaire) : elle n'a pas de sens dans un
//    canvas d'édition.
const DESTINATION_DE_LIEN = /(?:^|_)url$|^url$/
const LOGIQUE_PUBLIQUE = new Set(["start_date", "end_date", "show_deadline"])

// Écarts inverses connus, chacun un choix assumé et non un oubli.
const ECARTS_INVERSES_CONNUS: Record<string, string[]> = {
  // La description part dans le fichier d'agenda que le visiteur télécharge ;
  // elle ne s'affiche nulle part, donc l'aperçu n'a rien à en montrer.
  add_to_calendar: ["description"],
  // Un carrousel qui défile tout seul pendant qu'on compose la page serait
  // insupportable : l'aperçu montre la première image, fixe.
  image_carousel: ["auto_play"],
  // La fiche produit publique affiche la description sous le prix ; l'aperçu
  // n'en a pas la place et s'arrête au nom et au prix.
  product: ["description"],
  // Ces deux champs ne s'AFFICHENT pas : ils décident si la fiche de contact a
  // quelque chose à enregistrer. L'aperçu applique la même règle depuis ce soir
  // (voir hasPublishableContent("vcard")), il ne les dessine simplement pas.
  vcard: ["email", "phone"],
}

describe("l'aperçu montre tout ce que la page publiée affichera", () => {
  it("aucun réglage visible seulement en ligne", () => {
    const trouves: Record<string, string[]> = {}
    for (const type of legacy.filter(t => !masques.has(t))) {
      const e = champsLus(texteEditeur(type))
      const p = champsLus(texteePublic(type))
      const offerts = champsOfferts(type)
      const seuls = [...p.directs]
        .filter(f => !e.directs.has(f))
        .filter(f => ![...e.prefixes].some(pref => f.startsWith(pref)))
        .filter(f => offerts.has(f))
        .filter(f => !DESTINATION_DE_LIEN.test(f) && !LOGIQUE_PUBLIQUE.has(f))
        .sort()
      if (seuls.length) trouves[type] = seuls
    }
    expect(trouves).toEqual(ECARTS_INVERSES_CONNUS)
  })

  it("les exclusions restent des exclusions, pas un tapis sous lequel balayer", () => {
    // Si ces deux filtres devenaient trop larges, le contrôle ne verrait plus rien.
    expect(DESTINATION_DE_LIEN.test("cta_url")).toBe(true)
    expect(DESTINATION_DE_LIEN.test("url")).toBe(true)
    expect(DESTINATION_DE_LIEN.test("sub"), "un sous-titre n'est pas une destination").toBe(false)
    expect(DESTINATION_DE_LIEN.test("columns_mobile")).toBe(false)
    expect(DESTINATION_DE_LIEN.test("position")).toBe(false)
    expect(LOGIQUE_PUBLIQUE.size).toBeLessThan(5)
  })

  it("les quatre écarts redressés ce soir-là ne reviennent pas", () => {
    const preview = lire("builderPreview.tsx")
    expect(preview, "gallery : l'aperçu doit montrer les colonnes MOBILE").toContain("c.columns_mobile")
    expect(preview, "sticky_bar : la position haut/bas").toContain('c.position === "top" ? "haut" : "bas"')
    expect(preview, "media_before_after : le mode curseur").toContain('c.mode === "slider"')
    expect(preview, "vcard : invisible en ligne sans nom, téléphone ni e-mail").toContain('hasPublishableContent("vcard", c)')
  })
})

