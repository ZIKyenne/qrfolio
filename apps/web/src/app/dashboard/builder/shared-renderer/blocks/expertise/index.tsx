"use client"
// expertise — Domaines de competence, avec une barre de niveau sur 5.
// Un niveau non renseigne produisait `parseInt("undefined")` = NaN, donc une barre
// large de « NaN% » — des deux cotes. Il vaut maintenant 3 sur 5, comme le code le
// croyait deja. Le rail de la barre suit le theme au lieu d'un blanc en dur.
import { niveauxExpertise } from "../../models/presentationEtEncadres"
import { TitreSection, pagePad } from "../../views/TitreSection"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function Vue({ u, c, accent }: { u: UnifiedCtx; c: Record<string, any>; accent: string }) {
  const skills = niveauxExpertise(c)
  return (
    <div style={{ padding: pagePad(u, 8), fontFamily: u.FONT_B }}>
      <TitreSection u={u} titre={c?.title} marge={12} />
      <div style={{ display: "flex", flexDirection: "column", gap: sz(u, 10) }}>
        {skills.map((s, i) => (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: sz(u, 8), marginBottom: sz(u, 4) }}>
              <span style={{ color: u.TEXT, fontSize: sz(u, 13), display: "flex", alignItems: "center", gap: sz(u, 6), fontFamily: u.FONT_B, minWidth: 0 }}>{s.icone && <span aria-hidden>{s.icone}</span>}{s.nom}</span>
              <span style={{ color: u.G, fontSize: sz(u, 11), fontWeight: 700, flexShrink: 0 }}>{s.pct}%</span>
            </div>
            <div role="img" aria-label={`${s.nom} : ${s.pct}%`} style={{ height: sz(u, 5), background: u.LINE, borderRadius: sz(u, 3), overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${s.pct}%`, background: `linear-gradient(90deg,${u.G},${accent})`, borderRadius: sz(u, 3) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EditorExpertise({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (niveauxExpertise(content).length === 0) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="🎯" label="Ajoutez une expertise" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} accent={ctx.accent} />
}
export function PublicExpertise({ content, ctx }: PublicAdapterProps) {
  if (niveauxExpertise(content).length === 0) return null
  return <Vue u={publicCtx(ctx)} c={content} accent={(ctx.theme as any)?.accent || "var(--success)"} />
}
