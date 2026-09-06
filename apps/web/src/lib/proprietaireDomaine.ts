// ─────────────────────────────────────────────────────────────────────────────
// À QUI APPARTIENT CE DOMAINE ?
//
// La résolution publique d'un domaine personnalisé cherchait des redirections et
// des routes SANS regarder qui possède le domaine. Conséquence, lue dans le code
// le 4 septembre : un compte gratuit pouvait poser une redirection sur
// « victim.com » (domaine vérifié d'un autre client) et détourner tout son
// trafic ; et /api/domains/resolve?domain=n-importe-quoi servait de redirection
// ouverte sur qrowg.com.
//
// Règle : un domaine — ou un sous-domaine d'un domaine — n'est résolu que pour
// son propriétaire VÉRIFIÉ, et rien n'est résolu pour un domaine que personne
// n'a vérifié. Pur, testé à part.
// ─────────────────────────────────────────────────────────────────────────────

export type Verification = { user_id: string; domain: string; verified?: boolean | null }

/**
 * Domaines candidats pour un hôte : lui-même et chacun de ses parents jusqu'au
 * domaine enregistrable (deux étiquettes). « a.b.exemple.fr » → « a.b.exemple.fr »,
 * « b.exemple.fr », « exemple.fr ».
 */
export function candidats(hote: string): string[] {
  const h = hote.toLowerCase().replace(/^www\./, "").replace(/\.$/, "")
  const parts = h.split(".").filter(Boolean)
  const out: string[] = []
  for (let i = 0; i <= parts.length - 2; i++) out.push(parts.slice(i).join("."))
  return out
}

/**
 * Le propriétaire vérifié le plus précis pour cet hôte, ou null.
 * Parmi les vérifications fournies, on ne garde que les vérifiées ; le domaine
 * le plus long (le plus précis) l'emporte : « booking.exemple.fr » avant
 * « exemple.fr » si les deux sont vérifiés.
 */
export function proprietaire(hote: string, verifications: Verification[]): Verification | null {
  const ordre = candidats(hote)
  for (const c of ordre) {
    const v = verifications.find(x => x.domain.toLowerCase() === c && x.verified !== false)
    if (v) return v
  }
  return null
}
