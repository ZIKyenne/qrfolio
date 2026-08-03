// Modèle pur du bloc `donation`. Couleur dérivée de la plateforme (comme le legacy).
// href via extHref, visible si URL. Aucun React.
import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

const PLATFORM_COLORS: Record<string, string> = { "Ko-fi": "#FF5E5B", "Buy Me A Coffee": "#FFDD00", "Patreon": "#FF424D", "PayPal": "#009CDE", "Tipeee": "#E55100" }

export type DonationViewModel = { label: string; color: string; link: CtaLink }
export function donationViewModel(content: Record<string, any> | null | undefined): DonationViewModel {
  const c = content || {}
  const color = PLATFORM_COLORS[c.platform || "Ko-fi"] || "#F59E0B"
  const url = typeof c.url === "string" ? c.url.trim() : ""
  const href = url ? extHref(url) : null
  return { label: c.label || "Soutenir mon travail", color, link: { href, external: true, trackTarget: url, visible: href != null } }
}
