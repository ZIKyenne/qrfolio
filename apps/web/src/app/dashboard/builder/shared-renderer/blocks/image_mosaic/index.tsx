"use client"
// image_mosaic — Mosaïque asymétrique : une grande image et quatre petites. Donne du
// rythme là où une galerie régulière fait « catalogue ». Deux dispositions au choix.
import { extractIndexed } from "../../models/repeaterExtract"
import { safeImageUrl } from "../../models/layoutStyle"
import { LayoutSurface, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

export function mosaicImages(c: Record<string, any>): string[] {
  return extractIndexed<string>(c || {}, 5, (src, i) => safeImageUrl(src[`img${i}`]) || null)
}

function Cell({ src, radius, height }: { src: string; radius: number; height?: number }) {
  return <img src={src} alt="" loading="lazy" decoding="async"
    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
    style={{ width: "100%", height: height ? height : "100%", objectFit: "cover", display: "block", borderRadius: radius }} />
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const imgs = mosaicImages(c)
  const big = imgs[0]
  const small = imgs.slice(1, 5)
  const r = 10
  const bigH = Math.round((String(c.layout || "") === "Grande à droite" ? 150 : 168) * u.scale)
  const smallH = Math.round(72 * u.scale)
  const reversed = String(c.layout || "") === "Grande à droite"
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <SurfaceHeading u={u} title={c.title} subtitle={undefined} align="left" color={u.TEXT} mutedColor={u.MUTED} titleSize={17} />
      <div style={{ display: "flex", flexDirection: reversed ? "row-reverse" : "row", gap: Math.round(7 * u.scale), marginTop: c.title ? Math.round(11 * u.scale) : 0 }}>
        {big && <div style={{ flex: "1 1 55%", minWidth: 0 }}><Cell src={big} radius={r} height={bigH} /></div>}
        {small.length > 0 && (
          <div style={{ flex: "1 1 45%", minWidth: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: Math.round(7 * u.scale) }}>
            {small.map((s, i) => <Cell key={i} src={s} radius={r} height={smallH} />)}
          </div>
        )}
      </div>
      {c.caption && <p style={{ color: u.MUTED, fontSize: Math.round(11.5 * u.scale), margin: `${Math.round(8 * u.scale)}px 0 0`, fontFamily: u.FONT_B, fontStyle: "italic" }}>{c.caption}</p>}
    </LayoutSurface>
  )
}

export function EditorImageMosaic({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicImageMosaic({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (mosaicImages(c).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
