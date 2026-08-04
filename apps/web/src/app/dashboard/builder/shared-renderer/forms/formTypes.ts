// Contrats de FORMULAIRES partagés (B09.13) — INFRASTRUCTURE INACTIVE, préparatoire.
// Aucun de ces types n'est câblé aux registres actifs ; ils préparent la migration future des
// formulaires de leads (contact/quote/reservation/booking/register/rsvp) vers le renderer partagé.
// Purs : aucun React, aucun Supabase, aucun callback ici.

export type SharedFormFieldType =
  | "text" | "email" | "tel" | "number" | "date" | "time" | "textarea" | "select" | "checkbox"

export type SharedFormOption = { label: string; value: string }

export type SharedFormField = {
  key: string                 // clé canonique de la donnée visiteur (name/email/phone/message…)
  type: SharedFormFieldType
  label: string               // libellé + placeholder (le legacy utilise le label comme placeholder)
  required: boolean
  placeholder?: string
  autocomplete?: string
  area?: boolean              // textarea (compat champ legacy { area })
  options?: SharedFormOption[]
}

// Formulaire à champs (contact/quote/reservation/booking/register).
export type SharedLeadFormModel = {
  kind: "fields"
  visible: boolean
  blockType: string
  leadType: string            // contact | quote | reservation | booking | register (envoyé tel quel)
  title: string
  description?: string
  fields: SharedFormField[]
  submitLabel: string
  successMessage: string
  subject: string             // sujet email + repli message
}

// Formulaire à choix (rsvp) — pas de champs saisis, boutons de réponse.
export type SharedRsvpChoice = { value: string; label: string }
export type SharedRsvpModel = {
  kind: "choice"
  visible: boolean
  blockType: "rsvp"
  leadType: "rsvp"
  title: string
  description?: string
  choices: SharedRsvpChoice[]
  successMessage: string
}

export type SharedFormModel = SharedLeadFormModel | SharedRsvpModel

// Le contrat de champs de LeadFormPublic (public legacy, fiable) : { key, label, area? }.
// La migration future alimente LeadFormPublic via ce mapping (aucune réécriture).
export type LeadFormPublicField = { key: string; label: string; area?: boolean }
export function toLeadFormFields(model: SharedLeadFormModel): LeadFormPublicField[] {
  return model.fields.map(f => ({ key: f.key, label: f.label, ...(f.area ? { area: true } : {}) }))
}
