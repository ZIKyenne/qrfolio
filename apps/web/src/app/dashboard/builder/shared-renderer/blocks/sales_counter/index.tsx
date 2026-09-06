"use client"
// sales_counter — « 127 ventes cette semaine ». Un compteur sans chiffre ne
// s'affiche nulle part.
import { compteurVentes } from "../../models/compteursEtOffres"
import { pagePad } from "../../views/TitreSection"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

const ROUGE = "#EF4444"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const m = compteurVentes(c)!
  return (
    <div style={{ padding: pagePad(u), fontFamily: u.FONT_B }}>
      <div style={{ background: "rgba(239,68,68,0.08)", border: `1.5px solid rgba(239,68,68,0.25)`, borderRadius: sz(u, 15), padding: sz(u, 17), textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: sz(u, 11), marginBottom: m.subtext ? sz(u, 7) : 0 }}>
          <span aria-hidden style={{ fontSize: sz(u, 30) }}>{m.emoji}</span>
          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0, lineHeight: 1, fontFamily: u.FONT_D }}>
              <span style={{ color: u.TEXT, fontSize: sz(u, 30), fontWeight: 700 }}>{m.count}</span>{" "}
              <span style={{ color: ROUGE, fontSize: sz(u, 15), fontWeight: 700 }}>{m.label}</span>
            </p>
            {m.period && <p style={{ color: u.MUTED, fontSize: sz(u, 12), margin: `${sz(u, 3)}px 0 0` }}>{m.period}</p>}
          </div>
        </div>
        {m.subtext && <p style={{ color: ROUGE, fontSize: sz(u, 13), fontWeight: 600, margin: 0 }}>{m.subtext}</p>}
      </div>
    </div>
  )
}

export function EditorSalesCounter({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!compteurVentes(content)) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="🔥" label="Ajoutez le nombre de ventes" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicSalesCounter({ content, ctx }: PublicAdapterProps) {
  if (!compteurVentes(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
