"use client"
import { eventInfoViewModel } from "../../models/eventInfo"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import type { EditorAdapterProps } from "../../renderTypes"

// Legacy sans gate : carte toujours rendue. Dates = texte statique (aucune logique temporelle).
export function EditorEventInfo({ content, ctx }: EditorAdapterProps) {
  const { name, rows, ctaLabel } = eventInfoViewModel(content)
  const { theme, text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <div style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 12, padding: "14px" }}>
        <p style={{ color: text, fontSize: 16, fontWeight: 700, margin: "0 0 10px", fontFamily: theme.fontDisplay }}>{name}</p>
        {rows.map((r) => (
          <p key={r.icon} style={{ color: muted, fontSize: 12, margin: "0 0 4px" }}>{r.icon} {r.val}</p>
        ))}
        {ctaLabel && <EditorCtaShell style={{ background: "#EC4899", color: "#fff", textAlign: "center", padding: "9px", borderRadius: 7, fontSize: 12, fontWeight: 700, marginTop: 10 }}>{ctaLabel}</EditorCtaShell>}
      </div>
    </div>
  )
}
