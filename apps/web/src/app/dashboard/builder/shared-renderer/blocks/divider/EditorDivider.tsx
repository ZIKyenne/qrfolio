"use client"
import { dividerViewModel } from "../../models/divider"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorDivider({ content, ctx }: EditorAdapterProps) {
  const { style } = dividerViewModel(content)
  const { primary, muted, surfaceStyle } = ctx
  const d: Record<string, any> = {
    gold: <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${primary}60,transparent)` }} />,
    line: <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />,
    dots: <div style={{ textAlign: "center", color: muted, letterSpacing: 8, fontSize: 14 }}>• • •</div>,
    stars: <div style={{ textAlign: "center", color: primary, letterSpacing: 8 }}>✦ ✦ ✦</div>,
  }
  return <div style={{ padding: "6px 16px", ...surfaceStyle }}>{d[style]}</div>
}
