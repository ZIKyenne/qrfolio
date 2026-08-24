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
export function creerUrl(usage?: string | null, ref?: string | null): string {
  const p = new URLSearchParams()
  const m = METIER_BY_USAGE[(usage || "").trim()]
  if (m) p.set("metier", m)
  const r = (ref || "").trim().toLowerCase()
  if (/^[a-z0-9_-]{3,40}$/.test(r)) p.set("ref", r)
  const q = p.toString()
  return q ? `/creer?${q}` : "/creer"
}

/** Libellé affiché dans le bandeau d'arrivée. */
export const SECTEUR_LABEL: Record<string, string> = {
  Restaurant: "restauration", Bar: "bars", Cafe: "cafés", Freelance: "freelances",
  Consultant: "consultants et artisans", Coach: "coachs", Agence: "agences",
  Influenceur: "créateurs", Musicien: "musiciens", Photographe: "photographes",
  Immobilier: "immobilier", Beaute: "beauté", Sante: "santé",
  Evenement: "événementiel", SaaS: "SaaS", Ecommerce: "commerces",
}
