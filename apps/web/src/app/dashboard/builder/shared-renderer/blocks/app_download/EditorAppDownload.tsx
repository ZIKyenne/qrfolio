"use client"
import { appDownloadViewModel } from "../../models/appDownload"
import type { EditorAdapterProps } from "../../renderTypes"

// Éditeur : badges non navigables, placeholder textuel si aucun lien (aucune fausse image).
export function EditorAppDownload({ content, ctx }: EditorAdapterProps) {
  const { ios, android } = appDownloadViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "4px 16px 10px", ...surfaceStyle }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {ios && <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.25)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 11, padding: "10px 14px" }}><span style={{ fontSize: 22 }}>🍎</span><div><p style={{ color: muted, fontSize: 8, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Disponible sur</p><p style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>App Store</p></div></div>}
        {android && <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.25)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 11, padding: "10px 14px" }}><span style={{ fontSize: 22 }}>🤖</span><div><p style={{ color: muted, fontSize: 8, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Disponible sur</p><p style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>Google Play</p></div></div>}
        {!ios && !android && <div style={{ textAlign: "center", padding: "14px", color: muted, fontSize: 11 }}>Ajoutez vos liens App Store / Play Store</div>}
      </div>
    </div>
  )
}
