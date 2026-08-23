"use client"
// definition_list — Paires « terme → valeur » alignées, comme une fiche technique.
// Le tableau d'infos existant est figé en deux colonnes serrées ; ici on choisit la
// disposition (en ligne ou empilée), le pointillé de liaison et la mise en avant.
import { extractIndexed } from "../../models/repeaterExtract"
import { alignOf, safeColor } from "../../models/layoutStyle"
import { LayoutSurface, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

type Row = { label: string; value: string; strong: boolean }

export function definitionRows(c: Record<string, any>): Row[] {
  return extractIndexed<Row>(c || {}, 12, (src, i) => {
    const label = String(src[`r${i}_label`] || "").trim()
    const value = String(src[`r${i}_value`] || "").trim()
    if (!label && !value) return null
    return { label, value, strong: String(src[`r${i}_strong`] || "") === "Oui" }
  })
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const rows = definitionRows(c)
  const align = alignOf(c.align, "left")
  const stacked = String(c.layout || "En ligne") === "Empilée"
  const dotted = String(c.dots || "Oui") === "Oui" && !stacked
  const accent = safeColor(c.value_color, u.G)
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <SurfaceHeading u={u} title={c.title} subtitle={undefined} align={align} color={u.TEXT} mutedColor={u.MUTED} titleSize={18} />
      <dl style={{ margin: `${c.title ? Math.round(12 * u.scale) : 0}px 0 0`, display: "flex", flexDirection: "column", gap: Math.round(stacked ? 11 : 8) }}>
        {rows.map((r, i) => stacked ? (
          <div key={i}>
            <dt style={{ color: u.MUTED, fontSize: Math.round(10.5 * u.scale), textTransform: "uppercase", letterSpacing: 1.5, fontFamily: u.FONT_B, margin: 0 }}>{r.label}</dt>
            <dd style={{ color: r.strong ? accent : u.TEXT, fontSize: Math.round(14 * u.scale), fontWeight: r.strong ? 700 : 600, margin: `${Math.round(2 * u.scale)}px 0 0`, fontFamily: u.FONT_B }}>{r.value}</dd>
          </div>
        ) : (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: Math.round(7 * u.scale) }}>
            <dt style={{ color: u.MUTED, fontSize: Math.round(12.5 * u.scale), fontFamily: u.FONT_B, margin: 0, flexShrink: 0 }}>{r.label}</dt>
            {dotted && <span aria-hidden style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.22)", transform: `translateY(-${Math.round(3 * u.scale)}px)` }} />}
            <dd style={{ color: r.strong ? accent : u.TEXT, fontSize: Math.round(13 * u.scale), fontWeight: r.strong ? 700 : 600, margin: 0, fontFamily: u.FONT_B, textAlign: "right", flexShrink: 0, maxWidth: "60%" }}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </LayoutSurface>
  )
}

export function EditorDefinitionList({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicDefinitionList({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (definitionRows(c).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
