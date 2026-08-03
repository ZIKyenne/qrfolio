// Modèle pur `stats_block`. items filtrés sur `value`. visible = hasPublishableContent.
import { hasPublishableContent } from "../../blockEmptyState"
import { extractIndexed } from "./repeaterExtract"

export type StatItem = { icon?: string; value: string; label?: string }
export type StatsBlockViewModel = { visible: boolean; items: StatItem[] }

export function statsBlockViewModel(content: Record<string, any> | null | undefined): StatsBlockViewModel {
  const c = content || {}
  const items = extractIndexed<StatItem>(c, 50, (cc, i) => cc[`s${i}_value`] ? { icon: cc[`s${i}_icon`], value: cc[`s${i}_value`], label: cc[`s${i}_label`] } : null)
  return { visible: hasPublishableContent("stats_block", c), items }
}
