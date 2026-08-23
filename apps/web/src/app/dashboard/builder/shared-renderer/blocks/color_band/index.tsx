"use client"
// color_band — Bande de couleur ou de dégradé pleine largeur, hauteur libre. Sert de
// respiration colorée entre deux zones, ou de fond derrière un séparateur de forme.
import { safeColor, clampInt, safeImageUrl, pct01 } from "../../models/layoutStyle"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const h = clampInt(c.height, 4, 400, 48)
  const kind = String(c.fill || "Couleur")
  const c1 = safeColor(c.color, u.G)
  const c2 = safeColor(c.color2, u.SURFACE)
  const img = safeImageUrl(c.image)
  const background = kind === "Image" && img ? undefined : kind === "Dégradé" ? `linear-gradient(${clampInt(c.angle, 0, 360, 135)}deg, ${c1}, ${c2})` : c1
  return (
    <div style={{
      height: Math.round(h * u.scale), background,
      backgroundImage: kind === "Image" && img ? `url(${img})` : undefined,
      backgroundSize: "cover", backgroundPosition: "center", position: "relative",
    }}>
      {kind === "Image" && img && <div aria-hidden style={{ position: "absolute", inset: 0, background: "#000", opacity: pct01(c.overlay, 0.25) }} />}
    </div>
  )
}

export function EditorColorBand({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicColorBand({ content, ctx }: PublicAdapterProps) { return <View content={content || {}} u={publicCtx(ctx)} /> }
