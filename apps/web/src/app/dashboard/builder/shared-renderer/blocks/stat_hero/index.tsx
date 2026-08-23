"use client"
// stat_hero — UN chiffre, en très grand, avec son libellé et un contexte. Le bloc de
// statistiques existant en aligne quatre, tous petits ; celui-ci met un seul chiffre en
// scène, ce qui frappe bien davantage (« 15 ans », « 4,9/5 », « 2 min »).
import { alignOf, safeColor, clampInt } from "../../models/layoutStyle"
import { LayoutSurface } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const align = alignOf(c.align)
  const accent = safeColor(c.color, u.G)
  const size = clampInt(c.size, 28, 96, 58)
  const gradient = String(c.fill || "Uni") === "Dégradé"
  const grad = gradient
    ? { backgroundImage: `linear-gradient(120deg, ${accent}, ${safeColor(c.color2, u.TEXT)})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" as any }
    : { color: accent }
  return (
    <LayoutSurface content={c} u={u}>
      <div style={{ textAlign: align }}>
        {c.eyebrow && <p style={{ color: u.MUTED, fontSize: Math.round(10.5 * u.scale), textTransform: "uppercase", letterSpacing: 2, margin: `0 0 ${Math.round(6 * u.scale)}px`, fontFamily: u.FONT_B }}>{c.eyebrow}</p>}
        <p style={{ margin: 0, fontSize: Math.round(size * u.scale), fontWeight: 800, lineHeight: 1, fontFamily: u.FONT_D, letterSpacing: -1.5, ...grad }}>
          {c.value}{c.unit && <span style={{ fontSize: Math.round(size * 0.45 * u.scale), marginLeft: Math.round(3 * u.scale) }}>{c.unit}</span>}
        </p>
        {c.label && <p style={{ color: u.TEXT, fontSize: Math.round(15 * u.scale), fontWeight: 700, margin: `${Math.round(8 * u.scale)}px 0 0`, fontFamily: u.FONT_D }}>{c.label}</p>}
        {c.text && <p style={{ color: u.MUTED, fontSize: Math.round(12.5 * u.scale), margin: `${Math.round(5 * u.scale)}px 0 0`, lineHeight: 1.55, fontFamily: u.FONT_B }}>{c.text}</p>}
      </div>
    </LayoutSurface>
  )
}

export function EditorStatHero({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicStatHero({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (!String(c.value || "").trim()) return null
  return <View content={c} u={publicCtx(ctx)} />
}
