// Faire tenir le contenu dans le support — au lieu de le couper.
//
// LE DÉFAUT. Toutes les tailles du Atelier d'impression sont des fractions du support
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
  /** Blocs retirés faute de place, dans l'ordre où on les sacrifie. */
  masquer: ("sousTitre" | "bouton")[]
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
  if (dispo <= 0) return { k: 1, qr: besoin.qr, masquer: [], deborde: true }
  if (hauteurDemandee(besoin) <= dispo) return { k: 1, qr: besoin.qr, masquer: [], deborde: false }

  // 1) Les textes rétrécissent, le QR garde la taille DEMANDÉE.
  const masquer: ("sousTitre" | "bouton")[] = []
  let b: BesoinContenu = besoin
  let k = reduireTextes(b, dispo)
  if (tient(b, k, dispo)) return { k, qr: b.qr, masquer, deborde: false }

  // 2) Toujours trop : on RETIRE des blocs plutôt que de rapetisser le QR.
  //    Le QR est la seule chose que le support doit absolument faire ; le
  //    sous-titre est décoratif, le bouton répète souvent le titre. Rapetisser
  //    le QR à leur place donnait un curseur « Taille du QR » sans effet
  //    visible : Compact, Recommandé et Maximum rendaient la même image.
  for (const bloc of ["sousTitre", "bouton"] as const) {
    if (b[bloc] <= 0) continue
    masquer.push(bloc)
    b = { ...b, [bloc]: 0 }
    k = reduireTextes(b, dispo)
    if (tient(b, k, dispo)) return { k, qr: b.qr, masquer, deborde: false }
  }

  // 3) Il ne reste que le titre et le QR : c'est au QR de céder, en dernier,
  //    et jamais sous sa taille lisible.
  const textes = hauteurDemandee(b) - b.qr
  const qr = Math.max(b.qr * REDUCTION_QR_MIN, dispo - textes * k)
  return { k, qr, masquer, deborde: textes * k + qr > dispo + 1e-9 }
}

/** Facteur de réduction des textes, à QR constant, borné au seuil de lisibilité. */
function reduireTextes(b: BesoinContenu, dispo: number): number {
  const textes = hauteurDemandee(b) - b.qr
  if (textes <= 0) return 1
  return Math.min(1, Math.max(REDUCTION_TEXTE_MIN, (dispo - b.qr) / textes))
}

function tient(b: BesoinContenu, k: number, dispo: number): boolean {
  return (hauteurDemandee(b) - b.qr) * k + b.qr <= dispo + 1e-9
}


// ── Jusqu'où le QR peut-il grandir sur ce support ? ──────────────────────────
//
// Le panneau promettait « 36 mm » sur un sticker de 50 mm, le rendu en dessinait
// 22 : la borne du curseur (72 % de la plus petite dimension) et la borne du
// rendu (44 % du diamètre) étaient deux nombres écrits à deux endroits, sans
// rapport l'un avec l'autre. Résultat, de « Compact » à « Maximum » l'image ne
// bougeait presque pas — le curseur semblait cassé, et l'étiquette mentait.
//
// Une seule formule, tirée de la géométrie, sert maintenant aux deux.

export type Pastille = "carre" | "cercle" | "aucune"

/** Marge de la pastille carrée, en fraction du support. */
export const PAD_PASTILLE_CARREE = 0.028
/** Marge de la pastille ronde, en fraction du CÔTÉ du QR (la moitié de √2−1, plus un filet). */
export const PAD_PASTILLE_RONDE = (Math.SQRT2 - 1) / 2 + 0.035

/**
 * Côté maximal du QR, en fraction de min(largeur, hauteur) du support.
 *
 * `marge` = marge de sécurité, en fraction du support (0,15 sur un rond).
 * Sur un support ROND, tout doit tenir dans le cercle : un carré de côté c y
 * entre si c√2 ≤ diamètre utile. La pastille agrandit ce carré, donc réduit
 * d'autant le QR — une pastille ronde coûte plus qu'une carrée.
 */
export function partQrMax(rond: boolean, badge: Pastille, marge: number, qrGeant = false): number {
  if (rond) {
    const zone = Math.max(0.1, 1 - 2 * marge)          // diamètre utile
    if (badge === "cercle") return zone / (1 + 2 * PAD_PASTILLE_RONDE)
    if (badge === "carre") return Math.max(0.1, zone / Math.SQRT2 - 2 * PAD_PASTILLE_CARREE)
    return zone / Math.SQRT2
  }
  const plafond = qrGeant ? 0.5 : 0.86
  if (badge === "carre") return Math.max(0.1, plafond - 2 * PAD_PASTILLE_CARREE)
  return plafond
}
