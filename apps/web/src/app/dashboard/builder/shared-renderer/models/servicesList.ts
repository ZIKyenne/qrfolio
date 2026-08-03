// Modèle pur `services_list`. items filtrés sur `name` (s{i}), limite 50. Public null si vide.
import { extractIndexed } from "./repeaterExtract"

export type ServiceListItem = { icon?: string; name: string; desc?: string }
export type ServicesListViewModel = { visible: boolean; title?: string; items: ServiceListItem[] }

export function servicesListViewModel(content: Record<string, any> | null | undefined): ServicesListViewModel {
  const c = content || {}
  const items = extractIndexed<ServiceListItem>(c, 50, (cc, i) => cc[`s${i}_name`] ? { icon: cc[`s${i}_icon`], name: cc[`s${i}_name`], desc: cc[`s${i}_desc`] } : null)
  return { visible: items.length > 0, title: typeof c.title === "string" && c.title ? c.title : undefined, items }
}
