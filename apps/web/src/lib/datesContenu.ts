// datesContenu — quand chaque contenu a réellement été revu.
//
// Le sitemap annonçait la même date (24 août) pour tout, alors que les pages
// affichaient la leur : guides au 11 août, Sécurité au 12 août, mentions légales
// au 15 juin. Google compare les deux ; une date de sitemap systématiquement
// plus récente que la page apprend surtout à ne plus la croire.
//
// Une seule source, lue par les pages ET par le sitemap.

/** Date ISO (AAAA-MM-JJ) → objet Date à midi UTC (jamais de décalage de jour). */
export const jour = (iso: string): Date => new Date(`${iso}T12:00:00.000Z`)

/** Affichage français : « 15 juin 2026 ». */
export const enFrancais = (iso: string): string =>
  jour(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })

export const REVISIONS = {
  accueil: "2026-09-05",
  creer: "2026-09-05",
  features: "2026-09-05",
  examples: "2026-09-05",
  upgrade: "2026-09-05",
  contact: "2026-09-05",
  outils: "2026-08-24",
  generateurs: "2026-08-24",
  usages: "2026-08-24",
  guides: "2026-08-11",
  security: "2026-09-05",
  legal: "2026-06-15",
  terms: "2026-09-05",
  privacy: "2026-09-05",
} as const

export type CleRevision = keyof typeof REVISIONS
