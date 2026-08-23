"use client"
// compare_two — Comparatif en deux colonnes, ligne à ligne, avec une coche à gauche et
// une croix à droite (ou l'inverse). Répond à « pourquoi vous plutôt qu'un autre »,
// « avant / après », « formule simple / complète » sans tableau de tarifs complet.
import { extractIndexed } from "../../models/repeaterExtract"
import { safeColor } from "../../models/layoutStyle"
import { LayoutSurface, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

type Row = { left: string; right: string }

export function compareRows(c: Record<string, any>): Row[] {
  return extractIndexed<Row>(c || {}, 8, (src, i) => {
    const left = String(src[`r${i}_left`] || "").trim()
    const right = String(src[`r${i}_right`] || "").trim()
    if (!left && !right) return null
    return { left, right }
  })
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const rows = compareRows(c)
  const good = safeColor(c.left_color, "#39FF8F")
  const bad = safeColor(c.right_color, "#FF6B6B")
  const marks = String(c.marks || "Oui") === "Oui"
  const cell = (txt: string, color: string, mark: string) => (
    <div style={{ flex: 1, minWidth: 0, display: "flex", gap: Math.round(6 * u.scale), alignItems: "flex-start", padding: `${Math.round(9 * u.scale)}px ${Math.round(10 * u.scale)}px` }}>
      {marks && <span aria-hidden style={{ color, fontSize: Math.round(12 * u.scale), fontWeight: 800, flexShrink: 0, lineHeight: 1.4 }}>{mark}</span>}
      <span style={{ color: u.TEXT, fontSize: Math.round(12 * u.scale), lineHeight: 1.45, fontFamily: u.FONT_B }}>{txt}</span>
    </div>
  )
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <SurfaceHeading u={u} title={c.title} subtitle={undefined} align="center" color={u.TEXT} mutedColor={u.MUTED} titleSize={18} />
      <div style={{ marginTop: c.title ? Math.round(12 * u.scale) : 0, border: `1px solid ${u.LINE}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", background: u.FILL }}>
          <div style={{ flex: 1, minWidth: 0, padding: `${Math.round(9 * u.scale)}px ${Math.round(10 * u.scale)}px`, textAlign: "center" }}>
            <span style={{ color: good, fontSize: Math.round(12 * u.scale), fontWeight: 800, fontFamily: u.FONT_D }}>{c.left_title || "Nous"}</span>
          </div>
          <div style={{ width: 1, background: u.LINE }} />
          <div style={{ flex: 1, minWidth: 0, padding: `${Math.round(9 * u.scale)}px ${Math.round(10 * u.scale)}px`, textAlign: "center" }}>
            <span style={{ color: u.MUTED, fontSize: Math.round(12 * u.scale), fontWeight: 800, fontFamily: u.FONT_D }}>{c.right_title || "Ailleurs"}</span>
          </div>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", borderTop: `1px solid ${u.LINE}` }}>
            {cell(r.left, good, "✓")}
            <div style={{ width: 1, background: u.LINE }} />
            {cell(r.right, bad, "✕")}
          </div>
        ))}
      </div>
    </LayoutSurface>
  )
}

export function EditorCompareTwo({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicCompareTwo({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (compareRows(c).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
