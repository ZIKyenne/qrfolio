"use client"
// back_to_top — Bouton de retour en haut de page. Indispensable dès qu'une page dépasse
// deux écrans : sans lui, le visiteur arrivé en bas doit remonter à la main.
import { safeColor, alignOf, flexAlign } from "../../models/layoutStyle"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function View({ content: c, u }: { content: Record<string, any>; u: UnifiedCtx }) {
  const accent = safeColor(c.color, u.G)
  const align = alignOf(c.align)
  const label = String(c.label || "Haut de page")
  const round = String(c.shape || "Pastille") === "Rond"
  const scrollTop = () => { try { window.scrollTo({ top: 0, behavior: "smooth" }) } catch { window.scrollTo(0, 0) } }
  const style = {
    display: "inline-flex", alignItems: "center", gap: round ? 0 : Math.round(7 * u.scale),
    padding: round ? 0 : `${Math.round(9 * u.scale)}px ${Math.round(17 * u.scale)}px`,
    width: round ? Math.round(42 * u.scale) : undefined, height: round ? Math.round(42 * u.scale) : undefined,
    justifyContent: "center", borderRadius: 999, background: `${accent}18`, border: `1px solid ${accent}44`,
    color: accent, fontSize: Math.round(12.5 * u.scale), fontWeight: 700, fontFamily: u.FONT_B, cursor: "pointer",
  } as const
  return (
    <div style={{ padding: `${Math.round(12 * u.scale)}px 24px`, display: "flex", justifyContent: flexAlign(align) }}>
      {u.mode === "public"
        ? <button type="button" onClick={scrollTop} style={style}><span aria-hidden>↑</span>{!round && <span>{label}</span>}</button>
        : <div aria-disabled="true" style={style}><span aria-hidden>↑</span>{!round && <span>{label}</span>}</div>}
    </div>
  )
}

export function EditorBackToTop({ content, ctx }: EditorAdapterProps) { return <View content={content} u={editorCtx(ctx)} /> }
export function PublicBackToTop({ content, ctx }: PublicAdapterProps) { return <View content={content || {}} u={publicCtx(ctx)} /> }
