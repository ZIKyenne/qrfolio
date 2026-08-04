// Modèles PURS des 6 formulaires (B09.13, inactifs). Six fonctions explicites (pas de factory
// magique). Chaque modèle reproduit EXACTEMENT le contrat de champs du legacy (LeadFormPublic /
// EventRegisterPublic / RsvpPublic) : mêmes clés, mêmes libellés, mêmes champs conditionnels,
// mêmes 2 premiers champs requis, mêmes leadType/subject. Aucune soumission, aucun React.
import { contactFormFields } from "../../../../../lib/leadForms"
import type { SharedLeadFormModel, SharedRsvpModel, SharedFormField } from "./formTypes"

type C = Record<string, any> | null | undefined

// Typage HTML dérivé de la clé (aligné sur fieldProps de LeadFormPublic).
function fieldType(key: string, area?: boolean): SharedFormField["type"] {
  if (area) return "textarea"
  const k = key.toLowerCase()
  if (/e?mail/.test(k)) return "email"
  if (/phone|tel|mobile|whatsapp|numero/.test(k)) return "tel"
  if (/date/.test(k)) return "text"      // legacy : champ texte libre (pas d'input date natif)
  if (/people|guests|participants|nombre/.test(k)) return "text"
  return "text"
}
function autoComplete(key: string): string | undefined {
  const k = key.toLowerCase()
  if (/e?mail/.test(k)) return "email"
  if (/phone|tel|mobile|whatsapp|numero/.test(k)) return "tel"
  if (/name|nom|prenom/.test(k)) return "name"
  if (/company|societe|organisation/.test(k)) return "organization"
  return undefined
}
function mk(key: string, label: string, opts?: { required?: boolean; area?: boolean }): SharedFormField {
  return { key, type: fieldType(key, opts?.area), label, required: !!opts?.required, area: opts?.area, autocomplete: autoComplete(key) }
}
// Les 2 premiers champs sont requis (contrat LeadFormPublic : required = fields.slice(0,2)).
function withRequiredHead(fields: SharedFormField[]): SharedFormField[] {
  return fields.map((f, i) => (i < 2 ? { ...f, required: true } : f))
}

export function contactFormModel(content: C): SharedLeadFormModel {
  const c = content || {}
  const fields = withRequiredHead(contactFormFields(c).map(f => mk(f.key, f.label, { area: f.area })))
  return { kind: "fields", visible: true, blockType: "contact_form", leadType: "contact", title: c.title || "Contact", fields, submitLabel: c.button_label || "Envoyer", successMessage: "Demande envoyée, merci !", subject: "Nouveau message de contact" }
}

export function quoteFormModel(content: C): SharedLeadFormModel {
  const c = content || {}
  const fields = withRequiredHead([
    mk("name", "Nom complet"), mk("email", "Email"),
    ...(c.show_phone !== "no" ? [mk("phone", "Téléphone")] : []),
    ...(c.show_budget === "yes" ? [mk("budget", "Budget estimé")] : []),
    mk("project", "Description du projet", { area: true }),
  ])
  return { kind: "fields", visible: true, blockType: "quote_form", leadType: "quote", title: c.title || "Demander un devis", description: c.description || undefined, fields, submitLabel: c.button_label || "Envoyer ma demande", successMessage: "Demande envoyée, merci !", subject: "Demande de devis" }
}

export function reservationFormModel(content: C): SharedLeadFormModel {
  const c = content || {}
  // Champs VISITEUR uniquement : nom + date + nb personnes (le champ panel `phone` = téléphone
  // direct du commerce, ORPHELIN — rendu nulle part, non envoyé ; documenté, non migré).
  const fields = withRequiredHead([mk("name", "Nom"), mk("date", "Date souhaitée"), mk("people", "Nb personnes")])
  return { kind: "fields", visible: true, blockType: "reservation_form", leadType: "reservation", title: c.title || "Réserver", fields, submitLabel: c.button_label || "Réserver", successMessage: "Demande envoyée, merci !", subject: `Réservation: ${c.title || ""}` }
}

export function bookingRequestFormModel(content: C): SharedLeadFormModel {
  const c = content || {}
  const fields = withRequiredHead([
    mk("name", "Nom / Organisation"), mk("email", "Email"),
    mk("type", "Type d'événement"), mk("date", "Date souhaitée"), mk("message", "Message", { area: true }),
  ])
  return { kind: "fields", visible: true, blockType: "booking_request", leadType: "booking", title: c.title || "Réserver pour un événement", description: c.description || undefined, fields, submitLabel: c.button_label || "Envoyer ma demande", successMessage: "Demande envoyée, merci !", subject: "Demande de réservation événement" }
}

export function registerFormModel(content: C): SharedLeadFormModel {
  const c = content || {}
  // EventRegisterPublic : prénom&nom + email requis, téléphone/société conditionnels.
  const fields = withRequiredHead([
    mk("name", "Prénom & Nom"), mk("email", "Email"),
    ...(c.show_phone === "yes" ? [mk("phone", "Téléphone")] : []),
    ...(c.show_company === "yes" ? [mk("company", "Société")] : []),
  ])
  return { kind: "fields", visible: true, blockType: "event_register", leadType: "register", title: c.title || "S'inscrire gratuitement", description: c.description || undefined, fields, submitLabel: c.button_label || "Je m'inscris", successMessage: "Inscription enregistrée, merci !", subject: `Inscription: ${c.title || "événement"}` }
}

export function rsvpFormModel(content: C): SharedRsvpModel {
  const c = content || {}
  return {
    kind: "choice", visible: true, blockType: "rsvp", leadType: "rsvp",
    title: c.title || "Serez-vous présent ?", description: c.description || undefined,
    choices: [
      { value: "oui", label: c.yes_label || "✅ Oui, je viens" },
      { value: "peut-etre", label: c.maybe_label || "🤔 Peut-être" },
      { value: "non", label: c.no_label || "❌ Non" },
    ],
    successMessage: "Merci, votre réponse est enregistrée !",
  }
}
