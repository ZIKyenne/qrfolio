"use client"
// Primitive image PUBLIC : SmartImage (webp/avif + redimensionnement pour les images Supabase
// uploadées, repli <img> natif identique sinon) + lazy loading. onError masque l'élément.
// Le placeholder (absence de média) est géré par le bloc appelant.
import SmartImage from "@/components/SmartImage"
import type { CSSProperties } from "react"
import type { SharedImageModel } from "../models/sharedImage"

export function PublicSharedImage({ model, width, height, sizes, style }: { model: SharedImageModel; width: number; height: number; sizes?: string; style: CSSProperties }) {
  if (!model.src) return null
  return <SmartImage src={model.src} alt={model.alt} width={width} height={height} sizes={sizes} style={style} onError={e => { e.currentTarget.style.display = "none" }} />
}
