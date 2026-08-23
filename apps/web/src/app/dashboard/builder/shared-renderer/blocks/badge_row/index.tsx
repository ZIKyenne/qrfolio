"use client"
// badge_row — Rangée de pastilles. Une simple liste séparée par des virgules devient une
// série d'étiquettes colorées : labels, garanties, spécialités, moyens de paiement.
import { splitList, safeColor, alignOf, flexAlign } from "../../models/layoutStyle"
import { LayoutSurface, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const items = splitList(c.items, 20)
  const accent = safeColor(c.color, u.G)
  const align = alignOf(c.align)
  const kind = String(c.style || "Doux")
  const size = String(c.size || "Normale") === "Grande" ? 13.5 : String(c.size || "") === "Petite" ? 10.5 : 12
  const skin = kind === "Plein"
    ? { background: accent, color: "#080808", border: "none" }
    : kind === "Contour"
      ? { background: "transparent", color: accent, border: `1px solid ${accent}` }
      : { background: `${accent}1A`, color: accent, border: `1px solid ${accent}33` }
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <SurfaceHeading u={u} title={c.title} subtitle={undefined} align={align} color={u.TEXT} mutedColor={u.MUTED} titleSize={13} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: Math.round(6 * u.scale), justifyContent: flexAlign(align), marginTop: c.title ? Math.round(9 * u.scale) : 0 }}>
        {items.map((t, i) => (
          <span key={i} style={{
            ...skin, borderRadius: String(c.shape || "Arrondie") === "Carrée" ? 7 : 999,
            padding: `${Math.round(5 * u.scale)}px ${Math.round(12 * u.scale)}px`,
            fontSize: Math.round(size * u.scale), fontWeight: 700, fontFamily: u.FONT_B, whiteSpace: "nowrap",
          }}>{t}</span>
        ))}
      </div>
    </LayoutSurface>
  )
}

export function EditorBadgeRow({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicBadgeRow({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (splitList(c.items, 20).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
