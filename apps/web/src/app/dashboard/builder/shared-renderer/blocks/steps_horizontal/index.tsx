"use client"
// steps_horizontal — Étapes disposées horizontalement, reliées par un trait. Le bloc
// « étapes » existant empile verticalement : sur trois étapes courtes, l'horizontale
// tient sur un écran et se lit d'un coup d'œil (Scanner → Choisir → Réserver).
import { extractIndexed } from "../../models/repeaterExtract"
import { safeColor, clampInt } from "../../models/layoutStyle"
import { LayoutSurface, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

type Step = { emoji: string; title: string; text: string }

export function horizontalSteps(c: Record<string, any>): Step[] {
  return extractIndexed<Step>(c || {}, 4, (src, i) => {
    const title = String(src[`s${i}_title`] || "").trim()
    const text = String(src[`s${i}_text`] || "").trim()
    const emoji = String(src[`s${i}_emoji`] || "").trim()
    if (!title && !text && !emoji) return null
    return { emoji, title, text }
  })
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const steps = horizontalSteps(c)
  const accent = safeColor(c.accent_color, u.G)
  const showNumbers = String(c.markers || "Numéros") === "Numéros"
  const dot = Math.round(clampInt(c.marker_size, 24, 60, 34) * u.scale)
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <SurfaceHeading u={u} title={c.title} subtitle={c.subtitle} align="center" color={u.TEXT} mutedColor={u.MUTED} titleSize={18} />
      <div style={{ display: "flex", alignItems: "flex-start", marginTop: c.title || c.subtitle ? Math.round(14 * u.scale) : 0 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, position: "relative", textAlign: "center", paddingTop: Math.round(2 * u.scale) }}>
            {i > 0 && <span aria-hidden style={{ position: "absolute", top: dot / 2, left: "-50%", width: "100%", height: 1, background: `${accent}44` }} />}
            <div style={{
              position: "relative", width: dot, height: dot, borderRadius: "50%", margin: "0 auto",
              background: showNumbers ? accent : `${accent}1F`, border: showNumbers ? "none" : `1.5px solid ${accent}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {showNumbers
                ? <span style={{ color: "#080808", fontSize: Math.round(14 * u.scale), fontWeight: 800, fontFamily: u.FONT_D }}>{i + 1}</span>
                : <span style={{ fontSize: Math.round(16 * u.scale) }}>{s.emoji || "•"}</span>}
            </div>
            {s.title && <p style={{ color: u.TEXT, fontSize: Math.round(12 * u.scale), fontWeight: 700, margin: `${Math.round(7 * u.scale)}px ${Math.round(3 * u.scale)}px 0`, fontFamily: u.FONT_D, lineHeight: 1.3 }}>{s.title}</p>}
            {s.text && <p style={{ color: u.MUTED, fontSize: Math.round(10.5 * u.scale), margin: `${Math.round(3 * u.scale)}px ${Math.round(3 * u.scale)}px 0`, lineHeight: 1.4, fontFamily: u.FONT_B }}>{s.text}</p>}
          </div>
        ))}
      </div>
    </LayoutSurface>
  )
}

export function EditorStepsHorizontal({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicStepsHorizontal({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (horizontalSteps(c).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
