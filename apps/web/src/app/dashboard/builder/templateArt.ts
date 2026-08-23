// templateArt.ts — Visuels de remplacement SECTORIELS pour les modèles de page.
//
// Pourquoi : un modèle qui s'ouvre sur des rectangles gris ne donne envie à personne,
// et l'agent ne peut pas fournir de photographies sous licence. On génère donc des
// visuels abstraits — dégradé maillé, motif, pictogramme du métier en filigrane,
// grain — accordés à la palette du thème. Résultat : le modèle a de l'allure dès
// l'aperçu, et l'utilisateur remplace ensuite par ses vraies photos.
//
// Techniquement : des data-URI SVG. Aucune dépendance, aucun réseau, aucun fichier à
// héberger, rendus par n'importe quel <img src> (éditeur comme page publiée).

export type SectorArt =
  | "food" | "drink" | "coffee" | "bakery" | "beauty" | "hair" | "spa" | "sport"
  | "build" | "home" | "retail" | "flower" | "ink" | "night" | "nature" | "studio"

// Pictogramme du métier, dessiné dans une boîte 100 × 100 (trait, pas de remplissage).
const GLYPH: Record<SectorArt, string> = {
  food:   "M26 18v18M33 18v18M40 18v18M24 36h18c0 7-4 10-9 10s-9-3-9-10ZM33 46v36M62 20c9 3 13 14 13 24 0 6-4 9-9 9h-4V20ZM66 53v29",
  drink:  "M28 26h44L52 54v22M40 76h24M34 34h36",
  coffee: "M26 38h40v20a18 18 0 0 1-18 18h-4a18 18 0 0 1-18-18zM66 42h6a9 9 0 0 1 0 18h-6M22 84h52",
  bakery: "M18 64a34 30 0 0 1 64 0 30 26 0 0 0-64 0ZM18 64c-3 6-1 11 6 9M82 64c3 6 1 11-6 9M34 52c4-6 8-9 16-9s12 3 16 9",
  beauty: "M50 18c14 16 21 27 21 36a21 21 0 0 1-42 0c0-9 7-20 21-36ZM40 58a10 10 0 0 0 10 10",
  hair:   "M30 22 66 66M70 22 34 66M28 74a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM72 74a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  spa:    "M50 84c0-26 12-44 32-52-2 24-14 42-32 46ZM50 84C42 62 30 50 18 46c2 20 14 34 32 38Z",
  sport:  "M22 40v20M30 32v36M70 32v36M78 40v20M30 50h40",
  build:  "M62 22a16 16 0 0 0-14 24L26 68a8 8 0 0 0 11 11l22-22a16 16 0 0 0 20-21l-11 11-9-3-3-9Z",
  home:   "M20 48 50 22l30 26M28 44v34h44V44M44 78V58h12v20",
  retail: "M26 34h48l4 46H22ZM38 34v-6a12 12 0 0 1 24 0v6",
  flower: "M56 44a9 9 0 1 0 18 0 9 9 0 1 0-18 0M48.5 57a9 9 0 1 0 18 0 9 9 0 1 0-18 0M33.5 57a9 9 0 1 0 18 0 9 9 0 1 0-18 0M26 44a9 9 0 1 0 18 0 9 9 0 1 0-18 0M33.5 31a9 9 0 1 0 18 0 9 9 0 1 0-18 0M48.5 31a9 9 0 1 0 18 0 9 9 0 1 0-18 0M43 44a7 7 0 1 0 14 0 7 7 0 1 0-14 0M50 66v18M50 76c-6 0-10-3-12-8",
  ink:    "M40 16h20v36H40zM40 52h20l-10 30zM46 24h8M46 32h8M46 40h8",
  night:  "M62 20a26 26 0 1 0 20 40A28 28 0 0 1 62 20ZM26 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3ZM30 62l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z",
  nature: "M14 74 38 38l16 22 10-13 22 27ZM60 34a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
  studio: "M20 34h14l6-8h20l6 8h14v44H20ZM50 72a16 16 0 1 0 0-32 16 16 0 0 0 0 32Z",
}

