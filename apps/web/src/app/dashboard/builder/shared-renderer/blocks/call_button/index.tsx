"use client"
// call_button — Appeler d'un doigt. Le sous-titre (« 7j/7 de 9h a 19h ») etait
// reglable et servi au visiteur, mais l'apercu de l'editeur ne le montrait pas.
import { boutonAppel } from "../../models/contactEtAction"
import { pagePad } from "../../views/TitreSection"
import { SmartCta } from "../../primitives/LayoutSurface"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

const VERT = "var(--success)"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const m = boutonAppel(c)!
  return (
    <div style={{ padding: pagePad(u, 6, 10), fontFamily: u.FONT_B }}>
      <SmartCta u={u} href={m.href} external={false} trackTarget="call"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: sz(u, 9), background: "rgba(57,255,143,0.1)", border: "1.5px solid rgba(57,255,143,0.3)", borderRadius: sz(u, 13), padding: m.sous ? `${sz(u, 12)}px ${sz(u, 18)}px` : `${sz(u, 15)}px ${sz(u, 18)}px`, textDecoration: "none" }}
        label={<>
          <span aria-hidden style={{ fontSize: sz(u, 17) }}>{m.icone}</span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: VERT, fontSize: sz(u, 15), fontWeight: 700, fontFamily: u.FONT_B }}>{m.label}</span>
            {m.sous && <span style={{ color: "rgba(57,255,143,0.7)", fontSize: sz(u, 11), fontFamily: u.FONT_B }}>{m.sous}</span>}
          </span>
        </>} />
    </div>
  )
}

export function EditorCallButton({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!boutonAppel(content)) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="📞" label="Ajoutez un numéro de téléphone" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicCallButton({ content, ctx }: PublicAdapterProps) {
  if (!boutonAppel(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
