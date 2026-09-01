"use client"
// Primitives PARTAGÉES des blocs « mise en page libre ».
// - LayoutSurface : conteneur avec fond (couleur / dégradé / image + overlay), arrondi,
//   marges intérieures et extérieures. Le calque d'assombrissement est un div séparé pour
//   que le contenu reste pleinement opaque au-dessus.
// - SmartCta : bouton/lien qui se neutralise dans l'éditeur (aucun href, aria-disabled)
//   et devient un vrai <a> tracké en public. Un seul composant → aucune divergence possible.
import type { CSSProperties, ReactNode } from "react"
import { avecCibleTactile } from "./BlockCtaLink"
import { surfaceStyle, padCss, radiusOf, edgeCss } from "../models/layoutStyle"
import type { UnifiedCtx } from "../renderTypes"

export function LayoutSurface({ content, u, children, defaultPad, defaultRadius, style }: {
  content: Record<string, any>
  u: UnifiedCtx
  children: ReactNode
  defaultPad?: "none" | "compact" | "normal" | "airy"
  defaultRadius?: number
  style?: CSSProperties
}) {
  const radius = radiusOf(content.radius, defaultRadius ?? 14)
  const { container, overlay } = surfaceStyle(content, { accent: u.G, surface: u.SURFACE, radius })
  return (
    <div style={{ padding: edgeCss(content.edge, u.scale) }}>
      <div style={{ ...(container as CSSProperties), ...style }}>
        {overlay && <div aria-hidden style={overlay as CSSProperties} />}
        <div style={{ position: "relative", padding: padCss(content.pad, u.scale, defaultPad ?? "normal") }}>{children}</div>
      </div>
    </div>
  )
}

export function SmartCta({ u, href, label, style, external = true }: {
  u: UnifiedCtx
  href: string
  label: ReactNode
  style: CSSProperties
  external?: boolean
}) {
  // Cible tactile plancher (voir avecCibleTactile) : ces boutons sont ceux qui
  // font réserver, commander, acheter — et on n'y touche qu'au téléphone.
  const st = avecCibleTactile(style)
  if (u.mode === "editor" || !href) return <div aria-disabled="true" style={st}>{label}</div>
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={() => { try { u.trackClick(href) } catch {} }}
      style={st}
    >{label}</a>
  )
}

// Titre + sous-titre standardisés (réutilisés par une dizaine de blocs).
export function SurfaceHeading({ u, title, subtitle, align, color, mutedColor, titleSize }: {
  u: UnifiedCtx
  title?: string
  subtitle?: string
  align: "left" | "center" | "right"
  color: string
  mutedColor: string
  titleSize?: number
}) {
  if (!title && !subtitle) return null
  return (
    <>
      {title && <p style={{ color, fontSize: Math.round((titleSize ?? 21) * u.scale), fontWeight: 700, margin: 0, fontFamily: u.FONT_D, textAlign: align, lineHeight: 1.25 }}>{title}</p>}
      {subtitle && <p style={{ color: mutedColor, fontSize: Math.round(14 * u.scale), margin: title ? `${Math.round(6 * u.scale)}px 0 0` : 0, fontFamily: u.FONT_B, textAlign: align, lineHeight: 1.5 }}>{subtitle}</p>}
    </>
  )
}