// Motif de fond, en coordonnées d'un pattern 40 × 40.
const PATTERN: Record<SectorArt, string> = {
  food:   "M0 20h40M20 0v40",
  drink:  "M20 6 30 20 20 34 10 20Z",
  coffee: "M6 20a14 14 0 0 0 28 0",
  bakery: "M0 30q10 -18 20 0t20 0",
  beauty: "M20 8c6 8 9 12 9 16a9 9 0 0 1-18 0c0-4 3-8 9-16Z",
  hair:   "M4 4 36 36M36 4 4 36",
  spa:    "M20 4c8 8 8 24 0 32-8-8-8-24 0-32Z",
  sport:  "M4 20h32M10 12v16M30 12v16",
  build:  "M0 0 40 40M-10 30 10 50M30 -10 50 10",
  home:   "M4 24 20 10l16 14M8 22v14h24V22",
  retail: "M8 12h24l3 24H5Z",
  flower: "M20 12a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM20 0v10M20 30v10M0 20h10M30 20h10",
  ink:    "M20 6c6 8 9 13 9 17a9 9 0 0 1-18 0c0-4 3-9 9-17Z",
  night:  "M20 8 22 16l8 2-8 2-2 8-2-8-8-2 8-2Z",
  nature: "M0 34 14 16l8 10 6-8 12 16Z",
  studio: "M20 8a12 12 0 1 0 0 24 12 12 0 0 0 0-24ZM20 14a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z",
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/**
 * Visuel sectoriel. `variant` décale la composition (position des halos, rotation
 * du motif, échelle du pictogramme) pour qu'une galerie de six images ne se répète pas.
 */
export function sectorArt(
  kind: SectorArt,
  opts: {
    c1?: string; c2?: string; accent?: string; w?: number; h?: number; variant?: number; label?: string
    /** Force des halos et du motif. 1 = discret (fond de carte), 2 = lumineux (image d'ouverture). */
    glow?: number
  } = {},
): string {
  const c1 = opts.c1 || "#12100C"
  const c2 = opts.c2 || "#080808"
  const accent = opts.accent || "#C9A84C"
  const w = opts.w || 900
  const h = opts.h || 600
  const v = Math.abs(opts.variant ?? 0)
  const g = Math.max(0.2, Math.min(3, opts.glow ?? 1))
  const id = `a${v % 97}`

  // Halos : deux taches lumineuses dont la position tourne avec la variante.
  const ang = (v * 47) % 360
  const rad = (deg: number) => (deg * Math.PI) / 180
  const bx = 50 + 30 * Math.cos(rad(ang))
  const by = 42 + 26 * Math.sin(rad(ang))
  const bx2 = 50 - 26 * Math.cos(rad(ang + 120))
  const by2 = 58 - 22 * Math.sin(rad(ang + 120))

  const rot = (v * 23) % 90
  const glyphScale = 3.2 + ((v % 3) * 0.55)
  const gx = w * (v % 2 ? 0.2 : 0.56)
  const gy = h * 0.16

  const label = opts.label
    ? `<text x='${w / 2}' y='${h - 34}' fill='${accent}' fill-opacity='0.5' font-family='DM Sans, Arial, sans-serif'` +
      ` font-size='${Math.round(h / 22)}' letter-spacing='3' text-anchor='middle'>${esc(opts.label.toUpperCase())}</text>`
    : ""

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
    `<defs>` +
      `<linearGradient id='bg${id}' x1='0' y1='0' x2='1' y2='1'>` +
        `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>` +
      `</linearGradient>` +
      `<radialGradient id='h1${id}' cx='${bx}%' cy='${by}%' r='55%'>` +
        `<stop offset='0' stop-color='${accent}' stop-opacity='${(0.42 * g).toFixed(2)}'/><stop offset='1' stop-color='${accent}' stop-opacity='0'/>` +
      `</radialGradient>` +
      `<radialGradient id='h2${id}' cx='${bx2}%' cy='${by2}%' r='45%'>` +
        `<stop offset='0' stop-color='${accent}' stop-opacity='${(0.2 * g).toFixed(2)}'/><stop offset='1' stop-color='${accent}' stop-opacity='0'/>` +
      `</radialGradient>` +
      `<pattern id='p${id}' width='40' height='40' patternUnits='userSpaceOnUse' patternTransform='rotate(${rot})'>` +
        `<path d='${PATTERN[kind]}' fill='none' stroke='${accent}' stroke-opacity='${(0.13 * g).toFixed(2)}' stroke-width='1.2'/>` +
      `</pattern>` +
      `<filter id='n${id}'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/>` +
        `<feColorMatrix type='saturate' values='0'/></filter>` +
    `</defs>` +
    `<rect width='${w}' height='${h}' fill='url(#bg${id})'/>` +
    `<rect width='${w}' height='${h}' fill='url(#p${id})'/>` +
    `<rect width='${w}' height='${h}' fill='url(#h1${id})'/>` +
    `<rect width='${w}' height='${h}' fill='url(#h2${id})'/>` +
    `<g transform='translate(${gx.toFixed(0)} ${gy.toFixed(0)}) scale(${glyphScale.toFixed(2)})' opacity='${(0.16 * g).toFixed(2)}'>` +
      `<path d='${GLYPH[kind]}' fill='none' stroke='${accent}' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/>` +
    `</g>` +
    `<rect width='${w}' height='${h}' filter='url(#n${id})' opacity='0.05'/>` +
    label +
    `</svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/** Jeu de N visuels du même secteur, variés — pour une galerie ou une mosaïque. */
export function sectorArtSet(
  kind: SectorArt, n: number, opts: Parameters<typeof sectorArt>[1] = {},
): string[] {
  return Array.from({ length: n }, (_, i) => sectorArt(kind, { ...opts, variant: (opts.variant ?? 0) + i }))
}

/** Visuels indexés img1..imgN (mosaïque, galerie). */
export function sectorArtImages(
  kind: SectorArt, n: number, opts: Parameters<typeof sectorArt>[1] = {},
): Record<string, string> {
  const out: Record<string, string> = {}
  sectorArtSet(kind, n, opts).forEach((src, i) => { out[`img${i + 1}`] = src })
  return out
}

/** Mélange deux couleurs hexadécimales. `t` = 0 donne `a`, 1 donne `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const parse = (h: string) => {
    const m = h.trim().match(/^#([0-9a-fA-F]{6})$/)
    if (!m) return null
    return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16))
  }
  const A = parse(a), B = parse(b)
  if (!A || !B) return a
  const k = Math.max(0, Math.min(1, t))
  const out = A.map((v, i) => Math.round(v + (B[i] - v) * k))
  return "#" + out.map(v => v.toString(16).padStart(2, "0")).join("")
}
