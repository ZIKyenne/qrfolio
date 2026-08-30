// Où atterrit quelqu'un qui vient de se connecter.
//
// Le seul vrai inscrit qu'a eu QRowg s'est inscrit par Google le 24 août, puis
// n'est jamais revenu : zéro page, zéro QR code. Le retour d'authentification
// renvoie vers /dashboard, et /dashboard montre à un compte neuf un écran
// d'administration vide — « Plan Gratuit », « 0 vue aujourd'hui », « Aucune
// page » — en le laissant trouver seul par où commencer. L'élan qui a fait
// cliquer sur « Continuer avec Google » se dépense sur un tableau de bord.
//
// Un compte qui n'a jamais rien créé n'a rien à administrer : on l'emmène
// directement créer sa page.

/** Là où on emmène quelqu'un qui n'a encore rien créé. */
export const CREER_SA_PAGE = "/dashboard/onboarding"

/** Le tableau de bord, pour un compte qui a déjà quelque chose à y voir. */
export const TABLEAU_DE_BORD = "/dashboard"

/**
 * Paramètre qui dit « je viens de l'écran de création, laisse-moi voir le
 * tableau de bord ». Sans lui, le bouton « Retour » de l'écran de création
 * renverrait un compte neuf vers la création : personne ne pourrait en sortir.
 */
export const ECHAPPE = "vue"

export type Atterrissage = {
  /** Nombre de pages du compte, brouillons compris. */
  nbPages: number
  /**
   * Destination demandée explicitement (?next=…), par exemple quand quelqu'un
   * cliquait sur un lien précis avant de devoir se connecter. Elle l'emporte
   * toujours : on ne détourne pas une intention exprimée.
   */
  demande?: string | null
  /**
   * Vrai si la personne a déjà été emmenée créer sa page pendant cette visite.
   * Sans ce garde-fou, quelqu'un qui revient au tableau de bord depuis l'écran
   * de création serait renvoyé en boucle vers la création.
   */
  dejaOriente?: boolean
}

/** Le chemin interne demandé, ou null si l'adresse n'est pas interne. */
export function demandeInterne(next: string | null | undefined): string | null {
  const n = (next || "").trim()
  if (!n.startsWith("/") || n.startsWith("//")) return null
  return n
}

/**
 * Décide où envoyer quelqu'un à l'entrée du tableau de bord.
 * Rend `null` quand il n'y a pas lieu de rediriger.
 */
export function destinationApresConnexion(a: Atterrissage): string | null {
  const demande = demandeInterne(a.demande)
  if (demande) return demande === TABLEAU_DE_BORD ? null : demande
  if (a.dejaOriente) return null
  if (a.nbPages > 0) return null
  return CREER_SA_PAGE
}
