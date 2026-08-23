"use client"
// icon_row — Rangée d'icônes avec leur libellé, réparties également. Sert de résumé
// visuel des points forts (Wi-Fi, terrasse, accès PMR, paiement sans contact) sans
// écrire un paragraphe ni ajouter cinq blocs distincts.
import { extractIndexed } from "../../models/repeaterExtract"
import { safeColor, clampInt, safeImageUrl } from "../../models/layoutStyle"
import { LayoutSurface, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

type Ico = { emoji: string; image: string; label: string }

export function iconRowItems(c: Record<string, any>): Ico[] {
  return extractIndexed<Ico>(c || {}, 6, (src, i) => {
    const emoji = String(src[`i${i}_emoji`] || "").trim()
    const label = String(src[`i${i}_label`] || "").trim()
    const image = safeImageUrl(src[`i${i}_image`])
    if (!emoji && !label && !image) return null
    return { emoji, image, label }
  })
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const items = iconRowItems(c)
  const accent = safeColor(c.color, u.G)
  const circle = String(c.icon_style || "Cercle") === "Cercle"
  const box = Math.round(clampInt(c.icon_size, 26, 72, 44) * u.scale)
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <SurfaceHeading u={u} title={c.title} subtitle={undefined} align="center" color={u.TEXT} mutedColor={u.MUTED} titleSize={14} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length || 1, clampInt(c.per_row, 2, 6, 4))}, minmax(0,1fr))`, gap: Math.round(9 * u.scale), marginTop: c.title ? Math.round(11 * u.scale) : 0 }}>
        {items.map((it, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{
              width: box, height: box, margin: "0 auto", borderRadius: circle ? "50%" : 11,
              background: circle ? `${accent}16` : "transparent", border: circle ? `1px solid ${accent}30` : "none",
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            }}>
              {it.image
                ? <img src={it.image} alt="" loading="lazy" decoding="async" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} style={{ width: "72%", height: "72%", objectFit: "contain" }} />
                : <span style={{ fontSize: Math.round(box * 0.5) }}>{it.emoji || "•"}</span>}
            </div>
            {it.label && <p style={{ color: u.MUTED, fontSize: Math.round(10.5 * u.scale), margin: `${Math.round(6 * u.scale)}px 0 0`, lineHeight: 1.3, fontFamily: u.FONT_B }}>{it.label}</p>}
          </div>
        ))}
      </div>
    </LayoutSurface>
  )
}

export function EditorIconRow({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicIconRow({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (iconRowItems(c).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
