"use client"

// Primitive Modal QRowg (design system). Dialogue accessible : rôle dialog +
// aria-modal, PIÈGE DE FOCUS, fermeture Échap, clic sur le scrim, verrou du
// scroll body, RESTAURATION du focus au déclencheur (corrige la lacune a11y des
// modales maison signalée à l'audit). Animation via .mo-pop-in (Motion System).

import { type ReactNode } from "react"
import { useDialogue } from "./useDialogue"

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxWidth?: number
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 460 }: ModalProps) {
  // Le comportement (Échap, piège de focus, restitution, verrou du défilement)
  // vit dans useDialogue : quatre fenêtres écrites à la main le partagent.
  const titleId = title ? "qr-modal-title" : undefined
  const { ref: dialogRef, props: dialogProps } = useDialogue(open, onClose, { labelledBy: titleId })

  if (!open) return null
  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }}
    >
      <div
        ref={dialogRef}
        {...dialogProps}
        className="mo-pop-in"
        style={{ width: "100%", maxWidth, maxHeight: "90dvh", overflowY: "auto", background: "var(--surface)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 18, boxShadow: "0 24px 70px rgba(0,0,0,0.6)", outline: "none" }}
      >
        {title && (
          <div style={{ padding: "18px 22px 0" }}>
            <h2 id={titleId} style={{ fontFamily: "Fraunces, serif", color: "var(--ink)", fontSize: 19, fontWeight: 700, margin: 0 }}>{title}</h2>
          </div>
        )}
        <div style={{ padding: "16px 22px 20px", color: "#C9C3B6", fontSize: 14, lineHeight: 1.6 }}>{children}</div>
        {footer && <div style={{ padding: "0 22px 20px", display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
  )
}
