"use client"
import { ExternalLink } from "lucide-react"
import { podcastLinksViewModel } from "../../models/podcastLinks"
import { PublicSharedImage } from "../../primitives/PublicImage"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicPodcastLinks({ content, ctx }: PublicAdapterProps) {
  const { visible, cover, name, description, platforms } = podcastLinksViewModel(content)
  if (!visible) return null
  const { TEXT, MUTED, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 13 }}>
        {cover.src
          ? <PublicSharedImage model={cover} width={54} height={54} style={{ width: 54, height: 54, borderRadius: 11, objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 54, height: 54, borderRadius: 11, background: "rgba(177,80,226,0.15)", border: "1px solid rgba(177,80,226,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 27, flexShrink: 0 }}>🎙️</div>}
        <div>
          <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{name}</p>
          {description && <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{description}</p>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {platforms.map((p, i) => (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" onClick={() => { try { trackClick(p.trackTarget) } catch {} }} style={{ display: "flex", alignItems: "center", gap: 11, background: `${p.color}12`, border: `1px solid ${p.color}25`, borderRadius: 10, padding: "11px 13px", textDecoration: "none" }}>
            <span style={{ fontSize: 17 }}>{p.icon}</span>
            <span style={{ color: TEXT, fontSize: 13, fontWeight: 600, flex: 1, fontFamily: FONT_B }}>{p.label}</span>
            <ExternalLink size={12} color={p.color} />
          </a>
        ))}
      </div>
    </div>
  )
}
