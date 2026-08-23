"use client"
// stack_cards — Jusqu'à six cartes empilées verticalement : image, titre, texte, lien.
// C'est le répétiteur « libre » : là où les blocs métier imposent leurs champs, celui-ci
// laisse composer n'importe quelle liste illustrée (services, quartiers, formules, étapes).
import { extHref } from "../../../types"
import { extractIndexed } from "../../models/repeaterExtract"
import { safeImageUrl, alignOf } from "../../models/layoutStyle"
import { LayoutSurface, SmartCta, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

type Card = { image: string; title: string; text: string; label: string; href: string; badge: string }

export function stackCardsItems(c: Record<string, any>): Card[] {
  return extractIndexed<Card>(c || {}, 6, (src, i) => {
    const title = String(src[`c${i}_title`] || "").trim()
    const text = String(src[`c${i}_text`] || "").trim()
    const image = safeImageUrl(src[`c${i}_image`])
    if (!title && !text && !image) return null
    return { image, title, text, label: String(src[`c${i}_label`] || "").trim(), href: extHref(String(src[`c${i}_url`] || "")), badge: String(src[`c${i}_badge`] || "").trim() }
  })
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const items = stackCardsItems(c)
  const align = alignOf(c.align, "left")
  const media = String(c.media || "Vignette")
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <SurfaceHeading u={u} title={c.title} subtitle={c.subtitle} align={align} color={u.TEXT} mutedColor={u.MUTED} titleSize={18} />
      <div style={{ display: "flex", flexDirection: "column", gap: Math.round(10 * u.scale), marginTop: c.title || c.subtitle ? Math.round(12 * u.scale) : 0 }}>
        {items.length === 0 && <p style={{ color: u.MUTED, fontSize: Math.round(12 * u.scale), textAlign: "center", margin: 0, fontFamily: u.FONT_B }}>Ajoutez votre première carte</p>}
        {items.map((it, i) => {
          const banner = media === "Bandeau" && it.image
          const inner = (
            <>
              {banner && <img src={it.image} alt="" loading="lazy" decoding="async" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} style={{ width: "100%", height: Math.round(120 * u.scale), objectFit: "cover", display: "block" }} />}
              <div style={{ display: "flex", gap: Math.round(11 * u.scale), alignItems: "center", padding: `${Math.round(12 * u.scale)}px ${Math.round(13 * u.scale)}px` }}>
                {!banner && it.image && <img src={it.image} alt="" loading="lazy" decoding="async" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} style={{ width: Math.round(54 * u.scale), height: Math.round(54 * u.scale), borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {it.badge && <span style={{ display: "inline-block", background: `${u.G}22`, color: u.G, border: `1px solid ${u.G}44`, borderRadius: 20, padding: `${Math.round(2 * u.scale)}px ${Math.round(9 * u.scale)}px`, fontSize: Math.round(10 * u.scale), fontWeight: 700, marginBottom: Math.round(5 * u.scale), fontFamily: u.FONT_B }}>{it.badge}</span>}
                  {it.title && <p style={{ color: u.TEXT, fontSize: Math.round(14 * u.scale), fontWeight: 700, margin: 0, fontFamily: u.FONT_D }}>{it.title}</p>}
                  {it.text && <p style={{ color: u.MUTED, fontSize: Math.round(12.5 * u.scale), margin: `${Math.round(3 * u.scale)}px 0 0`, lineHeight: 1.5, fontFamily: u.FONT_B }}>{it.text}</p>}
                </div>
                {it.label && <span style={{ color: u.G, fontSize: Math.round(12 * u.scale), fontWeight: 700, whiteSpace: "nowrap", fontFamily: u.FONT_B }}>{it.label} →</span>}
              </div>
            </>
          )
          const box = { display: "block", background: u.FILL, border: `1px solid ${u.LINE}`, borderRadius: 12, overflow: "hidden", textDecoration: "none" } as const
          return it.href
            ? <SmartCta key={i} u={u} href={it.href} label={inner} style={box} />
            : <div key={i} style={box}>{inner}</div>
        })}
      </div>
    </LayoutSurface>
  )
}

export function EditorStackCards({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicStackCards({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (stackCardsItems(c).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
