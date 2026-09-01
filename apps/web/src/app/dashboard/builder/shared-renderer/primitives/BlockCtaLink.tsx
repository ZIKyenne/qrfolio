"use client"
// Abstraction de LIEN partagée pour les CTA (vague 2 + pricing).
// - PublicCtaLink : vrai <a> sécurisé (href sûr fourni par le modèle), target/rel fidèles
//   au legacy, tracking injecté (jamais dans le modèle pur), navigation non bloquée si le
//   tracking échoue (onClick synchrone, sans await).
// - EditorCtaShell : conteneur NON navigable (aucun href, aucun tracking), aria-disabled.
import type { CSSProperties, ReactNode } from "react"

/**
 * Plancher de cible tactile pour TOUS les appels à l'action d'une page publiée.
 *
 * Une page QRowg n'est presque jamais vue sur un ordinateur : on la découvre en
 * scannant un QR, donc au téléphone, souvent debout, une main occupée. Mesuré au
 * navigateur sur les 87 blocs, quinze commandes tombaient sous la barre des
 * 36 px — « ↓ Télécharger » à 15 px, « Voir plus » à 16 px, « J'en profite » à
 * 25 px, « Billets → » à 29 px. Ce sont exactement les gestes qui font gagner de
 * l'argent au commerçant : réserver, commander, prendre un billet.
 *
 * On n'écrase pas le dessin : couleurs, rayons et marges de l'appelant restent.
 * Seules la HAUTEUR minimale et le centrage du libellé sont imposés, et
 * l'alignement horizontal suit le `textAlign` demandé.
 */
export const CIBLE_TACTILE_MIN = 44

export function avecCibleTactile(style: CSSProperties): CSSProperties {
  const pleineLargeur = style.display === "block" || style.width === "100%"
  const horizontal = style.justifyContent
    ?? (style.textAlign === "left" || style.textAlign === "start" ? "flex-start"
      : style.textAlign === "right" || style.textAlign === "end" ? "flex-end"
      : "center")
  return {
    ...style,
    minHeight: CIBLE_TACTILE_MIN,
    boxSizing: "border-box",
    display: pleineLargeur ? "flex" : "inline-flex",
    alignItems: "center",
    justifyContent: horizontal,
  }
}

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
      style={avecCibleTactile(style)}
    >{children}</a>
  )
}

export function EditorCtaShell({ style, children }: { style: CSSProperties; children: ReactNode }) {
  // Même géométrie dans l'éditeur : sinon l'aperçu ment sur la taille réelle.
  return <div aria-disabled="true" style={avecCibleTactile(style)}>{children}</div>
}
