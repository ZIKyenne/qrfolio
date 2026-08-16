// QRowg · Print Studio — rendu packshot studio
// Paramètres de scène et calculs de rendu, sans DOM ni framework.
// Un moteur (React, Vue, canvas, WebGL) consomme ces valeurs telles quelles.
//
// Principe : l'objet est photographié en studio, pas dessiné à plat.
// Chaque scène = un fond, un sol, une lumière, une perspective, une ombre de contact
// (ao) et une ombre portée (cast), plus un reflet optionnel (mirror).

import type { Style } from './catalog'

// ao   : [scaleX, opacité, flou px]         — ombre de contact, sous l'objet
// cast : [scaleX, opacité, flou px, dx, dy] — ombre portée, décalée
// stage: transform 3D appliqué à l'objet    — la pose
// persp/pOrigin : perspective de la scène
// floorH: hauteur du sol en fraction de la scène (0 = scène murale)
// mirror: opacité du reflet (0 = aucun)
export type Scene = {
  caption: string; scenePad: number; floorH: number; studio: boolean; mirror: number;
  bg: string; floor: string; grain: string; grainOpacity: number; horizon: string;
  light: string; hasStreak?: boolean; persp: number; pOrigin: string; stage: string;
  offset: number; ao: [number, number, number]; cast: [number, number, number, number, number];
}

const SCENES: Record<string, Scene> = {
  table: {
    caption: 'Sur une table', scenePad: 18, floorH: .8, studio: true, mirror: .3,
    bg: 'radial-gradient(82% 72% at 50% 6%,#3c4046 0%,#202327 56%,#121417 100%)', floor: 'linear-gradient(180deg,#262a32 0%,#1a1d22 42%,#101215 100%)',
    grain: 'linear-gradient(180deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.015) 26%,transparent 52%)', grainOpacity: 1, horizon: 'rgba(255,255,255,.14)',
    light: 'radial-gradient(62% 46% at 50% 4%,rgba(255,255,255,.13),transparent 60%)',
    persp: 1000, pOrigin: '50% 34%', stage: 'rotateX(16deg) rotateZ(-2deg)', offset: -.04,
    ao: [1, .14, 5], cast: [1.3, .2, 8, 0, 12],
  },
  vitrine: {
    caption: 'Collé sur la vitrine', scenePad: 22, floorH: 0, studio: true, mirror: 0,
    bg: 'radial-gradient(82% 72% at 50% 6%,#3c4046 0%,#202327 56%,#121417 100%)', floor: 'transparent',
    grain: 'none', grainOpacity: 0, horizon: 'transparent',
    light: 'radial-gradient(60% 48% at 52% 4%,rgba(214,238,255,.13),transparent 62%)',
    hasStreak: true,
    persp: 1300, pOrigin: '44% 42%', stage: 'rotateY(-7deg) rotateX(1deg)', offset: 0,
    ao: [.98, .12, 5], cast: [1.14, .2, 10, -4, 9],
  },
  comptoir: {
    caption: 'Posé au comptoir', scenePad: 18, floorH: .46, studio: true, mirror: .26,
    bg: 'radial-gradient(82% 72% at 50% 6%,#3c4046 0%,#202327 56%,#121417 100%)', floor: 'linear-gradient(180deg,#262a32 0%,#1a1d22 42%,#101215 100%)',
    grain: 'linear-gradient(180deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.015) 26%,transparent 52%)', grainOpacity: 1, horizon: 'rgba(255,255,255,.14)',
    light: 'radial-gradient(64% 44% at 48% 2%,rgba(255,255,255,.12),transparent 60%)',
    persp: 1000, pOrigin: '50% 44%', stage: 'rotateX(6deg) rotateY(-9deg)', offset: -.03,
    ao: [1, .13, 5], cast: [1.34, .2, 9, 8, 11],
  },
  main: {
    caption: 'Donné en main', scenePad: 22, floorH: .38, studio: true, mirror: .18,
    bg: 'radial-gradient(82% 72% at 50% 6%,#3c4046 0%,#202327 56%,#121417 100%)', floor: 'linear-gradient(180deg,#262a32 0%,#1a1d22 42%,#101215 100%)',
    grain: 'linear-gradient(180deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.015) 26%,transparent 52%)', grainOpacity: 1, horizon: 'rgba(255,255,255,.1)',
    light: 'radial-gradient(58% 46% at 34% 4%,rgba(255,255,255,.12),transparent 60%)',
    persp: 900, pOrigin: '50% 50%', stage: 'rotateZ(-6deg) rotateY(12deg) rotateX(5deg)', offset: -.02,
    ao: [.92, .14, 6], cast: [1.26, .22, 12, 8, 14],
  },
  mur: {
    caption: 'Affiché au mur', scenePad: 20, floorH: 0, studio: true, mirror: 0,
    bg: 'radial-gradient(82% 72% at 50% 6%,#3c4046 0%,#202327 56%,#121417 100%)', floor: 'transparent',
    grain: 'none', grainOpacity: 0, horizon: 'transparent',
    light: 'radial-gradient(60% 46% at 50% 0%,rgba(255,255,255,.14),transparent 62%),radial-gradient(130% 100% at 50% 128%,rgba(0,0,0,.42),transparent 60%)',
    persp: 1400, pOrigin: '50% 44%', stage: 'rotateY(-5deg) rotateX(1deg)', offset: 0,
    ao: [.96, .12, 5], cast: [1.2, .24, 16, -8, 16],
  },
}

