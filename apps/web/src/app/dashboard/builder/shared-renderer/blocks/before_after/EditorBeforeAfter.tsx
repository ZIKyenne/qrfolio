"use client"
import { beforeAfterViewModel } from "../../models/beforeAfter"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorBeforeAfter({ content, ctx }: EditorAdapterProps) {
  const { title, description, beforeImg, afterImg, beforeLabel, afterLabel } = beforeAfterViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 10px", textAlign: "center" }}>{title}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ borderRadius: 10, overflow: "hidden" }}>
          {beforeImg ? <img src={beforeImg} alt="Avant" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} /> : <div style={{ height: 120, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📸</div>}
          <div style={{ background: "rgba(239,68,68,0.15)", padding: "5px", textAlign: "center" }}><p style={{ color: "#EF4444", fontSize: 11, fontWeight: 700, margin: 0 }}>{beforeLabel}</p></div>
        </div>
        <div style={{ borderRadius: 10, overflow: "hidden" }}>
          {afterImg ? <img src={afterImg} alt="Après" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} /> : <div style={{ height: 120, background: "rgba(57,255,143,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>✨</div>}
          <div style={{ background: "rgba(57,255,143,0.15)", padding: "5px", textAlign: "center" }}><p style={{ color: "var(--success)", fontSize: 11, fontWeight: 700, margin: 0 }}>{afterLabel}</p></div>
        </div>
      </div>
      {description && <p style={{ color: muted, fontSize: 12.5, textAlign: "center", margin: "8px 0 0" }}>{description}</p>}
    </div>
  )
}
