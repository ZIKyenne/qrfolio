"use client"
import { concertsViewModel } from "../../models/concerts"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorConcerts({ content, ctx }: EditorAdapterProps) {
  const { visible, title, items } = concertsViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {!visible
          ? <BlockEmptyState icon="🎫" label="Ajoutez une date de concert" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={muted} />
          : items.map((sh, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(145,70,255,0.06)", border: "1px solid rgba(145,70,255,0.2)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ textAlign: "center", flexShrink: 0, minWidth: 44 }}><p style={{ color: "#9146FF", fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{sh.date}</p></div>
              <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{sh.city}</p>{sh.venue && <p style={{ color: muted, fontSize: 11, margin: 0 }}>🎭 {sh.venue}</p>}</div>
              {sh.link.visible && <div style={{ background: "#9146FF", borderRadius: 7, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>Billets →</div>}
            </div>
          ))}
      </div>
    </div>
  )
}
