// Réconciliation PURE du quota « QR Dynamique » après un changement d'abonnement.
//
// Règle (décidée avec le propriétaire) : les liens les PLUS ANCIENS sont prioritaires
// pour les slots permanents. Après souscription/upgrade, les liens d'essai encore
// valides deviennent PERMANENTS dans la limite du quota (et les liens mis en pause pour
// dépassement sont réactivés). Après downgrade/résiliation, les liens permanents EN TROP
// (les plus récents) passent EN PAUSE — rien n'est supprimé, réactivation au ré-upgrade.
//
// Aucune I/O : renvoie la liste des mises à jour à appliquer. La route webhook applique.

export type DynLink = {
  id: string
  status: string | null          // 'active' | 'paused' | ...
  expires_at: string | null      // null = permanent ; date = essai (expire à cette date)
}

export type DynLinkOp = { id: string; patch: { status?: string; expires_at?: null } }

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

    if (used < cap) {
      // Dans le quota : rendre actif + permanent.
      const patch: DynLinkOp["patch"] = {}
      if (l.status !== "active") patch.status = "active"     // réactive un lien mis en pause
      if (l.expires_at !== null) patch.expires_at = null      // promeut un essai en permanent
      if (Object.keys(patch).length) ops.push({ id: l.id, patch })
      used++
    } else {
      // Au-delà du quota : ne mettre en pause QUE les permanents actifs.
      // Un essai encore valide est laissé tel quel (il expirera de lui-même).
      if (l.status === "active" && l.expires_at === null) ops.push({ id: l.id, patch: { status: "paused" } })
    }
  }
  return ops
}
