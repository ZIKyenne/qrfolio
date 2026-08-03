"use client"
// Abstraction de LIEN partagée pour les CTA (vague 2 + pricing).
// - PublicCtaLink : vrai <a> sécurisé (href sûr fourni par le modèle), target/rel fidèles
//   au legacy, tracking injecté (jamais dans le modèle pur), navigation non bloquée si le
//   tracking échoue (onClick synchrone, sans await).
// - EditorCtaShell : conteneur NON navigable (aucun href, aucun tracking), aria-disabled.
import type { CSSProperties, ReactNode } from "react"

export function PublicCtaLink({ href, external, trackTarget, trackClick, style, children }: {
  href: string | null
  external: boolean
  trackTarget: string
  trackClick: (target: string) => void
  style: CSSProperties
  children: ReactNode
}) {
  return (
    <a
      href={href || "#"}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={() => { try { trackClick(trackTarget) } catch {} }}
      style={style}
    >{children}</a>
  )
}

export function EditorCtaShell({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return <div aria-disabled="true" style={style}>{children}</div>
}
