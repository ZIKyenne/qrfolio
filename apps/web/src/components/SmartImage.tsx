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
// Une image servie par notre propre origine (chemin absolu, jamais //) est
// optimisable elle aussi : pas d'hôte tiers à déclarer, aucun proxy ouvert.
const MEME_ORIGINE = /^\/(?!\/)/
const optimisable = (src: string) => SUPABASE_UPLOAD.test(src) || MEME_ORIGINE.test(src)

type Props = {
  src?: string
  alt?: string
  width: number
  height: number
  style?: CSSProperties
  className?: string
  eager?: boolean
  draggable?: boolean
  /**
   * Largeur d'affichage réelle, en CSS. Sans elle, le navigateur suppose la
   * pleine largeur et télécharge la plus grosse variante : une photo de
   * 1600 px pour une vignette de 168 px, mesuré sur la galerie à 390 px.
   */
  sizes?: string
  onError?: (e: any) => void
  onClick?: (e: any) => void
  onMouseEnter?: (e: any) => void
  onMouseLeave?: (e: any) => void
}

export default function SmartImage({ src, alt = "", width, height, style, className, eager, draggable, sizes, onError, onClick, onMouseEnter, onMouseLeave }: Props) {
  if (!src || !optimisable(src)) {
    // Repli natif identique au comportement historique.
    return (
      <img
        src={src} alt={alt} className={className} style={style}
        loading={eager ? "eager" : "lazy"} decoding="async"
        {...(eager ? { fetchPriority: "high" as const } : {})}
        draggable={draggable} onError={onError} onClick={onClick}
        onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      />
    )
  }
  return (
    <Image
      src={src} alt={alt} width={width} height={height}
      sizes={sizes}
      className={className} style={style}
      priority={!!eager} draggable={draggable} onError={onError} onClick={onClick}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
    />
  )
}
