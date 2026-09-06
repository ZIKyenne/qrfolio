// Modeles PURS de `packs` et `services_pricing`.
//
// packs declarait un champ « Lien » par formule (pack1_url, pack2_url, pack3_url).
// Les deux renderers l'extrayaient... puis le jetaient. Le commercant collait
// l'adresse de sa page de reservation, et la carte n'etait cliquable nulle part.
// Elle l'est maintenant, des deux cotes.
import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

const txt = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

// Meme filtre de schema que les CTA : mieux vaut une carte non cliquable qu'une
// adresse fabriquee (« https://javascript:… »).
const SCHEMA_INCONNU = /^[a-z][a-z0-9+.-]*:/i
const SCHEMAS_ADMIS = /^(https?|mailto|tel|sms):/i
export function lienPack(url: string): CtaLink | null {
  if (!url) return null
  if (SCHEMA_INCONNU.test(url) && !SCHEMAS_ADMIS.test(url)) return null
  const href = extHref(url)
  if (!href) return null
  return { href, external: /^https?:/i.test(href), trackTarget: url, visible: true }
}

export type Pack = { icone: string; nom: string; prix: string; lignes: string[]; lien: CtaLink | null }
export function listePacks(c: Record<string, any> | null | undefined, max = 50): Pack[] {
  const src = c || {}
  const out: Pack[] = []
  for (let i = 1; i <= max; i++) {
    const nom = txt(src[`pack${i}_name`])
    if (!nom) continue
    out.push({
      icone: txt(src[`pack${i}_icon`]) || "🚀",
      nom,
      prix: txt(src[`pack${i}_price`]),
      lignes: txt(src[`pack${i}_content`]).split("\n").map(l => l.trim()).filter(Boolean),
      lien: lienPack(txt(src[`pack${i}_url`])),
    })
  }
  return out
}

export type Prestation = { nom: string; prix: string; duree: string; description: string }
export function listePrestations(c: Record<string, any> | null | undefined, max = 50): Prestation[] {
  const src = c || {}
  const out: Prestation[] = []
  for (let i = 1; i <= max; i++) {
    const nom = txt(src[`s${i}_name`])
    if (!nom) continue
    out.push({ nom, prix: txt(src[`s${i}_price`]), duree: txt(src[`s${i}_duration`]), description: txt(src[`s${i}_desc`]) })
  }
  return out
}
