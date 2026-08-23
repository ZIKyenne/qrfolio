"use client"
// checklist — Liste à coches, avec la possibilité de marquer une ligne comme exclue.
// Un commerçant veut souvent dire ce qui est compris ET ce qui ne l'est pas : une seule
// liste, deux symboles, aucun bloc supplémentaire.
import { extractIndexed } from "../../models/repeaterExtract"
import { alignOf, safeColor } from "../../models/layoutStyle"
import { LayoutSurface, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

type Line = { text: string; off: boolean; note: string }

export function checklistLines(c: Record<string, any>): Line[] {
  return extractIndexed<Line>(c || {}, 12, (src, i) => {
    const text = String(src[`i${i}`] || "").trim()
    if (!text) return null
    return { text, off: String(src[`i${i}_state`] || "") === "Exclu", note: String(src[`i${i}_note`] || "").trim() }
  })
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const lines = checklistLines(c)
  const align = alignOf(c.align, "left")
  const okColor = safeColor(c.check_color, "#39FF8F")
  const boxed = String(c.line_style || "Simple") === "Encadré"
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <SurfaceHeading u={u} title={c.title} subtitle={c.subtitle} align={align} color={u.TEXT} mutedColor={u.MUTED} titleSize={18} />
      <ul style={{ listStyle: "none", padding: 0, margin: `${c.title ? Math.round(12 * u.scale) : 0}px 0 0`, display: "flex", flexDirection: "column", gap: Math.round(boxed ? 7 : 9) }}>
        {lines.map((l, i) => (
          <li key={i} style={{
            display: "flex", gap: Math.round(9 * u.scale), alignItems: "flex-start",
            padding: boxed ? `${Math.round(9 * u.scale)}px ${Math.round(11 * u.scale)}px` : 0,
            background: boxed ? u.FILL : undefined,
            border: boxed ? `1px solid ${u.LINE}` : undefined, borderRadius: boxed ? 9 : undefined,
          }}>
            <span aria-hidden style={{ color: l.off ? "#FF6B6B" : okColor, fontSize: Math.round(14 * u.scale), fontWeight: 800, lineHeight: 1.4, flexShrink: 0 }}>{l.off ? "✕" : "✓"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: l.off ? u.MUTED : u.TEXT, fontSize: Math.round(13 * u.scale), lineHeight: 1.5, fontFamily: u.FONT_B, textDecoration: l.off && String(c.strike || "Oui") === "Oui" ? "line-through" : undefined }}>{l.text}</span>
              {l.note && <span style={{ display: "block", color: u.MUTED, fontSize: Math.round(11 * u.scale), marginTop: Math.round(2 * u.scale), fontFamily: u.FONT_B }}>{l.note}</span>}
            </div>
          </li>
        ))}
      </ul>
    </LayoutSurface>
  )
}

export function EditorChecklist({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicChecklist({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (checklistLines(c).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
