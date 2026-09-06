// cycleAbonnement — ce que la ligne `subscriptions` permet de dire au client.
// Les identifiants de prix Stripe restent côté serveur ; le cycle se lit sur la
// durée de la période en cours (un mois ≈ 28-31 jours, un an ≈ 365).

export type LigneAbonnement = {
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
  status?: string | null
}

export type Cycle = "monthly" | "annual" | null

export function cycleDe(l: LigneAbonnement | null | undefined): Cycle {
  if (!l?.current_period_start || !l.current_period_end) return null
  const jours = (Date.parse(l.current_period_end) - Date.parse(l.current_period_start)) / 86_400_000
  if (!Number.isFinite(jours) || jours <= 0) return null
  return jours > 200 ? "annual" : "monthly"
}

// Phrase affichée sous le prix : renouvellement OU fin programmée, jamais un
// « Renouvellement » pour un abonnement déjà résilié.
export function echeance(l: LigneAbonnement | null | undefined, maintenant = Date.now()): { libelle: string; date: string } | null {
  if (!l?.current_period_end) return null
  const t = Date.parse(l.current_period_end)
  if (!Number.isFinite(t) || t < maintenant) return null
  const date = new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
  return { libelle: l.cancel_at_period_end ? "Se termine le" : "Renouvellement le", date }
}
