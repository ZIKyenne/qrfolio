"use client"
// Adapter PUBLIC de `heading`. Reproduit PublicPageClient case "heading" à l'identique.
// N'importe AUCUN symbole éditeur.
import { headingViewModel } from "../../models/heading"
import type { PublicAdapterProps } from "../../renderTypes"

const SIZES: Record<string, number> = { small: 18, medium: 24, large: 32, xl: 42 }

export function PublicHeading({ content, ctx }: PublicAdapterProps) {
  const vm = headingViewModel(content)
  const { theme, G, TEXT, MUTED, FONT_D, FONT_B } = ctx
  const hColors: Record<string, string> = { default: TEXT, primary: G, accent: theme.accent || "var(--success)", muted: MUTED }
  return (
    <div style={{ padding: "12px 24px 6px", textAlign: vm.align as any }}>
      <h2 style={{ fontFamily: FONT_D, fontSize: SIZES[vm.size] ?? SIZES.medium, color: hColors[vm.color] ?? TEXT, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.2 }}>{vm.text || "Titre"}</h2>
      {vm.subtitle && <p style={{ color: MUTED, fontSize: 13, margin: 0, fontFamily: FONT_B }}>{vm.subtitle}</p>}
    </div>
  )
}