// Teinte et sol propres au métier : remplacent le sol neutre quand un métier est choisi.
// tint = lumière colorée du lieu, posée en surimpression légère.
export type Trade = { lieu: string; floor: string; tint: string }
const TRADES: Record<string, Trade> = {
  Restaurant: { lieu: 'du restaurant', floor: 'linear-gradient(180deg,#7a5b41 0%,#553d2a 38%,#2e2117 100%)', tint: 'rgba(255,238,205,.20)' },
  Bar: { lieu: 'du bar', floor: 'linear-gradient(180deg,#2b2f36 0%,#1c2026 42%,#101317 100%)', tint: 'rgba(255,190,120,.22)' },
  Boulangerie: { lieu: 'de la boulangerie', floor: 'linear-gradient(180deg,#c9b393 0%,#a08a68 40%,#6b5a41 100%)', tint: 'rgba(255,236,200,.24)' },
  Coiffeur: { lieu: 'du salon', floor: 'linear-gradient(180deg,#26282c 0%,#15171a 44%,#0b0c0e 100%)', tint: 'rgba(210,235,255,.16)' },
  'Beauté': { lieu: "de l'institut", floor: 'linear-gradient(180deg,#e6d9d6 0%,#c3aeaa 42%,#7d6c69 100%)', tint: 'rgba(255,225,230,.20)' },
  Boutique: { lieu: 'de la boutique', floor: 'linear-gradient(180deg,#b99a72 0%,#8d7050 42%,#4f3d29 100%)', tint: 'rgba(255,242,220,.18)' },
  'Hôtel': { lieu: "de l'hôtel", floor: 'linear-gradient(180deg,#3b3a38 0%,#232220 46%,#121110 100%)', tint: 'rgba(255,228,180,.20)' },
  Artisan: { lieu: "de l'atelier", floor: 'linear-gradient(180deg,#6f6a62 0%,#4a453f 44%,#252220 100%)', tint: 'rgba(255,240,215,.14)' },
  Coach: { lieu: 'de la salle', floor: 'linear-gradient(180deg,#2f3a3a 0%,#1e2626 44%,#0f1414 100%)', tint: 'rgba(190,255,235,.14)' },
  Immobilier: { lieu: "de l'agence", floor: 'linear-gradient(180deg,#54595f 0%,#363a3f 44%,#1a1d20 100%)', tint: 'rgba(215,232,255,.16)' },
  Freelance: { lieu: 'du bureau', floor: 'linear-gradient(180deg,#8f8272 0%,#635a4d 44%,#332e28 100%)', tint: 'rgba(255,240,220,.16)' },
  'Événement': { lieu: 'du stand', floor: 'linear-gradient(180deg,#4a3f52 0%,#2e2836 46%,#16131b 100%)', tint: 'rgba(235,205,255,.18)' },
}

export { SCENES, TRADES }

