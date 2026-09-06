// ─────────────────────────────────────────────────────────────────────────────
// SUPPRIMER SON COMPTE DOIT ARRÊTER LA FACTURATION
//
// Lu dans le code le 4 septembre : /api/account/delete supprimait l'utilisateur
// (cascade sur profiles et subscriptions) sans jamais toucher Stripe. Le client
// continuait d'être prélevé tous les mois, et les webhooks suivants mettaient à
// jour zéro ligne, en silence.
//
// Règle : on annule d'abord chez Stripe, et on refuse la suppression si Stripe
// échoue — mieux vaut un compte qui reste qu'un compte fantôme qui paie.
// La logique est isolée ici pour être testable sans réseau.
// ─────────────────────────────────────────────────────────────────────────────

export type ClientStripe = {
  subscriptions: {
    list(params: { customer: string; status: "all"; limit: number }): Promise<{ data: { id: string; status: string }[] }>
    cancel(id: string): Promise<unknown>
  }
}

/** Statuts qui facturent ou factureront encore. */
export const STATUTS_A_ANNULER = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"])

export type Resiliation = { annules: string[]; ignores: string[] }

/**
 * Annule chez Stripe tout abonnement encore facturable du client.
 * Sans customer (compte jamais passé en caisse) : rien à faire.
 * Toute erreur Stripe remonte : l'appelant doit alors REFUSER la suppression.
 */
export async function resilierToutChezStripe(stripe: ClientStripe, customerId: string | null | undefined): Promise<Resiliation> {
  if (!customerId) return { annules: [], ignores: [] }
  const { data } = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })
  const annules: string[] = [], ignores: string[] = []
  for (const s of data) {
    if (STATUTS_A_ANNULER.has(s.status)) { await stripe.subscriptions.cancel(s.id); annules.push(s.id) }
    else ignores.push(s.id)
  }
  return { annules, ignores }
}
