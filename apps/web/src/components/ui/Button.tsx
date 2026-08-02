"use client"

// Primitive Button QRowg — 1re brique du design system (Bible Ch.2/Ch.3).
// Styles en CLASSES (globals.css → .ui-btn*) pour de vrais états :hover/:active
// impossibles en inline. Couleurs = tokens (var(--accent) suit l'utilisateur ;
// rôles sémantiques) ; motion = var(--mo-*) ; spinner = classe .mo-spin ;
// cible tactile md = 46px ; focus visible via la règle globale :focus-visible.

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
export type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, fullWidth = false, leftIcon, rightIcon, disabled, children, className, ...rest },
  ref,
) {
  const isDisabled = disabled || loading
  const cls = [
    "ui-btn",
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    fullWidth ? "ui-btn--full" : "",
    className ?? "",
  ].filter(Boolean).join(" ")

  return (
    <button ref={ref} className={cls} disabled={isDisabled} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="mo-spin ui-btn__spin" aria-hidden />}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})
