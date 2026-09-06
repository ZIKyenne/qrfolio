"use client"
// participants_count — Inscrits, avec une jauge de remplissage facultative.
// La jauge n'a de sens qu'avec un objectif : sans lui, elle affichait « 0 % · 5/0 »
// dans l'apercu, sous un commentaire qui affirmait pourtant etre le miroir exact
// du rendu public — lequel, lui, ne la dessinait pas.
import { participants } from "../../models/compteursEtOffres"
import { pagePad } from "../../views/TitreSection"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

const ROSE = "#EC4899"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const m = participants(c)!
  return (
    <div style={{ padding: pagePad(u, 14, 14), textAlign: "center", fontFamily: u.FONT_B }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: sz(u, 13), background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: sz(u, 15), padding: `${sz(u, 17)}px ${sz(u, 26)}px`, marginBottom: m.jauge ? sz(u, 13) : 0 }}>
        <span aria-hidden style={{ fontSize: sz(u, 30) }}>{m.emoji}</span>
        <div style={{ textAlign: "left" }}>
          <p style={{ color: ROSE, fontSize: sz(u, 34), fontWeight: 700, margin: 0, fontFamily: u.FONT_D, lineHeight: 1 }}>{m.count}</p>
          <p style={{ color: u.MUTED, fontSize: sz(u, 12), margin: `${sz(u, 3)}px 0 0` }}>{m.label}</p>
        </div>
      </div>
      {m.jauge && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: sz(u, 5) }}>
            <span style={{ color: u.MUTED, fontSize: sz(u, 11) }}>Inscriptions</span>
            <span style={{ color: ROSE, fontSize: sz(u, 11), fontWeight: 700 }}>{m.jauge.pct}% · {m.jauge.total}/{m.jauge.max}</span>
          </div>
          <div role="img" aria-label={`${m.jauge.total} inscrits sur ${m.jauge.max}`} style={{ height: sz(u, 7), background: u.LINE, borderRadius: sz(u, 4), overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${m.jauge.pct}%`, background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: sz(u, 4) }} />
          </div>
        </div>
      )}
    </div>
  )
}

export function EditorParticipantsCount({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!participants(content)) return <div style={{ padding: "14px 16px" }}><BlockEmptyState icon="👥" label="Ajoutez le nombre de participants" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicParticipantsCount({ content, ctx }: PublicAdapterProps) {
  if (!participants(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
