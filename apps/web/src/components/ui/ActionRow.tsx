"use client"

// Primitive ActionRow QRowg — rangée d'action : boîte d'icône colorée + titre +
// sous-titre + slot droit optionnel. Capture les nombreux « boutons riches » de
// l'app (déconnexion appareils, statut email, réglages…) sans les aplatir dans un
// simple Button. Cliquable (rendu <button>/<a>) ou statique (<div>).
// Tons = grammaire sémantique (accent/success/warning/danger/neutral).

import { type ReactNode, type CSSProperties } from "react"

export type ActionRowTone = "accent" | "success" | "warning" | "danger" | "neutral"

const TONE: Record<ActionRowTone, { box: string; icon: string; title: string; border: string }> = {
  accent: { box: "color-mix(in srgb, var(--accent) 12%, transparent)", icon: "var(--accent)", title: "var(--ink)", border: "rgba(255,255,255,0.06)" },
  success: { box: "var(--success-bg)", icon: "var(--success)", title: "var(--ink)", border: "var(--success-border)" },
  warning: { box: "var(--warning-bg)", icon: "var(--warning)", title: "var(--warning)", border: "var(--warning-border)" },
  danger: { box: "var(--danger-bg)", icon: "var(--danger)", title: "var(--danger)", border: "var(--danger-border)" },
  neutral: { box: "rgba(255,255,255,0.05)", icon: "#A8A190", title: "var(--ink)", border: "rgba(255,255,255,0.06)" },
}

export interface ActionRowProps {
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  tone?: ActionRowTone
  right?: ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  /** true : la rangée prend une teinte de fond du ton (au lieu de la surface neutre). */
  tinted?: boolean
  style?: CSSProperties
}

export function ActionRow({ icon, title, subtitle, tone = "neutral", right, onClick, href, disabled, tinted = false, style }: ActionRowProps) {
  const t = TONE[tone]
  const clickable = !!(onClick || href) && !disabled
  const base: CSSProperties = {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
    background: tinted ? t.box : "rgba(255,255,255,0.03)",
    border: `1px solid ${tinted ? t.border : "rgba(255,255,255,0.06)"}`,
    borderRadius: 12, ...style,
  }
  const inner = (
    <>
      {icon && (
        <span style={{ width: 32, height: 32, borderRadius: 8, background: t.box, color: t.icon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", color: t.title, fontSize: 13, fontWeight: 600 }}>{title}</span>
        {subtitle && <span style={{ display: "block", color: "#A8A190", fontSize: 11, marginTop: 1 }}>{subtitle}</span>}
      </span>
      {right}
    </>
  )
  const cls = `ui-actionrow${clickable ? " ui-actionrow--clickable" : ""}`

  if (href && !disabled) {
    return <a href={href} className={cls} style={base}>{inner}</a>
  }
  if (onClick) {
    return <button type="button" className={cls} style={base} onClick={onClick} disabled={disabled}>{inner}</button>
  }
  return <div className={cls} style={base}>{inner}</div>
}
