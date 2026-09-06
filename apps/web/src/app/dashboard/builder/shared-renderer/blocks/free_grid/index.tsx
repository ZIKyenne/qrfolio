"use client"
// free_grid — Grille libre de 1 à 3 colonnes, jusqu'à neuf cellules. Chaque cellule
// accepte un emoji OU une image, un titre, un texte et un lien. Contrairement à la
// grille existante (emoji + titre + texte figés), tout est optionnel : on peut donc
// obtenir aussi bien une galerie qu'une liste de services ou un plan de salle.
import { extHref } from "../../../types"
import { extractIndexed } from "../../models/repeaterExtract"
import { safeImageUrl, alignOf, clampInt } from "../../models/layoutStyle"
import { LayoutSurface, SmartCta, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"
import SmartImage from "@/components/SmartImage"

type Cell = { emoji: string; image: string; title: string; text: string; href: string }

export function freeGridCells(c: Record<string, any>): Cell[] {
  return extractIndexed<Cell>(c || {}, 9, (src, i) => {
    const title = String(src[`c${i}_title`] || "").trim()
    const text = String(src[`c${i}_text`] || "").trim()
    const emoji = String(src[`c${i}_emoji`] || "").trim()
    const image = safeImageUrl(src[`c${i}_image`])
    if (!title && !text && !emoji && !image) return null
    return { emoji, image, title, text, href: extHref(String(src[`c${i}_url`] || "")) }
  })
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const cells = freeGridCells(c)
  const cols = clampInt(c.columns, 1, 3, 2)
  const align = alignOf(c.align)
  const boxed = String(c.cell_style || "Carte") !== "Nu"
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <SurfaceHeading u={u} title={c.title} subtitle={c.subtitle} align={align} color={u.TEXT} mutedColor={u.MUTED} titleSize={18} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: Math.round(9 * u.scale), marginTop: c.title || c.subtitle ? Math.round(12 * u.scale) : 0 }}>
        {cells.length === 0 && <p style={{ gridColumn: "1 / -1", color: u.MUTED, fontSize: Math.round(12 * u.scale), textAlign: "center", margin: 0, fontFamily: u.FONT_B }}>Ajoutez vos cases</p>}
        {cells.map((cell, i) => {
          const inner = (
            <>
              {cell.image
                ? <SmartImage src={cell.image} alt="" width={280} height={84} sizes="(max-width: 640px) 50vw, 280px" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} style={{ width: "100%", height: Math.round(84 * u.scale), objectFit: "cover", borderRadius: 8, display: "block", marginBottom: Math.round(8 * u.scale) }} />
                : cell.emoji ? <span style={{ fontSize: Math.round(24 * u.scale), display: "block", marginBottom: Math.round(6 * u.scale) }}>{cell.emoji}</span> : null}
              {cell.title && <p style={{ color: u.TEXT, fontSize: Math.round(13 * u.scale), fontWeight: 700, margin: 0, fontFamily: u.FONT_D }}>{cell.title}</p>}
              {cell.text && <p style={{ color: u.MUTED, fontSize: Math.round(11.5 * u.scale), margin: `${Math.round(4 * u.scale)}px 0 0`, lineHeight: 1.45, fontFamily: u.FONT_B }}>{cell.text}</p>}
            </>
          )
          const box = {
            display: "block", textDecoration: "none", textAlign: align as any,
            padding: boxed ? `${Math.round(13 * u.scale)}px ${Math.round(11 * u.scale)}px` : 0,
            background: boxed ? u.FILL : "transparent",
            border: boxed ? `1px solid ${u.LINE}` : "none",
            borderRadius: 11,
          } as const
          return cell.href
            ? <SmartCta key={i} u={u} href={cell.href} label={inner} style={box} />
            : <div key={i} style={box}>{inner}</div>
        })}
      </div>
    </LayoutSurface>
  )
}

export function EditorFreeGrid({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicFreeGrid({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (freeGridCells(c).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
