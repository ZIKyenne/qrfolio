// Primitive Card QRowg (design system). Conteneur standard : surface + bordure
// discrète + élévation depuis les tokens. En-tête optionnel (icône + titre Fraunces
// + action à droite). Présentationnel (pas de hook) -> utilisable partout.

import { type ReactNode, type CSSProperties } from "react"

export interface CardProps {
  children: ReactNode
  title?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  elevated?: boolean
  padding?: number
  style?: CSSProperties
  className?: string
}

export function Card({ children, title, icon, action, elevated = false, padding = 18, style, className }: CardProps) {
  const hasHeader = !!(title || action)
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        boxShadow: elevated ? "0 12px 34px rgba(0,0,0,0.45)" : "0 4px 14px rgba(0,0,0,0.25)",
        overflow: "hidden",
        ...style,
      }}
    >
      {hasHeader && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: `${padding}px ${padding}px 0` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {icon && <span style={{ color: "var(--accent)", display: "flex", flexShrink: 0 }}>{icon}</span>}
            {title && <h3 style={{ color: "var(--ink)", fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif" }}>{title}</h3>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding, paddingTop: hasHeader ? 12 : padding }}>{children}</div>
    </div>
  )
}
