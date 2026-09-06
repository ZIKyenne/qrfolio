"use client"
// promo_code — Le code a saisir au paiement. La puce du code s'etalait sur toute la
// largeur dans l'apercu et restait ajustee au texte en ligne.
import { codePromo } from "../../models/compteursEtOffres"
import { pagePad } from "../../views/TitreSection"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

const ORANGE = "#F97316"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const m = codePromo(c)!
  return (
    <div style={{ padding: pagePad(u, 6, 12), fontFamily: u.FONT_B }}>
      <div style={{ background: "rgba(249,115,22,0.08)", border: "2px dashed rgba(249,115,22,0.3)", borderRadius: sz(u, 13), padding: sz(u, 16), textAlign: "center" }}>
        {m.description && <p style={{ color: u.MUTED, fontSize: sz(u, 13), margin: `0 0 ${sz(u, 9)}px`, fontFamily: u.FONT_B }}>{m.description}</p>}
        <div style={{ display: "inline-block", background: "rgba(249,115,22,0.15)", border: "2px solid rgba(249,115,22,0.4)", borderRadius: sz(u, 9), padding: `${sz(u, 10)}px ${sz(u, 18)}px`, fontFamily: "monospace", fontSize: sz(u, 20), fontWeight: 700, color: ORANGE, letterSpacing: 3 }}>{m.code}</div>
        {m.expires && <p style={{ color: u.MUTED, fontSize: sz(u, 11), margin: `${sz(u, 7)}px 0 0` }}>Expire le {m.expires}</p>}
      </div>
    </div>
  )
}

export function EditorPromoCode({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!codePromo(content)) return <div style={{ padding: "4px 16px 10px" }}><BlockEmptyState icon="🏷️" label="Ajoutez un code promo" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicPromoCode({ content, ctx }: PublicAdapterProps) {
  if (!codePromo(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
