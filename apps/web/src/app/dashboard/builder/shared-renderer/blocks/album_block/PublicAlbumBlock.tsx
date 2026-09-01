"use client"
import { albumBlockViewModel } from "../../models/albumBlock"
import { PublicSharedImage } from "../../primitives/PublicImage"
import type { PublicAdapterProps } from "../../renderTypes"
import { avecCibleTactile } from "../../primitives/BlockCtaLink"

export function PublicAlbumBlock({ content, ctx }: PublicAdapterProps) {
  const { visible, cover, title, artist, year, tracks, description, platforms, cta } = albumBlockViewModel(content)
  if (!visible) return null
  const { TEXT, MUTED, FONT_D, trackClick } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div style={{ background: "rgba(29,185,84,0.06)", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 15, overflow: "hidden" }}>
        {cover.src
          ? <PublicSharedImage model={cover} width={800} height={200} style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
          : <div style={{ height: 150, background: "rgba(29,185,84,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>💿</div>}
        <div style={{ padding: "15px" }}>
          <p style={{ color: TEXT, fontSize: 19, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_D }}>{title}</p>
          {artist && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 3px" }}>{artist}</p>}
          <div style={{ display: "flex", gap: 10, marginBottom: description ? 11 : 13 }}>{year && <span style={{ color: "#1DB954", fontSize: 12, fontWeight: 600 }}>{year}</span>}{tracks && <span style={{ color: MUTED, fontSize: 12 }}>· {tracks}</span>}</div>
          {description && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 13px", lineHeight: 1.6 }}>{description}</p>}
          {platforms.length > 0 && <div style={{ display: "flex", gap: 8 }}>{platforms.map((p, i) => <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" onClick={() => { try { trackClick(p.trackTarget) } catch {} }} style={avecCibleTactile({ flex: 1, background: `${p.color}18`, border: `1px solid ${p.color}33`, borderRadius: 9, padding: "9px", textAlign: "center", fontSize: 12, fontWeight: 700, color: p.color, textDecoration: "none" })}>{p.label}</a>)}</div>}
          {cta.visible && <div style={{ background: "#1DB954", borderRadius: 9, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#000" }}>{cta.label}</div>}
        </div>
      </div>
    </div>
  )
}
