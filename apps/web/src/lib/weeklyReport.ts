// weeklyReport.ts — de quoi parle vraiment le rapport hebdomadaire.
//
// Ce qu'il envoyait : `total_scans` et `total_pages`, c'est-à-dire les cumuls depuis
// la création du compte, avec la date du jour en objet. Un commerçant qui le recevait
// chaque lundi voyait donc deux nombres identiques d'une semaine sur l'autre, sous un
// titre qui annonçait « votre activité ». Il n'apprenait rien, et pouvait même croire
// qu'il ne se passait rien alors que ses scans montaient.
//
// Un rapport de période doit parler de la période. Module PUR : les bornes et les
// libellés se testent sans base de données.

export const JOUR_MS = 24 * 60 * 60 * 1000

/** Bornes des sept derniers jours, et libellé lisible (« du 18 au 24 août »). */
export function semaineEcoulee(maintenant: Date): { debutIso: string; libelle: string } {
  const fin = new Date(maintenant)
  const debut = new Date(maintenant.getTime() - 7 * JOUR_MS)
  const jour = (d: Date) => d.getDate()
  const mois = (d: Date) => d.toLocaleDateString("fr-FR", { month: "long" })
  const libelle = mois(debut) === mois(fin)
    ? `du ${jour(debut)} au ${jour(fin)} ${mois(fin)}`
    : `du ${jour(debut)} ${mois(debut)} au ${jour(fin)} ${mois(fin)}`
  return { debutIso: debut.toISOString(), libelle }
}

export type Chiffres = {
  /** Visites de page sur les sept derniers jours. */
  vues: number
  /** Scans de QR sur les sept derniers jours. */
  scans: number
  /** Scans depuis toujours — le repère, pas le sujet. */
  scansTotal: number
}

/**
 * Ce qu'on écrit dans l'email.
 *
 * Le cas « rien cette semaine » est le plus important à traiter honnêtement : c'est
 * celui qu'un commerçant qui vient d'imprimer son support recevra en premier. On ne
 * le félicite pas dans le vide, et on ne le culpabilise pas non plus — on dit ce qui
 * s'est passé, et la seule chose qui change quelque chose.
 */
export function resumeSemaine(c: Chiffres): { titre: string; phrase: string; creux: boolean } {
  const creux = c.vues === 0 && c.scans === 0
  if (creux) {
    return {
      titre: "Semaine calme",
      phrase: c.scansTotal > 0
        ? "Aucun scan ni visite cette semaine. Vos supports sont peut-être hors de vue : le comptoir et la vitrine marchent mieux qu'un présentoir en retrait."
        : "Personne n'a encore scanné votre QR. Tant qu'il n'est pas posé là où passent vos clients, il ne peut rien se passer.",
      creux: true,
    }
  }
  const bouts: string[] = []
  if (c.scans > 0) bouts.push(`${c.scans} scan${c.scans > 1 ? "s" : ""}`)
  if (c.vues > 0) bouts.push(`${c.vues} visite${c.vues > 1 ? "s" : ""}`)
  return {
    titre: "Votre semaine",
    phrase: `${bouts.join(" et ")} cette semaine.`,
    creux: false,
  }
}

/** Nombre lisible en français, pour l'affichage dans les cartes. */
export function nombre(n: number): string {
  return (n ?? 0).toLocaleString("fr-FR")
}
