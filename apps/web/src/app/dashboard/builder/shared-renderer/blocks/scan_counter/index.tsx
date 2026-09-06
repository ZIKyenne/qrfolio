"use client"
// scan_counter — Le nombre de scans annonce par le commercant.
// C'est ce bloc qui publiait « 1 240 » a la place d'un chiffre absent. Sans chiffre,
// il n'y a plus rien : ni en ligne, ni dans l'apercu.
import { compteurScans } from "../../models/compteursEtOffres"
import { pagePad } from "../../views/TitreSection"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const m = compteurScans(c)!
  return (
    <div style={{ padding: pagePad(u, 12, 16), textAlign: "center", fontFamily: u.FONT_B }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: sz(u, 12), justifyContent: "center" }}>
        {m.emoji && <span aria-hidden style={{ fontSize: sz(u, 34) }}>{m.emoji}</span>}
        <div style={{ textAlign: "left" }}>
          <p style={{ fontFamily: u.FONT_D, fontSize: sz(u, 40), color: u.G, fontWeight: 700, margin: "0 0 1px", lineHeight: 1 }}>{m.count}</p>
          {m.label && <p style={{ color: u.MUTED, fontSize: sz(u, 13), margin: 0, fontFamily: u.FONT_B }}>{m.label}</p>}
        </div>
      </div>
    </div>
  )
}

export function EditorScanCounter({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!compteurScans(content)) return <div style={{ padding: "14px 16px" }}><BlockEmptyState icon="📱" label="Ajoutez le nombre de scans" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicScanCounter({ content, ctx }: PublicAdapterProps) {
  if (!compteurScans(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
