// QRowg · Print Studio — jetons de design
// Extraits des valeurs réellement utilisées dans la maquette mobile v3.
// À adapter au web : la grille et la typo montent d'un cran sur grand écran.

export const color = {
  // surfaces — l'app est sombre, l'aperçu est le seul endroit lumineux
  bg: '#14161a',
  surface: '#101215',
  surfaceUp: 'rgba(255,255,255,.05)',
  hairline: 'rgba(255,255,255,.08)',
  // texte
  fg: '#eceef1',
  fgMuted: 'rgba(236,238,241,.6)',
  fgFaint: 'rgba(236,238,241,.44)',
  // accents
  gold: '#c9a84c',      // action principale, sélection, compteurs
  goldSoft: 'rgba(201,168,76,.14)',
  ok: '#5cc98a',
  bad: '#ff564a',
}

// Grille au pas de 4. Rien ne s'aligne hors de cette liste.
export const space = [0, 4, 6, 8, 11, 14, 18, 22, 28, 36, 48]

export const radius = { chip: 999, control: 13, card: 15, sheet: 22, print: 3 }

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
