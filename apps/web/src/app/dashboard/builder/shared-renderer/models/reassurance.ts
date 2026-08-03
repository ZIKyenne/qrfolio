// Modèle pur `reassurance`. items filtrés sur `label` (clés g{i}). Limite 50.
import { extractIndexed } from "./repeaterExtract"

export type Guarantee = { icon?: string; label: string; desc?: string }
export type ReassuranceViewModel = { visible: boolean; items: Guarantee[] }

export function reassuranceViewModel(content: Record<string, any> | null | undefined): ReassuranceViewModel {
  const c = content || {}
  const items = extractIndexed<Guarantee>(c, 50, (cc, i) => cc[`g${i}_label`] ? { icon: cc[`g${i}_icon`], label: cc[`g${i}_label`], desc: cc[`g${i}_desc`] } : null)
  return { visible: items.length > 0, items }
}
