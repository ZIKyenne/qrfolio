"use client"
// logo_marquee — Logos qui défilent en boucle. Le mur de logos existant est une grille
// figée ; ici, dix logos tiennent dans la largeur d'un téléphone sans rien rétrécir.
import { extractIndexed } from "../../models/repeaterExtract"
import { safeImageUrl, clampInt } from "../../models/layoutStyle"
import { LayoutSurface, SurfaceHeading } from "../../primitives/LayoutSurface"
import { Marquee } from "../../primitives/Marquee"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"
import SmartImage from "@/components/SmartImage"

export function marqueeLogos(c: Record<string, any>): { src: string; name: string }[] {
  return extractIndexed<{ src: string; name: string }>(c || {}, 10, (src, i) => {
    const img = safeImageUrl(src[`logo${i}`])
    const name = String(src[`name${i}`] || "").trim()
    if (!img && !name) return null
    return { src: img, name }
  })
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const logos = marqueeLogos(c)
  const h = clampInt(c.logo_height, 22, 90, 40)
  const grey = String(c.style || "Nuances de gris") === "Nuances de gris"
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <SurfaceHeading u={u} title={c.title} subtitle={undefined} align="center" color={u.TEXT} mutedColor={u.MUTED} titleSize={13} />
      <div style={{ marginTop: c.title ? Math.round(11 * u.scale) : 0 }}>
        <Marquee animate={u.mode === "public"} durationSec={clampInt(c.speed, 8, 90, 26)} reverse={String(c.direction || "") === "Droite"} gap={Math.round(22 * u.scale)}>
          {logos.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: Math.round(h * u.scale), flexShrink: 0 }}>
              {l.src
                ? <SmartImage src={l.src} alt={l.name} width={120} height={60} sizes="120px" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} style={{ maxHeight: "100%", maxWidth: Math.round(120 * u.scale), objectFit: "contain", filter: grey ? "grayscale(1)" : undefined, opacity: grey ? 0.75 : 1 }} />
                : <span style={{ color: u.MUTED, fontSize: Math.round(13 * u.scale), fontWeight: 700, whiteSpace: "nowrap", fontFamily: u.FONT_B }}>{l.name}</span>}
            </div>
          ))}
        </Marquee>
      </div>
    </LayoutSurface>
  )
}

export function EditorLogoMarquee({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicLogoMarquee({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (marqueeLogos(c).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
