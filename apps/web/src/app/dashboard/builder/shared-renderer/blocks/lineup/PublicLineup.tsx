"use client"
import { lineupViewModel } from "../../models/lineup"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicLineup({ content, ctx }: PublicAdapterProps) {
  const { title, items } = lineupViewModel(content)
  if (items.length === 0) return null
  const { TEXT, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: a.headliner === "yes" ? "rgba(236,72,153,0.1)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${a.headliner === "yes" ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 13, padding: "12px 15px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p style={{ color: a.headliner === "yes" ? "#EC4899" : TEXT, fontSize: a.headliner === "yes" ? 16 : 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{a.name}</p>
                {a.headliner === "yes" && <span style={{ background: "#EC4899", color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 9, fontWeight: 700 }}>HEADLINER</span>}
              </div>
              {a.stage && <p style={{ color: MUTED, fontSize: 11, margin: "2px 0 0" }}>🎭 {a.stage}</p>}
            </div>
            {a.time && <span style={{ color: a.headliner === "yes" ? "#EC4899" : MUTED, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{a.time}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
