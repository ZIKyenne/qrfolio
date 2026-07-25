// Logique pure de resolution de destination d'un QR dynamique (override).
// Extraite du handler pour etre testable et robuste. Le type "page" n'est PAS
// gere ici (il exige un acces DB) : il reste dans la route.

export type OverrideDest = { type?: string; url?: string; value?: string } | null | undefined

// Renvoie l'URL de redirection finale d'un override synchrone, ou null si non
// resoluble ici (type "page", type inconnu, ou destination vide). Le garde-fou
// sur une destination vide evite un crash (dest.startsWith sur undefined).
export function resolveOverrideDest(override: OverrideDest): string | null {
  if (!override) return null
  const dest = override.url || override.value
  if (!dest) return null
  switch (override.type) {
    case "url":
    case "file":
      return dest.startsWith("http") ? dest : `https://${dest}`
    case "email":
      return dest.startsWith("mailto:") ? dest : `mailto:${dest}`
    case "phone":
      return dest.startsWith("tel:") ? dest : `tel:${dest}`
    case "whatsapp":
      return dest
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
