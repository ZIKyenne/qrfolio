"use client"
import { eventProgramViewModel } from "../../models/eventProgram"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicEventProgram({ content, ctx }: PublicAdapterProps) {
  const { title, items } = eventProgramViewModel(content)
  if (items.length === 0) return null
  const { TEXT, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((st, i, arr) => (
          <div key={i} style={{ display: "flex", gap: 15, paddingBottom: i < arr.length - 1 ? 15 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#EC4899,#F472B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{st.time}</div>
              {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: "rgba(236,72,153,0.2)", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, paddingTop: 7 }}>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{st.title}</p>
              {st.desc && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{st.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
