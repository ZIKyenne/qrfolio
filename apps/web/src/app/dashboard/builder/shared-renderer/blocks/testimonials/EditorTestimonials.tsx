"use client"
import { InlineEditable } from "../../../InlineEditable"
import { testimonialsViewModel } from "../../models/testimonials"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorTestimonials({ content, ctx }: EditorAdapterProps) {
  const { items } = testimonialsViewModel(content)
  const { text, muted, primary, surfaceStyle, canEdit, edit } = ctx
  return (
    <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 7, ...surfaceStyle }}>
      {items.map((r) => (
        <div key={r.i} style={{ background: primary + "06", border: `1px solid ${primary}12`, borderRadius: 9, padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <InlineEditable as="p" editable={canEdit} value={r.name} onCommit={edit(`name${r.i}`)} style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }} />
            <p style={{ color: "#FFD700", fontSize: 11, margin: 0 }}>{"★".repeat(parseInt(r.stars || "5"))}</p>
          </div>
          <p style={{ color: muted, fontSize: 11, margin: 0, fontStyle: "italic" }}>"<InlineEditable as="span" editable={canEdit} value={r.text} multiline onCommit={edit(`text${r.i}`)} />"</p>
        </div>
      ))}
    </div>
  )
}
