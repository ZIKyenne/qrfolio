"use client"
// text_columns — Texte long réparti en colonnes façon journal, avec lettrine optionnelle.
// Un paragraphe de dix lignes sur un téléphone décourage la lecture ; en deux colonnes
// courtes, il passe. Le nombre de colonnes retombe à une seule sous 360 px.
import { alignOf, clampInt } from "../../models/layoutStyle"
import { LayoutSurface, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

const DROPCAP_CSS = `.qf-dropcap::first-letter{float:left;font-size:2.9em;line-height:.85;padding:.05em .09em 0 0;font-weight:700}`

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const align = alignOf(c.align, "left")
  const cols = clampInt(c.columns, 1, 3, 2)
  const dropcap = String(c.dropcap || "Non") === "Oui"
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      {dropcap && <style dangerouslySetInnerHTML={{ __html: DROPCAP_CSS }} />}
      <SurfaceHeading u={u} title={c.title} subtitle={undefined} align={align} color={u.TEXT} mutedColor={u.MUTED} titleSize={18} />
      <p className={dropcap ? "qf-dropcap" : undefined} style={{
        color: u.TEXT, fontSize: Math.round(13 * u.scale), lineHeight: 1.75, fontFamily: u.FONT_B,
        margin: c.title ? `${Math.round(10 * u.scale)}px 0 0` : 0, textAlign: String(c.align || "") === "Justifié" ? "justify" : align,
        columnCount: cols, columnGap: Math.round(16 * u.scale),
        columnRule: String(c.rule || "Non") === "Oui" ? `1px solid ${u.LINE}` : undefined,
        whiteSpace: "pre-line", hyphens: "auto",
      }}>{c.text}</p>
    </LayoutSurface>
  )
}

export function EditorTextColumns({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicTextColumns({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (!String(c.text || "").trim()) return null
  return <View content={c} u={publicCtx(ctx)} />
}
