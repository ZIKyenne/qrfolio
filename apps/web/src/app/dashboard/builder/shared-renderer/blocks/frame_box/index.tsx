"use client"
// frame_box — Cadre décoratif autour d'un titre et d'un texte. Quatre styles de bordure
// (or, fine, double, coins) pour donner du relief à une information sans créer un bloc
// métier dédié : mention légale, engagement, note du chef, promesse de la maison.
import { alignOf, safeColor, textOnSurface } from "../../models/layoutStyle"
import { LayoutSurface } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function frameStyle(kind: string, color: string, u: UnifiedCtx): Record<string, any> {
  const k = String(kind || "Or").toLowerCase()
  if (k.startsWith("fine")) return { border: `1px solid ${color}55` }
  if (k.startsWith("double")) return { border: `1px solid ${color}`, boxShadow: `0 0 0 ${Math.round(4 * u.scale)}px ${color}22` }
  if (k.startsWith("épais") || k.startsWith("epais")) return { border: `3px solid ${color}` }
  return { border: `1.5px solid ${color}`, boxShadow: `inset 0 0 ${Math.round(30 * u.scale)}px ${color}18` }
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const align = alignOf(c.align)
  const color = safeColor(c.frame_color, u.G)
  const text = textOnSurface(c, u.TEXT)
  const muted = text === "#FFFFFF" ? "rgba(255,255,255,0.78)" : u.MUTED
  return (
    <LayoutSurface content={c} u={u} defaultPad="none" defaultRadius={0}>
      <div style={{ ...frameStyle(String(c.frame_style || "Or"), color, u), borderRadius: Math.round(14 * u.scale), padding: `${Math.round(20 * u.scale)}px ${Math.round(18 * u.scale)}px`, textAlign: align }}>
        {c.emoji && <span style={{ fontSize: Math.round(24 * u.scale), display: "block", marginBottom: Math.round(8 * u.scale) }}>{c.emoji}</span>}
        {c.title && <p style={{ color: text, fontSize: Math.round(16 * u.scale), fontWeight: 700, margin: 0, fontFamily: u.FONT_D, letterSpacing: 0.3 }}>{c.title}</p>}
        {c.text && <p style={{ color: muted, fontSize: Math.round(13.5 * u.scale), lineHeight: 1.7, margin: `${Math.round(c.title ? 8 : 0) * u.scale}px 0 0`, fontFamily: u.FONT_B, whiteSpace: "pre-line" }}>{c.text}</p>}
        {c.signature && <p style={{ color, fontSize: Math.round(12 * u.scale), fontStyle: "italic", margin: `${Math.round(10 * u.scale)}px 0 0`, fontFamily: u.FONT_B }}>{c.signature}</p>}
      </div>
    </LayoutSurface>
  )
}

export function EditorFrameBox({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicFrameBox({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (!c.title && !c.text) return null
  return <View content={c} u={publicCtx(ctx)} />
}
