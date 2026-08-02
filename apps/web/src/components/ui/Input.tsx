"use client"

// Primitives de champ QRowg (Input / Textarea / Select). Label ASSOCIÉ (htmlFor/id
// via useId) — corrige l'a11y des champs. hint/error optionnels (aria-describedby,
// aria-invalid). Styles = classes .ui-input/.ui-textarea/.ui-select (globals.css,
// 16px anti-zoom iOS, focus via règles globales).

import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react"

function Wrapper({ id, label, hint, error, children }: { id: string; label?: ReactNode; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label htmlFor={id} className="ui-field-label">{label}</label>}
      {children}
      {(error || hint) && <span id={`${id}-desc`} className={error ? "ui-field-error" : "ui-field-hint"}>{error || hint}</span>}
    </div>
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: ReactNode; hint?: ReactNode; error?: string }
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, id, className, ...rest }, ref) {
  const gid = useId(); const fid = id || gid
  return (
    <Wrapper id={fid} label={label} hint={hint} error={error}>
      <input ref={ref} id={fid} aria-invalid={!!error || undefined} aria-describedby={hint || error ? `${fid}-desc` : undefined}
        className={`ui-input${error ? " ui-input--error" : ""}${className ? " " + className : ""}`} {...rest} />
    </Wrapper>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: ReactNode; hint?: ReactNode; error?: string }
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, hint, error, id, className, ...rest }, ref) {
  const gid = useId(); const fid = id || gid
  return (
    <Wrapper id={fid} label={label} hint={hint} error={error}>
      <textarea ref={ref} id={fid} aria-invalid={!!error || undefined} aria-describedby={hint || error ? `${fid}-desc` : undefined}
        className={`ui-textarea${error ? " ui-textarea--error" : ""}${className ? " " + className : ""}`} {...rest} />
    </Wrapper>
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: ReactNode; hint?: ReactNode; error?: string; children: ReactNode }
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, id, className, children, ...rest }, ref) {
  const gid = useId(); const fid = id || gid
  return (
    <Wrapper id={fid} label={label} hint={hint} error={error}>
      <select ref={ref} id={fid} aria-invalid={!!error || undefined} aria-describedby={hint || error ? `${fid}-desc` : undefined}
        className={`ui-select${error ? " ui-select--error" : ""}${className ? " " + className : ""}`} {...rest}>
        {children}
      </select>
    </Wrapper>
  )
})
