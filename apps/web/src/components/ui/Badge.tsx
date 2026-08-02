// Primitive Badge QRowg (design system). Pastille de statut/plan. Tons =
// grammaire sémantique de la Bible (accent/success/warning/danger/neutral).

import { type ReactNode, type CSSProperties } from "react"

export type BadgeTone = "accent" | "success" | "warning" | "danger" | "neutral"

const TONES: Record<BadgeTone, CSSProperties> = {
  accent: { background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" },
  success: { background: "var(--success-bg)", color: "var(--success)", border: "1px solid var(--success-border)" },
  warning: { background: "var(--warning-bg)", color: "var(--warning)", border: "1px solid var(--warning-border)" },
  danger: { background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-border)" },
  neutral: { background: "rgba(255,255,255,0.05)", color: "#A8A190", border: "1px solid rgba(255,255,255,0.10)" },
}

export function Badge({ tone = "neutral", children, style }: { tone?: BadgeTone; children: ReactNode; style?: CSSProperties }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, lineHeight: 1.4, whiteSpace: "nowrap", ...TONES[tone], ...style }}>
      {children}
    </span>
  )
}
