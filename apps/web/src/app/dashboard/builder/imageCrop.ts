// imageCrop.ts — Maths PURES du recadrage d'image (pan + zoom + ratio). Aucun DOM, aucune dépendance,
// testable. Le modèle : l'image « couvre » le cadre (comme object-fit: cover) à zoom=1, puis l'utilisateur
// zoome (≥1) et déplace ; on borne le déplacement pour que le cadre reste toujours couvert. On en déduit
// le rectangle SOURCE (en pixels de l'image d'origine) à dessiner sur le canvas de sortie.

export type Size = { w: number; h: number }
export type Offset = { x: number; y: number }
export type CropRect = { sx: number; sy: number; sw: number; sh: number }

// Échelle « cover » : plus petite échelle telle que l'image couvre entièrement le cadre.
export function coverBaseScale(natural: Size, frame: Size): number {
  if (natural.w <= 0 || natural.h <= 0) return 1
  return Math.max(frame.w / natural.w, frame.h / natural.h)
}

// Taille affichée de l'image pour un zoom donné (zoom ≥ 1).
export function displaySize(natural: Size, frame: Size, zoom: number): Size {
  const s = coverBaseScale(natural, frame) * Math.max(1, zoom)
  return { w: natural.w * s, h: natural.h * s }
}

// Borne l'offset (coin haut-gauche de l'image relatif au cadre, valeurs ≤ 0) pour couvrir le cadre.
export function clampOffset(offset: Offset, disp: Size, frame: Size): Offset {
  const minX = Math.min(0, frame.w - disp.w) // disp ≥ frame ⇒ ≤ 0
  const minY = Math.min(0, frame.h - disp.h)
  return {
    x: Math.min(0, Math.max(minX, offset.x)),
    y: Math.min(0, Math.max(minY, offset.y)),
  }
}

// Rectangle source (pixels image d'origine) correspondant au cadre visible.
export function computeCropRect(natural: Size, frame: Size, zoom: number, offset: Offset): CropRect {
  const disp = displaySize(natural, frame, zoom)
  const clamped = clampOffset(offset, disp, frame)
  const scale = disp.w / natural.w // = disp.h / natural.h (même échelle sur les 2 axes)
  const sx = -clamped.x / scale
  const sy = -clamped.y / scale
  const sw = frame.w / scale
  const sh = frame.h / scale
  return {
    sx: Math.max(0, sx),
    sy: Math.max(0, sy),
    sw: Math.min(sw, natural.w - Math.max(0, sx)),
    sh: Math.min(sh, natural.h - Math.max(0, sy)),
  }
}

// Dimensions de sortie : on respecte le ratio du cadre, borné à `maxLongest` px (qualité/poids).
export function outputSize(crop: CropRect, maxLongest = 1600): Size {
  const aspect = crop.sw / crop.sh
  let w = Math.round(crop.sw)
  let h = Math.round(crop.sh)
  const longest = Math.max(w, h)
  if (longest > maxLongest) {
    const k = maxLongest / longest
    w = Math.round(w * k); h = Math.round(h * k)
  }
  return { w: Math.max(1, w), h: Math.max(1, h || Math.round(w / aspect)) }
}

// Ratios proposés (cadre). null = libre (ratio de l'image d'origine).
export const CROP_ASPECTS: { key: string; label: string; ratio: number | null }[] = [
  { key: "free", label: "Libre", ratio: null },
  { key: "square", label: "Carré 1:1", ratio: 1 },
  { key: "landscape", label: "Paysage 16:9", ratio: 16 / 9 },
  { key: "portrait", label: "Portrait 4:5", ratio: 4 / 5 },
  { key: "wide", label: "Bannière 3:1", ratio: 3 },
]

// =============================================================================
// Taille du cadre à l'écran
// -----------------------------------------------------------------------------
// Le cadre était figé à 280 px de côté. Sur un téléphone de 390 px, mesuré en
// capture, cela donnait une zone de recadrage de 280 × 135 perdue au milieu de
// l'écran, avec du noir au-dessus et en dessous : on cadrait la photo de son
// commerce à travers un timbre-poste. Le mauvais cadrage se retrouve ensuite sur
// la page publiée, en grand.
//
// Ici, le cadre prend la place disponible. Fonction pure -> testable sans DOM.
// =============================================================================

/** Marges de la fenêtre modale (bordures de page + padding intérieur). */
export const MARGE_MODALE = 60
/** Titre, curseur de zoom, pastilles de ratio, boutons : ce qui entoure le cadre. */
export const CHROME_MODALE = 300
export const CADRE_MIN = 200
export const CADRE_MAX = 520

/**
 * Plus grand côté du cadre de recadrage, en pixels.
 *
 * @param largeurEcran largeur visible
 * @param hauteurEcran hauteur visible
 */
export function cadreMax(largeurEcran: number, hauteurEcran: number): number {
  const l = Number.isFinite(largeurEcran) && largeurEcran > 0 ? largeurEcran : 390
  const h = Number.isFinite(hauteurEcran) && hauteurEcran > 0 ? hauteurEcran : 844
  const parLaLargeur = l - MARGE_MODALE
  const parLaHauteur = h - CHROME_MODALE
  return Math.round(Math.min(CADRE_MAX, Math.max(CADRE_MIN, Math.min(parLaLargeur, parLaHauteur))))
}

/** Largeur de la fenêtre : pleine largeur utile sur téléphone, sobre au-delà. */
export function largeurModale(largeurEcran: number): number {
  const l = Number.isFinite(largeurEcran) && largeurEcran > 0 ? largeurEcran : 390
  return Math.round(Math.min(Math.max(300, l - 24), 560))
}
