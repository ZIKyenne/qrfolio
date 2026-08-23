"use client"
// decor_line — Ligne décorative avec, au centre, un emoji ou un mot. Là où le séparateur
// existant propose quatre styles figés, celui-ci laisse choisir la couleur, l'épaisseur,
// la largeur et le contenu central : le même bloc sert de filet discret ou de titre orné.
import { safeColor, clampInt } from "../../models/layoutStyle"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const color = safeColor(c.color, u.G)
  const thickness = clampInt(c.thickness, 1, 8, 1)
  const width = clampInt(c.width, 20, 100, 70)
  const kind = String(c.line_style || "Dégradé")
  const center = String(c.center || "").trim()
  const line: Record<string, any> = kind === "Pointillés"
    ? { borderTop: `${thickness}px dotted ${color}88`, height: 0 }
    : kind === "Tirets"
      ? { borderTop: `${thickness}px dashed ${color}88`, height: 0 }
      : kind === "Plein"
        ? { background: color, height: thickness }
        : { background: `linear-gradient(to right, transparent, ${color}, transparent)`, height: thickness }
  return (
    <div style={{ padding: `${Math.round(clampInt(c.space, 0, 60, 14) * u.scale)}px 24px` }}>
      <div style={{ display: "flex", alignItems: "center", gap: Math.round(11 * u.scale), width: `${width}%`, margin: "0 auto" }}>
        <div style={{ flex: 1, ...line }} />
        {center && <span style={{ color, fontSize: Math.round((center.length > 2 ? 11 : 16) * u.scale), fontWeight: 700, letterSpacing: center.length > 2 ? 2 : 0, textTransform: center.length > 2 ? "uppercase" : "none", whiteSpace: "nowrap", fontFamily: u.FONT_B }}>{center}</span>}
        {center && <div style={{ flex: 1, ...line }} />}
      </div>
    </div>
  )
}

export function EditorDecorLine({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicDecorLine({ content, ctx }: PublicAdapterProps) { return <View content={content || {}} u={publicCtx(ctx)} /> }
