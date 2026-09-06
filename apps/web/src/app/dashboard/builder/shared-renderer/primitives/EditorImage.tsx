"use client"
// Primitive image ÉDITEUR : même chemin que le rendu public — SmartImage (webp/avif +
// redimensionnement serveur pour les images uploadées sur Supabase, repli <img> natif
// strictement identique sinon). Elle rendait un <img> brut : sur téléphone, l'auteur
// téléchargeait l'original pleine taille pour une vignette de 52 px, à chaque aperçu.
// onError masque l'élément (pas de boucle). Le placeholder (absence de média) est géré
// par le bloc appelant (icône/emoji spécifique).
import SmartImage from "@/components/SmartImage"
import type { CSSProperties } from "react"
import type { SharedImageModel } from "../models/sharedImage"

export function EditorSharedImage({ model, width = 160, height = 160, sizes, style }: {
  model: SharedImageModel
  /** Dimensions intrinsèques indicatives : servent à choisir la variante servie. */
  width?: number
  height?: number
  sizes?: string
  style: CSSProperties
}) {
  if (!model.src) return null
  return <SmartImage src={model.src} alt={model.alt} width={width} height={height} sizes={sizes} style={style} onError={e => { e.currentTarget.style.display = "none" }} />
}
