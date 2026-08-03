"use client"
import { skillsViewModel } from "../../models/skills"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorSkills({ content, ctx }: EditorAdapterProps) {
  const { title, tags } = skillsViewModel(content)
  const { primary, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "12px 16px", ...surfaceStyle }}>
      {title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px" }}>{title}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {tags.map((tag, i) => <span key={i} style={{ background: primary + "12", border: `1px solid ${primary}30`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: primary, fontWeight: 600 }}>{tag}</span>)}
      </div>
    </div>
  )
}
