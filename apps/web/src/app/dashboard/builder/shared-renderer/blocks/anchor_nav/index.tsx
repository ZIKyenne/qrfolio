"use client"
// anchor_nav — Menu de navigation interne : chaque entrée saute vers un bloc « Point
// d'ancrage » posé plus bas dans la page. C'est ce qui permet enfin de faire des pages
// longues consultables : le visiteur choisit sa section au lieu de tout faire défiler.
import { extractIndexed } from "../../models/repeaterExtract"
import { anchorId, safeColor, alignOf, flexAlign } from "../../models/layoutStyle"
import { LayoutSurface, SmartCta } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

type Entry = { label: string; target: string; emoji: string }

export function anchorEntries(c: Record<string, any>): Entry[] {
  return extractIndexed<Entry>(c || {}, 6, (src, i) => {
    const label = String(src[`i${i}_label`] || "").trim()
    if (!label) return null
    const target = anchorId(src[`i${i}_target`] || label)
    return { label, target, emoji: String(src[`i${i}_emoji`] || "").trim() }
  })
}

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const entries = anchorEntries(c)
  const accent = safeColor(c.accent_color, u.G)
  const align = alignOf(c.align)
  const pill = String(c.style || "Pastilles") === "Pastilles"
  const scroll = String(c.scroll || "Retour à la ligne") === "Défilement"
  return (
    <LayoutSurface content={c} u={u} defaultPad="compact">
      <div style={{
        display: "flex", gap: Math.round(7 * u.scale), justifyContent: flexAlign(align),
        flexWrap: scroll ? "nowrap" : "wrap", overflowX: scroll ? "auto" : undefined,
        paddingBottom: scroll ? Math.round(4 * u.scale) : undefined,
      }}>
        {entries.map((e, i) => (
          <SmartCta key={i} u={u} href={e.target ? `#${e.target}` : ""} external={false} label={<>{e.emoji ? `${e.emoji} ` : ""}{e.label}</>} style={{
            display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", textDecoration: "none",
            padding: `${Math.round(8 * u.scale)}px ${Math.round(14 * u.scale)}px`,
            borderRadius: pill ? 999 : 9,
            background: pill ? `${accent}18` : "transparent",
            border: `1px solid ${accent}${pill ? "3A" : "55"}`,
            color: accent, fontSize: Math.round(12.5 * u.scale), fontWeight: 700, fontFamily: u.FONT_B,
          }} />
        ))}
      </div>
    </LayoutSurface>
  )
}

export function EditorAnchorNav({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicAnchorNav({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (anchorEntries(c).length === 0) return null
  return <View content={c} u={publicCtx(ctx)} />
}
