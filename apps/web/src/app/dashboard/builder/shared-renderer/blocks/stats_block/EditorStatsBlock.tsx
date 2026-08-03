"use client"
import { statsBlockViewModel } from "../../models/statsBlock"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorStatsBlock({ content, ctx }: EditorAdapterProps) {
  const { visible, items } = statsBlockViewModel(content)
  const { theme, primary, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {!visible ? <BlockEmptyState icon="📊" label="Ajoutez une statistique" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={muted} /> : (
        <div style={{ display: "grid", gridTemplateColumns: items.length <= 2 ? "1fr 1fr" : items.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8 }}>
          {items.map((st, i) => (
            <div key={i} style={{ background: primary + "08", border: `1px solid ${primary}15`, borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
              {st.icon && <span style={{ fontSize: 20, display: "block", marginBottom: 4 }}>{st.icon}</span>}
              <p style={{ color: primary, fontSize: 22, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay, lineHeight: 1 }}>{st.value}</p>
              <p style={{ color: muted, fontSize: 10, margin: 0 }}>{st.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
