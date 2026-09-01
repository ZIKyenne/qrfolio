// =============================================================================
// print-studio/apercuMobile.ts — place l'aperçu dans la bande que la feuille laisse
// -----------------------------------------------------------------------------
// Sur mobile, les réglages vivent dans une feuille ancrée en bas de l'écran.
// L'aperçu, lui, gardait une taille FIXE (320 × 400) quelle que soit la hauteur
// de cette feuille. Deux défauts qui se voyaient à l'œil nu :
//
//  · feuille ouverte : le bas du support passait DERRIÈRE la feuille. On réglait
//    « Taille du QR » et « Pastille » sans jamais voir le QR — les deux réglages
//    dont l'unique raison d'être est de regarder le résultat.
//  · feuille fermée : ~450 px de noir sous l'aperçu, collé en haut de l'écran.
//
// Ici, un seul calcul : quelle hauteur reste-t-il VRAIMENT au-dessus de la
// feuille, et quelle boîte tient dedans. Fonctions pures → testables sans DOM.
// =============================================================================

/** Ligne « ← Bibliothèque · nom du support » au-dessus de l'aperçu. */
export const HAUT_ENTETE_MOBILE = 52
/** Barre d'action ancrée : rangée d'onglets + rangée statut/export + marges. */
export const HAUT_BARRE_MOBILE = 122
/** Sous cette hauteur, l'aperçu ne dit plus rien : on ne descend pas plus bas. */
export const BANDE_MINIMALE = 120
/** Légende sous l'aperçu (« À poser sur la table — taille réelle… »). */
export const HAUT_LEGENDE = 30
/** L'aperçu ne s'étale pas jusqu'aux bords : marge latérale sur chaque côté. */
export const MARGE_LATERALE = 12

/**
 * Hauteur utile pour l'aperçu, en pixels.
 *
 * @param hauteurEcran hauteur visible (visualViewport de préférence)
 * @param feuilleOuverte la feuille de réglages est-elle déployée
 * @param feuilleVh sa hauteur, en % de l'écran (40 / 66 / 90)
 */
export function bandeApercuMobile(hauteurEcran: number, feuilleOuverte: boolean, feuilleVh: number): number {
  if (!Number.isFinite(hauteurEcran) || hauteurEcran <= 0) return BANDE_MINIMALE
  // Feuille ouverte : elle est ancrée en bas et masque `feuilleVh` % de l'écran ;
  // la barre d'action flotte AU-DESSUS d'elle, elle ne retire donc rien de plus.
  // Feuille fermée : seule la barre d'action mange le bas.
  const dispo = feuilleOuverte
    ? hauteurEcran * (1 - Math.min(100, Math.max(0, feuilleVh)) / 100)
    : hauteurEcran - HAUT_BARRE_MOBILE
  return Math.max(BANDE_MINIMALE, Math.round(dispo - HAUT_ENTETE_MOBILE))
}

/**
 * Largeur en deçà de laquelle le rendu casse. Un support très portrait (le
 * roll-up : 850 × 2000, ratio 0,42) devient si étroit dans une bande courte que
 * le moteur de QR refuse de dessiner — « The canvas is too small », page en
 * erreur. Le support descend jusqu'ici, pas plus bas : mieux vaut un aperçu qui
 * dépasse un peu qu'un aperçu qui plante.
 */
export const LARGEUR_MINIMALE_SUPPORT = 168

/**
 * Boîte maximale de l'aperçu dans cette bande. La largeur suit l'écran (un
 * support carré ou rond sur un téléphone est limité par la largeur, jamais par
 * la hauteur) ; la hauteur laisse la place à la légende.
 */
export function boiteApercuMobile(bande: number, largeurEcran: number): { boxW: number; boxH: number } {
  const boxW = Math.max(160, Math.round(largeurEcran - MARGE_LATERALE * 2))
  // La légende ne prend de la place que si elle est affichée — sinon on retirait
  // 30 px à une bande déjà courte, et le support débordait pour rien.
  const boxH = Math.max(110, Math.round(bande - (legendeVisible(bande) ? HAUT_LEGENDE : 0)))
  return { boxW, boxH }
}

/**
 * Dimensions FINALES du support dans la bande, ratio compris.
 *
 * @param ratio largeur / hauteur du support (rond = 1)
 * @returns `w`/`h` en pixels et `deborde` = la bande était trop courte, le
 *          support a été maintenu à sa taille minimale et sera rogné.
 */
export function dimensionsApercuMobile(
  bande: number, largeurEcran: number, ratio: number,
): { w: number; h: number; deborde: boolean } {
  const r = Number.isFinite(ratio) && ratio > 0 ? ratio : 1
  const { boxW, boxH } = boiteApercuMobile(bande, largeurEcran)
  let w = r >= 1 ? boxW : boxH * r
  let h = r >= 1 ? boxW / r : boxH
  if (h > boxH) { h = boxH; w = h * r }
  if (w > boxW) { w = boxW; h = w / r }
  // Plancher de lisibilité — jamais au-delà de la largeur de l'écran, sinon on
  // remplacerait un plantage par un débordement horizontal.
  if (w < LARGEUR_MINIMALE_SUPPORT) {
    w = Math.min(boxW, LARGEUR_MINIMALE_SUPPORT)
    h = w / r
  }
  return { w: Math.round(w), h: Math.round(h), deborde: h > boxH + 1 }
}

/**
 * La légende sous l'aperçu mérite-t-elle sa place ? Dans une bande courte, elle
 * vole des pixels au seul élément qu'on est venu regarder.
 */
export function legendeVisible(bande: number): boolean {
  return bande >= 220
}

/**
 * Une feuille ne monte jamais au point de faire disparaître le support.
 *
 * Le roll-up (850 × 2000) illustre le problème : maintenu à sa largeur minimale
 * il fait ~395 px de haut, alors qu'une feuille à 66 % n'en laisse que 235. Le
 * support était rogné pile là où se trouve le QR — on réglait sa taille sur une
 * bande blanche. Plutôt que de rogner, on limite la MONTÉE de la feuille : elle
 * s'arrête là où le support tient encore en entier.
 *
 * @returns la hauteur maximale de la feuille, en % de l'écran.
 */
export const VH_FEUILLE_MINIMALE = 38
export const VH_FEUILLE_MAXIMALE = 90

export function vhFeuilleMax(hauteurEcran: number, largeurEcran: number, ratio: number): number {
  const r = Number.isFinite(ratio) && ratio > 0 ? ratio : 1
  if (!Number.isFinite(hauteurEcran) || hauteurEcran <= 0) return VH_FEUILLE_MAXIMALE
  const largeur = Math.min(Math.max(160, largeurEcran - MARGE_LATERALE * 2), LARGEUR_MINIMALE_SUPPORT)
  const hauteurSupport = largeur / r
  // On réserve TOUJOURS la place de la légende dans le calcul du plafond : si
  // elle finit masquée (bande courte), la bande est simplement plus généreuse
  // que nécessaire — jamais l'inverse.
  const bandeNecessaire = hauteurSupport + HAUT_LEGENDE + HAUT_ENTETE_MOBILE
  const vh = (1 - bandeNecessaire / hauteurEcran) * 100
  return Math.min(VH_FEUILLE_MAXIMALE, Math.max(VH_FEUILLE_MINIMALE, Math.floor(vh)))
}
