"use client"
// cta_button — Le bouton d'action libre, le bloc le plus pose de tous.
// « Pleine largeur » etait propose dans les reglages et n'avait aucun effet :
// le bouton s'etirait toujours. « Non » donne un bouton ajuste a son libelle.
import { boutonAction } from "../../models/contactEtAction"
import { pagePad } from "../../views/TitreSection"
import { SmartCta } from "../../primitives/LayoutSurface"
import { ctaButtonStyle, CTA_ANIM_CSS } from "../../../types"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function Vue({ u, c, accent }: { u: UnifiedCtx; c: Record<string, any>; accent: string }) {
  const m = boutonAction(c)!
  const { style, className } = ctaButtonStyle(m.style, { G: u.G, accent, text: u.TEXT })
  return (
    <div style={{ padding: pagePad(u, 6, 12), textAlign: m.pleineLargeur ? undefined : "center", fontFamily: u.FONT_B }}>
      {className && <style>{CTA_ANIM_CSS}</style>}
      <SmartCta u={u} href={m.lien.href || "#"} external={false} trackTarget={m.lien.trackTarget}
        style={{ ...style, alignItems: "center", justifyContent: "center", gap: sz(u, 8), borderRadius: sz(u, 14), padding: `${sz(u, 15)}px ${sz(u, 24)}px`, textDecoration: "none", fontSize: sz(u, 15), fontWeight: 700, fontFamily: u.FONT_B, boxSizing: "border-box", ...(m.pleineLargeur ? { display: "flex", width: "100%" } : { display: "inline-flex", width: "auto" }) }}
        label={<>{m.icone && <span aria-hidden style={{ fontSize: sz(u, 16) }}>{m.icone}</span>}{m.label}</>} />
    </div>
  )
}

export function EditorCtaButton({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!boutonAction(content)) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="👆" label="Ajoutez le libellé du bouton" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} accent={ctx.accent} />
}
export function PublicCtaButton({ content, ctx }: PublicAdapterProps) {
  if (!boutonAction(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} accent={(ctx.theme as any)?.accent || "var(--success)"} />
}
