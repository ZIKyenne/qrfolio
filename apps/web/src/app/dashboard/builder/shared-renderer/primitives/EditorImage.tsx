"use client"
// Primitive image ÉDITEUR : <img> natif simple (aucun SmartImage → aucun next/image dans le
// bundle éditeur). onError masque l'élément (pas de boucle). Le placeholder (absence de média)
// est géré par le bloc appelant (icône/emoji spécifique).
import type { CSSProperties } from "react"
import type { SharedImageModel } from "../models/sharedImage"

export function EditorSharedImage({ model, style }: { model: SharedImageModel; style: CSSProperties }) {
  if (!model.src) return null
  return <img src={model.src} alt={model.alt} style={style} onError={e => { e.currentTarget.style.display = "none" }} />
}
