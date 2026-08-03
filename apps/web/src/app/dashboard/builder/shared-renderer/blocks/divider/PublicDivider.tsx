"use client"
import { dividerViewModel } from "../../models/divider"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicDivider({ content, ctx }: PublicAdapterProps) {
  const { style } = dividerViewModel(content)
  const { G, MUTED } = ctx
  const d: Record<string, any> = {
    gold: <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${G}60,transparent)` }} />,
    line: <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />,
    dots: <div style={{ textAlign: "center", color: MUTED, letterSpacing: 10, fontSize: 18 }}>• • •</div>,
    stars: <div style={{ textAlign: "center", color: G, letterSpacing: 10, fontSize: 16 }}>✦ ✦ ✦</div>,
  }
  return <div style={{ padding: "10px 24px" }}>{d[style]}</div>
}
