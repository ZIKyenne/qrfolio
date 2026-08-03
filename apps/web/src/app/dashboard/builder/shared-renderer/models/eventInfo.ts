// Modèle pur `event_info`. Carte événement : nom + lignes date/heure/lieu/prix (texte
// statique, aucune logique temporelle) + CTA optionnel. Toujours visible (public rend
// toujours le conteneur). CTA legacy : PAS de target/rel (external=false).
import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

export type EventInfoRow = { icon: string; val: string }
export type EventInfoViewModel = { name?: string; rows: EventInfoRow[]; ctaLabel?: string; link: CtaLink }

export function eventInfoViewModel(content: Record<string, any> | null | undefined): EventInfoViewModel {
  const c = content || {}
  const url = typeof c.cta_url === "string" ? c.cta_url : ""
  const rows = ([["📅", c.date], ["🕐", c.time], ["📍", c.location], ["🎟️", c.price]] as [string, any][])
    .filter(([, v]) => v).map(([icon, val]) => ({ icon, val: val as string }))
  return {
    name: c.name, rows, ctaLabel: c.cta_label,
    link: { href: extHref(url) || null, external: false, trackTarget: url || "event_info", visible: !!c.cta_label },
  }
}
