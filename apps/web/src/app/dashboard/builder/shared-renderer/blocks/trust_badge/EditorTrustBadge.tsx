"use client"
import { trustBadgeViewModel } from "../../models/trustBadge"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorTrustBadge({ content, ctx }: EditorAdapterProps) {
  const { visible, title, items } = trustBadgeViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", textAlign: "center" }}>{title}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {!visible ? <BlockEmptyState icon="🏆" label="Ajoutez un badge de confiance" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={muted} /> : items.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(57,255,143,0.08)", border: "1px solid rgba(57,255,143,0.2)", borderRadius: 20, padding: "7px 14px" }}>
            <span style={{ color: "var(--success)", fontSize: 14, fontWeight: 700 }}>{b.icon}</span>
            <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
