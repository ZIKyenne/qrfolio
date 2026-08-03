"use client"
import { reassuranceViewModel } from "../../models/reassurance"
import type { EditorAdapterProps } from "../../renderTypes"

// Legacy sans état vide éditeur : grille (éventuellement vide) rendue telle quelle.
export function EditorReassurance({ content, ctx }: EditorAdapterProps) {
  const { items } = reassuranceViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {items.map((g, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "rgba(57,255,143,0.05)", border: "1px solid rgba(57,255,143,0.12)", borderRadius: 11, padding: "12px 8px", textAlign: "center" }}>
            <span style={{ fontSize: 24 }}>{g.icon || "✅"}</span>
            <p style={{ color: text, fontSize: 11, fontWeight: 700, margin: 0 }}>{g.label}</p>
            {g.desc && <p style={{ color: muted, fontSize: 9, margin: 0 }}>{g.desc}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
