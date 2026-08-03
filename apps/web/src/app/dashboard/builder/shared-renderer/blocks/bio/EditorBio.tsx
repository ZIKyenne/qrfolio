"use client"
import { InlineEditable } from "../../../InlineEditable"
import { bioViewModel } from "../../models/bio"
import type { EditorAdapterProps } from "../../renderTypes"

export function EditorBio({ content, ctx }: EditorAdapterProps) {
  const { text, align } = bioViewModel(content)
  const { text: textColor, surfaceStyle, canEdit, edit } = ctx
  return (
    <div style={{ padding: "12px 16px", textAlign: align as any, ...surfaceStyle }}>
      <InlineEditable as="p" editable={canEdit} value={text} placeholder="Votre texte de présentation…" multiline onCommit={edit("text")} style={{ color: textColor, fontSize: 13, lineHeight: 1.7, margin: 0 }} />
    </div>
  )
}
