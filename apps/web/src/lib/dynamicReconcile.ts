// Réconciliation PURE du quota de QR MODIFIABLES après un changement de plan.
//
// Règle (décidée avec le propriétaire) : les liens les PLUS ANCIENS sont prioritaires
// pour les slots. Après une montée de plan, les liens mis en pause pour dépassement
// sont réactivés, et les anciens liens d'essai (héritage de la période où un QR
// mourait au bout de 30 jours) deviennent permanents dans la limite du quota. Après
// une descente de plan, les liens EN TROP (les plus récents) passent EN PAUSE —
// rien n'est supprimé, réactivation dès que le quota les re-couvre.
//
// Aucune I/O : renvoie la liste des mises à jour à appliquer. La route webhook applique.

export type DynLink = {
  id: string
  status: string | null          // 'active' | 'paused' | ...
  expires_at: string | null      // null = permanent ; date = essai (expire à cette date)
  paused_reason?: string | null  // 'manual' = pause choisie par l'utilisateur (intouchable) ; 'quota'/null = pause auto
}

export type DynLinkOp = { id: string; patch: { status?: string; expires_at?: null; paused_reason?: string | null } }

// `links` DOIT être trié du plus ANCIEN au plus récent (created_at asc).
// `limit` = quota de liens permanents (null = illimité, 0 = aucun -> essai seul).
// `now` = horodatage courant (ms) pour ignorer les essais déjà expirés.
export function planDynamicReconcile(links: DynLink[], limit: number | null, now: number): DynLinkOp[] {
  const cap = limit === null ? Infinity : limit
  const ops: DynLinkOp[] = []
  let used = 0
  for (const l of links) {
    const expTs = l.expires_at ? Date.parse(l.expires_at) : null
    // Essai déjà expiré : on n'y touche pas (il reste expiré, ne consomme aucun slot).
    if (expTs !== null && expTs <= now) continue
    // Pause MANUELLE (choix de l'utilisateur) : jamais réactivée ni comptée dans le quota.
    if (l.status === "paused" && l.paused_reason === "manual") continue

    if (used < cap) {
      // Dans le quota : rendre actif + permanent.
      const patch: DynLinkOp["patch"] = {}
      if (l.status !== "active") { patch.status = "active"; if (l.paused_reason != null) patch.paused_reason = null } // réactive une pause-quota
      if (l.expires_at !== null) patch.expires_at = null      // promeut un essai en permanent
      if (Object.keys(patch).length) ops.push({ id: l.id, patch })
      used++
    } else {
      // Au-delà du quota : ne mettre en pause QUE les permanents actifs (motif 'quota').
      // Un essai encore valide est laissé tel quel (il expirera de lui-même).
      if (l.status === "active" && l.expires_at === null) ops.push({ id: l.id, patch: { status: "paused", paused_reason: "quota" } })
    }
  }
  return ops
}
