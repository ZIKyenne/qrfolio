// ─────────────────────────────────────────────────────────────
// QRowg — Catalogue de thèmes (legacy, EN ATTENTE DE PROMOTION)
// NOTE : l'éditeur actif (BuilderV4) utilise le système de thème de types.ts
// (PageTheme). Ce fichier n'est plus référencé que par themes.test.ts. On le
// CONSERVE volontairement pour ses helpers d'ACCESSIBILITÉ testés (readableText /
// contrastRatio WCAG), destinés au futur garde-fou de contraste (voir
// docs/BUILDER-REBUILD-PLAN.md §2.12). Ne pas supprimer sans récupérer ces helpers.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react'

export type ThemeCategory =
  | 'luxury'
  | 'restaurant'
  | 'bar'
  | 'cafe'
  | 'hotel'
  | 'salon'
  | 'bakery'
  | 'creator'
  | 'portfolio'
  | 'fitness'
  | 'immobilier'
  | 'event'
  | 'retail'
  | 'health'
  | 'music'
  | 'business'

export type PageTheme = {
  name: string
  category: ThemeCategory
  // Couleurs (hex #RRGGBB)
  background: string   // fond principal de la page
  surface: string      // fond des cartes / surfaces posées sur le fond
  primary: string      // couleur principale (boutons, accents forts)
  accent: string       // couleur d'accent (liens, highlights)
  text: string         // texte principal
  muted: string        // texte secondaire / légendes
  // Polices (familles Google Fonts)
  font_display: string // titres
  font_body: string    // corps de texte
  // Fond
  bg_mode?: 'solid' | 'gradient' | 'pattern'  // défaut: 'solid'
  bg_gradient?: string                         // CSS, requis si bg_mode === 'gradient'
  bg_pattern?: 'dots' | 'grid' | 'stars' | 'waves'  // si bg_mode === 'pattern'
}

export const DEFAULT_THEME_KEY = 'midnight_gold'

export const CATEGORY_LABELS: Record<ThemeCategory, string> = {
  luxury: 'Luxe',
  restaurant: 'Restaurant',
  bar: 'Bar',
  cafe: 'Café',
  hotel: 'Hôtel',
  salon: 'Coiffeur / Beauté',
  bakery: 'Boulangerie',
  creator: 'Créateur',
  portfolio: 'Portfolio',
  fitness: 'Fitness',
  immobilier: 'Immobilier',
  event: 'Événement',
  retail: 'Boutique',
  health: 'Santé',
  music: 'Musique',
  business: 'Business',
}

