// Contextes MINIMAUX passés aux adapters (capacités explicites, pas 50 callbacks).
// Éditeur et public ont des contextes distincts → aucune capacité éditeur ne peut fuiter
// dans le rendu public.

import type { CSSProperties } from "react"
import type { PageTheme } from "../types"

// Adapter ÉDITEUR : couleurs + style de surface + édition inline (capacité fournie).
export type EditorRenderCtx = {
  theme: PageTheme
  primary: string
  text: string
  muted: string
  accent: string
  surfaceStyle: CSSProperties        // l'objet `s` (background + fontFamily) du builder
  canEdit: boolean
  edit: (key: string) => (value: string) => void
}

// Adapter PUBLIC : couleurs résolues + ids + tracking (jamais d'édition inline).
export type PublicRenderCtx = {
  theme: PageTheme
  G: string
  TEXT: string
  MUTED: string
  FONT_D: string
  FONT_B: string
  pageId: string
  blockId: string
  trackClick: (target: string) => void
}

export type EditorAdapterProps = { content: Record<string, any>; ctx: EditorRenderCtx }
export type PublicAdapterProps = { content: Record<string, any>; ctx: PublicRenderCtx }

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXTE UNIFIÉ — blocs « mise en page libre »
// -----------------------------------------------------------------------------
// Les blocs de la vague Layout n'ont PAS d'édition inline (tout se règle dans le
// panneau de réglages). Leur vue est donc STRICTEMENT identique des deux côtés :
// une seule vue partagée, deux adapters d'une ligne. La parité éditeur/public est
// garantie par construction, pas par un test de comparaison.
// `scale` réduit les tailles dans le canvas de l'éditeur (aperçu plus étroit).
// `mode` sert uniquement à neutraliser les liens dans l'éditeur.
export type UnifiedCtx = {
  mode: "editor" | "public"
  theme: PageTheme
  G: string          // couleur primaire résolue
  TEXT: string
  MUTED: string
  SURFACE: string
  FONT_D: string
  FONT_B: string
  scale: number      // 1 en public, < 1 dans le canvas éditeur
  trackClick: (target: string) => void
}

export function editorCtx(ctx: EditorRenderCtx): UnifiedCtx {
  return {
    mode: "editor",
    theme: ctx.theme,
    G: ctx.primary,
    TEXT: ctx.text,
    MUTED: ctx.muted,
    SURFACE: ctx.theme.surface || "#111009",
    FONT_D: ctx.theme.fontDisplay || "inherit",
    FONT_B: ctx.theme.fontBody || "inherit",
    scale: 0.86,
    trackClick: () => {},
  }
}

export function publicCtx(ctx: PublicRenderCtx): UnifiedCtx {
  return {
    mode: "public",
    theme: ctx.theme,
    G: ctx.G,
    TEXT: ctx.TEXT,
    MUTED: ctx.MUTED,
    SURFACE: (ctx.theme as any)?.surface || "#111009",
    FONT_D: ctx.FONT_D,
    FONT_B: ctx.FONT_B,
    scale: 1,
    trackClick: ctx.trackClick,
  }
}

// Échelle : arrondit une taille de référence (pensée pour le public) au contexte.
export function sz(u: UnifiedCtx, n: number): number {
  return Math.max(1, Math.round(n * u.scale))
}
