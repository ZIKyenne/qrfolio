"use client"
import { processStepsViewModel } from "../../models/processSteps"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicProcessSteps({ content, ctx }: PublicAdapterProps) {
  const { title, items } = processStepsViewModel(content)
  if (items.length === 0) return null
  const { theme, G, TEXT, MUTED, FONT_B } = ctx
  const accent = theme.accent || "var(--success)"
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {items.map((st, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${G},${accent})`, color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontSize: st.icon ? 17 : 14, fontWeight: 700, flexShrink: 0 }}>{st.icon || i + 1}</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: "5px 0 2px", fontFamily: FONT_B }}>{st.title}</p>
              {st.desc && <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{st.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
