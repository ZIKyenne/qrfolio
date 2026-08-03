"use client"
import { skillsViewModel } from "../../models/skills"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicSkills({ content, ctx }: PublicAdapterProps) {
  const { title, tags } = skillsViewModel(content)
  const { G, MUTED, FONT_B } = ctx
  return (
    <div style={{ padding: "6px 24px 16px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {tags.map((tag, i) => <span key={i} style={{ background: `${G}10`, border: `1px solid ${G}22`, borderRadius: 20, padding: "5px 13px", fontSize: 12, color: G, fontWeight: 600, fontFamily: FONT_B }}>{tag}</span>)}
      </div>
    </div>
  )
}
