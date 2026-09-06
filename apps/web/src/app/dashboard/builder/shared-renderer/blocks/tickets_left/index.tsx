"use client"
// tickets_left — Places restantes, avec un niveau d'urgence qui teinte la carte.
// L'apercu affichait « 14 places restantes » quand le champ etait vide : un chiffre
// invente, sur un bloc que la page ne publiait meme pas.
import { placesRestantes } from "../../models/compteursEtOffres"
import { pagePad } from "../../views/TitreSection"
import { SmartCta } from "../../primitives/LayoutSurface"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const m = placesRestantes(c)!
  return (
    <div style={{ padding: pagePad(u), fontFamily: u.FONT_B }}>
      <div style={{ background: m.style.bg, border: `1.5px solid ${m.style.border}`, borderRadius: sz(u, 15), padding: sz(u, 17), textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: sz(u, 11), marginBottom: m.cta ? sz(u, 13) : 0 }}>
          <span aria-hidden style={{ fontSize: sz(u, 30) }}>🎟️</span>
          <div style={{ textAlign: "left" }}>
            <p style={{ color: m.style.color, fontSize: sz(u, 34), fontWeight: 700, margin: 0, fontFamily: u.FONT_D, lineHeight: 1 }}>{m.count}</p>
            <p style={{ color: u.MUTED, fontSize: sz(u, 12), margin: `${sz(u, 3)}px 0 0` }}>{m.label}</p>
          </div>
        </div>
        {m.cta && (
          <SmartCta u={u} href={m.cta.link.href || "#"} external={m.cta.link.external} trackTarget={m.cta.link.trackTarget}
            label={m.cta.label}
            style={{ display: "block", background: m.style.color, borderRadius: sz(u, 11), padding: sz(u, 13), fontSize: sz(u, 14), fontWeight: 700, color: m.style.texteBouton, textDecoration: "none", fontFamily: u.FONT_B }} />
        )}
      </div>
    </div>
  )
}

export function EditorTicketsLeft({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!placesRestantes(content)) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="🎟️" label="Ajoutez le nombre de places restantes" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicTicketsLeft({ content, ctx }: PublicAdapterProps) {
  if (!placesRestantes(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
