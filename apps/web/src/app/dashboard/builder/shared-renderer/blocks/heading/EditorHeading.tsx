"use client"
// Adapter ÉDITEUR de `heading`. Reproduit builderPreview case "heading" à l'identique
// (échelle canvas réduite + édition inline). Consomme le modèle pur partagé.
import { InlineEditable } from "../../../InlineEditable"
import { headingViewModel } from "../../models/heading"
import type { EditorAdapterProps } from "../../renderTypes"

const SIZES: Record<string, number> = { small: 15, medium: 20, large: 27, xl: 34 }

export function EditorHeading({ content, ctx }: EditorAdapterProps) {
  const vm = headingViewModel(content)
  const { theme, text, primary, accent, muted, surfaceStyle, canEdit, edit } = ctx
  const hColors: Record<string, string> = { default: text, primary, accent, muted }
  return (
    <div style={{ padding: "14px 16px", textAlign: vm.align as any, ...surfaceStyle }}>
      <InlineEditable as="h2" editable={canEdit} value={vm.text} placeholder="Titre" onCommit={edit("text")} style={{ fontFamily: theme.fontDisplay, fontSize: SIZES[vm.size] ?? SIZES.medium, color: hColors[vm.color] ?? text, fontWeight: 700, margin: "0 0 3px" }} />
      {vm.subtitle && <InlineEditable as="p" editable={canEdit} value={vm.subtitle} onCommit={edit("subtitle")} style={{ color: muted, fontSize: 12, margin: 0 }} />}
    </div>
  )
}
