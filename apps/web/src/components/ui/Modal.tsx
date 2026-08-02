"use client"

// Primitive Modal QRowg (design system). Dialogue accessible : rôle dialog +
// aria-modal, PIÈGE DE FOCUS, fermeture Échap, clic sur le scrim, verrou du
// scroll body, RESTAURATION du focus au déclencheur (corrige la lacune a11y des
// modales maison signalée à l'audit). Animation via .mo-pop-in (Motion System).

import { useEffect, useRef, type ReactNode } from "react"

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxWidth?: number
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, children, footer, maxWidth = 460 }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    prevFocus.current = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const list = () => Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    ;(list()[0] ?? dialog)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return }
      if (e.key === "Tab") {
        const f = list()
        if (f.length === 0) { e.preventDefault(); return }
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener("keydown", onKey, true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey, true)
      document.body.style.overflow = prevOverflow
      prevFocus.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  const titleId = title ? "qr-modal-title" : undefined
  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
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
