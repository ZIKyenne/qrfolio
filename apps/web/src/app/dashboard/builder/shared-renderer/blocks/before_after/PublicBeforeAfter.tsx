"use client"
import { beforeAfterViewModel } from "../../models/beforeAfter"
import type { PublicAdapterProps } from "../../renderTypes"

// Public : grille avant/après statique (aucun slider, aucune lib). null si aucune image.
export function PublicBeforeAfter({ content, ctx }: PublicAdapterProps) {
  const { visible, title, description, beforeImg, afterImg, beforeLabel, afterLabel } = beforeAfterViewModel(content)
  if (!visible) return null
  const { TEXT, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 11px", textAlign: "center", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        <div style={{ borderRadius: 11, overflow: "hidden" }}>
          {beforeImg ? <img onError={e => { e.currentTarget.style.display = 'none' }} loading="lazy" decoding="async" src={beforeImg} alt="Avant" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} /> : <div style={{ height: 150, background: "rgba(239,68,68,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>📸</div>}
          <div style={{ background: "rgba(239,68,68,0.15)", padding: "7px", textAlign: "center" }}><p style={{ color: "#EF4444", fontSize: 12, fontWeight: 700, margin: 0 }}>{beforeLabel}</p></div>
        </div>
        <div style={{ borderRadius: 11, overflow: "hidden" }}>
          {afterImg ? <img onError={e => { e.currentTarget.style.display = 'none' }} loading="lazy" decoding="async" src={afterImg} alt="Après" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} /> : <div style={{ height: 150, background: "rgba(57,255,143,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>✨</div>}
          <div style={{ background: "rgba(57,255,143,0.15)", padding: "7px", textAlign: "center" }}><p style={{ color: "var(--success)", fontSize: 12, fontWeight: 700, margin: 0 }}>{afterLabel}</p></div>
        </div>
      </div>
      {description && <p style={{ color: MUTED, fontSize: 13.5, textAlign: "center", margin: "9px 0 0" }}>{description}</p>}
    </div>
  )
}
