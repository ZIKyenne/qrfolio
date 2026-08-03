// Modèle pur `promo_banner`. Carte promo + CTA optionnel. Toujours visible (public rend
// toujours le conteneur). CTA legacy : PAS de target/rel (external=false), href via extHref.
import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

export type PromoBannerViewModel = { emoji?: string; text?: string; subtext?: string; ctaLabel?: string; link: CtaLink }

export function promoBannerViewModel(content: Record<string, any> | null | undefined): PromoBannerViewModel {
  const c = content || {}
  const url = typeof c.cta_url === "string" ? c.cta_url : ""
  return {
    emoji: c.emoji, text: c.text, subtext: c.subtext, ctaLabel: c.cta_label,
    link: { href: extHref(url) || null, external: false, trackTarget: url || "promo_banner", visible: !!c.cta_label },
  }
}
