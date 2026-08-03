// Modèle pur `event_ticketing`. Carte billetterie : nom/date/lieu/prix (texte statique) +
// CTA (lien billetterie) TOUJOURS présent. Public null si (event_name || url) absents.
// CTA legacy : target si http(s), href via extHref. Libellé composé avec la plateforme.
import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

export type EventTicketingViewModel = { visible: boolean; eventName?: string; date?: string; location?: string; price?: string; ctaText: string; link: CtaLink }

export function eventTicketingViewModel(content: Record<string, any> | null | undefined): EventTicketingViewModel {
  const c = content || {}
  const url = typeof c.url === "string" ? c.url : ""
  const platform = c.platform && c.platform !== "URL personnalisée" ? ` — ${c.platform}` : ""
  return {
    visible: !!(c.event_name || c.url),
    eventName: c.event_name, date: c.date, location: c.location, price: c.price,
    ctaText: `${c.label || "Réserver ma place"}${platform}`,
    link: { href: extHref(url) || null, external: /^https?:/.test(url), trackTarget: url || "ticket", visible: true },
  }
}
