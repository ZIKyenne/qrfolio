// Modèle pur `event_program`. items filtrés sur `title`. visible = hasPublishableContent.
import { hasPublishableContent } from "../../blockEmptyState"
import { extractIndexed } from "./repeaterExtract"

export type ProgramStep = { time?: string; title: string; desc?: string }
export type EventProgramViewModel = { visible: boolean; title?: string; items: ProgramStep[] }

export function eventProgramViewModel(content: Record<string, any> | null | undefined): EventProgramViewModel {
  const c = content || {}
  const items = extractIndexed<ProgramStep>(c, 50, (cc, i) => cc[`s${i}_title`] ? { time: cc[`s${i}_time`], title: cc[`s${i}_title`], desc: cc[`s${i}_desc`] } : null)
  return { visible: hasPublishableContent("event_program", c), title: typeof c.title === "string" && c.title ? c.title : undefined, items }
}
