"use client"
import { videoBlockViewModel } from "../../models/videoBlock"
import type { PublicAdapterProps } from "../../renderTypes"

// Public : iframe canonique (provider allowlisté) — null si aucun provider valide (jamais d'URL brute).
export function PublicVideo({ content, ctx }: PublicAdapterProps) {
  const { visible, embed, title } = videoBlockViewModel(content)
  if (!visible || !embed.src) return null
  const { MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "6px 24px 16px" }}>
      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}>
        <iframe src={embed.src} loading="lazy" title={embed.title}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
          allow={embed.allow} allowFullScreen={embed.allowFullScreen} referrerPolicy={embed.referrerPolicy as any} />
      </div>
      {title && <p style={{ color: MUTED, fontSize: 12, textAlign: "center", margin: "8px 0 0", fontFamily: FONT_B }}>{title}</p>}
    </div>
  )
}