// --- utilitaires couleur ---
export const rgb = (hex: string): number[] => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export const rgba = (hex: string, a: number): string => { const c = rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})` }
export const shade = (hex: string, amt: number): string => {
  const c = rgb(hex).map(v => Math.max(0, Math.min(255, Math.round(v + 255 * amt))))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}
export const darken = (hex: string, amt: number): string => {
  const c = rgb(hex).map(v => Math.round(v * (1 - amt)))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}
const lum = (hex: string): number => rgb(hex).map(v => v / 255)
  .map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4))
  .reduce((a, v, i) => a + [.2126, .7152, .0722][i] * v, 0)
export const wcag = (a: string, b: string): number => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05) }
// encre lisible sur un fond donné (noir ou blanc, celui qui contraste le plus)
export const on = (hex: string): string => wcag('#0A0A0A', hex) >= wcag('#FFFFFF', hex) ? '#0A0A0A' : '#FFFFFF'

// #2 — encre du bouton « trait » : l'accent, sauf s'il se fond dans le fond (< 2.2:1),
// auquel cas on se rabat sur l'encre du thème. Sert pour la bordure ET le libellé.
export const traitInk = (accent: string, bg: string, ink: string): string =>
  wcag(accent, bg) >= 2.2 ? accent : ink

// #3 — éclairage : un fond plat n'a jamais l'air photographié.
export const grad = (hex: string): string => `linear-gradient(168deg,${shade(hex, .07)} 0%,${hex} 45%,${shade(hex, -.07)} 100%)`
// version renforcée pour le fini « dégradé » (bgFinish === 'degrade')
export const gradStrong = (hex: string): string => `linear-gradient(168deg,${shade(hex, .12)} 0%,${hex} 45%,${shade(hex, -.12)} 100%)`

// #4 — finis dérivés de l'encre du thème (plus de gris fixe : lisible sur clair ET sombre).
// SupportVisual préfixe la couche au background : `${finishLayer(pal.fg, bgFinish)}${grad(pal.flat)}`
export function finishLayer(ink: string, finish: string): string {
  const iA = rgba(ink, .06)
  if (finish === 'grain') return `radial-gradient(${rgba(ink, .07)} .6px,transparent .7px) 0 0 / 5px 5px, `
  if (finish === 'rayures') return `repeating-linear-gradient(135deg,${iA} 0 5px,transparent 5px 11px), `
  if (finish === 'quadrillage') return `repeating-linear-gradient(0deg,${iA} 0 1px,transparent 1px 12px), repeating-linear-gradient(90deg,${iA} 0 1px,transparent 1px 12px), `
  return ''
}

// #1 — familles déclarées mais non chargées → familles réellement rendues.
const FONT_FALLBACK: Record<string, string> = {
  'Playfair Display': '"Fraunces",Georgia,serif',
  'Lora': 'Georgia,serif',
  'Montserrat': '"Inter",sans-serif',
  'Poppins': '"DM Sans",sans-serif',
  'Raleway': '"DM Sans",sans-serif',
  'Bebas Neue': 'Impact,"Arial Black",sans-serif',
}
const fontStack = (f: string, serif: boolean): string =>
  FONT_FALLBACK[f] ?? `"${f}",${serif ? 'Georgia,serif' : 'Helvetica,Arial,sans-serif'}`
// familles « condensé affiche » : graisse 400 + léger espacement (Bebas → Impact inclus)
const isDisplay = (f: string): boolean => f === 'Bebas Neue' || f === 'Impact'

// Palette prête à peindre, dérivée d'un STYLE du catalogue.
export function paletteFromStyle(s: Style) {
  return {
    id: s.id, label: s.label,
    flat: s.bg, bg: grad(s.bg), fg: s.ink, muted: rgba(s.ink, .55),
    ctaBg: s.accent, ctaFg: on(s.accent), ink: s.qr, qrBg: s.qrBg,
    band: s.accent, bandFg: on(s.accent), rule: rgba(s.ink, .3),
    // #2 : encre sûre pour les éléments « trait » (bordure + libellé du bouton filaire)
    trait: traitInk(s.accent, s.bg, s.ink),
    titleFont: fontStack(s.title, true),
    bodyFont: fontStack(s.body, false),
    titleWeight: isDisplay(s.title) ? 400 : 600,
    titleLs: isDisplay(s.title) ? '.02em' : '-.015em',
  }
}

// Échelle : convertit les mm réels de l'objet en px d'écran pour une scène donnée.
// REF_MM = hauteur de référence ; un roll-up de 2 m et une carte de visite
// restent tous deux cadrés, avec un rapport de taille crédible.
export const REF_MM = 210
export function scaleFor(hMm: number, boxPx: number, scene?: Scene): number {
  const pad = (scene && scene.scenePad) || 18
  const usable = boxPx - pad * 2
  const rel = Math.pow(hMm / REF_MM, 0.42) // compression douce : le roll-up ne sort pas du cadre
  return Math.max(48, Math.min(usable, usable * Math.min(1, rel)))
}

// Toutes les couches d'une scène, dans l'ordre de peinture (fond → objet → ombres → reflet).
export function sceneLayers(sceneId: string, trade?: string | null) {
  const s = SCENES[sceneId]
  const t = trade ? TRADES[trade] : null
  return {
    background: s.bg,
    floor: t && s.floorH ? t.floor : s.floor,
    floorHeight: s.floorH,
    grain: s.grain, grainOpacity: s.grainOpacity,
    horizon: s.horizon,
    light: t ? `radial-gradient(70% 50% at 50% 0%,${t.tint},transparent 64%),${s.light}` : s.light,
    streak: !!s.hasStreak,       // reflet de vitre en diagonale
    perspective: s.persp, perspectiveOrigin: s.pOrigin,
    transform: s.stage, verticalOffset: s.offset,
    contactShadow: { scaleX: s.ao[0], opacity: s.ao[1], blur: s.ao[2] },
    castShadow: { scaleX: s.cast[0], opacity: s.cast[1], blur: s.cast[2], dx: s.cast[3], dy: s.cast[4] },
    mirror: s.mirror,
    caption: s.caption,
  }
}
