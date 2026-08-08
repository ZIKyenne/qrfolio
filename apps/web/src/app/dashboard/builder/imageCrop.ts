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
