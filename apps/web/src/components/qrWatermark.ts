// Géométrie du filigrane d'aperçu — module PUR, testable sans navigateur.
//
// Ce qu'il y avait avant : un flou plein cadre + un voile blanc + onze rangées de
// « QROWG » en travers. C'était efficace (illisible) et détestable : on ne voyait
// plus ni les couleurs, ni la forme des modules, ni le logo — c'est-à-dire tout ce
// qu'on vient de régler. Le filigrane cachait le travail au lieu de le protéger.
//
// Ce qu'il y a maintenant : UN ruban, posé sur la diagonale bas-gauche → haut-droite.
// Le reste du QR reste net, en vraies couleurs.
//
// Pourquoi cette diagonale exactement : un QR se repère à ses trois « yeux »
// (motifs de détection), placés en haut-gauche, haut-droite et bas-gauche. Leurs
// centres sont à la même distance des deux bords — autrement dit les yeux
// bas-gauche et haut-droite sont posés PILE sur cette diagonale, quelle que soit la
// version du code. Un ruban centré dessus en efface donc deux sur trois : aucun
// lecteur ne peut plus cadrer le symbole, et aucune correction d'erreur ne rattrape
// une détection qui n'a pas eu lieu (elle répare des données, pas un repérage).
// L'œil haut-gauche, lui, reste visible : on voit le style de coin choisi.

/** Hauteur du ruban, en fraction du côté du QR. */
export const RIBBON_RATIO = 0.26

/** En dessous de cette taille, le texte serait illisible : ruban nu. */
export const TEXT_MIN_SIZE = 110

export type WatermarkGeometry = {
  /** Côté utilisé pour les calculs (borné : une vignette minuscule reste cohérente). */
  side: number
  /** Hauteur du ruban en px. */
  band: number
  /** Demi-hauteur : distance couverte de part et d'autre de la diagonale. */
  half: number
  /** Taille du texte porté par le ruban (0 = pas de texte). */
  fontSize: number
  /** Interlettrage du texte. */
  letterSpacing: number
  /** Le ruban porte-t-il un libellé ? */
  withText: boolean
}

export function watermarkGeometry(size: number): WatermarkGeometry {
  const side = Math.max(24, Math.round(size || 0))
  const band = Math.round(side * RIBBON_RATIO)
  const withText = side >= TEXT_MIN_SIZE
  const fontSize = withText ? Math.max(9, Math.min(14, Math.round(side / 17))) : 0
  return {
    side,
    band,
    half: band / 2,
    fontSize,
    letterSpacing: withText ? Math.max(1, Math.round(fontSize / 6)) : 0,
    withText,
  }
}

/**
 * Le ruban efface-t-il le cœur des deux yeux qu'il traverse ?
 *
 * Repères : l'image fait `size` px, dont `margin` px de marge blanche de chaque
 * côté ; le QR lui-même compte `moduleCount` modules (21 pour une version 1, 177
 * pour une version 40). Un œil occupe 7 modules ; son cœur plein en fait 3.
 *
 * Le centre de l'œil bas-gauche est à `margin + 3.5 module` des deux bords : il est
 * donc sur la diagonale, à distance nulle du ruban. Le point du cœur le plus
 * éloigné de cet axe est à 1,5 module en diagonale, soit 1,5 × √2 modules.
 */
export function hidesFinderCore(size: number, moduleCount: number, margin = 10): boolean {
  const { half } = watermarkGeometry(size)
  const qr = Math.max(1, size - margin * 2)
  const module = qr / Math.max(1, moduleCount)
  return half >= 1.5 * Math.SQRT2 * module
}
