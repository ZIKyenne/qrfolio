"use client"
// avatar_row — Rangée de portraits superposés avec un compteur et une légende.
// Preuve sociale compacte : « + de 400 clients », « notre équipe », « ils étaient là ».
import { extractIndexed } from "../../models/repeaterExtract"
import { safeImageUrl, alignOf, flexAlign, safeColor, textOn } from "../../models/layoutStyle"
import { LayoutSurface } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"
import SmartImage from "@/components/SmartImage"

export function rowAvatars(c: Record<string, any>): { src: string; initial: string }[] {
  return extractIndexed<{ src: string; initial: string }>(c || {}, 6, (src, i) => {
    const img = safeImageUrl(src[`img${i}`])
    const name = String(src[`name${i}`] || "").trim()
    if (!img && !name) return null
    return { src: img, initial: (name || "?").charAt(0).toUpperCase() }
  })
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const items = rowAvatars(c)
  const align = alignOf(c.align)
  const size = Math.round(38 * u.scale)
  const ring = safeColor(c.ring_color, u.SURFACE)
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <div style={{ display: "flex", flexDirection: "column", alignItems: flexAlign(align), gap: Math.round(8 * u.scale) }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {items.map((a, i) => (
            <div key={i} style={{ width: size, height: size, borderRadius: "50%", marginLeft: i === 0 ? 0 : -Math.round(size * 0.32), border: `2px solid ${ring}`, overflow: "hidden", background: `linear-gradient(135deg, ${u.G}, ${u.SURFACE})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: items.length - i }}>
              {a.src
                ? <SmartImage src={a.src} alt="" width={96} height={96} sizes="96px" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ color: textOn(u.G), fontSize: Math.round(14 * u.scale), fontWeight: 800, fontFamily: u.FONT_D }}>{a.initial}</span>}
            </div>
          ))}
          {c.count && <div style={{ height: size, minWidth: size, padding: `0 ${Math.round(9 * u.scale)}px`, borderRadius: 999, marginLeft: -Math.round(size * 0.18), border: `2px solid ${ring}`, background: u.G, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: textOn(u.G), fontSize: Math.round(12 * u.scale), fontWeight: 800, fontFamily: u.FONT_B, whiteSpace: "nowrap" }}>{c.count}</span>
          </div>}
        </div>
        {c.label && <p style={{ color: u.TEXT, fontSize: Math.round(13 * u.scale), fontWeight: 600, margin: 0, fontFamily: u.FONT_B, textAlign: align }}>{c.label}</p>}
        {c.sublabel && <p style={{ color: u.MUTED, fontSize: Math.round(11.5 * u.scale), margin: 0, fontFamily: u.FONT_B, textAlign: align }}>{c.sublabel}</p>}
      </div>
    </LayoutSurface>
  )
}

export function EditorAvatarRow({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicAvatarRow({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (rowAvatars(c).length === 0 && !c.label) return null
  return <View content={c} u={publicCtx(ctx)} />
}