// ─── Catalogue de presets ─────────────────────────────────────
export const PRESET_THEMES: Record<string, PageTheme> = {
  midnight_gold: {
    name: 'Midnight Gold',
    category: 'luxury',
    background: '#080808',
    surface: '#141109',
    primary: '#C9A84C',
    accent: '#39FF8F',
    text: '#F5F0E8',
    muted: '#A8A190',
    font_display: 'Fraunces',
    font_body: 'DM Sans',
    bg_mode: 'solid',
  },
  velvet_noir: {
    name: 'Velvet Noir',
    category: 'luxury',
    background: '#0B0A0F',
    surface: '#15131C',
    primary: '#C9A227',
    accent: '#E8C36A',
    text: '#F3EEE6',
    muted: '#9A93A5',
    font_display: 'Playfair Display',
    font_body: 'Inter',
    bg_mode: 'gradient',
    bg_gradient: 'linear-gradient(160deg, #0B0A0F 0%, #1A1320 60%, #0B0A0F 100%)',
  },
  ivory_couture: {
    name: 'Ivory Couture',
    category: 'luxury',
    background: '#F7F3EC',
    surface: '#FFFFFF',
    primary: '#6E1023',
    accent: '#A8853E',
    text: '#211C17',
    muted: '#6E6658',
    font_display: 'Fraunces',
    font_body: 'Jost',
    bg_mode: 'solid',
  },
  warm_bistro: {
    name: 'Warm Bistro',
    category: 'restaurant',
    background: '#FBF6EE',
    surface: '#FFFFFF',
    primary: '#B23A1E',
    accent: '#E0913A',
    text: '#2A1C14',
    muted: '#7A6A5C',
    font_display: 'Fraunces',
    font_body: 'Nunito Sans',
    bg_mode: 'solid',
  },
  terra_trattoria: {
    name: 'Terra Trattoria',
    category: 'restaurant',
    background: '#1E140F',
    surface: '#2A1D15',
    primary: '#D86C3B',
    accent: '#E8B04B',
    text: '#F6EADD',
    muted: '#B49A86',
    font_display: 'Fraunces',
    font_body: 'Manrope',
    bg_mode: 'solid',
  },
  neon_speakeasy: {
    name: 'Neon Speakeasy',
    category: 'bar',
    background: '#0A0410',
    surface: '#160B22',
    primary: '#FF2E88',
    accent: '#23E5DB',
    text: '#F7E9FF',
    muted: '#A98FBE',
    font_display: 'Space Grotesk',
    font_body: 'Inter',
    bg_mode: 'pattern',
    bg_pattern: 'dots',
  },
  amber_lounge: {
    name: 'Amber Lounge',
    category: 'bar',
    background: '#120D08',
    surface: '#1E150D',
    primary: '#E0913A',
    accent: '#F2C879',
    text: '#F4E9DA',
    muted: '#B09A80',
    font_display: 'Playfair Display',
    font_body: 'Manrope',
    bg_mode: 'gradient',
    bg_gradient: 'linear-gradient(160deg, #120D08 0%, #241808 55%, #120D08 100%)',
  },
  cafe_creme: {
    name: 'Café Crème',
    category: 'cafe',
    background: '#F3E9DC',
    surface: '#FFFFFF',
    primary: '#6F4E37',
    accent: '#A9805E',
    text: '#2E2218',
    muted: '#766554',
    font_display: 'Fraunces',
    font_body: 'Work Sans',
    bg_mode: 'solid',
  },
  electric_pop: {
    name: 'Electric Pop',
    category: 'creator',
    background: '#0E0B1A',
    surface: '#181233',
    primary: '#9076FF',
    accent: '#FF5CA8',
    text: '#F1ECFF',
    muted: '#9C92C9',
    font_display: 'Space Grotesk',
    font_body: 'Inter',
    bg_mode: 'gradient',
    bg_gradient: 'linear-gradient(160deg, #0E0B1A 0%, #241653 60%, #0E0B1A 100%)',
  },
  mono_studio: {
    name: 'Mono Studio',
    category: 'portfolio',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#111111',
    accent: '#555555',
    text: '#141414',
    muted: '#6B6B6B',
    font_display: 'Manrope',
    font_body: 'Inter',
    bg_mode: 'solid',
  },
  blush_atelier: {
    name: 'Blush Atelier',
    category: 'salon',
    background: '#FBF1F1',
    surface: '#FFFFFF',
    primary: '#A7535F',
    accent: '#D9A7AF',
    text: '#2E2226',
    muted: '#7D696D',
    font_display: 'Fraunces',
    font_body: 'Jost',
    bg_mode: 'solid',
  },
  azure_estate: {
    name: 'Azure Estate',
    category: 'immobilier',
    background: '#0C1424',
    surface: '#14203A',
    primary: '#5B8DEF',
    accent: '#38BDF8',
    text: '#EAF1FF',
    muted: '#8290AE',
    font_display: 'Playfair Display',
    font_body: 'Inter',
    bg_mode: 'gradient',
    bg_gradient: 'linear-gradient(160deg, #0C1424 0%, #10284A 55%, #0C1424 100%)',
  },
}

// Liste des polices utilisées par les presets (pour un futur sélecteur de police).
export const GOOGLE_FONTS: string[] = [
  'Fraunces',
  'Playfair Display',
  'Fraunces',
  'Space Grotesk',
  'Manrope',
  'DM Sans',
  'Inter',
  'Jost',
  'Nunito Sans',
  'Work Sans',
]

