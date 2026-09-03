"use client"
import { ExternalLink } from "lucide-react"
import { podcastLinksViewModel } from "../../models/podcastLinks"
import { EditorSharedImage } from "../../primitives/EditorImage"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorPodcastLinks({ content, ctx }: EditorAdapterProps) {
  const { cover, name, description, platforms } = podcastLinksViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
        {cover.src
          ? <EditorSharedImage model={cover} style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 52, height: 52, borderRadius: 10, background: "rgba(177,80,226,0.15)", border: "1px solid rgba(177,80,226,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>🎙️</div>}
        <div>
          <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>{name}</p>
          {description && <p style={{ color: muted, fontSize: 12.5, margin: 0 }}>{description}</p>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {platforms.length === 0
          ? <p style={{ color: muted, fontSize: 11, textAlign: "center", margin: 0 }}>Ajoutez vos plateformes d écoute</p>
          : platforms.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: `${p.color}12`, border: `1px solid ${p.color}25`, borderRadius: 9, padding: "9px 12px" }}>
              <span style={{ fontSize: 16 }}>{p.icon}</span>
              <span style={{ color: text, fontSize: 12, fontWeight: 600, flex: 1 }}>{p.label}</span>
              <ExternalLink size={11} color={p.color} />
            </div>
          ))}
      </div>
    </div>
  )
}
