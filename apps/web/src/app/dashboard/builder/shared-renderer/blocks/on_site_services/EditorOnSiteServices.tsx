"use client"
import { onSiteServicesViewModel } from "../../models/onSiteServices"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorOnSiteServices({ content, ctx }: EditorAdapterProps) {
  const { visible, title, items } = onSiteServicesViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{title}</p>}
      {!visible ? <BlockEmptyState icon="🛎️" label="Ajoutez un service sur place" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={muted} /> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {items.map((svc, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.15)", borderRadius: 10, padding: "10px 12px" }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{svc.icon}</span>
              <span style={{ color: text, fontSize: 11, fontWeight: 600 }}>{svc.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
