"use client"
import { testimonialsViewModel } from "../../models/testimonials"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicTestimonials({ content, ctx }: PublicAdapterProps) {
  const { items } = testimonialsViewModel(content)
  if (items.length === 0) return null
  const { G, TEXT, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "6px 24px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((r, i) => (
        <div key={i} style={{ background: `${G}05`, border: `1px solid ${G}12`, borderRadius: 14, padding: "15px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{r.name}</p>
            <p style={{ color: "#FFD700", fontSize: 13, margin: 0 }}>{"★".repeat(parseInt(r.stars || "5"))}</p>
          </div>
          <p style={{ color: MUTED, fontSize: 13, margin: 0, fontStyle: "italic", lineHeight: 1.65, fontFamily: FONT_B }}>"{r.text}"</p>
        </div>
      ))}
    </div>
  )
}
