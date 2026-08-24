// Logique pure de resolution de destination d'un QR dynamique (override).
// Extraite du handler pour etre testable et robuste. Le type "page" n'est PAS
// gere ici (il exige un acces DB) : il reste dans la route.

export type OverrideDest = { type?: string; url?: string; value?: string } | null | undefined

// Renvoie l'URL de redirection finale d'un override synchrone, ou null si non
// resoluble ici (type "page", type inconnu, ou destination vide). Le garde-fou
// sur une destination vide evite un crash (dest.startsWith sur undefined).
/**
 * Schémas autorisés en sortie. Tout le reste est refusé.
 *
 * Cette valeur part dans un en-tête `Location` : un scan la suit sans que personne
 * ne la lise. On ne laisse donc sortir que ce qu'un QR est censé faire — ouvrir une
 * page, écrire un mail, appeler. `javascript:`, `data:`, `file:` n'ont rien à y faire.
 */
const SCHEMAS_AUTORISES = /^(https?|mailto|tel):/i

/** Un « http » suivi de n'importe quoi n'est pas une adresse : on veut http:// ou https://. */
const VRAI_HTTP = /^https?:\/\//i

export function resolveOverrideDest(override: OverrideDest): string | null {
  if (!override) return null
  const dest = (override.url || override.value || "").trim()
  if (!dest) return null

  // Une destination qui porte déjà un schéma non autorisé est refusée d'emblée —
  // sans quoi « javascript:… » repartait tel quel pour le type « whatsapp », et
  // « httpjavascript:… » passait le test `startsWith("http")` de l'ancienne version.
  if (/^[a-z][a-z0-9+.-]*:/i.test(dest) && !SCHEMAS_AUTORISES.test(dest)) return null

  switch (override.type) {
    case "url":
    case "file":
      return VRAI_HTTP.test(dest) ? dest : `https://${dest}`
    case "email":
      return dest.startsWith("mailto:") ? dest : `mailto:${dest}`
    case "phone":
      return dest.startsWith("tel:") ? dest : `tel:${dest}`
    case "whatsapp":
      // Un numéro seul est fréquent ici : on lui donne son adresse WhatsApp.
      return VRAI_HTTP.test(dest) ? dest : `https://wa.me/${dest.replace(/[^0-9]/g, "")}`
    default:
      return null
  }
}

// Re-export du helper canonique (source unique : lib/escapeHtml). Utilise pour
// echapper pause_message (saisi par le proprietaire du QR) dans les pages d'etat
// /q construites en template string -> sinon XSS stocke.
export { escapeHtml } from "../../../lib/escapeHtml"

// Categorise l'appareil a partir du user-agent (pour les stats de scan).
export function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  if (/Mobile|Android|iPhone/i.test(ua)) return "mobile"
  if (/Tablet|iPad/i.test(ua)) return "tablet"
  return "desktop"
}
