"use client"
// google_maps — La carte d'adresse, cliquable vers Google Maps. Sans adresse, les
// deux cotes dessinaient quand meme la carte, et la page publiait un lien vers une
// recherche Google VIDE. Sans adresse, il n'y a plus de bloc.
import { carteAdresse } from "../../models/contactEtAction"
import { pagePad } from "../../views/TitreSection"
import { SmartCta } from "../../primitives/LayoutSurface"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const m = carteAdresse(c)!
  return (
    <div style={{ padding: pagePad(u, 6, 16), fontFamily: u.FONT_B }}>
      <SmartCta u={u} href={m.href} trackTarget={m.href}
        style={{ display: "flex", gap: sz(u, 13), background: "rgba(255,230,109,0.06)", border: "1px solid rgba(255,230,109,0.14)", borderRadius: sz(u, 14), padding: `${sz(u, 15)}px ${sz(u, 16)}px`, textDecoration: "none", textAlign: "left" }}
        label={<>
          <span aria-hidden style={{ fontSize: sz(u, 26), flexShrink: 0 }}>📍</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", color: u.TEXT, fontSize: sz(u, 14), fontWeight: 700, margin: "0 0 2px", fontFamily: u.FONT_B }}>{m.label}</span>
            <span style={{ display: "block", color: u.MUTED, fontSize: sz(u, 12), fontFamily: u.FONT_B }}>{m.adresse}</span>
            {m.transport && <span style={{ display: "block", color: u.MUTED, fontSize: sz(u, 11), marginTop: 3, fontFamily: u.FONT_B }}>🚇 {m.transport}</span>}
          </span>
        </>} />
    </div>
  )
}

export function EditorGoogleMaps({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!carteAdresse(content)) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="📍" label="Ajoutez votre adresse" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicGoogleMaps({ content, ctx }: PublicAdapterProps) {
  if (!carteAdresse(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
