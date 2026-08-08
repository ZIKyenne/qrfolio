"use client"
import { timelineViewModel } from "../../models/timeline"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicTimeline({ content, ctx }: PublicAdapterProps) {
  const { title, horizontal, items } = timelineViewModel(content)
  if (items.length === 0) return null
  const { G, TEXT, MUTED, FONT_B, trackClick } = ctx
  const linkStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 4, marginTop: 7, color: G, fontSize: 12,
    fontWeight: 700, fontFamily: FONT_B, textDecoration: "none",
    borderBottom: `1px solid ${G}55`, paddingBottom: 1,
  }
  const EventLink = ({ link }: { link: NonNullable<typeof items[number]["link"]> }) => (
    <a href={link.href} target="_blank" rel="noopener noreferrer"
      onClick={() => trackClick(link.trackTarget)} style={linkStyle}>
      {link.label} <span aria-hidden>↗</span>
    </a>
  )
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 16px", fontFamily: FONT_B }}>{title}</p>}
      {horizontal ? (
        <div style={{ display: "flex", gap: 11, overflowX: "auto", padding: "2px 0 8px", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory" }}>
          {items.map((e, i) => (
            <div key={i} style={{ scrollSnapAlign: "start", flexShrink: 0, width: 168, background: "rgba(255,255,255,0.03)", border: `1px solid ${i === items.length - 1 ? "var(--success)30" : "rgba(255,255,255,0.07)"}`, borderRadius: 13, padding: "14px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${G}12`, border: `1px solid ${G}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{e.icon || "•"}</div>
                <p style={{ color: G, fontSize: 12, fontWeight: 700, margin: 0 }}>{e.date}</p>
              </div>
              <p style={{ color: TEXT, fontSize: 13.5, fontWeight: 600, margin: "0 0 3px", fontFamily: FONT_B }}>{e.title}</p>
              {e.desc && <p style={{ color: MUTED, fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>{e.desc}</p>}
              {e.link && <EventLink link={e.link} />}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 22 }}>
          <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg,${G},${G}40)`, borderRadius: 1 }} />
          {items.map((e, i) => (
            <div key={i} style={{ position: "relative", marginBottom: i < items.length - 1 ? 18 : 0 }}>
              <div style={{ position: "absolute", left: -19, top: 4, width: 11, height: 11, borderRadius: "50%", background: i === items.length - 1 ? "var(--success)" : G, border: `2px solid ${i === items.length - 1 ? "var(--success)40" : `${G}40`}` }} />
              <p style={{ color: G, fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{e.date}</p>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: "0 0 2px", fontFamily: FONT_B, display: "flex", alignItems: "center", gap: 6 }}>{e.icon && <span aria-hidden style={{ fontSize: 15 }}>{e.icon}</span>}{e.title}</p>
              {e.desc && <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{e.desc}</p>}
              {e.link && <EventLink link={e.link} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
