"use client"
// packs — Formules (Essentiel / Confort / Premium). La deuxieme est mise en avant.
// Le lien par formule etait extrait puis jete : la carte est maintenant cliquable.
import { listePacks } from "../../models/packsEtTarifs"
import { TitreSection, pagePad } from "../../views/TitreSection"
import { SmartCta } from "../../primitives/LayoutSurface"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function Carte({ u, p, phare }: { u: UnifiedCtx; p: ReturnType<typeof listePacks>[number]; phare: boolean }) {
  return (
    <div style={{ background: phare ? `${u.G}10` : u.FILL, border: `1.5px solid ${phare ? `${u.G}35` : u.LINE}`, borderRadius: sz(u, 13), padding: `${sz(u, 14)}px ${sz(u, 15)}px` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: sz(u, 10), marginBottom: sz(u, 9) }}>
        <div style={{ display: "flex", alignItems: "center", gap: sz(u, 9), minWidth: 0 }}>
          <span aria-hidden style={{ fontSize: sz(u, 22) }}>{p.icone}</span>
          <p style={{ color: u.TEXT, fontSize: sz(u, 15), fontWeight: 700, margin: 0, fontFamily: u.FONT_B }}>{p.nom}</p>
        </div>
        {p.prix && <span style={{ color: u.G, fontSize: sz(u, 17), fontWeight: 700, flexShrink: 0 }}>{p.prix}</span>}
      </div>
      {p.lignes.map((l, j) => (
        <p key={j} style={{ color: u.MUTED, fontSize: sz(u, 12), margin: `0 0 ${sz(u, 4)}px`, display: "flex", gap: sz(u, 7) }}>
          <span aria-hidden style={{ color: "var(--success)" }}>✓</span> {l}
        </p>
      ))}
      {p.lien && (
        <SmartCta u={u} href={p.lien.href || "#"} external={p.lien.external} trackTarget={p.lien.trackTarget}
          label="Choisir cette formule"
          style={{ display: "block", marginTop: sz(u, 10), background: phare ? u.G : `${u.G}18`, border: `1px solid ${u.G}40`, borderRadius: sz(u, 10), padding: sz(u, 11), textAlign: "center", fontSize: sz(u, 13), fontWeight: 700, color: phare ? "#080808" : u.G, textDecoration: "none", fontFamily: u.FONT_B }} />
      )}
    </div>
  )
}

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const packs = listePacks(c)
  return (
    <div style={{ padding: pagePad(u), fontFamily: u.FONT_B }}>
      <TitreSection u={u} titre={c?.title} marge={12} />
      <div style={{ display: "flex", flexDirection: "column", gap: sz(u, 11) }}>
        {packs.map((p, i) => <Carte key={i} u={u} p={p} phare={i === 1} />)}
      </div>
    </div>
  )
}

export function EditorPacks({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (listePacks(content).length === 0) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="🚀" label="Ajoutez une formule" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicPacks({ content, ctx }: PublicAdapterProps) {
  if (listePacks(content).length === 0) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
