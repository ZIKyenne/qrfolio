"use client"
// free_section — LA section libre : fond au choix (couleur, dégradé, image + voile),
// sur-titre / titre / sous-titre / texte, jusqu'à deux boutons, hauteur minimale.
// C'est le bloc « couteau suisse » : il permet de composer une page entière sans
// dépendre d'un bloc métier figé. Vue unique → parité éditeur/public par construction.
import { extHref } from "../../../types"
import { alignOf, textOnSurface, clampInt } from "../../models/layoutStyle"
import { LayoutSurface, SmartCta, SurfaceHeading } from "../../primitives/LayoutSurface"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const align = alignOf(c.align)
  const color = textOnSurface(c, u.TEXT)
  const muted = color === "#FFFFFF" ? "rgba(255,255,255,0.78)" : u.MUTED
  const minH = clampInt(c.min_height, 0, 600, 0)
  const ctas: { label: string; href: string; primary: boolean }[] = []
  if (c.cta_label) ctas.push({ label: String(c.cta_label), href: extHref(String(c.cta_url || "")), primary: true })
  if (c.cta2_label) ctas.push({ label: String(c.cta2_label), href: extHref(String(c.cta2_url || "")), primary: false })

  return (
    <LayoutSurface content={c} u={u} style={minH ? { minHeight: Math.round(minH * u.scale) } : undefined}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: minH ? Math.round((minH - 44) * u.scale) : undefined, textAlign: align }}>
        {c.eyebrow && <p style={{ color: u.G, fontSize: Math.round(11 * u.scale), fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: `0 0 ${Math.round(8 * u.scale)}px`, fontFamily: u.FONT_B }}>{c.eyebrow}</p>}
        <SurfaceHeading u={u} title={c.title} subtitle={c.subtitle} align={align} color={color} mutedColor={muted} titleSize={24} />
        {c.text && <p style={{ color: muted, fontSize: Math.round(14 * u.scale), lineHeight: 1.7, margin: `${Math.round(12 * u.scale)}px 0 0`, fontFamily: u.FONT_B, whiteSpace: "pre-line" }}>{c.text}</p>}
        {ctas.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: Math.round(9 * u.scale), marginTop: Math.round(18 * u.scale), justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center" }}>
            {ctas.map((b, i) => (
              <SmartCta key={i} u={u} href={b.href} label={b.label} style={{
                display: "inline-block", padding: `${Math.round(11 * u.scale)}px ${Math.round(22 * u.scale)}px`, borderRadius: 10,
                fontSize: Math.round(14 * u.scale), fontWeight: 700, textDecoration: "none", fontFamily: u.FONT_B,
                background: b.primary ? u.G : "transparent", color: b.primary ? "#080808" : color,
                border: b.primary ? "none" : `1.5px solid ${color === "#FFFFFF" ? "rgba(255,255,255,0.45)" : u.G}`,
              }} />
            ))}
          </div>
        )}
      </div>
    </LayoutSurface>
  )
}

export function EditorFreeSection({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicFreeSection({ content, ctx }: PublicAdapterProps) {
  const c = content || {}
  if (!c.title && !c.text && !c.subtitle && !c.eyebrow && !c.bg_image && !c.cta_label) return null
  return <View content={c} u={publicCtx(ctx)} />
}
