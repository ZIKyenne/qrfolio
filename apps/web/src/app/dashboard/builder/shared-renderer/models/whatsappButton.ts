// Modèle pur du bloc `whatsapp_button`. href via waLink (helper existant). Aucun React.
import { waLink } from "../../types"
import type { CtaLink } from "./ctaLink"

export type WhatsappButtonViewModel = { label: string; link: CtaLink }
export function whatsappButtonViewModel(content: Record<string, any> | null | undefined): WhatsappButtonViewModel {
  const c = content || {}
  const href = waLink(c.phone, c.message, c.country_code) || null
  return { label: c.label || "Discuter sur WhatsApp", link: { href, external: true, trackTarget: "whatsapp", visible: href != null } }
}
