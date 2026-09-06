"use client"
import type { CSSProperties } from "react"
import { albumBlockViewModel } from "../../models/albumBlock"
import { EditorSharedImage } from "../../primitives/EditorImage"
import type { EditorAdapterProps } from "../../renderTypes"

// Badges plateformes : styles bespoke par plateforme (fidèle au legacy éditeur).
const ED_BADGE: Record<string, CSSProperties> = {
  spotify_url: { flex: 1, background: "#1DB954", borderRadius: 8, padding: "8px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#000" },
  apple_url: { flex: 1, background: "rgba(252,60,68,0.15)", border: "1px solid rgba(252,60,68,0.3)", borderRadius: 8, padding: "8px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#FC3C44" },
  deezer_url: { flex: 1, background: "rgba(162,56,255,0.12)", border: "1px solid rgba(162,56,255,0.25)", borderRadius: 8, padding: "8px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#A238FF" },
}

export function EditorAlbumBlock({ content, ctx }: EditorAdapterProps) {
  const { cover, title, artist, year, tracks, description, platforms, cta } = albumBlockViewModel(content)
  const { theme, text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <div style={{ background: "rgba(29,185,84,0.06)", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 14, overflow: "hidden" }}>
        {cover.src
          ? <EditorSharedImage model={cover} width={480} height={160} sizes="(max-width: 640px) 100vw, 480px" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
          : <div style={{ height: 140, background: "rgba(29,185,84,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>💿</div>}
        <div style={{ padding: "14px" }}>
          <p style={{ color: text, fontSize: 18, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay }}>{title}</p>
          {artist && <p style={{ color: muted, fontSize: 12, margin: "0 0 3px" }}>{artist}</p>}
          <div style={{ display: "flex", gap: 10, marginBottom: description ? 10 : 12 }}>{year && <span style={{ color: "#1DB954", fontSize: 11, fontWeight: 600 }}>{year}</span>}{tracks && <span style={{ color: muted, fontSize: 11 }}>· {tracks}</span>}</div>
          {description && <p style={{ color: muted, fontSize: 12.5, margin: "0 0 12px", lineHeight: 1.6 }}>{description}</p>}
          {platforms.length > 0 && <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>{platforms.map((p, i) => <div key={i} style={ED_BADGE[p.key]}>{p.label}</div>)}</div>}
          {cta.visible && <div style={{ background: "#1DB954", borderRadius: 9, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#000" }}>{cta.label}</div>}
        </div>
      </div>
    </div>
  )
}
