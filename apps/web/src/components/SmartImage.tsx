"use client"

// <SmartImage> — <img> qui passe par next/image (avif/webp + redimensionnement
// serveur) UNIQUEMENT pour les images uploadées sur Supabase Storage à dimensions
// connues. Tout le reste retombe sur un <img> natif STRICTEMENT identique :
//   - data: URLs (avatars générés par AvatarStudio) — non optimisables ;
//   - URLs externes collées par l'utilisateur — hôte non déclaré → next/image
//     planterait, et ouvrir remotePatterns à `**` ferait un proxy d'images ouvert.
// => Pire cas : aucun changement. Meilleur cas : image Supabase servie légère.
import Image from "next/image"
import type { CSSProperties } from "react"

const SUPABASE_UPLOAD = /^https:\/\/[a-z0-9-]+\.supabase\.co\//i

type Props = {
  src?: string
  alt?: string
  width: number
  height: number
  style?: CSSProperties
  className?: string
  eager?: boolean
  draggable?: boolean
  onError?: (e: any) => void
  onClick?: (e: any) => void
}

export default function SmartImage({ src, alt = "", width, height, style, className, eager, draggable, onError, onClick }: Props) {
  if (!src || !SUPABASE_UPLOAD.test(src)) {
    // Repli natif identique au comportement historique.
    return (
      <img
        src={src} alt={alt} className={className} style={style}
        loading={eager ? "eager" : "lazy"} decoding="async"
        {...(eager ? { fetchPriority: "high" as const } : {})}
        draggable={draggable} onError={onError} onClick={onClick}
      />
    )
  }
  return (
    <Image
      src={src} alt={alt} width={width} height={height}
      className={className} style={style}
      priority={!!eager} draggable={draggable} onError={onError} onClick={onClick}
    />
  )
}
