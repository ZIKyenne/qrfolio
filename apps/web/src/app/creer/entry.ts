// entry.ts — le raccord entre les pages qui ramènent du monde et l'essai.
//
// Constat, sur trente jours de mesures réelles : huit personnes sont arrivées
// sur /auth/signup, aucune n'a créé de compte. Elles venaient pour la plupart
// des pages « QR code par usage », qui envoyaient toutes vers un formulaire.
//
// Depuis, composer une page ne demande plus de compte. Encore faut-il que les
// pages d'entrée y mènent — et, tant qu'à faire, sur les bons modèles :
// quelqu'un qui cherche « QR code restaurant » doit voir des restaurants.
//
// Module PUR : aucune dépendance React, testable seul.

/**
 * Usage SEO (slug de /qr-code/<usage>) → secteur de la galerie.
 *
 * Volontairement incomplet : un usage transversal (Wi-Fi, PDF, SMS, paiement)
 * ne dit rien du métier de la personne. Mieux vaut la galerie entière qu'un
 * filtre inventé qui masquerait 40 modèles sur 48.
 */
export const METIER_BY_USAGE: Record<string, string> = {
  "restaurant":       "Restaurant",
  "menu":             "Restaurant",
  "food-truck":       "Restaurant",
  "hotel":            "Restaurant",   // hébergement/restauration : mêmes modèles (carte, horaires, Wi-Fi)
  "salon":            "Beaute",
  "boutique":         "Ecommerce",
  "immobilier":       "Immobilier",
  "instagram":        "Influenceur",
  "musique":          "Musicien",
  "carte-de-visite":  "Freelance",
  "cv":               "Freelance",
  "artisan":          "Consultant",   // artisans et indépendants : services, devis, contact
  "evenement":        "Evenement",
  "boulangerie":      "Restaurant",   // carte, horaires, commandes : mêmes blocs
  "bar":              "Bar",
  "garage":           "Consultant",   // devis, prestations, avis
  "pharmacie":        "Sante",
  "camping":          "Restaurant",   // hébergement : Wi-Fi, horaires, infos pratiques
  "fleuriste":        "Ecommerce",
}

/** Secteurs connus de la galerie — garde-fou contre une clé qui ne filtrerait rien. */
export const SECTEURS = [
  "Tous", "Restaurant", "Bar", "Cafe", "Freelance", "Consultant", "Coach", "Agence",
  "Influenceur", "Musicien", "Photographe", "Immobilier", "Beaute", "Sante",
  "Evenement", "SaaS", "Ecommerce",
] as const

/** Secteur recevable, ou "" — jamais une valeur qui viderait la galerie. */
export function safeMetier(v: string | null | undefined): string {
  const s = (v || "").trim()
  return (SECTEURS as readonly string[]).includes(s) && s !== "Tous" ? s : ""
}

/**
 * Adresse de l'essai depuis une page d'entrée.
 * `usage` = slug SEO ; `ref` = code de parrainage à ne pas perdre en route.
 */
export function creerUrl(usage?: string | null, ref?: string | null, lien?: string | null): string {
  const p = new URLSearchParams()
  const m = METIER_BY_USAGE[(usage || "").trim()]
  if (m) p.set("metier", m)
  const r = (ref || "").trim().toLowerCase()
  if (/^[a-z0-9_-]{3,40}$/.test(r)) p.set("ref", r)
  const l = safeEntryLink(lien)
  if (l) p.set("lien", l)
  const q = p.toString()
  return q ? `/creer?${q}` : "/creer"
}

// ── Le lien saisi au générateur suit jusqu'à la page ────────────────────────────
//
// Quelqu'un qui vient de faire un QR vers monsite.fr et qui accepte de composer une
// page ne devrait pas avoir à retaper son adresse. Elle voyage dans ?lien=… et
// devient un bouton sur la page composée.

/** Lien d'entrée recevable : http(s) uniquement, longueur bornée. Sinon "". */
export function safeEntryLink(v: string | null | undefined): string {
  const s = (v || "").trim()
  if (!s || s.length > 300) return ""
  // javascript:, data:, mailto:, tel: … : rien de tout cela n'a sa place dans un bouton.
  if (!/^https?:\/\//i.test(s)) return ""
  try {
    const u = new URL(s)
    if (u.protocol !== "http:" && u.protocol !== "https:") return ""
    if (!u.hostname.includes(".")) return ""
    return u.toString()
  } catch { return "" }
}

/** Nom de domaine lisible — sert de libellé au bouton ajouté. */
export function linkLabel(link: string): string {
  const l = safeEntryLink(link)
  if (!l) return ""
  try {
    const h = new URL(l).hostname.replace(/^www\./i, "")
    return h.length > 40 ? h.slice(0, 40) : h
  } catch { return "" }
}

/**
 * Ajoute le lien d'entrée aux blocs d'un modèle : un bouton, juste après le bloc
 * de profil (ou en tête s'il n'y en a pas), là où il sera vu.
 *
 * Volontairement ADDITIF : on ne réécrit pas l'URL d'un bouton existant, dont le
 * libellé (« Réserver une table ») promettrait alors autre chose que sa destination.
 * Idempotent : rappelé avec le même lien, il n'en ajoute pas un second.
 */
export function applyEntryLink(blocks: unknown, link: string): any[] {
  const list = Array.isArray(blocks) ? (blocks as any[]) : []
  const l = safeEntryLink(link)
  if (!l) return list
  const already = list.some(b => b && b.type === "cta_button" && b.content && b.content.url === l)
  if (already) return list
  const bouton = {
    type: "cta_button",
    content: { label: `Voir ${linkLabel(l)}`, url: l, style: "gold", icon: "🔗", full_width: "yes" },
  }
  const i = list.findIndex(b => b && b.type === "profile")
  const at = i >= 0 ? i + 1 : 0
  return [...list.slice(0, at), bouton, ...list.slice(at)]
}

/** Libellé affiché dans le bandeau d'arrivée. */
export const SECTEUR_LABEL: Record<string, string> = {
  Restaurant: "restauration", Bar: "bars", Cafe: "cafés", Freelance: "freelances",
  Consultant: "consultants et artisans", Coach: "coachs", Agence: "agences",
  Influenceur: "créateurs", Musicien: "musiciens", Photographe: "photographes",
  Immobilier: "immobilier", Beaute: "beauté", Sante: "santé",
  Evenement: "événementiel", SaaS: "SaaS", Ecommerce: "commerces",
}
