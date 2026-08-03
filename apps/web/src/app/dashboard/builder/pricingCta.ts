// pricingCta.ts — modèle PARTAGÉ du CTA du bloc `pricing`.
// L'aperçu éditeur et le rendu public consomment CE modèle → même règle de présence,
// même libellé, même URL sécurisée (fin de la divergence « CTA visible en public mais
// absent de l'éditeur »). Testable sans React.

import { extHref } from "./types"

export type PricingCtaModel =
  | { visible: false }
  | { visible: true; label: string; href: string | null; external: boolean }

// Règle de présence IDENTIQUE au public : le CTA existe dès qu'un libellé est fourni
// (l'URL est optionnelle). L'URL est passée par `extHref` (autorise http(s)/mailto/tel/
// sms/interne ; neutralise le reste, dont `javascript:`, en le préfixant en https://).
// `href` vaut null quand aucune destination exploitable n'est fournie (le rendu tombe
// alors sur "#", comme le public). `external` = lien web absolu (info pour l'appelant).
export function pricingCtaModel(content: Record<string, any> | null | undefined): PricingCtaModel {
  const c = content || {}
  if (!c.cta_label) return { visible: false }
  const safe = extHref(c.cta_url)
  const href = safe && safe !== "#" ? safe : null
  return { visible: true, label: c.cta_label, href, external: !!href && /^https?:\/\//i.test(href) }
}
