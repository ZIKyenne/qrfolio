"use client"
import { engagementsViewModel } from "../../models/engagements"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorEngagements({ content, ctx }: EditorAdapterProps) {
  const { visible, title, items } = engagementsViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {!visible ? <BlockEmptyState icon="✅" label="Ajoutez un engagement" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={muted} /> : items.map((eng, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(57,255,143,0.05)", border: "1px solid rgba(57,255,143,0.15)", borderRadius: 10 }}>
            <p style={{ color: text, fontSize: 13, margin: 0, lineHeight: 1.4 }}>{eng}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
