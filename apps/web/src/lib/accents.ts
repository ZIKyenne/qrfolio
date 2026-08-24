// accents.ts — la règle : ce qu'un client lit doit être écrit en français correct.
//
// Le code du projet a été écrit vite, et beaucoup de textes sont partis sans accents :
// « Cuisine francaise depuis 1985 », « Soupe a l oignon », « Reserver une table ».
// Ces phrases-là ne restent pas dans l'éditeur : elles sont publiées sur la page d'un
// commerçant, devant ses propres clients. C'est sa vitrine qui a l'air bâclée.
//
// Ce module porte la règle ; accents.test.ts la fait respecter. Volontairement
// conservateur : aucun mot ambigu (cree/créé, des/dès, ou/où, a/à hors expressions
// listées) — mieux vaut laisser passer que corriger de travers.

/** Formes fautives → forme correcte. La clé n'existe pas en français, ou pas dans ce sens. */
export const SANS_ACCENT: Record<string, string> = {
  francais: "français", francaise: "française", Francais: "Français", Francaise: "Française",
  Temoignage: "Témoignage", Temoignages: "Témoignages", temoignage: "témoignage", temoignages: "témoignages",
  Reseaux: "Réseaux", reseaux: "réseaux", Reseau: "Réseau", reseau: "réseau",
  Reserver: "Réserver", reserver: "réserver", Reservation: "Réservation", reservation: "réservation",
  Entrees: "Entrées", Entrecote: "Entrecôte", Gratinee: "Gratinée",
  bearnaise: "béarnaise", legumes: "légumes", Duree: "Durée", duree: "durée",
  Deja: "Déjà", deja: "déjà", Apres: "Après", apres: "après", Acces: "Accès", acces: "accès",
  Generer: "Générer", generer: "générer", Telecharger: "Télécharger", telecharger: "télécharger",
  Securise: "Sécurisé", securise: "sécurisé", Illimite: "Illimité", illimite: "illimité",
  Modele: "Modèle", modele: "modèle", Numero: "Numéro", numero: "numéro",
  Reglages: "Réglages", reglages: "réglages", Parametres: "Paramètres", parametres: "paramètres",
  experience: "expérience", competences: "compétences", Competences: "Compétences",
  Developpeur: "Développeur", developpement: "développement", Developpement: "Développement",
  Decoration: "Décoration", decoration: "décoration", ceramique: "céramique",
  parfumee: "parfumée", vegetale: "végétale", Categorie: "Catégorie", categorie: "catégorie",
  Verifie: "Vérifié", verifie: "vérifié", Selectionner: "Sélectionner", selectionner: "sélectionner",
  Precedent: "Précédent", Repondre: "Répondre", repondre: "répondre",
  Presentation: "Présentation", presentation: "présentation", Prenom: "Prénom", prenom: "prénom",
}

/** Expressions où « a » est le verbe ou la préposition : à traiter une par une. */
export const EXPRESSIONS: [string, string][] = [
  ["Soupe a l oignon", "Soupe à l'oignon"],
  ["Bouton d'appel a l'action", "Bouton d'appel à l'action"],
  ["Grille de 2 a 6 photos", "Grille de 2 à 6 photos"],
]

/**
 * Ce littéral est-il de la PROSE (donc soumis à la règle), ou du code déguisé ?
 *
 * Un identifiant, une clé, une couleur, une URL, une déclaration CSS : rien de tout
 * cela ne se lit. Y toucher casse le produit — l'outil de correction a déjà changé
 * `text-decoration:none` en `text-décoration:none` avant qu'on l'en empêche.
 */
export function estProse(txt: string): boolean {
  if (!/\s/.test(txt)) return false                     // "event_info", "#C9A84C"
  if (/^https?:|^data:|^\//i.test(txt)) return false
  if (/[a-z-]+\s*:\s*[^;]{1,80};/.test(txt)) return false   // "display:block;color:#fff;"
  if (/^[a-z-]+\s*:/i.test(txt)) return false
  if (/[{}<>]|=>|\bfunction\b/.test(txt)) return false
  return true
}

/** Mots fautifs trouvés dans les littéraux de prose d'un fichier source. */
export function motsSansAccent(src: string): string[] {
  const trouves: string[] = []
  const litteraux = src.match(/(["'])(?:\\.|(?!\1)[^\\\n])*\1/g) || []
  for (const brut of litteraux) {
    const txt = brut.slice(1, -1)
    if (!estProse(txt)) continue
    for (const mot of Object.keys(SANS_ACCENT)) {
      if (new RegExp("(?<![A-Za-zÀ-ÿ])" + mot + "(?![A-Za-zÀ-ÿ])").test(txt)) trouves.push(mot)
    }
    for (const [avant] of EXPRESSIONS) if (txt.includes(avant)) trouves.push(avant)
  }
  return [...new Set(trouves)]
}
