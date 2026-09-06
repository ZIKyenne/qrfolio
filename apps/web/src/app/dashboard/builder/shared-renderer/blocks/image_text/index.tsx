"use client"
// image_text — Image et texte côte à côte, image à gauche ou à droite, largeur d'image
// réglable. Sur un écran étroit (< 380 px de conteneur) la mise en page reste lisible
// grâce à un ratio minimum ; c'est la brique de base des présentations « à propos ».
import { extHref } from "../../../types"
import { alignOf, safeImageUrl, textOnSurface, textOn } from "../../models/layoutStyle"
import { LayoutSurface, SmartCta, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"
import SmartImage from "@/components/SmartImage"

const WIDTHS: Record<string, string> = { "Petite": "34%", "Moyenne": "44%", "Grande": "56%" }

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const img = safeImageUrl(c.image)
  const right = /droite/i.test(String(c.side || ""))
  const w = WIDTHS[String(c.image_width || "Moyenne")] || "44%"
  const align = alignOf(c.align, "left")
  const color = textOnSurface(c, u.TEXT)
  const muted = color === "#FFFFFF" ? "rgba(255,255,255,0.78)" : u.MUTED
  const href = extHref(String(c.cta_url || ""))

  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <div style={{ display: "flex", flexDirection: right ? "row-reverse" : "row", alignItems: "center", gap: Math.round(14 * u.scale) }}>
        {img && (
          <div style={{ flex: `0 0 ${w}`, maxWidth: w }}>
            <SmartImage src={img} alt={String(c.title || "")} width={640} height={640} sizes="(max-width: 640px) 100vw, 640px"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
              style={{ width: "100%", aspectRatio: String(c.image_shape || "") === "Carrée" ? "1 / 1" : undefined, display: "block", borderRadius: 12, objectFit: "cover" }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, textAlign: align }}>
          <SurfaceHeading u={u} title={c.title} subtitle={undefined} align={align} color={color} mutedColor={muted} titleSize={17} />
          {c.text && <p style={{ color: muted, fontSize: Math.round(13 * u.scale), lineHeight: 1.6, margin: `${Math.round(6 * u.scale)}px 0 0`, fontFamily: u.FONT_B, whiteSpace: "pre-line" }}>{c.text}</p>}
          {c.cta_label && (
            <SmartCta u={u} href={href} label={c.cta_label} style={{
              display: "inline-block", marginTop: Math.round(10 * u.scale), padding: `${Math.round(8 * u.scale)}px ${Math.round(16 * u.scale)}px`,
              borderRadius: 9, background: u.G, color: textOn(u.G), fontSize: Math.round(12.5 * u.scale), fontWeight: 700, textDecoration: "none", fontFamily: u.FONT_B,
            }} />
          )}
        </div>
      </div>
    </LayoutSurface>
  )
}

export function EditorImageText({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicImageText({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (!safeImageUrl(c.image) && !c.title && !c.text) return null
  return <View content={c} u={publicCtx(ctx)} />
}
