// D'où vient une vue — décidé par le serveur, plus par le navigateur.
//
// /api/track écrivait `source`, `device`, `referrer` et `qr_source` tels que le
// client les envoyait. L'identifiant de la page est dans le HTML de chaque page
// publique : il suffisait de le relever et de boucler
//
//   POST /api/track {"type":"view","pageId":"<uuid>","source":"qr_scan","qrSource":"abc123"}
//
// pour fabriquer des scans qui n'ont jamais eu lieu — et le tout premier appel
// envoyait « Votre premier scan sur QRowg » au propriétaire de la page.
//
// Deux règles ici :
//  · `source` ne peut valoir qu'une valeur de la liste connue ; tout le reste
//    devient « direct » plutôt que d'entrer brut dans la base.
//  · « qr_scan » ne se déclare pas : il se PROUVE. Il faut un code de support
//    présent dans l'URL, et ce code doit appartenir à la page (vérification en
//    base, côté appelant). Sans preuve, la vue est comptée, mais pas comme un scan.
//
// Ce que ça ne fait pas : rendre l'endpoint infalsifiable. Il est public par
// nature — n'importe quel visiteur peut rejouer un appel légitime. Ce qui change,
// c'est qu'il faut désormais un vrai code de la page pour être compté en scan, et
// qu'on ne peut plus inventer ni la source, ni un support qui n'existe pas.

/** Les sources que le produit sait nommer (cf. lib/detectTrafficSource). */
export const SOURCES_CONNUES = [
  "qr_scan", "interne", "direct", "instagram", "tiktok", "facebook", "linkedin",
  "twitter", "whatsapp", "telegram", "email", "google", "referral",
] as const

export type SourceVue = (typeof SOURCES_CONNUES)[number]

export const SOURCE_SCAN: SourceVue = "qr_scan"
export const SOURCE_PAR_DEFAUT: SourceVue = "direct"

/** Format d'un code de support (`?s=` posé par la redirection /q/[code]). */
const CODE = /^[A-Za-z0-9_-]{1,40}$/

export function estUnCode(v: unknown): v is string {
  return typeof v === "string" && CODE.test(v)
}

/**
 * Le code de support porté par une URL (celle de la page publique).
 * Sert à lire l'en-tête `Referer` de l'appel : sur une requête de même origine,
 * le navigateur y met l'URL complète de la page, paramètres compris.
 */
export function codeDansUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url) return null
  try {
    const s = new URL(url).searchParams.get("s")
    return estUnCode(s) ? s : null
  } catch { return null }
}

/**
 * La source finalement enregistrée.
 * `scanProuve` vient d'une vérification en base : le code existe et mène à cette page.
 */
export function sourceRetenue(brut: unknown, scanProuve: boolean): SourceVue {
  if (scanProuve) return SOURCE_SCAN
  const v = typeof brut === "string" ? brut.trim().toLowerCase() : ""
  if (v === SOURCE_SCAN) return SOURCE_PAR_DEFAUT // revendiqué sans preuve
  return (SOURCES_CONNUES as readonly string[]).includes(v) ? (v as SourceVue) : SOURCE_PAR_DEFAUT
}

/** Appareils que le produit sait nommer ; tout le reste est inconnu. */
const APPAREILS = new Set(["mobile", "tablet", "desktop"])

export function appareilRetenu(brut: unknown): string {
  const v = typeof brut === "string" ? brut.trim().toLowerCase() : ""
  return APPAREILS.has(v) ? v : "unknown"
}
