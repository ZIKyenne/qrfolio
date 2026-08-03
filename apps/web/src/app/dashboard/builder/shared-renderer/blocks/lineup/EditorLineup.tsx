"use client"
import { lineupViewModel } from "../../models/lineup"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorLineup({ content, ctx }: EditorAdapterProps) {
  const { visible, title, items } = lineupViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {!visible ? <BlockEmptyState icon="🎧" label="Ajoutez un artiste" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={muted} /> : items.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: a.headliner === "yes" ? "rgba(236,72,153,0.1)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${a.headliner === "yes" ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "11px 14px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <p style={{ color: a.headliner === "yes" ? "#EC4899" : text, fontSize: a.headliner === "yes" ? 15 : 13, fontWeight: 700, margin: 0 }}>{a.name}</p>
                {a.headliner === "yes" && <span style={{ background: "#EC4899", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 8, fontWeight: 700 }}>HEADLINER</span>}
              </div>
              {a.stage && <p style={{ color: muted, fontSize: 10, margin: "2px 0 0" }}>🎭 {a.stage}</p>}
            </div>
            {a.time && <span style={{ color: a.headliner === "yes" ? "#EC4899" : muted, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{a.time}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
