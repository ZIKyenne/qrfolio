"use client"
// limited_offer — Bandeau d'offre a duree limitee. L'apercu dessinait toujours la
// carte, titre « Offre limitée » compris, pour un bloc entierement vide que la page
// ne publiait pas.
import { offreLimitee } from "../../models/compteursEtOffres"
import { pagePad } from "../../views/TitreSection"
import { SmartCta } from "../../primitives/LayoutSurface"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

const ROUGE = "#EF4444"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const m = offreLimitee(c)!
  return (
    <div style={{ padding: pagePad(u, 6, 12), fontFamily: u.FONT_B }}>
      <div style={{ background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.3)", borderRadius: sz(u, 13), padding: `${sz(u, 14)}px ${sz(u, 16)}px` }}>
        <div style={{ display: "flex", alignItems: "center", gap: sz(u, 7), marginBottom: sz(u, 6) }}>
          <span aria-hidden style={{ color: ROUGE }}>⚡</span>
          <p style={{ color: u.TEXT, fontSize: sz(u, 15), fontWeight: 700, margin: 0, fontFamily: u.FONT_B }}>{m.title}</p>
        </div>
        {m.description && <p style={{ color: u.MUTED, fontSize: sz(u, 13), margin: `0 0 ${sz(u, 7)}px` }}>{m.description}</p>}
        {m.expires && <p style={{ color: ROUGE, fontSize: sz(u, 12), margin: `0 0 ${sz(u, 10)}px`, fontWeight: 600 }}>⏰ Expire le {m.expires}</p>}
        {m.cta && (
          <SmartCta u={u} href={m.cta.link.href || "#"} external={m.cta.link.external} trackTarget={m.cta.link.trackTarget}
            label={m.cta.label}
            style={{ display: "block", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: sz(u, 9), padding: sz(u, 12), textAlign: "center", fontSize: sz(u, 14), fontWeight: 700, color: ROUGE, textDecoration: "none" }} />
        )}
      </div>
    </div>
  )
}

export function EditorLimitedOffer({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!offreLimitee(content)) return <div style={{ padding: "4px 16px 10px" }}><BlockEmptyState icon="⚡" label="Ajoutez le titre de votre offre" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicLimitedOffer({ content, ctx }: PublicAdapterProps) {
  if (!offreLimitee(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
