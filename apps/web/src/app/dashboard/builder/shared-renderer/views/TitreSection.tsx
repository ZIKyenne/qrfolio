"use client"
// Sur-titre commun aux blocs « tableau » : petites capitales espacées, discret.
// Repris tel quel de la page publiée (11 px, lettres espacées de 2), réduit par `scale`
// dans l'aperçu — au lieu d'être recopié à 10 px d'un côté et 11 px de l'autre.
import { sz, type UnifiedCtx } from "../renderTypes"

export function TitreSection({ u, titre, marge = 10 }: { u: UnifiedCtx; titre?: string; marge?: number }) {
  if (!titre) return null
  return (
    <p style={{
      color: u.MUTED, fontSize: sz(u, 11), textTransform: "uppercase", letterSpacing: 2,
      margin: `0 0 ${sz(u, marge)}px`, fontFamily: u.FONT_B,
    }}>{titre}</p>
  )
}

// Gouttière horizontale des blocs de cette vague (24 px en public).
export function pagePad(u: UnifiedCtx, haut = 10, bas = 14): string {
  return `${sz(u, haut)}px ${sz(u, 24)}px ${sz(u, bas)}px`
}
