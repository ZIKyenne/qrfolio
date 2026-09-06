"use client"
// services_pricing — Prestation, description a gauche ; prix et duree a droite.
// Le filet de separation etait fige en blanc a 6 % sur la page publiee : invisible
// sur un theme clair, alors que l'apercu, lui, le teintait selon le theme.
import { listePrestations } from "../../models/packsEtTarifs"
import { TitreSection, pagePad } from "../../views/TitreSection"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const svcs = listePrestations(c)
  return (
    <div style={{ padding: pagePad(u), fontFamily: u.FONT_B }}>
      <TitreSection u={u} titre={c?.title} />
      <div>
        {svcs.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: sz(u, 11), padding: `${sz(u, 11)}px 0`, borderBottom: i < svcs.length - 1 ? `1px solid ${u.LINE}` : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: u.TEXT, fontSize: sz(u, 14), fontWeight: 600, margin: "0 0 1px", fontFamily: u.FONT_B }}>{s.nom}</p>
              {s.description && <p style={{ color: u.MUTED, fontSize: sz(u, 13), margin: 0 }}>{s.description}</p>}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, maxWidth: "50%", overflowWrap: "anywhere" }}>
              {s.prix && <p style={{ color: u.G, fontSize: sz(u, 15), fontWeight: 700, margin: 0 }}>{s.prix}</p>}
              {s.duree && <p style={{ color: u.MUTED, fontSize: sz(u, 11), margin: 0 }}>{s.duree}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EditorServicesPricing({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (listePrestations(content).length === 0) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="💶" label="Ajoutez une prestation" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicServicesPricing({ content, ctx }: PublicAdapterProps) {
  if (listePrestations(content).length === 0) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
