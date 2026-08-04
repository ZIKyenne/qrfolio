// Registre PRÉPARATOIRE INACTIF des formulaires (B09.13). N'est importé par AUCUN registre actif
// (editorRegistry / publicRegistry) ni par le flag SHARED_RENDERER_BLOCKS. Source unique pour les
// tests et la future vague pilote B09.14. Aucune résolution runtime en production.
import { contactFormModel, quoteFormModel, reservationFormModel, bookingRequestFormModel, registerFormModel, rsvpFormModel } from "./leadFormModels"
import type { SharedFormModel } from "./formTypes"

export const FORM_RENDERER_CANDIDATES: Record<string, (content: Record<string, any> | null | undefined) => SharedFormModel> = {
  contact_form: contactFormModel,
  quote_form: quoteFormModel,
  reservation_form: reservationFormModel,
  booking_request: bookingRequestFormModel,
  event_register: registerFormModel,
  rsvp: rsvpFormModel,
}

// Deux pilotes recommandés pour B09.14 (NON activés) : les plus simples, sans divergence, déjà
// portés par LeadFormPublic + contactFormFields testés.
export const FORM_PILOT_CANDIDATES = ["contact_form", "quote_form"] as const
