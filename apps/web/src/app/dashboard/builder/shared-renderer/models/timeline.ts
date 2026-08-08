// Modèle pur `timeline`. items filtrés sur title||date (clés e{i}). Limite 50. `i` conservé.
// Lien externe optionnel par événement (durci via extHref) : rediriger vers plus de détails
// (page d'événement, réseau social…). visible via title||date (le lien seul ne crée pas d'item).
import { extractIndexed } from "./repeaterExtract"
import { extHref } from "../../types"

export type TimelineLink = { href: string; label: string; trackTarget: string }
export type TimelineEvent = { i: number; date?: string; title?: string; desc?: string; icon: string; link: TimelineLink | null }
export type TimelineViewModel = { visible: boolean; title?: string; horizontal: boolean; items: TimelineEvent[] }

function eventLink(cc: Record<string, any>, i: number): TimelineLink | null {
  const url = cc[`e${i}_link_url`]
  const href = url ? extHref(url) : ""
  if (!href) return null
  const label = (cc[`e${i}_link_label`] || "").trim() || "En savoir plus"
  return { href, label, trackTarget: url }
}

export function timelineViewModel(content: Record<string, any> | null | undefined): TimelineViewModel {
  const c = content || {}
  const items = extractIndexed<TimelineEvent>(c, 50, (cc, i) => (cc[`e${i}_title`] || cc[`e${i}_date`]) ? { i, date: cc[`e${i}_date`], title: cc[`e${i}_title`], desc: cc[`e${i}_desc`], icon: (cc[`e${i}_icon`] || "").trim(), link: eventLink(cc, i) } : null)
  return { visible: items.length > 0, title: typeof c.title === "string" && c.title ? c.title : undefined, horizontal: c.layout === "Horizontale", items }
}
