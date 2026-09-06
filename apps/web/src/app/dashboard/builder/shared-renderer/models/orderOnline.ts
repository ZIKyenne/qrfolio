// Modèle pur du bloc `order_online`. TOUJOURS visible (le public rend href||"#").
// external seulement si l'URL est http(s), comme le legacy. Aucun React.
import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

export type OrderOnlineViewModel = { label: string; platform: string; link: CtaLink }
export function orderOnlineViewModel(content: Record<string, any> | null | undefined): OrderOnlineViewModel {
  const c = content || {}
  const url = typeof c.url === "string" ? c.url : ""
  const href = extHref(url) || null
  // « Plateforme » etait proposee (Uber Eats, Deliveroo, Just Eat…) et lue par
  // personne : le commercant la choisissait, rien ne changeait. Elle rassure le
  // visiteur sur l'endroit ou le lien l'emmene, comme sur le bloc « Boutique ».
  const platform = typeof c.platform === "string" ? c.platform.trim() : ""
  return { label: c.label || "Commander maintenant", platform, link: { href, external: /^https?:/.test(url), trackTarget: url || "order", visible: true } }
}
