// Modèle pur `portfolio_work`. items filtrés sur title (work{i}), limite 50, image optionnelle
// (safeMediaSrc). CTA optionnel : lien réel si cta_url, sinon libellé non navigable (legacy).
import { extHref } from "../../types"
import { safeMediaSrc } from "./mediaUrl"
import { extractIndexed } from "./repeaterExtract"
import type { CtaLink } from "./ctaLink"

export type PortfolioItem = { img: string | null; title: string; desc?: string }
export type PortfolioWorkViewModel = { visible: boolean; title?: string; items: PortfolioItem[]; ctaLabel?: string; link: CtaLink }

export function portfolioWorkViewModel(content: Record<string, any> | null | undefined): PortfolioWorkViewModel {
  const c = content || {}
  const items = extractIndexed<PortfolioItem>(c, 50, (cc, i) => cc[`work${i}_title`] ? { img: safeMediaSrc(cc[`work${i}_img`]), title: cc[`work${i}_title`], desc: cc[`work${i}_desc`] } : null)
  const url = typeof c.cta_url === "string" ? c.cta_url : ""
  return {
    visible: items.length > 0, title: typeof c.title === "string" && c.title ? c.title : undefined, items, ctaLabel: c.cta_label || undefined,
    link: { href: extHref(url) || null, external: true, trackTarget: url, visible: !!c.cta_label },
  }
}
