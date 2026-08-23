"use client"
// progress_bars — Barres de progression avec pourcentage. Le bloc « compétences »
// existant n'affiche que des étiquettes ; ici on montre un niveau, un avancement, une
// jauge d'objectif (cagnotte, places restantes, taux de satisfaction).
import { extractIndexed } from "../../models/repeaterExtract"
import { safeColor, clampInt } from "../../models/layoutStyle"
import { LayoutSurface, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

type Bar = { label: string; value: number; note: string; color: string }

export function progressBars(c: Record<string, any>): Bar[] {
  return extractIndexed<Bar>(c || {}, 8, (src, i) => {
    const label = String(src[`b${i}_label`] || "").trim()
    const raw = src[`b${i}_value`]
    if (!label && (raw === undefined || raw === "")) return null
    return { label, value: clampInt(raw, 0, 100, 0), note: String(src[`b${i}_note`] || "").trim(), color: safeColor(src[`b${i}_color`], "") }
  })
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const bars = progressBars(c)
  const accent = safeColor(c.color, u.G)
  const thickness = Math.round(clampInt(c.thickness, 4, 24, 8) * u.scale)
  const showPct = String(c.show_value || "Oui") === "Oui"
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <SurfaceHeading u={u} title={c.title} subtitle={c.subtitle} align="left" color={u.TEXT} mutedColor={u.MUTED} titleSize={18} />
      <div style={{ display: "flex", flexDirection: "column", gap: Math.round(12 * u.scale), marginTop: c.title || c.subtitle ? Math.round(12 * u.scale) : 0 }}>
        {bars.map((b, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: Math.round(5 * u.scale), gap: Math.round(8 * u.scale) }}>
              <span style={{ color: u.TEXT, fontSize: Math.round(12.5 * u.scale), fontWeight: 600, fontFamily: u.FONT_B }}>{b.label}</span>
              {showPct && <span style={{ color: b.color || accent, fontSize: Math.round(12 * u.scale), fontWeight: 800, fontFamily: u.FONT_B, flexShrink: 0 }}>{b.note || `${b.value}%`}</span>}
            </div>
            <div style={{ height: thickness, borderRadius: 999, background: "rgba(255,255,255,0.09)", overflow: "hidden" }}>
              <div style={{ width: `${b.value}%`, height: "100%", borderRadius: 999, background: b.color || `linear-gradient(90deg, ${accent}, ${accent}AA)` }} />
            </div>
          </div>
        ))}
      </div>
    </LayoutSurface>
  )
}

export function EditorProgressBars({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicProgressBars({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (progressBars(c).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
