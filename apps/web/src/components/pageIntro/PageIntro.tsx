"use client"

// <PageIntro /> — overlay d'intro joué avant l'affichage d'une page publique.
// Ne rend rien dans l'arbre React : l'overlay est injecté en DOM natif puis se
// retire tout seul (voir piIntro.ts). Gating premium appliqué CÔTÉ SERVEUR au
// rendu public (ne pas se fier au seul `enabled`).
import { useEffect, useRef } from "react"
import { initIntro, resetIntroSession, DEFAULTS, type IntroStyle } from "./piIntro"

type Props = {
  enabled?: boolean
  style?: IntroStyle
  accent?: string
  bg?: string
  text?: string
  title: string
  subtitle?: string
  avatar?: string
  duration?: number
  oncePerSession?: boolean
  skippable?: boolean
  containerRef?: React.RefObject<HTMLElement | null> | null  // preview builder (cadre) au lieu du body
  replayKey?: number
  onReady?: () => void   // appelé une fois l'overlay en place (ou l'intro sautée) → retirer le cache SSR
}

export default function PageIntro({
  enabled = true,
  style = DEFAULTS.style,
  accent = DEFAULTS.accent,
  bg = DEFAULTS.bg,
  text = DEFAULTS.text,
  title,
  subtitle = "",
  avatar = "",
  duration = DEFAULTS.duration,
  oncePerSession = DEFAULTS.oncePerSession,
  skippable = DEFAULTS.skippable,
  containerRef = null,
  replayKey = 0,
  onReady,
}: Props) {
  const teardownRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!enabled || !title) { onReady?.(); return }
    if (replayKey > 0) resetIntroSession()

    teardownRef.current = initIntro(
      { style, accent, bg, text, title, subtitle, avatar, duration, oncePerSession, skippable },
      containerRef ? containerRef.current || undefined : undefined
    )
    // L'overlay client est en place (ou l'intro a été sautée : déjà vue cette session)
    // → on peut retirer le cache SSR sans laisser apparaître la page en dessous.
    onReady?.()

    return () => { if (teardownRef.current) teardownRef.current() }
    // volontairement large : toute modif de thème/contenu relance l'intro (utile en preview builder).
  }, [enabled, style, accent, bg, text, title, subtitle, avatar, duration,
      oncePerSession, skippable, containerRef, replayKey])

  return null
}
