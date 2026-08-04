"use client"
import { discographyViewModel } from "../../models/discography"
import { PublicSharedImage } from "../../primitives/PublicImage"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicDiscography({ content, ctx }: PublicAdapterProps) {
  const { title, items } = discographyViewModel(content)
  if (items.length === 0) return null
  const { TEXT, MUTED, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((a, i) => {
          const inner = <>
            {a.cover.src
              ? <PublicSharedImage model={a.cover} width={54} height={54} style={{ width: 54, height: 54, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 54, height: 54, borderRadius: 9, background: "rgba(29,185,84,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 25, flexShrink: 0 }}>💿</div>}
            <div style={{ flex: 1 }}><p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_B }}>{a.title}</p><div style={{ display: "flex", alignItems: "center", gap: 7 }}>{a.type && <span style={{ background: "rgba(29,185,84,0.12)", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 10, padding: "1px 8px", color: "#1DB954", fontSize: 10, fontWeight: 700 }}>{a.type}</span>}{a.year && <span style={{ color: MUTED, fontSize: 12 }}>{a.year}</span>}</div></div>
            <span style={{ color: "#1DB954", fontSize: 19 }}>▶</span>
          </>
          const st: any = { display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }
          return a.link.visible
            ? <a key={i} href={a.link.href || "#"} target="_blank" rel="noopener noreferrer" onClick={() => { try { trackClick(a.link.trackTarget) } catch {} }} style={st}>{inner}</a>
            : <div key={i} style={st}>{inner}</div>
        })}
      </div>
    </div>
  )
}
