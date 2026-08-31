// Faire tenir le contenu dans le support — au lieu de le couper.
//
// LE DÉFAUT. Toutes les tailles du Print Studio sont des fractions du support
// (titre = 0,11 · sous-titre = 0,05 · QR = 0,44 sur un rond, etc.). Elles ne sont
// JAMAIS confrontées à la place réellement disponible. Sur un sticker rond de
// 50 mm, le contenu d'un modèle demande environ 0,94 fois le diamètre alors que
// le carré inscrit n'en offre que 0,70 :
//
//   titre 0,112 + sous-titre 0,063 + QR (avec pastille ronde) 0,540
//   + bouton 0,130 + trois écarts 0,096  =  0,941   pour 0,70 disponible
//
// Le bloc est centré verticalement et le conteneur coupe ce qui dépasse : le
// surplus est retiré MOITIÉ EN HAUT, MOITIÉ EN BAS. D'où le titre tranché net
// par le bord haut, et le bouton mangé par le bas — sans le moindre avertissement.
//
// CE QUE FAIT CE MODULE. Il calcule le budget vertical et, s'il ne tient pas,
// rend un facteur de réduction. L'ordre de sacrifice n'est pas neutre :
//
//   1. les TEXTES rétrécissent en premier, jusqu'à 62 % — en dessous, un titre
//      n'est plus un titre ;
//   2. le QR ne rétrécit qu'ENSUITE, et jamais sous sa taille minimale lisible :
//      un QR trop petit ne se scanne pas, et c'est la seule chose que le support
//      doit absolument faire ;
//   3. si ça ne tient toujours pas, on le DIT (`déborde`) au lieu de couper en
//      silence — le contrôle avant impression peut alors l'afficher.

/** Hauteurs demandées, exprimées comme le rendu : en fractions du support. */
export type BesoinContenu = {
  /** Nom affiché au-dessus du titre. 0 s'il est absent (cas des ronds). */
  marque: number
  /** Hauteur d'UNE ligne de titre. Le nombre de lignes est calculé à part. */
  ligneTitre: number
  lignesTitre: number
  sousTitre: number
  /** Côté du QR, pastille comprise. */
  qr: number
  bouton: number
  /** Écart entre deux blocs. */
  ecart: number
}

export type Ajustement = {
  /** Multiplicateur à appliquer aux textes et aux écarts (≤ 1). */
  k: number
  /** Côté du QR après ajustement (≤ besoin.qr). */
  qr: number
  /** Vrai si, même au minimum, le contenu ne rentre pas. */
  deborde: boolean
}

/** En dessous, un texte n'est plus lisible à la distance prévue. */
export const REDUCTION_TEXTE_MIN = 0.62
/** Le QR ne descend jamais sous cette part de sa taille demandée. */
export const REDUCTION_QR_MIN = 0.72

/** Nombre de blocs présents, donc d'écarts entre eux. */
function nbEcarts(b: BesoinContenu): number {
  const blocs = [b.marque, b.lignesTitre > 0 ? b.ligneTitre : 0, b.sousTitre, b.qr, b.bouton].filter(v => v > 0).length
  return Math.max(0, blocs - 1)
}

/** Hauteur totale demandée, avant tout ajustement. */
export function hauteurDemandee(b: BesoinContenu): number {
  return b.marque + b.ligneTitre * b.lignesTitre + b.sousTitre + b.qr + b.bouton + b.ecart * nbEcarts(b)
}

/**
 * Combien de lignes ce titre occupera-t-il ?
 *
 * Estimation, pas une mesure : le rendu n'est pas encore fait quand on décide des
 * tailles. Une capitale de titre fait en moyenne ~0,54 fois sa hauteur de police ;
 * l'erreur d'une demi-ligne est absorbée par la marge de sécurité du support.
 */
export const LARGEUR_CARACTERE = 0.54

export function lignesDeTitre(texte: string, taillePolice: number, largeurDispo: number): number {
  const t = (texte || "").trim()
  if (!t) return 0
  if (taillePolice <= 0 || largeurDispo <= 0) return 1
  const parMot = t.split(/\s+/)
  const parLigne = Math.max(1, Math.floor(largeurDispo / (taillePolice * LARGEUR_CARACTERE)))
  // Retour à la ligne par MOT, comme le navigateur : « Marché des créateurs » sur
  // douze caractères par ligne fait trois lignes, pas deux.
  let lignes = 1, reste = parLigne
  for (const mot of parMot) {
    const l = mot.length
    if (l > parLigne) { lignes += Math.ceil(l / parLigne); reste = parLigne - (l % parLigne || parLigne); continue }
    if (l > reste) { lignes++; reste = parLigne - l - 1 }
    else reste -= l + 1
  }
  return lignes
}

/**
 * Le contenu tient-il, et sinon de combien faut-il le réduire ?
 * `dispo` et les champs de `besoin` sont dans la même unité (fraction du support).
 */
export function ajusterAuSupport(besoin: BesoinContenu, dispo: number): Ajustement {
  const demande = hauteurDemandee(besoin)
  if (dispo <= 0) return { k: 1, qr: besoin.qr, deborde: true }
  if (demande <= dispo) return { k: 1, qr: besoin.qr, deborde: false }

  const textes = demande - besoin.qr
  // 1) Réduire les textes, le QR intact.
  const kBrut = textes > 0 ? (dispo - besoin.qr) / textes : 1
  const k = Math.min(1, Math.max(REDUCTION_TEXTE_MIN, kBrut))
  const restant = dispo - textes * k
  if (besoin.qr <= restant) return { k, qr: besoin.qr, deborde: false }

  // 2) Le QR cède à son tour, mais pas en dessous du minimum lisible.
  const qrMin = besoin.qr * REDUCTION_QR_MIN
  const qr = Math.max(qrMin, restant)
  return { k, qr, deborde: textes * k + qr > dispo + 1e-9 }
}
