"use client"
import { spotifyEmbedViewModel } from "../../models/spotifyEmbed"
import type { PublicAdapterProps } from "../../renderTypes"

// Public : iframe Spotify (URL d'embed strictement allowlistée par spotifyEmbedUrl). null si vide.
export function PublicSpotifyEmbed({ content }: PublicAdapterProps) {
  const { visible, src, height } = spotifyEmbedViewModel(content)
  if (!visible) return null
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <iframe src={src!} title="Lecteur Spotify" width="100%" height={height} style={{ borderRadius: 13, border: "none", display: "block" }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
    </div>
  )
}
