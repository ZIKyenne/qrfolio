"use client"
// journey — Quatre lignes de parcours ou de chiffres cles. Le premier mot de chaque
// ligne sert d'icone : convention d'origine du bloc, conservee telle quelle pour ne
// pas changer l'affichage des pages deja publiees.
import { lignesParcours } from "../../models/presentationEtEncadres"
import { TitreSection, pagePad } from "../../views/TitreSection"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const lignes = lignesParcours(c)
  return (
    <div style={{ padding: pagePad(u, 8), fontFamily: u.FONT_B }}>
      <TitreSection u={u} titre={c?.title} marge={9} />
      <div style={{ display: "flex", flexDirection: "column", gap: sz(u, 7) }}>
        {lignes.map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: sz(u, 11), background: `${u.G}0a`, border: `1px solid ${u.G}18`, borderRadius: sz(u, 11), padding: `${sz(u, 11)}px ${sz(u, 12)}px` }}>
            <span aria-hidden style={{ fontSize: sz(u, 17), flexShrink: 0 }}>{l.icone}</span>
            <span style={{ color: u.TEXT, fontSize: sz(u, 14), lineHeight: 1.5, fontFamily: u.FONT_B }}>{l.texte}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EditorJourney({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (lignesParcours(content).length === 0) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="🧭" label="Ajoutez une étape de votre parcours" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicJourney({ content, ctx }: PublicAdapterProps) {
  if (lignesParcours(content).length === 0) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
