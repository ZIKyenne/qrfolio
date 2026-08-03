// Modèle pur `timeline`. items filtrés sur title||date (clés e{i}). Limite 50. `i` conservé.
import { extractIndexed } from "./repeaterExtract"

export type TimelineEvent = { i: number; date?: string; title?: string; desc?: string; icon: string }
export type TimelineViewModel = { visible: boolean; title?: string; horizontal: boolean; items: TimelineEvent[] }

export function timelineViewModel(content: Record<string, any> | null | undefined): TimelineViewModel {
  const c = content || {}
  const items = extractIndexed<TimelineEvent>(c, 50, (cc, i) => (cc[`e${i}_title`] || cc[`e${i}_date`]) ? { i, date: cc[`e${i}_date`], title: cc[`e${i}_title`], desc: cc[`e${i}_desc`], icon: (cc[`e${i}_icon`] || "").trim() } : null)
  return { visible: items.length > 0, title: typeof c.title === "string" && c.title ? c.title : undefined, horizontal: c.layout === "Horizontale", items }
}
