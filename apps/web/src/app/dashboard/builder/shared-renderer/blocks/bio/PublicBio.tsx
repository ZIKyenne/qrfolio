"use client"
import { bioViewModel } from "../../models/bio"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicBio({ content, ctx }: PublicAdapterProps) {
  const { text, align } = bioViewModel(content)
  const { TEXT, FONT_B } = ctx
  return (
    <div style={{ padding: "6px 24px 16px", textAlign: align as any }}>
      <p style={{ color: TEXT, fontSize: 15, lineHeight: 1.75, margin: 0, fontFamily: FONT_B }}>{text}</p>
    </div>
  )
}
