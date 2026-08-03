// leadForms.ts — configuration PURE des formulaires de leads publics.
// Extrait ici pour être testable sans rendu React (l'infra Vitest tourne en
// environnement "node", sans jsdom) et pour verrouiller le contrat de soumission :
// dans LeadFormPublic, les DEUX premiers champs sont requis, et les clés
// name/email/phone/message alimentent les colonnes structurées de la table leads.

export type LeadField = { key: string; label: string; area?: boolean }

// Champs du bloc "contact_form".
// Ordre : name + email en tête (⇒ requis), téléphone optionnel selon le réglage
// du bloc (`show_phone === "yes"`, comme l'ancien formulaire), message libre en fin.
export function contactFormFields(c: Record<string, any> | undefined): LeadField[] {
  return [
    { key: "name", label: "Nom" },
    { key: "email", label: "Email" },
    ...(c?.show_phone === "yes" ? [{ key: "phone", label: "Téléphone" }] : []),
    { key: "message", label: "Message", area: true },
  ]
}
