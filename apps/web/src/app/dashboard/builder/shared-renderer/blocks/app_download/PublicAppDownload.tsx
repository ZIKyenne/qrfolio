"use client"
import { appDownloadViewModel } from "../../models/appDownload"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicAppDownload({ content, ctx }: PublicAdapterProps) {
  const { visible, label, ios, android } = appDownloadViewModel(content)
  if (!visible) return null
  const { TEXT, MUTED, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "6px 24px 12px" }}>
      {label && <p style={{ color: ctx.TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 8px", fontFamily: ctx.FONT_B }}>{label}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ios && <a href={ios.href || "#"} target="_blank" rel="noopener noreferrer" onClick={() => { try { trackClick(ios.trackTarget) } catch {} }} style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(0,0,0,0.25)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "11px 15px", textDecoration: "none" }}><span style={{ fontSize: 24 }}>🍎</span><div><p style={{ color: MUTED, fontSize: 9, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Disponible sur</p><p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>App Store</p></div></a>}
        {android && <a href={android.href || "#"} target="_blank" rel="noopener noreferrer" onClick={() => { try { trackClick(android.trackTarget) } catch {} }} style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(0,0,0,0.25)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "11px 15px", textDecoration: "none" }}><span style={{ fontSize: 24 }}>🤖</span><div><p style={{ color: MUTED, fontSize: 9, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Disponible sur</p><p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>Google Play</p></div></a>}
      </div>
    </div>
  )
}
