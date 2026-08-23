"use client"
// full_bleed_image — Image bord à bord, avec légende optionnelle et hauteur au choix.
// « Auto » respecte les proportions d'origine ; les autres recadrent proprement pour
// obtenir une bande régulière, utile en tête de page ou entre deux sections.
import { safeImageUrl, clampInt, edgeCss, radiusOf } from "../../models/layoutStyle"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

const HEIGHTS: Record<string, number> = { "Petite": 140, "Moyenne": 220, "Grande": 320, "Très grande": 420 }

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const img = safeImageUrl(c.image)
  const key = String(c.height || "Moyenne")
  const auto = key === "Auto"
  const h = HEIGHTS[key] ?? clampInt(c.height, 100, 620, 220)
  const radius = radiusOf(c.radius, 0)
  return (
    <div style={{ padding: edgeCss(c.edge ?? "Bord à bord", u.scale) }}>
      {img
        ? <img src={img} alt={String(c.caption || "")} loading="lazy" decoding="async"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
            style={{ width: "100%", display: "block", borderRadius: radius, ...(auto ? {} : { height: Math.round(h * u.scale), objectFit: "cover" }) }} />
        : <div style={{ width: "100%", height: Math.round((auto ? 200 : h) * u.scale), borderRadius: radius, background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: u.MUTED, fontSize: Math.round(12 * u.scale), fontFamily: u.FONT_B }}>Ajoutez une image</div>}
      {c.caption && <p style={{ color: u.MUTED, fontSize: Math.round(11.5 * u.scale), textAlign: "center", margin: `${Math.round(7 * u.scale)}px ${Math.round(24 * u.scale)}px 0`, fontFamily: u.FONT_B, fontStyle: "italic" }}>{c.caption}</p>}
    </div>
  )
}

export function EditorFullBleedImage({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicFullBleedImage({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (!safeImageUrl(c.image)) return null
  return <View content={c} u={publicCtx(ctx)} />
}
