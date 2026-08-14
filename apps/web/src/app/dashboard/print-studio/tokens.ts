// QRowg · Print Studio — jetons de design
// Extraits des valeurs réellement utilisées dans la maquette mobile v3.
// À adapter au web : la grille et la typo montent d'un cran sur grand écran.

// Aligné sur le design system de l'app (globals.css) : même near-black chaud, même crème,
// et surtout la couleur d'ACCENT pilotée par l'utilisateur (var(--accent)) au lieu d'un or figé.
// Les variantes *A** existent parce que certains styles concatènent une alpha (`${C.gold}55`)
// et qu'on ne peut pas suffixer une var() — on passe par color-mix.
export const color = {
  bg: '#080808',                      // --bg (near-black chaud)
  surface: '#141310',                 // panneau opaque, chaud, lisible sur le near-black
  surfaceUp: 'rgba(255,255,255,.04)',
  hairline: 'rgba(255,255,255,.08)',
  fg: '#F5F0E8',                      // --ink (crème)
  fgMuted: '#8A8478',                 // --muted
  fgFaint: 'rgba(245,240,232,.44)',
  gold: 'var(--accent)',             // suit l'accent utilisateur (défaut = or)
  goldSoft: 'color-mix(in srgb, var(--accent) 14%, transparent)',
  goldA22: 'color-mix(in srgb, var(--accent) 14%, transparent)',
  goldA33: 'color-mix(in srgb, var(--accent) 22%, transparent)',
  goldA55: 'color-mix(in srgb, var(--accent) 36%, transparent)',
  goldA88: 'color-mix(in srgb, var(--accent) 56%, transparent)',
  ok: 'var(--success)',
  okA22: 'color-mix(in srgb, var(--success) 14%, transparent)',
  bad: 'var(--danger)',
  badA22: 'var(--danger-bg)',
  badA55: 'var(--danger-border)',
}

// Grille au pas de 4. Rien ne s'aligne hors de cette liste.
export const space = [0, 4, 6, 8, 11, 14, 18, 22, 28, 36, 48]

export const radius = { chip: 999, control: 12, card: 16, sheet: 20, print: 3 }

// Cible tactile : 44 px minimum, 52 px pour l'action principale.
export const touch = { min: 44, primary: 52 }

// Six tailles, pas une de plus.
export const type = {
  display: { size: 38, line: 1.03, weight: 400, ls: '-.03em' },
  title: { size: 22, line: 1.15, weight: 500, ls: '-.02em' },
  body: { size: 15, line: 1.5, weight: 400, ls: '0' },
  label: { size: 12.5, line: 1.4, weight: 500, ls: '0' },
  meta: { size: 11.5, line: 1.4, weight: 500, ls: '0' },
  mono: { size: 10.5, line: 1.4, weight: 600, ls: '.18em', transform: 'uppercase' },
}

export const font = {
  ui: '"Helvetica Neue",Helvetica,Arial,sans-serif',
  mono: 'ui-monospace,Menlo,monospace',   // chiffres, formats, tailles, compteurs
}

// Mouvements : courts, jamais décoratifs.
export const motion = {
  tap: { duration: 90, easing: 'cubic-bezier(.2,.8,.3,1)' },
  reveal: { duration: 140, easing: 'cubic-bezier(.2,.8,.3,1)' },
  sheet: { duration: 160, easing: 'cubic-bezier(.2,.8,.3,1)' },
  reduced: '@media (prefers-reduced-motion: reduce) — durée 0, opacité seule',
}

// Adaptation web (l'app est dessinée en 393 px de large).
export const breakpoints = {
  mobile: '≤ 640px  · une colonne, volets empilés, barre d\'action fixe en bas',
  tablet: '641–1024 · aperçu à gauche (sticky), volets à droite',
  desktop: '≥ 1025   · aperçu 60% sticky, volets 40%, action en haut du panneau',
}

const tokens = { color, space, radius, touch, type, font, motion, breakpoints }
export default tokens
