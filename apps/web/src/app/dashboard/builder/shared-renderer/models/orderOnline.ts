// Modèle pur du bloc `order_online`. TOUJOURS visible (le public rend href||"#").
// external seulement si l'URL est http(s), comme le legacy. Aucun React.
import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

export type OrderOnlineViewModel = { label: string; link: CtaLink }
export function orderOnlineViewModel(content: Record<string, any> | null | undefined): OrderOnlineViewModel {
  const c = content || {}
  const url = typeof c.url === "string" ? c.url : ""
  const href = extHref(url) || null
  return { label: c.label || "Commander maintenant", link: { href, external: /^https?:/.test(url), trackTarget: url || "order", visible: true } }
}
