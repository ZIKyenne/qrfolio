// builderUi.ts — Tokens visuels CENTRALISÉS du nouveau Builder (mission C07, harmonisation).
// Source unique pour surfaces, bordures, rayons, espacements, typographie, tons et motion — afin
// d'éliminer les littéraux dupliqués dans les composants C01-C06 et donner un rendu « un seul
// produit ». Ne concerne QUE le nouveau Builder (derrière BUILDER_REDESIGN) ; ne touche NI le design
// system global, NI le renderer public, NI le style des pages utilisateurs. Valeurs alignées sur
// l'existant dominant (adoption value-preserving) ; identité Qrowg noir & or conservée.

export const BUILDER_UI = {
  // Surfaces sombres, du plus profond au plus clair.
  surface: {
    app: "#080808",          // fond application
    base: "#0A0A0A",         // panneaux (bibliothèque, canvas)
    panel: "#161616",        // panneau de réglages
    chrome: "#0C0C0C",       // barres (toolbars, bottom nav)
    header: "#0D0D0D",       // header
    sheet: "#141210",        // bottom sheet mobile
    field: "#111111",        // champs de saisie
    card: "rgba(255,255,255,0.03)",       // carte au repos
    cardHover: "rgba(255,255,255,0.06)",  // carte survolée
    raised: "rgba(255,255,255,0.04)",     // boutons discrets / contrôles
    overlayScrim: "rgba(0,0,0,0.5)",      // scrim des overlays
  },
  border: {
    faint: "rgba(255,255,255,0.06)",
    subtle: "rgba(255,255,255,0.08)",
    strong: "rgba(255,255,255,0.14)",
    accentSoft: "color-mix(in srgb, var(--accent) 30%, transparent)",
    accent: "color-mix(in srgb, var(--accent) 40%, transparent)",
  },
  // Texte / accents (CSS vars du design system, doré avec retenue).
  text: {
    ink: "var(--ink, #F5F0E8)",
    muted: "#8A8478",
    accent: "var(--accent)",
  },
  accentBg: {
    soft: "color-mix(in srgb, var(--accent) 14%, transparent)",
    chip: "color-mix(in srgb, var(--accent) 16%, transparent)",
  },
  radius: { sm: 8, md: 12, lg: 16, pill: 999, sheet: 22 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  // Cibles tactiles / tailles de contrôle.
  tap: { mobile: 44, desktop: 30 },
  // Tons sémantiques (mappés sur les tokens du design system global).
  tone: {
    neutral: "#8A8478",
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",
    accent: "var(--accent)",
  } as Record<string, string>,
  // Typographie (px) — hiérarchie lisible, minimum lisible sur mobile.
  font: { heading: 15, title: 13, body: 12.5, label: 11, hint: 10.5, meta: 10, badge: 9.5 },
  // Motion : durées courtes + easing unique. Respecter prefers-reduced-motion (globals.css).
  motion: { fast: "140ms", base: "200ms", easing: "cubic-bezier(.2,.7,.2,1)" },
} as const

export type BuilderUiTone = keyof typeof BUILDER_UI.tone
export function toneColor(tone: string): string {
  return BUILDER_UI.tone[tone] ?? BUILDER_UI.text.muted
}
