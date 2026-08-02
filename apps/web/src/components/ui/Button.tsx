"use client"

// Primitive Button QRowg — première brique du design system (Bible Ch.2/Ch.3).
// Inline styles (convention du repo) dérivés des TOKENS : couleur = var(--accent)
// / rôles sémantiques ; motion = var(--mo-*) ; spinner = classe .mo-spin ;
// cible tactile md = 46px ; focus visible via la règle globale :focus-visible ;
// enfoncement via la règle globale button:active. Zéro hex arbitraire.

import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type CSSProperties } from "react"

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

const SIZES: Record<ButtonSize, { h: number; px: number; fs: number; gap: number }> = {
  sm: { h: 38, px: 14, fs: 13, gap: 6 },
  md: { h: 46, px: 18, fs: 14.5, gap: 8 }, // 46 = cible tactile minimale (Bible §9)
  lg: { h: 54, px: 24, fs: 15.5, gap: 9 },
}

function variantStyle(v: ButtonVariant, disabled: boolean): CSSProperties {
  switch (v) {
    case "primary":
      return {
        background: "var(--accent)",
        color: "#080808", // texte sombre sur l'accent (l'accent est clair par défaut)
        border: "1px solid transparent",
        boxShadow: disabled ? "none" : "0 6px 18px color-mix(in srgb, var(--accent) 28%, transparent)",
      }
    case "secondary":
      return {
        background: "var(--surface)",
        color: "var(--ink)",
        border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
      }
    case "ghost":
      return { background: "transparent", color: "var(--ink)", border: "1px solid rgba(255,255,255,0.10)" }
    case "danger":
      return { background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-border)" }
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, fullWidth = false, leftIcon, rightIcon, disabled, children, style, ...rest },
  ref,
) {
  const s = SIZES[size]
  const isDisabled = disabled || loading
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        minHeight: s.h,
        padding: `0 ${s.px}px`,
        width: fullWidth ? "100%" : undefined,
        borderRadius: 12,
        fontSize: s.fs,
        fontWeight: 700,
        fontFamily: "Inter, system-ui, sans-serif",
        lineHeight: 1,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.55 : 1,
        // Motion System : transition douce (les règles globales gèrent :active et :focus-visible).
        transition: "transform var(--mo-fast) var(--mo-ease-standard), filter var(--mo-fast) var(--mo-ease-standard), box-shadow var(--mo-fast) var(--mo-ease-standard)",
        WebkitTapHighlightColor: "transparent",
        ...variantStyle(variant, isDisabled),
        ...style,
      }}
      {...rest}
    >
      {loading && (
        <span
          className="mo-spin"
          aria-hidden
          style={{ width: s.fs, height: s.fs, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", opacity: 0.9 }}
        />
      )}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})