// ─── Helpers de rendu ─────────────────────────────────────────

/** Renvoie un thème complet : le preset par sa clé, ou le thème enregistré sur la page,
 *  avec repli sur Midnight Gold pour tout champ manquant (rétro-compatibilité). */
export function resolveTheme(raw: unknown): PageTheme {
  const base = PRESET_THEMES[DEFAULT_THEME_KEY]!
  if (!raw || typeof raw !== 'object') return base
  const t = raw as Partial<PageTheme>
  return {
    name: t.name ?? base.name,
    category: t.category ?? base.category,
    background: t.background ?? base.background,
    surface: t.surface ?? base.surface,
    primary: t.primary ?? base.primary,
    accent: t.accent ?? base.accent,
    text: t.text ?? base.text,
    muted: t.muted ?? base.muted,
    font_display: t.font_display ?? base.font_display,
    font_body: t.font_body ?? base.font_body,
    bg_mode: t.bg_mode ?? 'solid',
    bg_gradient: t.bg_gradient,
    bg_pattern: t.bg_pattern,
  }
}

/** URL Google Fonts robuste (remplace TOUS les espaces, poids sûrs 400→700). */
export function fontsUrl(theme: PageTheme): string {
  const d = theme.font_display.replace(/ /g, '+')
  const b = theme.font_body.replace(/ /g, '+')
  return `https://fonts.googleapis.com/css2?family=${d}:wght@400;600;700&family=${b}:wght@400;500;600&display=swap`
}

/** Ajoute un alpha hex (0..1) à une couleur #RRGGBB → #RRGGBBAA */
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
  return hex + a
}

/** Luminance relative (WCAG) d'une couleur #RRGGBB. */
function relativeLuminance(hex: string): number {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16) / 255
  const g = parseInt(m.slice(2, 4), 16) / 255
  const b = parseInt(m.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Couleur de texte lisible (noir ou blanc) à poser sur une couleur de fond. */
export function readableText(hex: string): string {
  try {
    return relativeLuminance(hex) > 0.5 ? '#0A0A0A' : '#FFFFFF'
  } catch {
    return '#FFFFFF'
  }
}

/** CSS background-image d'un motif, teinté par `color`. Renvoie undefined si pas de motif. */
export function patternCss(pattern: PageTheme['bg_pattern'], color: string): string | undefined {
  switch (pattern) {
    case 'dots':
      return `radial-gradient(circle, ${withAlpha(color, 0.18)} 1px, transparent 1px)`
    case 'grid':
      return `linear-gradient(${withAlpha(color, 0.1)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(color, 0.1)} 1px, transparent 1px)`
    case 'stars':
      return `radial-gradient(circle, ${withAlpha(color, 0.25)} 1px, transparent 1px)`
    case 'waves':
      return `repeating-linear-gradient(45deg, ${withAlpha(color, 0.07)} 0px, ${withAlpha(color, 0.07)} 2px, transparent 2px, transparent 20px)`
    default:
      return undefined
  }
}

/** Taille de tuile du motif. */
export function patternSize(pattern: PageTheme['bg_pattern']): string {
  switch (pattern) {
    case 'dots':
      return '20px 20px'
    case 'grid':
      return '24px 24px'
    case 'stars':
      return '30px 30px'
    default:
      return 'auto'
  }
}

/** Style CSS du fond complet (couleur + mode). À étaler dans un style inline. */
export function backgroundStyle(theme: PageTheme): CSSProperties {
  if (theme.bg_mode === 'gradient' && theme.bg_gradient) {
    return { background: theme.bg_gradient }
  }
  if (theme.bg_mode === 'pattern' && theme.bg_pattern) {
    const img = patternCss(theme.bg_pattern, theme.primary)
    return {
      backgroundColor: theme.background,
      backgroundImage: img,
      backgroundSize: patternSize(theme.bg_pattern),
    }
  }
  return { background: theme.background }
}
