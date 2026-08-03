// Modèle pur `process_steps`. visible = hasPublishableContent ; items filtrés sur `title`.
import { hasPublishableContent } from "../../blockEmptyState"
import { extractIndexed } from "./repeaterExtract"

export type ProcessStep = { i: number; icon?: string; title: string; desc?: string }
export type ProcessStepsViewModel = { visible: boolean; title?: string; items: ProcessStep[] }

export function processStepsViewModel(content: Record<string, any> | null | undefined): ProcessStepsViewModel {
  const c = content || {}
  const items = extractIndexed<ProcessStep>(c, 50, (cc, i) => cc[`s${i}_title`] ? { i, icon: cc[`s${i}_icon`], title: cc[`s${i}_title`], desc: cc[`s${i}_desc`] } : null)
  return { visible: hasPublishableContent("process_steps", c), title: typeof c.title === "string" && c.title ? c.title : undefined, items }
}
