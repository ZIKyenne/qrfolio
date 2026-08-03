// Modèle pur `on_site_services`. visible = hasPublishableContent ; items filtrés sur `label`.
import { hasPublishableContent } from "../../blockEmptyState"
import { extractIndexed } from "./repeaterExtract"

export type OnSiteService = { icon?: string; label: string }
export type OnSiteServicesViewModel = { visible: boolean; title?: string; items: OnSiteService[] }

export function onSiteServicesViewModel(content: Record<string, any> | null | undefined): OnSiteServicesViewModel {
  const c = content || {}
  const items = extractIndexed<OnSiteService>(c, 50, (cc, i) => cc[`s${i}_label`] ? { icon: cc[`s${i}_icon`], label: cc[`s${i}_label`] } : null)
  return { visible: hasPublishableContent("on_site_services", c), title: typeof c.title === "string" && c.title ? c.title : undefined, items }
}
