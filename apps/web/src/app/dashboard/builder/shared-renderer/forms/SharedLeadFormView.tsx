"use client"
// Vue PRÉSENTATIVE commune des formulaires (B09.13, inactive). Aucune logique réseau/Supabase/
// tracking : uniquement structure + accessibilité (label htmlFor/id, aria-invalid, aria-describedby,
// role=status). N'utilise PAS <form onSubmit> (conteneur <div> + <button type="button">) pour
// interdire toute soumission native accidentelle. Le honeypot n'est PAS un champ ici (géré par
// l'adapter public au moment de l'activation).
import type { CSSProperties } from "react"
import type { LeadFormStatus } from "./leadFormMachine"
import type { SharedLeadFormModel } from "./formTypes"

export type SharedLeadFormViewProps = {
  model: SharedLeadFormModel
  values: Record<string, string>
  status: LeadFormStatus
  emailInvalid?: boolean
  errorMessage?: string
  idPrefix: string
  onChange?: (key: string, value: string) => void
  onSubmit?: () => void
  readOnly?: boolean
  previewNotice?: string
  TEXT: string
  MUTED: string
  accent: string
}

export function SharedLeadFormView(props: SharedLeadFormViewProps) {
  const { model, values, status, emailInvalid, errorMessage, idPrefix, onChange, onSubmit, readOnly, previewNotice, TEXT, MUTED, accent } = props
  const inputStyle: CSSProperties = { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 9, padding: "11px 13px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }

  if (status === "success") return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div role="status" aria-live="polite" style={{ background: "rgba(57,255,143,0.08)", border: "1.5px solid rgba(57,255,143,0.3)", borderRadius: 12, padding: "16px", textAlign: "center", color: "var(--success)", fontSize: 14, fontWeight: 700 }}>✅ {model.successMessage}</div>
    </div>
  )

  const errId = `${idPrefix}-err`
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>{model.title}</p>
      {model.description && <p style={{ color: MUTED, fontSize: 12, margin: "0 0 13px" }}>{model.description}</p>}
      {previewNotice && <p role="note" style={{ color: MUTED, fontSize: 11, fontStyle: "italic", margin: "0 0 10px" }}>{previewNotice}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {model.fields.map(f => {
          const id = `${idPrefix}-${f.key}`
          const invalid = f.type === "email" && !!emailInvalid
          const common: any = { id, name: f.key, value: values[f.key] || "", readOnly, "aria-required": f.required || undefined, "aria-invalid": invalid || undefined, "aria-describedby": invalid ? errId : undefined, onChange: onChange ? (e: any) => onChange(f.key, e.target.value) : undefined, style: inputStyle }
          return (
            <div key={f.key}>
              <label htmlFor={id} style={{ display: "block", color: MUTED, fontSize: 12, margin: "0 0 4px" }}>{f.label}{f.required ? " *" : ""}</label>
              {f.type === "textarea"
                ? <textarea {...common} placeholder={f.placeholder || f.label} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                : f.type === "select"
                  ? <select {...common} aria-label={f.label}>{(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                  : <input {...common} type={f.type} autoComplete={f.autocomplete} placeholder={f.placeholder || f.label} />}
            </div>
          )
        })}
        {emailInvalid && <p id={errId} style={{ color: "#F59E0B", fontSize: 12, margin: 0 }}>Adresse email invalide.</p>}
        {status === "error" && <p role="alert" style={{ color: "#EF4444", fontSize: 12, margin: 0 }}>{errorMessage || "Une erreur est survenue. Réessayez."}</p>}
        <button type="button" onClick={readOnly ? undefined : onSubmit} disabled={readOnly || status === "sending"} aria-disabled={readOnly || undefined} style={{ background: accent, borderRadius: 10, padding: "13px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#fff", border: "none", cursor: readOnly || status === "sending" ? "not-allowed" : "pointer", opacity: status === "sending" ? 0.55 : 1 }}>{status === "sending" ? "Envoi…" : model.submitLabel}</button>
      </div>
    </div>
  )
}
