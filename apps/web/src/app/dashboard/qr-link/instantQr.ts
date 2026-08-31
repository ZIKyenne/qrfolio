// instantQr.ts — La forme réelle d'un QR enregistré, et l'état qu'on en affiche.
//
// La page manipulait ces enregistrements à travers 22 `any`, alors que le serveur
// connaît exactement leurs quinze champs (api/qr-instant, constante COLS). Trois
// défauts vivaient dans ce flou : un `ecc` corrompu passait la compilation, un
// statut inconnu s'affichait brut à l'écran, et deux fonctions décrivaient le même
// lien avec des mots différents — côte à côte, dans la même fenêtre.

import type { ScanStats } from "@/lib/scanStats"

export type StatutQr = "active" | "paused" | "expired"

export type StyleQr = {
  fg?: string
  bg?: string
  ecc?: "L" | "M" | "Q" | "H"
  styleKey?: string
}

export type InstantQr = {
  id: string
  kind: string
  label: string | null
  payload: string
  inputs: Record<string, unknown> | null
  style: StyleQr | null
  created_at: string
  dynamic: boolean | null
  short_code: string | null
  dest_url: string | null
  status: StatutQr | null
  expires_at: string | null
  total_scans: number | null
  last_scan_at: string | null
  paused_reason: string | null
  /** Le serveur ne renvoie JAMAIS le hash : seulement s'il en existe un. */
  has_password?: boolean
}

/** Réponse de /api/qr-instant/stats : union discriminée, pas un objet flou. */
export type StatsLien = { detailed: false } | ({ detailed: true } & ScanStats)

const JOUR_MS = 86400000

export type EtatLien = {
  /** Pastille courte, pour une liste. */
  badge: string
  /** Phrase complète, pour la fiche. Toujours cohérente avec le badge. */
  phrase: string
  couleur: string
  expire: boolean
}

const ROUGE = "#FF6B6B"
const AMBRE = "#FBBF24"
const VERT = "var(--success)"

/**
 * L'état d'un QR enregistré — UNE seule fonction.
 *
 * Il y en avait deux, `dynStatus` et `expiryText`, appelées sur le même objet et
 * rendues l'une au-dessus de l'autre dans la fenêtre de statistiques. Elles
 * recalculaient chacune l'échéance et n'employaient pas les mêmes mots : la même
 * ligne pouvait dire « Essai · expire dans 3 j » et « Permanent (aucune
 * expiration) ». Une seule branche décide maintenant des deux libellés.
 */
export function etatLien(qr: Pick<InstantQr, "dynamic" | "status" | "expires_at"> | null | undefined, maintenant: number = Date.now()): EtatLien {
  if (!qr?.dynamic) {
    return { badge: "Statique", phrase: "Contenu encodé — n'expire pas", couleur: "var(--success)", expire: false }
  }
  if (qr.status === "expired") return { badge: "Expiré", phrase: "Expiré", couleur: ROUGE, expire: true }
  if (qr.status === "paused") return { badge: "En pause", phrase: "En pause — ne redirige plus", couleur: AMBRE, expire: false }

  if (!qr.expires_at) {
    return { badge: "Actif", phrase: "Actif, sans date de fin", couleur: VERT, expire: false }
  }

  const restant = Date.parse(qr.expires_at) - maintenant
  if (Number.isNaN(restant)) return { badge: "Actif", phrase: "Actif, sans date de fin", couleur: VERT, expire: false }
  if (restant <= 0) return { badge: "Expiré", phrase: "Expiré", couleur: ROUGE, expire: true }

  const jours = Math.floor(restant / JOUR_MS)
  const heures = Math.floor((restant % JOUR_MS) / 3600000)
  const minutes = Math.floor((restant % 3600000) / 60000)
  const delai = jours > 0 ? `${jours} j ${heures} h` : heures > 0 ? `${heures} h ${minutes} min` : `${minutes} min`
  const date = new Date(qr.expires_at).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
  return {
    badge: `Expire dans ${jours > 0 ? `${jours} j` : delai}`,
    phrase: `Expire dans ${delai} · le ${date}`,
    couleur: AMBRE,
    expire: false,
  }
}

/** Date lisible d'un enregistrement. Chaîne vide si absente ou invalide. */
export function dateLisible(iso?: string | null): string {
  if (!iso) return ""
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ""
  return new Date(t).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

/** Le style enregistré, avec des valeurs de repli sûres — jamais `any`. */
export function styleSur(qr: Pick<InstantQr, "style"> | null | undefined): Required<Omit<StyleQr, never>> {
  const s = qr?.style ?? {}
  const ecc = s.ecc === "L" || s.ecc === "M" || s.ecc === "Q" || s.ecc === "H" ? s.ecc : "M"
  return { fg: s.fg || "#080808", bg: s.bg || "#FFFFFF", ecc, styleKey: s.styleKey || "carre" }
}
