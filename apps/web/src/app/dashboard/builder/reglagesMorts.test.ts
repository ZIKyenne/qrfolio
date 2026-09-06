import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { BLOCK_DEFS } from "./blockDefs"

// ═══════════════════════════════════════════════════════════════════════════════
// RÉGLAGES MORTS — un champ proposé au commerçant que PERSONNE ne lit.
//
// Écrit le 6 septembre, après en avoir trouvé cinq à la main. Le pire :
// `quote_form.email_dest` et `booking_request.email_dest`, deux champs intitulés
// « Email destinataire » et « Email de contact booking ». Un artisan qui routait
// ses devis vers devis@son-entreprise.fr ne recevait rien à cette adresse — et ne
// pouvait pas s'en apercevoir, puisque les demandes arrivaient quand même,
// ailleurs, sur l'adresse du compte. Ce n'est pas un écart d'affichage : c'est
// une promesse du produit qui ne tenait pas.
//
// Le principe est celui d'apercuFidele.test.ts, poussé d'un cran : ce dernier
// compare l'aperçu et la page publiée, donc il ne voit rien quand AUCUN des deux
// ne lit le champ. Ici on part de ce que le panneau de réglages promet, et on
// vérifie que quelque chose, quelque part, le lit.
//
// DEUX ANGLES MORTS connus, à garder en tête plutôt qu'à croire couverts :
//
//  1. un champ lu puis JETÉ. `packs` extrayait pack1_url dans un tableau sans
//     jamais s'en servir : pour ce contrôle, la clé est « lue ».
//  2. un champ lu par un AUTRE bloc. La recherche porte sur tout le dépôt, donc
//     `platform` — que lit `payment_button` — passait pour lu partout, alors que
//     `booking_button`, `table_booking` et `order_online` proposaient le même
//     réglage et l'ignoraient : le commerçant choisissait « TheFork » ou
//     « Uber Eats » et rien ne changeait.
//
// Poser la question bloc par bloc demande une vraie résolution de modules (les
// vues passent par des modèles, qui passent par d'autres fichiers) ; sans elle,
// le contrôle produirait surtout du bruit. Les six cas ci-dessus ont donc été
// trouvés à la main, et le dernier bloc de ce fichier les fige un par un.
//
// Ce contrôle ne remplace pas la lecture du code ; il empêche la régression franche.
// ═══════════════════════════════════════════════════════════════════════════════

const ICI = dirname(fileURLToPath(import.meta.url))
const APP = join(ICI, "..", "..")               // src/app

function sources(racine: string): string[] {
  const out: string[] = []
  const marcher = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) { if (n !== "node_modules") marcher(p); continue }
      if (!/\.tsx?$/.test(n) || /\.test\./.test(n) || n === "blockDefs.ts") continue
      out.push(readFileSync(p, "utf8"))
    }
  }
  marcher(racine)
  return out
}

// Tout ce qui peut lire le contenu d'un bloc : l'éditeur, la page publiée, le
// renderer partagé, et les modules communs (types.ts, générateur de vCard,
// notification des demandes…).
const FICHIERS = [
  ...sources(join(APP, "dashboard", "builder")),
  ...sources(join(APP, "[slug]")),
  ...sources(join(APP, "api")),
  ...sources(join(APP, "..", "lib")),
]
const TOUT = FICHIERS.join("\n")

