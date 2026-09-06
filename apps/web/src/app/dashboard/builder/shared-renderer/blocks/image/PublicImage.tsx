"use client"
import { imageViewModel } from "../../models/image"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import type { PublicAdapterProps } from "../../renderTypes"
import SmartImage from "@/components/SmartImage"

// Public : null si pas de média ; lazy loading ; lien optionnel (href durci via extHref, tracké).
export function PublicImage({ content, ctx }: PublicAdapterProps) {
  const { hasMedia, src, alt, caption, isCircle, rounded, aspectRatio, link } = imageViewModel(content)
  if (!hasMedia) return null
  const { MUTED, FONT_B, trackClick } = ctx
  const radius = isCircle ? "50%" : rounded === "rounded" ? 16 : 0
  const imgEl = (
    <SmartImage src={src!} alt={alt} width={800} height={800} sizes="(max-width: 640px) 100vw, 800px" onError={e => (e.currentTarget.style.display = "none")}
      style={{ width: "100%", height: aspectRatio ? "100%" : undefined, maxHeight: aspectRatio ? undefined : 320, aspectRatio, objectFit: "cover", display: "block", borderRadius: radius, transition: "transform 0.3s" }}
      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
  )
  const wrapped = link.visible
    ? <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={trackClick} style={{ display: "block", textDecoration: "none" }}>{imgEl}</PublicCtaLink>
    : imgEl
  return (
    <div style={{ overflow: "hidden", padding: isCircle ? "8px 24px 0" : 0 }}>
      {isCircle ? <div style={{ maxWidth: 240, margin: "0 auto" }}>{wrapped}</div> : wrapped}
      {caption && <p style={{ color: MUTED, fontSize: 12, textAlign: "center", margin: "7px 24px", fontFamily: FONT_B }}>{caption}</p>}
    </div>
  )
}
