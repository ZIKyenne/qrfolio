// Qui doit recevoir son rapport aujourd'hui.
//
// La tâche ne tournait qu'une fois par mois, avec « ?frequency=monthly » : les
// abonnements HEBDOMADAIRES, proposés et réservés aux plans payants dans l'écran
// Analytics, n'étaient envoyés à personne. Elle passe maintenant tous les jours et
// c'est cette fonction qui décide — comme le fait déjà le journal des tâches.
//
// La tolérance existe pour une raison précise : l'hébergeur déclenche à ±59 min.
// Avec un seuil strict à 7 jours, un rapport envoyé lundi 8h50 n'est pas dû au
// passage du lundi suivant (6,96 jours) ; il part le mardi, puis le mercredi…
// Le rendez-vous hebdomadaire glissait d'un jour par semaine.

export type Frequence = "weekly" | "monthly"

/** Espacement nominal, en jours. */
export const ESPACEMENT_JOURS: Record<Frequence, number> = { weekly: 7, monthly: 30 }

/** Marge absorbant la dérive de l'hébergeur (±59 min), en jours. */
export const TOLERANCE_JOURS = 0.5

export function estDuPourEnvoi(frequence: string, dernierEnvoi: string | null | undefined, maintenant: Date): boolean {
  if (!dernierEnvoi) return true // jamais envoyé : premier rapport
  const t = Date.parse(dernierEnvoi)
  if (Number.isNaN(t)) return true // date illisible : on n'enferme personne dans un silence
  const jours = (maintenant.getTime() - t) / 86_400_000
  const attendu = ESPACEMENT_JOURS[frequence as Frequence] ?? ESPACEMENT_JOURS.monthly
  return jours >= attendu - TOLERANCE_JOURS
}
