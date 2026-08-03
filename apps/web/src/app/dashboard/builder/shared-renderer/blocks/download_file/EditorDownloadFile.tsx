"use client"
import { downloadFileViewModel } from "../../models/downloadFile"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorDownloadFile({ content, ctx }: EditorAdapterProps) {
  const { icon, label, typeDoc } = downloadFileViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "4px 16px 10px", ...surfaceStyle }}>
      <EditorCtaShell style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(167,139,250,0.08)", border: "1.5px solid rgba(167,139,250,0.25)", borderRadius: 12, padding: "11px 14px" }}>
        <div style={{ width: 36, height: 36, background: "rgba(167,139,250,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>{label}</p>{typeDoc && <p style={{ color: muted, fontSize: 9, margin: 0 }}>{typeDoc}</p>}</div>
        <span style={{ color: "#A78BFA", fontSize: 16 }}>↓</span>
      </EditorCtaShell>
    </div>
  )
}
