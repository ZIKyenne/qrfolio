// Quelle taille imprimer un QR code.
//
// Deux contraintes se superposent, et ce sont rarement les mêmes qui limitent :
//
//   1. La DISTANCE de lecture. Règle de terrain retenue par les fabricants de
//      lecteurs : le côté du code fait environ un dixième de la distance à
//      laquelle on veut le scanner. Ce n'est pas une norme, c'est une marge de
//      sécurité — on l'écrit tel quel à l'écran.
//
//   2. La TAILLE D'UN MODULE une fois imprimé. Un code qui contient beaucoup de
//      texte a plus de modules ; à côté égal, chaque module devient plus petit.
//      En dessous d'environ 0,4 mm, l'encre bave, les modules se touchent et les
//      téléphones décrochent — quelle que soit la distance de lecture.
//
// L'outil calcule les deux et dit laquelle des deux commande.

/** Côté d'un module en dessous duquel l'impression devient hasardeuse (mm). */
export const MODULE_MINIMUM_MM = 0.4

/** Aucun QR code imprimé en dessous de ce côté, même pour une lecture de près. */
export const COTE_PLANCHER_MM = 20

/** Rapport côté / distance de lecture. Un code lu à 30 cm fait ~3 cm. */
export const RAPPORT_DISTANCE = 10

/** Nombre de modules d'un QR code selon sa version (1 à 40). */
export function modulesDeLaVersion(version: number): number {
  return 21 + (Math.min(40, Math.max(1, Math.round(version))) - 1) * 4
}

/**
 * Version de QR code nécessaire pour un contenu d'une longueur donnée, en
 * correction d'erreur M (le réglage courant). Les paliers viennent des tables
 * de capacité de la norme ISO 18004 — on reste volontairement prudent : on
 * choisit la version qui tient large.
 */
export function versionPourContenu(nbCaracteres: number): number {
  const n = Math.max(0, Math.round(nbCaracteres))
  const paliers: [number, number][] = [
    [20, 1], [38, 2], [61, 3], [90, 4], [122, 5], [154, 6], [178, 7],
    [221, 8], [262, 9], [311, 10], [366, 11], [419, 12], [483, 13], [528, 14],
  ]
  for (const [limite, version] of paliers) if (n <= limite) return version
  return 15
}

export type Contrainte = "distance" | "definition" | "plancher"

export type Calcul = {
  /** Côté conseillé du carré imprimé, en millimètres. */
  coteMm: number
  /** Taille d'un module à cette échelle, en millimètres. */
  moduleMm: number
  /** Nombre de modules du code. */
  modules: number
  /** Ce qui commande la taille finale. */
  contrainte: Contrainte
  /** Phrase qui explique la contrainte, en français, sans jargon. */
  explication: string
}

const arrondi = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d

/**
 * Côté minimal conseillé pour un code de `modules` modules lu à `distanceCm`.
 * On prend la plus contraignante des trois exigences.
 */
export function calculerTaille(distanceCm: number, modules: number): Calcul {
  const d = Math.max(1, distanceCm)
  const m = Math.max(21, Math.round(modules))

  const parDistance = (d * 10) / RAPPORT_DISTANCE
  const parDefinition = m * MODULE_MINIMUM_MM
  const cote = Math.max(parDistance, parDefinition, COTE_PLANCHER_MM)

  const contrainte: Contrainte =
    cote === parDefinition && parDefinition > parDistance && parDefinition > COTE_PLANCHER_MM ? "definition"
    : cote === COTE_PLANCHER_MM && COTE_PLANCHER_MM > parDistance && COTE_PLANCHER_MM > parDefinition ? "plancher"
    : "distance"

  const explication =
    contrainte === "definition"
      ? "C'est la quantité de contenu qui commande : votre code a beaucoup de carrés, il faut cette taille pour qu'aucun ne descende sous le seuil d'impression."
      : contrainte === "plancher"
      ? "En dessous de 2 cm de côté, un QR code devient capricieux même lu de tout près. On ne descend pas plus bas."
      : "C'est la distance de lecture qui commande : à cette distance, l'appareil photo a besoin de ce côté-là pour voir les carrés."

  return {
    coteMm: Math.ceil(cote),
    moduleMm: arrondi(cote / m, 2),
    modules: m,
    contrainte,
    explication,
  }
}

/** Jusqu'à quelle distance un code de ce côté se lit-il ? */
export function distanceMaximaleCm(coteMm: number): number {
  return Math.max(0, Math.round((Math.max(0, coteMm) * RAPPORT_DISTANCE) / 10))
}

export type Support = {
  cle: string
  nom: string
  /** Distance de lecture typique, en centimètres. */
  distanceCm: number
  note: string
}

/**
 * Distances de lecture typiques par support. Ce sont des ordres de grandeur
 * observables, pas des mesures : on les présente comme des points de départ.
 */
export const SUPPORTS: Support[] = [
  { cle: "carte", nom: "Carte de visite", distanceCm: 20, note: "On la tient en main." },
  { cle: "menu", nom: "Menu ou chevalet de table", distanceCm: 30, note: "Posé sur la table, on se penche." },
  { cle: "flyer", nom: "Flyer ou dépliant", distanceCm: 30, note: "Tenu à bout de bras." },
  { cle: "sous_bock", nom: "Sous-bock", distanceCm: 30, note: "Sur la table, à côté du verre." },
  { cle: "vitrine", nom: "Vitrine", distanceCm: 60, note: "On s'approche du verre, mais pas au contact." },
  { cle: "affichette", nom: "Affichette A5 ou A4", distanceCm: 100, note: "Sur un mur, à hauteur d'yeux." },
  { cle: "affiche", nom: "Affiche A2 ou A1", distanceCm: 200, note: "On la lit en passant." },
  { cle: "kakemono", nom: "Kakémono ou stand", distanceCm: 300, note: "Dans un salon, depuis l'allée." },
  { cle: "vehicule", nom: "Véhicule ou panneau", distanceCm: 500, note: "Le code doit se lire à l'arrêt, jamais en roulant." },
]

/** Le support par sa clé, ou undefined. */
export function support(cle: string): Support | undefined {
  return SUPPORTS.find(s => s.cle === cle)
}
