// ─────────────────────────────────────────────────────────────────────────────
// DU CONTENU DE VRAI COMMERÇANT, PAS DU CONTENU DE DÉMO
//
// Les 20 modèles portent des textes calibrés au caractère près : « Foie gras
// poêlé », « Chutney de figues ». Personne n'écrit comme ça. Un vrai
// utilisateur tape le nom complet du plat, colle une URL entière, oublie une
// photo, ou met son enseigne en majuscules. Ces quatre épreuves rejouent la
// même page avec ce contenu-là — c'est là que les mises en page cèdent.
//
// Fonctions pures, testées à part : aucune dépendance au rendu.
// ─────────────────────────────────────────────────────────────────────────────

export type Epreuve = "long" | "colle" | "vide" | "majuscules"

export const EPREUVES: Epreuve[] = ["long", "colle", "vide", "majuscules"]

/** Une phrase longue mais normale — ce qu'écrit quelqu'un qui décrit son plat. */
const PHRASE_LONGUE =
  "Tartare de saumon de l'Atlantique mariné aux agrumes, aneth frais et huile d'olive de première pression à froid"

/** Un mot que rien ne peut couper : URL collée, e-mail, référence produit. */
const MOT_COLLE = "https://www.mon-tres-long-nom-de-restaurant-a-paris.example.com/reservation?source=qr&table=12"

/**
 * Réécrit une valeur de contenu selon l'épreuve.
 * Les clés techniques (URL, couleurs, modes, oui/non) sont laissées intactes :
 * les tordre testerait le parseur, pas la mise en page.
 */
export function valeurEprouvee(cle: string, valeur: unknown, epreuve: Epreuve): unknown {
  if (typeof valeur !== "string") return valeur
  if (estCleTechnique(cle)) return valeur
  switch (epreuve) {
    case "long":       return PHRASE_LONGUE
    case "colle":      return MOT_COLLE
    case "vide":       return ""
    case "majuscules": return valeur.toLocaleUpperCase("fr-FR")
  }
}

/**
 * Clés dont la valeur pilote un comportement, pas un affichage.
 * Les noms portent souvent un indice : `img1`, `m1_photo`, `d2_url`. Il faut
 * donc tolérer les chiffres autour du mot, sans quoi `img1` passe pour du texte
 * et l'épreuve remplace une URL d'image par une phrase.
 */
export function estCleTechnique(cle: string): boolean {
  const mots = "url|link|href|img|image|photo|video|embed|icon|color|accent|banner|cover|avatar|logo"
  if (new RegExp(`(^|_)\\d*(${mots})\\d*($|_)`).test(cle)) return true
  if (/^(mode|layout|style|type|network|target|align|density|shape|variant)$/.test(cle)) return true
  if (/_(type|mode|style|layout)$/.test(cle)) return true
  return false
}

/** Applique l'épreuve à tout le contenu d'un bloc. */
export function contenuEprouve(contenu: Record<string, unknown>, epreuve: Epreuve): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(contenu)) out[k] = valeurEprouvee(k, v, epreuve)
  return out
}

/** L'épreuve « vide » retire aussi les images : une page sans aucun visuel. */
export function sansImages(contenu: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(contenu)) {
    out[k] = /(^|_)\d*(img|image|photo|avatar|banner|cover|logo)\d*($|_)/.test(k) ? "" : v
  }
  return out
}

/**
 * Injecte de vraies photos dans les champs d'image d'un bloc.
 *
 * Les clés viennent de la DÉFINITION du bloc (`type: "image"`), pas d'une
 * devinette sur les noms : aucun modèle de la galerie ne renseigne d'image, donc
 * il n'y a rien à remplacer — il faut savoir quels champs EXISTENT. 112 champs
 * d'image sont déclarés dans les définitions de blocs ; c'est la seule liste
 * qui fasse foi.
 */
export function avecImages(contenu: Record<string, unknown>, clesImages: string[], depart = 1): Record<string, unknown> {
  const out: Record<string, unknown> = { ...contenu }
  let n = depart
  for (const k of clesImages) {
    const [w, h] = formatPour(k)
    // Dimensions dans le chemin : l'optimiseur de Next refuse une adresse
    // source locale qui porte une chaîne de requête.
    out[k] = `/e2e-harness/photo/${w}x${h}-${n++}.png`
  }
  return out
}

/**
 * Le format compte : une bannière est panoramique, un avatar est carré. Servir
 * du 4:3 partout masquerait les défauts de mise en page propres à chaque forme.
 */
export function formatPour(cle: string): [number, number] {
  if (/avatar|logo/.test(cle)) return [800, 800]
  if (/banner|cover/.test(cle)) return [1600, 600]
  return [1600, 1200]
}
