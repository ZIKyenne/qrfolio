"use client"
import { ExternalLink } from "lucide-react"
import { favoriteLinksViewModel } from "../../models/favoriteLinks"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicFavoriteLinks({ content, ctx }: PublicAdapterProps) {
  const { visible, title, items } = favoriteLinksViewModel(content)
  if (!visible) return null
  const { G, TEXT, MUTED, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it, i) => (
          <a key={i} href={it.link.href || "#"} target="_blank" rel="noopener noreferrer" onClick={() => { try { trackClick(it.link.trackTarget) } catch {} }} style={{ display: "flex", alignItems: "center", gap: 13, background: `${G}08`, border: `1px solid ${G}15`, borderRadius: 11, padding: "12px 13px", textDecoration: "none" }}>
            <span style={{ fontSize: 21, flexShrink: 0 }}>{it.icon || "🔗"}</span>
            <span style={{ color: TEXT, fontSize: 14, fontWeight: 600, flex: 1, fontFamily: FONT_B }}>{it.label}</span>
            <ExternalLink size={12} color={G} />
          </a>
        ))}
      </div>
    </div>
  )
}
