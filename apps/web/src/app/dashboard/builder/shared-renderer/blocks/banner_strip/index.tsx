"use client"
// banner_strip — Bande d'annonce pleine largeur : emoji, message court, lien optionnel.
// Trois styles (plein, contour, dégradé). Pensée pour l'info qui doit se voir en premier :
// « Fermé le lundi », « Livraison offerte dès 25 € », « Nouvelle carte ».
import { extHref } from "../../../types"
import { safeColor, edgeCss, radiusOf } from "../../models/layoutStyle"
import { SmartCta } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const color = safeColor(c.color, u.G)
  const kind = String(c.style || "Plein").toLowerCase()
  const outline = kind.startsWith("contour")
  const gradient = kind.startsWith("dégra") || kind.startsWith("degra")
  const fg = outline ? color : "#080808"
  const href = extHref(String(c.cta_url || ""))
  const bg = outline ? "transparent" : gradient ? `linear-gradient(135deg, ${color}, ${safeColor(c.color2, u.SURFACE)})` : color
  return (
    <div style={{ padding: edgeCss(c.edge, u.scale) }}>
      <div style={{
        background: bg, border: outline ? `1.5px solid ${color}` : "none", borderRadius: radiusOf(c.radius, 10),
        padding: `${Math.round(12 * u.scale)}px ${Math.round(15 * u.scale)}px`,
        display: "flex", alignItems: "center", gap: Math.round(10 * u.scale), justifyContent: "center", flexWrap: "wrap",
      }}>
        {c.emoji && <span style={{ fontSize: Math.round(18 * u.scale) }}>{c.emoji}</span>}
        <p style={{ color: gradient ? "#FFFFFF" : fg, fontSize: Math.round(13.5 * u.scale), fontWeight: 700, margin: 0, fontFamily: u.FONT_B, textAlign: "center" }}>{c.text}</p>
        {c.cta_label && <SmartCta u={u} href={href} label={c.cta_label} style={{
          padding: `${Math.round(5 * u.scale)}px ${Math.round(12 * u.scale)}px`, borderRadius: 20,
          background: outline ? color : "rgba(0,0,0,0.18)", color: outline ? "#080808" : gradient ? "#FFFFFF" : fg,
          fontSize: Math.round(11.5 * u.scale), fontWeight: 700, textDecoration: "none", fontFamily: u.FONT_B, whiteSpace: "nowrap",
        }} />}
      </div>
    </div>
  )
}

export function EditorBannerStrip({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicBannerStrip({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (!c.text) return null
  return <View content={c} u={publicCtx(ctx)} />
}
