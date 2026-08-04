"use client"
import { spotifyEmbedViewModel } from "../../models/spotifyEmbed"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorSpotifyEmbed({ content, ctx }: EditorAdapterProps) {
  const { src, height } = spotifyEmbedViewModel(content)
  const { muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {src
        ? <iframe src={src} title="Lecteur Spotify" width="100%" height={height} style={{ borderRadius: 12, border: "none", display: "block" }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
        : <div style={{ height: 152, background: "rgba(29,185,84,0.08)", border: "1.5px solid rgba(29,185,84,0.25)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: 32 }}>🎧</span>
            <p style={{ color: muted, fontSize: 11, margin: 0 }}>Ajoutez un lien Spotify</p>
            <p style={{ color: muted, fontSize: 9, margin: 0 }}>track / album / playlist / artist</p>
          </div>}
    </div>
  )
}
