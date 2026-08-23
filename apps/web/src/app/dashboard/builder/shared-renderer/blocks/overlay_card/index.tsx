"use client"
// overlay_card — Grande carte visuelle : image de fond, voile réglable, texte posé
// par-dessus (haut / centre / bas) et bouton optionnel. C'est le bloc « couverture »
// que réclament les vitrines, les hôtels et les cartes de restaurant.
import { extHref } from "../../../types"
import { safeImageUrl, pct01, clampInt, alignOf, edgeCss, radiusOf, textOn } from "../../models/layoutStyle"
import { SmartCta } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

const POS: Record<string, string> = { "Haut": "flex-start", "Centre": "center", "Bas": "flex-end" }

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const img = safeImageUrl(c.image)
  const h = clampInt(c.height, 120, 620, 260)
  const align = alignOf(c.align)
  const justify = POS[String(c.position || "Bas")] || "flex-end"
  const href = extHref(String(c.cta_url || ""))
  return (
    <div style={{ padding: edgeCss(c.edge, u.scale) }}>
      <div style={{
        position: "relative", borderRadius: radiusOf(c.radius, 16), overflow: "hidden",
        minHeight: Math.round(h * u.scale), display: "flex", flexDirection: "column", justifyContent: justify,
        background: img ? undefined : "linear-gradient(135deg,rgba(201,168,76,0.25),rgba(0,0,0,0.5))",
        backgroundImage: img ? `url("${img}")` : undefined, backgroundSize: "cover", backgroundPosition: "center",
      }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, rgba(0,0,0,${pct01(c.overlay, 0.62)}), rgba(0,0,0,${pct01(c.overlay, 0.62) * 0.25}))`, pointerEvents: "none" }} />
        <div style={{ position: "relative", padding: `${Math.round(20 * u.scale)}px ${Math.round(18 * u.scale)}px`, textAlign: align }}>
          {c.eyebrow && <p style={{ color: u.G, fontSize: Math.round(10.5 * u.scale), fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: `0 0 ${Math.round(6 * u.scale)}px`, fontFamily: u.FONT_B }}>{c.eyebrow}</p>}
          {c.title && <p style={{ color: "#FFFFFF", fontSize: Math.round(23 * u.scale), fontWeight: 800, margin: 0, lineHeight: 1.2, fontFamily: u.FONT_D, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>{c.title}</p>}
          {c.subtitle && <p style={{ color: "rgba(255,255,255,0.85)", fontSize: Math.round(13.5 * u.scale), margin: `${Math.round(7 * u.scale)}px 0 0`, lineHeight: 1.55, fontFamily: u.FONT_B }}>{c.subtitle}</p>}
          {c.cta_label && (
            <SmartCta u={u} href={href} label={c.cta_label} style={{
              display: "inline-block", marginTop: Math.round(14 * u.scale), padding: `${Math.round(10 * u.scale)}px ${Math.round(20 * u.scale)}px`,
              borderRadius: 9, background: u.G, color: textOn(u.G), fontSize: Math.round(13.5 * u.scale), fontWeight: 700, textDecoration: "none", fontFamily: u.FONT_B,
            }} />
          )}
        </div>
      </div>
    </div>
  )
}

export function EditorOverlayCard({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicOverlayCard({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (!safeImageUrl(c.image) && !c.title) return null
  return <View content={c} u={publicCtx(ctx)} />
}
