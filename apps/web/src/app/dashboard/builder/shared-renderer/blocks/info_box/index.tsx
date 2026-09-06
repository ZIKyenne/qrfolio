"use client"
// info_box — Encadre colore (info, avertissement, succes, astuce, important).
// Les retours a la ligne saisis par le commercant etaient conserves en ligne et
// ecrases dans l'apercu : ils sont desormais preserves des deux cotes.
import { encadre } from "../../models/presentationEtEncadres"
import { pagePad } from "../../views/TitreSection"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const e = encadre(c)!
  return (
    <div style={{ padding: pagePad(u, 8, 8), fontFamily: u.FONT_B }}>
      <div style={{ background: e.style.bg, border: `1.5px solid ${e.style.border}`, borderRadius: sz(u, 13), padding: `${sz(u, 15)}px ${sz(u, 17)}px` }}>
        <div style={{ display: "flex", gap: sz(u, 11), alignItems: "flex-start" }}>
          <span aria-hidden style={{ fontSize: sz(u, 22), flexShrink: 0 }}>{e.emoji}</span>
          <div style={{ minWidth: 0 }}>
            {e.title && <p style={{ color: e.style.color, fontSize: sz(u, 13), fontWeight: 700, margin: `0 0 ${sz(u, 4)}px`, fontFamily: u.FONT_B }}>{e.title}</p>}
            {e.message && <p style={{ color: u.TEXT, fontSize: sz(u, 13), margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: u.FONT_B }}>{e.message}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export function EditorInfoBox({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!encadre(content)) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="💡" label="Ajoutez le texte de l'encadré" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicInfoBox({ content, ctx }: PublicAdapterProps) {
  if (!encadre(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
