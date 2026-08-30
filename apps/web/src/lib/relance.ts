// La relance de celui qui s'est inscrit et n'a rien créé.
//
// Le seul vrai inscrit qu'a eu QRowg est arrivé par Google le 24 août. Tout a
// fonctionné : l'email de bienvenue est parti, il a atterri sur l'écran de
// création par objectif. Il n'a jamais créé de page, et plus rien ne lui a
// jamais été envoyé. L'email de bienvenue arrive à la minute zéro, quand la
// personne est déjà devant l'écran — il ne rattrape personne.
//
// Un rappel deux jours plus tard est la seule chose qui avait une chance.
//
// AUCUNE colonne, AUCUNE migration : la fenêtre d'envoi est calculée de sorte
// qu'un passage quotidien du cron ne puisse jamais envoyer deux fois. Un compte
// n'est éligible que le jour où il atteint deux jours d'âge. Si un passage est
// manqué, la personne ne reçoit rien — c'est préférable à un doublon, et
// infiniment préférable à une colonne de suivi ajoutée à la main en production.

const HEURE = 3_600_000

/** Âge minimal : laisser passer une vraie nuit avant de relancer. */
export const AGE_MIN_H = 48
/** Âge maximal : au-delà, la fenêtre du passage quotidien suivant prend le relais. */
export const AGE_MAX_H = 72

export type Compte = {
  id: string
  email: string | null
  /** Date d'inscription, ISO. */
  inscritLe: string | null
  /** Nom affichable, éventuellement vide. */
  nom?: string | null
  /** Nombre de pages du compte, brouillons compris. */
  nbPages: number
}

export type Refus =
  | "sans_email"
  | "date_illisible"
  | "trop_recent"
  | "trop_ancien"
  | "a_deja_cree"

export type Verdict = { relancer: true; ageH: number } | { relancer: false; motif: Refus; ageH: number | null }

/** Âge d'un compte en heures, ou null si la date est inexploitable. */
export function ageEnHeures(inscritLe: string | null | undefined, maintenant: Date): number | null {
  if (!inscritLe) return null
  const t = Date.parse(inscritLe)
  if (Number.isNaN(t)) return null
  return (maintenant.getTime() - t) / HEURE
}

/** Faut-il relancer ce compte lors de ce passage ? */
export function jugerCompte(c: Compte, maintenant: Date): Verdict {
  const ageH = ageEnHeures(c.inscritLe, maintenant)
  if (!c.email || !c.email.includes("@")) return { relancer: false, motif: "sans_email", ageH }
  if (ageH === null) return { relancer: false, motif: "date_illisible", ageH: null }
  if (c.nbPages > 0) return { relancer: false, motif: "a_deja_cree", ageH }
  if (ageH < AGE_MIN_H) return { relancer: false, motif: "trop_recent", ageH }
  if (ageH >= AGE_MAX_H) return { relancer: false, motif: "trop_ancien", ageH }
  return { relancer: true, ageH }
}

/** Les comptes à relancer lors de ce passage. */
export function comptesARelancer(comptes: Compte[], maintenant: Date): Compte[] {
  return comptes.filter(c => jugerCompte(c, maintenant).relancer)
}

/**
 * Bornes de la requête envoyée à la base, pour ne pas ramener tous les comptes.
 * `depuis` et `jusqua` encadrent la date d'inscription des comptes éligibles.
 */
export function fenetreInscription(maintenant: Date): { depuis: string; jusqua: string } {
  return {
    depuis: new Date(maintenant.getTime() - AGE_MAX_H * HEURE).toISOString(),
    jusqua: new Date(maintenant.getTime() - AGE_MIN_H * HEURE).toISOString(),
  }
}

/** Prénom exploitable, ou chaîne vide. */
export function prenom(nom: string | null | undefined): string {
  const n = (nom || "").trim()
  if (!n) return ""
  return n.split(/\s+/)[0].slice(0, 40)
}
