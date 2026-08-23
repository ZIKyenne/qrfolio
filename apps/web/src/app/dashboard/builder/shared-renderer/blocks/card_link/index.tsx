"use client"
// card_link — Une grande carte entièrement cliquable : image, titre, description, flèche.
// Là où un bouton n'offre qu'un libellé, cette carte porte un visuel et un contexte —
// c'est la brique des pages « sommaire » qui renvoient vers plusieurs destinations.
import { extHref } from "../../../types"
import { safeImageUrl, alignOf, safeColor } from "../../models/layoutStyle"
import { LayoutSurface, SmartCta } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const img = safeImageUrl(c.image)
  const href = extHref(String(c.url || ""))
  const align = alignOf(c.align, "left")
  const accent = safeColor(c.accent_color, u.G)
  const cover = String(c.layout || "Vignette") === "Couverture"
  const inner = (
    <>
      {cover && img && <img src={img} alt="" loading="lazy" decoding="async" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} style={{ width: "100%", height: Math.round(140 * u.scale), objectFit: "cover", display: "block" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: Math.round(12 * u.scale), padding: `${Math.round(14 * u.scale)}px ${Math.round(14 * u.scale)}px`, textAlign: align }}>
        {!cover && img && <img src={img} alt="" loading="lazy" decoding="async" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} style={{ width: Math.round(56 * u.scale), height: Math.round(56 * u.scale), borderRadius: 11, objectFit: "cover", flexShrink: 0 }} />}
        {!cover && !img && c.emoji && <span style={{ fontSize: Math.round(28 * u.scale), flexShrink: 0 }}>{c.emoji}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          {c.eyebrow && <p style={{ color: accent, fontSize: Math.round(10 * u.scale), fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: `0 0 ${Math.round(3 * u.scale)}px`, fontFamily: u.FONT_B }}>{c.eyebrow}</p>}
          {c.title && <p style={{ color: u.TEXT, fontSize: Math.round(15 * u.scale), fontWeight: 700, margin: 0, fontFamily: u.FONT_D }}>{c.title}</p>}
          {c.text && <p style={{ color: u.MUTED, fontSize: Math.round(12.5 * u.scale), margin: `${Math.round(3 * u.scale)}px 0 0`, lineHeight: 1.5, fontFamily: u.FONT_B }}>{c.text}</p>}
        </div>
        <span aria-hidden style={{ color: accent, fontSize: Math.round(19 * u.scale), fontWeight: 700, flexShrink: 0 }}>›</span>
      </div>
    </>
  )
  const box = {
    display: "block", textDecoration: "none", overflow: "hidden", borderRadius: 13,
    background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}33`,
  } as const
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      {href ? <SmartCta u={u} href={href} label={inner} style={box} /> : <div style={box}>{inner}</div>}
    </LayoutSurface>
  )
}

export function EditorCardLink({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicCardLink({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (!c.title && !c.text) return null
  return <View content={c} u={publicCtx(ctx)} />
}
