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

// Echappe le HTML pour une insertion sure dans une chaine HTML construite a la
// main (les pages d'etat /q sont des template strings, pas du JSX auto-echappe).
// pause_message est saisi par le proprietaire du QR -> XSS stocke sans echappement.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Categorise l'appareil a partir du user-agent (pour les stats de scan).
export function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  if (/Mobile|Android|iPhone/i.test(ua)) return "mobile"
  if (/Tablet|iPad/i.test(ua)) return "tablet"
  return "desktop"
}
