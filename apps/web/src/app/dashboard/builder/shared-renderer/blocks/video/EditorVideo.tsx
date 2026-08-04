"use client"
import { videoBlockViewModel } from "../../models/videoBlock"
import type { EditorAdapterProps } from "../../renderTypes"

// Éditeur : placeholder legacy (aucune iframe/navigation au canvas). Fidèle au legacy.
export function EditorVideo({ content, ctx }: EditorAdapterProps) {
  const { title } = videoBlockViewModel(content)
  const { text, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "24px", textAlign: "center" }}>
        <span style={{ fontSize: 28 }}>▶️</span>
        <p style={{ color: text, fontSize: 13, margin: "8px 0 0", fontWeight: 600 }}>{title || "Vidéo"}</p>
      </div>
    </div>
  )
}