// Certains blocs ne nomment jamais leurs champs : `social_links` (63 réseaux),
// `music_links` et `podcast_links` parcourent une TABLE de plateformes et lisent
// le contenu par clé variable — `[["apple_music", …]].filter(([k]) => c[k])`.
// Un fichier qui indexe dynamiquement le contenu ET qui cite la clé en toutes
// lettres la lit bel et bien.
const INDEXATION_DYNAMIQUE = /\b(?:c|content|src|cc)\s*(?:as any\s*)?\[\s*[a-zA-Z_$]/
const FICHIERS_A_TABLE = FICHIERS.filter(f => INDEXATION_DYNAMIQUE.test(f) || /\[\s*\[\s*"/.test(f))

function lu(cle: string, corpus = TOUT): boolean {
  // 1) accès par point : c.cle, src?.cle, content.cle — jamais une clé d'objet littéral.
  if (new RegExp(`[?.]\\s*${echap(cle)}\\b(?!\\s*:)`).test(corpus)) return true
  // 2) accès par crochets : ["cle"] ou [`cle`]
  if (new RegExp("\\[\\s*[`\"']" + echap(cle) + "[`\"']\\s*\\]").test(corpus)) return true
  // 3) gabarit indexé : pack3_url lu via `pack${i}_url`
  const indexe = echap(cle).replace(/\d+/, "\\$\\{[^}]+\\}")
  if (indexe !== echap(cle) && new RegExp("`[^`]*" + indexe + "[^`]*`").test(corpus)) return true
  // 4) préfixe variable : l_emoji lu via `${p}_emoji`
  const m = /^([a-z])_(.+)$/.exec(cle)
  if (m && new RegExp("`\\$\\{[^}]+\\}_" + echap(m[2]) + "`").test(corpus)) return true
  // 5) table de plateformes : la clé est citée dans un fichier qui indexe le
  //    contenu par clé variable.
  if (corpus === TOUT) {
    const cite = new RegExp("[\"'`]" + echap(cle) + "[\"'`]")
    if (FICHIERS_A_TABLE.some(f => cite.test(f))) return true
  }
  return false
}
const echap = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Réglages morts encore tolérés, avec la raison. Cette liste ne doit que
// RÉTRÉCIR : chaque entrée est une promesse faite au commerçant et non tenue.
// Vide au 6 septembre : les cinq réglages morts trouvés ce jour-là sont honorés.
// Le mécanisme reste, pour qu'un cas légitime puisse être documenté plutôt que
// simplement ignoré — mais chaque entrée est une promesse non tenue.
const TOLERES: Record<string, string> = {}

describe("le détecteur sait reconnaître un champ réellement lu", () => {
  // Sans ces garde-fous, une expression trop large déclarerait tout « lu » et le
  // test passerait en ne vérifiant plus rien.
  it("repère les quatre formes de lecture utilisées dans le dépôt", () => {
    expect(lu("hide_avatar"), "accès direct c.hide_avatar").toBe(true)
    expect(lu("adv1"), "gabarit `adv${i}`").toBe(true)
    expect(lu("l_emoji"), "préfixe variable `${p}_emoji`").toBe(true)
    expect(lu("handle"), "lu par paymentLink dans types.ts").toBe(true)
  })
  it("ne confond pas une clé d'objet littéral avec une lecture", () => {
    expect(lu("cle_qui_nexiste_pas", 'const x = { cle_qui_nexiste_pas: "oui" }')).toBe(false)
    expect(lu("cle_qui_nexiste_pas", "const y = c.cle_qui_nexiste_pas")).toBe(true)
  })
})

describe("chaque réglage proposé au commerçant est lu quelque part", () => {
  const morts: string[] = []
  for (const [type, def] of Object.entries(BLOCK_DEFS)) {
    for (const champ of (def as any).fields ?? []) {
      const cle = champ?.key
      if (typeof cle !== "string" || !cle) continue
      if (TOLERES[`${type}.${cle}`]) continue
      if (!lu(cle)) morts.push(`${type}.${cle} (« ${champ.label ?? cle} »)`)
    }
  }

  it("aucun réglage n'est proposé puis ignoré", () => {
    expect(morts, "réglages réglables mais lus par personne").toEqual([])
  })

  it("les cas tolérés le sont pour une raison écrite, et restent tolérés à bon droit", () => {
    for (const [ref, raison] of Object.entries(TOLERES)) {
      expect(raison.length, `${ref} : la raison doit être explicite`).toBeGreaterThan(20)
      const [type, cle] = ref.split(".")
      expect(BLOCK_DEFS[type], `${ref} : bloc inconnu, retirer l'entrée`).toBeTruthy()
      expect(lu(cle), `${ref} est désormais lu : retirez-le de la liste des tolérés`).toBe(false)
    }
  })
})

describe("les réglages redressés le 6 septembre restent branchés", () => {
  // Cinq champs proposés et lus par personne. Chacun est maintenant honoré ;
  // ces assertions nomment l'endroit exact, pour qu'un retour en arrière se voie.
  const lire = (rel: string) => readFileSync(join(APP, rel), "utf8")

  it("l'email destinataire d'un formulaire est réellement utilisé", () => {
    const notif = readFileSync(join(APP, "..", "lib", "notifierProprietaireLead.ts"), "utf8")
    // On vise l'USAGE, pas l'import : une ligne `import { destinataireDuBloc }`
    // peut rester en place alors que le destinataire est redevenu celui du compte.
    expect(notif, "la notification doit préférer l'adresse du bloc")
      .toMatch(/const to = destinataireDuBloc\(.*\?\? profile/)
    expect(lire("api/leads/route.ts"), "la route doit transmettre le bloc").toContain("blockId: base.block_id")
    expect(lire("[slug]/blocsPublics.tsx"), "le repli mailto aussi").toContain("adresseEmailValide((block.content as any)?.email_dest)")
  })

  it("le champ « délai souhaité » du devis apparaît quand il est activé", () => {
    expect(lire("[slug]/renduLegacy.tsx")).toContain('c.show_deadline === "yes"')
  })

  it("« pleine largeur » change vraiment la largeur du bouton, des deux côtés", () => {
    for (const f of ["[slug]/renduLegacy.tsx", "dashboard/builder/builderPreview.tsx"]) {
      expect(lire(f), f).toContain('c.full_width !== "no"')
    }
  })

  it("l'effectif de l'entreprise et le lien des formules sont rendus", () => {
    expect(lire("dashboard/builder/shared-renderer/models/presentationEtEncadres.ts")).toContain("src.team_size")
    expect(lire("dashboard/builder/shared-renderer/models/packsEtTarifs.ts")).toContain("pack${i}_url")
  })

  it("la plateforme choisie est annoncée au visiteur, sur les quatre blocs qui la proposent", () => {
    // external_shop l'affichait deja ; les trois autres la demandaient et
    // l'ignoraient. Meme forme partout : « via TheFork », « via Uber Eats ».
    const pub = lire("[slug]/renduLegacy.tsx")
    expect(pub.match(/via \{c\.platform\}/g) ?? [], "booking_button, table_booking, external_shop").toHaveLength(3)
    expect(lire("dashboard/builder/builderPreview.tsx").match(/via \{c\.platform\}/g) ?? []).toHaveLength(3)
    expect(lire("dashboard/builder/shared-renderer/models/orderOnline.ts"), "order_online").toContain("c.platform")
  })

  it("le titre du bloc pré-sauvegarde et celui du bloc application s'affichent", () => {
    expect(lire("dashboard/builder/shared-renderer/models/appDownload.ts")).toContain("c.label")
    for (const f of ["[slug]/renduLegacy.tsx", "dashboard/builder/builderPreview.tsx"]) {
      expect(lire(f), `presave dans ${f}`).toMatch(/\{c\.title && <p[^>]*>\{c\.title\}<\/p>\}/)
    }
  })
})
