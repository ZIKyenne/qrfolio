// funnel.ts — les repères du parcours, pour arrêter de deviner.
//
// Les statistiques ne disent aujourd'hui qu'une chose : quelle PAGE a été affichée.
// Or l'essentiel se joue sans changer d'adresse — on choisit un modèle dans une
// fenêtre, on modifie sa page dans l'éditeur, on se cogne au mur du compte. Tout
// cela tient dans une seule ligne : « /dashboard/builder, 5 visiteurs ».
//
// Six repères suffisent à voir la marche qui casse. Ils sont posés aux endroits
// où quelque chose d'irréversible arrive, jamais « au survol » ni « au scroll ».
//
// Ce qu'on ne mesure PAS, volontairement : rien de nominatif, aucune adresse
// saisie, aucun contenu de page. Les propriétés sont des étiquettes courtes.
//
// Module PUR : `marque` est le seul point de contact avec Vercel, et il est
// enveloppé — une erreur de mesure ne doit jamais casser une page.

/** Noms des repères. Courts, stables : les renommer casserait l'historique. */
export const FUNNEL = {
  /** Arrivée sur la galerie de l'essai, sans compte. */
  essaiVu: "essai_vu",
  /** Un modèle est validé : la page existe, en brouillon local ou en base. */
  modeleChoisi: "modele_choisi",
  /** Premier vrai changement gardé dans l'éditeur, sans compte. */
  pageModifiee: "page_modifiee",
  /** Clic sur « Publier » sans compte — juste avant le mur. */
  publierSansCompte: "publier_sans_compte",
  /** Le compte a été créé ET le brouillon repris : le parcours est bouclé. */
  brouillonRepris: "brouillon_repris",
} as const

export type FunnelEvent = typeof FUNNEL[keyof typeof FUNNEL]

/**
 * D'où vient la personne, réduit à une étiquette exploitable.
 *
 * Limite connue, à ne pas oublier en lisant les chiffres : la navigation interne
 * de Next se fait sans rechargement, donc `document.referrer` reste celui de
 * l'ENTRÉE dans le site, pas celui de la page précédente. Cette mesure répond
 * donc à « quelle source amène du monde » (Facebook, Google, direct), pas à
 * « quel bouton a été cliqué ». Pour la page d'entrée SEO, c'est `metier` qui
 * renseigne, puisqu'il voyage dans l'adresse.
 *
 * Un référent interne garde son chemin, jamais ses paramètres : ils peuvent
 * contenir un code de parrainage ou l'adresse du site de la personne.
 */
export function origine(referent: string | null | undefined, siteOrigin: string): string {
  const r = (referent || "").trim()
  if (!r) return "direct"
  try {
    const u = new URL(r)
    if (siteOrigin && u.origin === siteOrigin) return u.pathname || "/"
    return u.hostname.replace(/^www\./i, "").slice(0, 40)
  } catch { return "inconnu" }
}

/** Étiquette recevable : courte, sans rien de personnel. Sinon « autre ». */
export function etiquette(v: unknown, max = 40): string {
  const s = typeof v === "string" ? v.trim() : ""
  if (!s) return "autre"
  return s.length > max ? s.slice(0, max) : s
}

/**
 * Charge la mesure à l'avance. À appeler au montage d'un écran qui pose un repère
 * JUSTE AVANT de quitter la page : sans cela, l'import paresseux n'aurait pas le
 * temps de se résoudre et le repère le plus important du parcours serait perdu.
 */
export function precharge(): void {
  try { if (typeof window !== "undefined") void import("@vercel/analytics").catch(() => {}) } catch {}
}

/**
 * Pose un repère. Silencieux par construction : si la mesure échoue, ou si le
 * module n'est pas chargé, la page continue exactement comme avant.
 */
export function marque(nom: FunnelEvent, props?: Record<string, string | number | boolean>): void {
  try {
    if (typeof window === "undefined") return
    // Import paresseux : aucune conséquence sur le rendu serveur.
    void import("@vercel/analytics").then(m => {
      try { m.track(nom, props) } catch { /* une mesure ne casse pas une page */ }
    }).catch(() => {})
  } catch { /* idem */ }
}
