"use client"
// numbered_list — Liste numérotée soignée : pastille chiffrée, titre, description.
// Différente du bloc « étapes » existant, qui impose une lecture chronologique : ici les
// numéros sont un simple repère (top 5, sélection, classement).
import { extractIndexed } from "../../models/repeaterExtract"
import { alignOf, safeColor, textOn } from "../../models/layoutStyle"
import { LayoutSurface, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

type Item = { title: string; text: string }

export function numberedItems(c: Record<string, any>): Item[] {
  return extractIndexed<Item>(c || {}, 10, (src, i) => {
    const title = String(src[`i${i}_title`] || "").trim()
    const text = String(src[`i${i}_text`] || "").trim()
    if (!title && !text) return null
    return { title, text }
  })
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const items = numberedItems(c)
  const align = alignOf(c.align, "left")
  const color = safeColor(c.number_color, u.G)
  const filled = String(c.number_style || "Plein") === "Plein"
  const start = parseInt(String(c.start || "1"), 10) || 1
  const size = Math.round(28 * u.scale)
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <SurfaceHeading u={u} title={c.title} subtitle={c.subtitle} align={align} color={u.TEXT} mutedColor={u.MUTED} titleSize={18} />
      <ol style={{ listStyle: "none", padding: 0, margin: `${c.title ? Math.round(12 * u.scale) : 0}px 0 0`, display: "flex", flexDirection: "column", gap: Math.round(11 * u.scale) }}>
        {items.map((it, i) => (
          <li key={i} style={{ display: "flex", gap: Math.round(11 * u.scale), alignItems: "flex-start" }}>
            <span style={{
              flexShrink: 0, width: size, height: size, borderRadius: String(c.number_shape || "Rond") === "Carré" ? 8 : "50%",
              background: filled ? color : "transparent", border: filled ? "none" : `1.5px solid ${color}`,
              color: filled ? textOn(color) : color, fontWeight: 800, fontSize: Math.round(13 * u.scale),
              display: "flex", alignItems: "center", justifyContent: "center", fontFamily: u.FONT_D,
            }}>{start + i}</span>
            <div style={{ flex: 1, minWidth: 0, paddingTop: Math.round(3 * u.scale) }}>
              {it.title && <p style={{ color: u.TEXT, fontSize: Math.round(13.5 * u.scale), fontWeight: 700, margin: 0, fontFamily: u.FONT_D }}>{it.title}</p>}
              {it.text && <p style={{ color: u.MUTED, fontSize: Math.round(12.5 * u.scale), margin: `${Math.round(3 * u.scale)}px 0 0`, lineHeight: 1.55, fontFamily: u.FONT_B }}>{it.text}</p>}
            </div>
          </li>
        ))}
      </ol>
    </LayoutSurface>
  )
}

export function EditorNumberedList({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicNumberedList({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (numberedItems(c).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
