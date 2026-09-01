"use client"
import { concertsViewModel } from "../../models/concerts"
import type { PublicAdapterProps } from "../../renderTypes"
import { avecCibleTactile } from "../../primitives/BlockCtaLink"

export function PublicConcerts({ content, ctx }: PublicAdapterProps) {
  const { title, items } = concertsViewModel(content)
  if (items.length === 0) return null
  const { TEXT, MUTED, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((sh, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(145,70,255,0.06)", border: "1px solid rgba(145,70,255,0.2)", borderRadius: 13, padding: "12px 15px" }}>
            <div style={{ textAlign: "center", flexShrink: 0, minWidth: 48 }}><p style={{ color: "#9146FF", fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{sh.date}</p></div>
            <div style={{ flex: 1 }}><p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{sh.city}</p>{sh.venue && <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>🎭 {sh.venue}</p>}</div>
            {sh.link.visible && <a href={sh.link.href || "#"} target="_blank" rel="noopener noreferrer" onClick={() => { try { trackClick(sh.link.trackTarget) } catch {} }} style={avecCibleTactile({ background: "#9146FF", borderRadius: 8, padding: "7px 13px", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, textDecoration: "none" })}>Billets →</a>}
          </div>
        ))}
      </div>
    </div>
  )
}
