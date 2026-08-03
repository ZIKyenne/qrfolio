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
