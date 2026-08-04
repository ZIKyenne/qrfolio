"use client"
import { audioPlayerViewModel } from "../../models/audioPlayer"
import type { EditorAdapterProps } from "../../renderTypes"

// Éditeur : carte représentative (barre de progression décorative), aucun lecteur réel — fidèle legacy.
export function EditorAudioPlayer({ content, ctx }: EditorAdapterProps) {
  const { cover, title, artist } = audioPlayerViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <div style={{ background: "rgba(167,139,250,0.06)", border: "1.5px solid rgba(167,139,250,0.22)", borderRadius: 14, padding: "13px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          {cover
            ? <img src={cover} alt="" style={{ width: 46, height: 46, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
            : <div style={{ width: 46, height: 46, borderRadius: 9, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎧</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 1px" }}>{title}</p>
            {artist && <p style={{ color: muted, fontSize: 11, margin: 0 }}>{artist}</p>}
            <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginTop: 6 }}><div style={{ width: "35%", height: "100%", background: "#A78BFA", borderRadius: 2 }} /></div>
          </div>
          <span style={{ fontSize: 18 }}>▶️</span>
        </div>
      </div>
    </div>
  )
}
