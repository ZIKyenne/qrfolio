// Modèle pur `lineup`. items filtrés sur `name` (a1..a4, limite 4). visible via hasPublishableContent.
import { hasPublishableContent } from "../../blockEmptyState"
import { extractIndexed } from "./repeaterExtract"

export type Artist = { name: string; stage?: string; time?: string; headliner?: string }
export type LineupViewModel = { visible: boolean; title?: string; items: Artist[] }

export function lineupViewModel(content: Record<string, any> | null | undefined): LineupViewModel {
  const c = content || {}
  const items = extractIndexed<Artist>(c, 4, (cc, i) => cc[`a${i}_name`] ? { name: cc[`a${i}_name`], stage: cc[`a${i}_stage`], time: cc[`a${i}_time`], headliner: cc[`a${i}_headliner`] } : null)
  return { visible: hasPublishableContent("lineup", c), title: typeof c.title === "string" && c.title ? c.title : undefined, items }
}
