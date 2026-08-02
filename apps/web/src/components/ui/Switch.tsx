"use client"

// Primitive Switch QRowg — interrupteur ACCESSIBLE (role="switch" + aria-checked,
// clavier natif via <button>). Corrige les toggles maison en <div onClick> sans
// sémantique. Piste + pastille stylées en tokens (accent quand actif).

import { type ReactNode } from "react"

export interface SwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  disabled?: boolean
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer" }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === "string" ? label : undefined}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`ui-switch${checked ? " ui-switch--on" : ""}`}
      >
        <span className="ui-switch__knob" />
      </button>
      {label && <span style={{ color: "var(--ink)", fontSize: 14 }}>{label}</span>}
    </label>
  )
}
