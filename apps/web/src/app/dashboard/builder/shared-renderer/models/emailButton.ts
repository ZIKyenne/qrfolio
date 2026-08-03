// Modèle pur du bloc `email_button`. href mailto (avec subject). Aucun React.
import type { CtaLink } from "./ctaLink"

export type EmailButtonViewModel = { label: string; link: CtaLink }
export function emailButtonViewModel(content: Record<string, any> | null | undefined): EmailButtonViewModel {
  const c = content || {}
  const email = typeof c.email === "string" ? c.email.trim() : ""
  const href = email ? `mailto:${email}${c.subject ? `?subject=${encodeURIComponent(c.subject)}` : ""}` : null
  return { label: c.label || "Envoyer un email", link: { href, external: false, trackTarget: "email", visible: href != null } }
}
