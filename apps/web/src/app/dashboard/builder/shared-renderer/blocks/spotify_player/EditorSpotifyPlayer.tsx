"use client"
import { spotifyPlayerViewModel } from "../../models/spotifyPlayer"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorSpotifyPlayer({ content, ctx }: EditorAdapterProps) {
  const { title } = spotifyPlayerViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <div style={{ background: "rgba(29,185,84,0.08)", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 12, padding: "14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 42, height: 42, background: "#1DB954", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎧</div>
        <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{title}</p><p style={{ color: muted, fontSize: 10, margin: 0 }}>Écouter sur Spotify</p></div>
        <div style={{ background: "#1DB954", color: "#000", padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>▶ Play</div>
      </div>
    </div>
  )
}
