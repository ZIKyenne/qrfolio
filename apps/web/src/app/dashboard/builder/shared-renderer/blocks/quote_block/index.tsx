"use client"
// quote_block — Une citation encadree. Sans citation, aucun bloc : la page publiait
// auparavant deux guillemets vides suivis du nom de l'auteur.
import { citation } from "../../models/presentationEtEncadres"
import { pagePad } from "../../views/TitreSection"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const q = citation(c)!
  return (
    <div style={{ padding: pagePad(u, 14, 14), fontFamily: u.FONT_B }}>
      <div style={{ background: `${u.G}08`, border: `1px solid ${u.G}20`, borderRadius: sz(u, 15), padding: `${sz(u, 22)}px ${sz(u, 20)}px`, position: "relative" }}>
        <span aria-hidden style={{ position: "absolute", top: sz(u, 12), left: sz(u, 16), color: u.G, fontSize: sz(u, 44), fontFamily: "Georgia, serif", lineHeight: 1, opacity: 0.35 }}>&ldquo;</span>
        <p style={{ color: u.TEXT, fontSize: sz(u, 17), fontStyle: "italic", lineHeight: 1.7, margin: `0 0 ${q.author ? sz(u, 12) : 0}px`, paddingTop: sz(u, 14), fontFamily: u.FONT_D, whiteSpace: "pre-wrap" }}>{q.quote}</p>
        {q.author && (
          <div style={{ display: "flex", alignItems: "center", gap: sz(u, 9) }}>
            <div aria-hidden style={{ width: sz(u, 26), height: 2, background: u.G, borderRadius: 1 }} />
            <p style={{ color: u.G, fontSize: sz(u, 13), fontWeight: 700, margin: 0, fontFamily: u.FONT_B }}>{q.author}{q.source && <span style={{ color: u.MUTED, fontWeight: 400 }}> — {q.source}</span>}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function EditorQuoteBlock({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!citation(content)) return <div style={{ padding: "14px 16px" }}><BlockEmptyState icon="❝" label="Ajoutez une citation" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicQuoteBlock({ content, ctx }: PublicAdapterProps) {
  if (!citation(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
