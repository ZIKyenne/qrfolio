"use client"
import { downloadFileViewModel } from "../../models/downloadFile"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicDownloadFile({ content, ctx }: PublicAdapterProps) {
  const { icon, label, typeDoc, link } = downloadFileViewModel(content)
  if (!link.visible) return null
  const { TEXT, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "6px 24px 10px" }}>
      <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={ctx.trackClick} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(167,139,250,0.08)", border: "1.5px solid rgba(167,139,250,0.28)", borderRadius: 13, padding: "13px 16px", textDecoration: "none" }}>
        <div style={{ width: 42, height: 42, background: "rgba(167,139,250,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}><p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{label}</p>{typeDoc && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{typeDoc}</p>}</div>
        <span style={{ color: "#A78BFA", fontSize: 20, flexShrink: 0 }}>↓</span>
      </PublicCtaLink>
    </div>
  )
}
