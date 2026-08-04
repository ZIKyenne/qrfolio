// Machine d'états PURE de soumission de formulaire (B09.13, inactive). Extraite pour tester la
// logique idle/sending/success/error SANS DOM ni réécriture de LeadFormPublic. Reproduit sa
// logique exacte : honeypot → faux succès silencieux ; validation ; envoi ; ok → succès ;
// sinon repli mailto (si ownerEmail) → succès ; sinon erreur. Anti-double-submit via canSubmit.
import type { SharedLeadFormModel } from "./formTypes"

export type LeadFormStatus = "idle" | "validation_error" | "sending" | "success" | "error"
export type LeadValidation = { ok: boolean; missing: string[]; emailInvalid: boolean }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLeadForm(model: SharedLeadFormModel, values: Record<string, any>): LeadValidation {
  const val = (k: string) => (typeof values[k] === "string" ? values[k].trim() : "")
  const missing = model.fields.filter(f => f.required && !val(f.key)).map(f => f.key)
  const emailField = model.fields.find(f => f.type === "email")
  const emailVal = emailField ? val(emailField.key) : ""
  const emailInvalid = !!emailVal && !EMAIL_RE.test(emailVal)
  return { ok: missing.length === 0 && !emailInvalid, missing, emailInvalid }
}

// Anti-double-submit : une soumission est refusée tant qu'un envoi est en cours.
export function canSubmit(status: LeadFormStatus): boolean {
  return status !== "sending"
}

export type SubmitDecision =
  | { status: "sending"; action: "send" }
  | { status: "sending"; action: "blocked" }
  | { status: "success"; action: "honeypot-skip" }
  | { status: "validation_error"; action: "none" }

// Décide de l'action à la soumission (avant tout appel réseau).
export function decideSubmit(
  current: LeadFormStatus,
  opts: { honeypotFilled: boolean; validation: LeadValidation },
): SubmitDecision {
  if (current === "sending") return { status: "sending", action: "blocked" } // anti-double-submit
  if (opts.honeypotFilled) return { status: "success", action: "honeypot-skip" } // bot : faux succès, rien envoyé
  if (!opts.validation.ok) return { status: "validation_error", action: "none" }
  return { status: "sending", action: "send" }
}

export type ResultDecision =
  | { status: "success"; action: "none" }
  | { status: "success"; action: "mailto" }
  | { status: "error"; action: "none" }

// Décide de l'état après la réponse réseau (succès uniquement après OK confirmé).
export function decideResult(ok: boolean, hasOwnerEmail: boolean): ResultDecision {
  if (ok) return { status: "success", action: "none" }
  if (hasOwnerEmail) return { status: "success", action: "mailto" } // repli mailto = succès (comme le legacy)
  return { status: "error", action: "none" }
}
