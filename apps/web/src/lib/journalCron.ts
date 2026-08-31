// journalCron.ts — Chaque tâche planifiée laisse une trace de son passage.
//
// Trois fonctionnalités livrées dépendent de ces tâches : la relance à deux jours,
// le rapport hebdomadaire et l'alerte de quota. Personne — ni le propriétaire, ni
// moi — ne pouvait dire si elles s'exécutaient : elles n'écrivent rien quand il n'y
// a rien à envoyer, et les journaux d'exécution de l'hébergeur ne remontent qu'une
// heure ou deux en arrière sur ce plan. La question « est-ce que mes emails
// partent ? » n'avait aucune réponse observable.
//
// Elle en a une maintenant : une ligne par passage, gardée trente jours.
//
// La table est FACULTATIVE. Si la migration n'a pas été appliquée, l'écriture
// échoue en silence et la tâche fait son travail comme avant — on ne casse jamais
// un envoi pour un journal. Même convention que `profiles.quota_alert_month`.
//
//   create table if not exists public.cron_runs (
//     id       bigint generated always as identity primary key,
//     tache    text not null,
//     lance_le timestamptz not null default now(),
//     statut   text not null check (statut in ('ok','rien','erreur','refuse')),
//     detail   text,
//     duree_ms integer
//   );
//   create index if not exists cron_runs_tache_lance_le_idx
//     on public.cron_runs (tache, lance_le desc);
//   alter table public.cron_runs enable row level security;
//   alter table public.cron_runs force row level security;
//   -- Aucune policy : seule la clé de service y accède. Un compte connecté ne lit
//   -- ce journal qu'à travers /api/cron/etat, qui masque la colonne `detail`
//   -- (elle cite les adresses email des destinataires en cas d'erreur).

export const TACHES = ["emails/weekly", "reports/send", "cron/quota-alerts", "cron/dynamic-expiry", "cron/relance"] as const
export type Tache = (typeof TACHES)[number]

export type Statut = "ok" | "rien" | "erreur" | "refuse"

/** Trente jours d'historique suffisent : au-delà, l'information ne sert plus à rien. */
export const RETENTION_JOURS = 30

export type Passage = { tache: string; lance_le: string; statut: string; detail?: string | null }

/**
 * Le dernier passage de chaque tâche, à partir d'une liste triée du plus récent au
 * plus ancien. Pur, pour être testé sans base.
 */
export function dernierPassage(passages: Passage[]): Map<string, Passage> {
  const dernier = new Map<string, Passage>()
  for (const p of passages) {
    if (!p?.tache) continue
    const connu = dernier.get(p.tache)
    if (!connu || Date.parse(p.lance_le) > Date.parse(connu.lance_le)) dernier.set(p.tache, p)
  }
  return dernier
}

/**
 * Ce qu'on affiche pour une tâche : depuis quand, et si c'est inquiétant.
 *
 * `attenduToutesLesHeures` = intervalle nominal de la tâche. Au-delà de deux fois
 * cet intervalle, on considère qu'elle a manqué son tour — l'hébergeur annonce
 * une précision de ±59 minutes, donc un simple retard ne doit pas alerter.
 */
export type Verdict = { texte: string; niveau: "ok" | "attention" | "jamais" }

export function jugerPassage(p: Passage | undefined, attenduToutesLesHeures: number, maintenant: number = Date.now()): Verdict {
  if (!p) return { texte: "Jamais exécutée", niveau: "jamais" }

  const t = Date.parse(p.lance_le)
  if (Number.isNaN(t)) return { texte: "Jamais exécutée", niveau: "jamais" }

  const heures = (maintenant - t) / 3600000
  const quand =
    heures < 1 ? "il y a moins d'une heure"
    : heures < 24 ? `il y a ${Math.floor(heures)} h`
    : `il y a ${Math.floor(heures / 24)} j`

  if (p.statut === "erreur") return { texte: `En échec ${quand}`, niveau: "attention" }
  if (heures > attenduToutesLesHeures * 2) return { texte: `Dernière exécution ${quand}`, niveau: "attention" }
  return { texte: `Dernière exécution ${quand}`, niveau: "ok" }
}

/** Intervalle nominal de chaque tâche, en heures. */
export const INTERVALLE_H: Record<string, number> = {
  "emails/weekly": 24 * 7,
  "reports/send": 24, // passage QUOTIDIEN : c'est `last_sent_at` qui espace les envois
  "cron/quota-alerts": 24 * 7,
  "cron/dynamic-expiry": 24,
  "cron/relance": 24,
}

/**
 * Note le passage d'une tâche. Ne jette JAMAIS et ne bloque jamais : si la table
 * n'existe pas, ou si l'écriture échoue, la tâche continue son travail.
 */
export async function noterPassage(
  admin: { from: (t: string) => { insert: (row: Record<string, unknown>) => Promise<unknown> | { then: unknown } } },
  tache: Tache,
  statut: Statut,
  detail?: string | null,
  dureeMs?: number,
): Promise<void> {
  try {
    await admin.from("cron_runs").insert({
      tache,
      statut,
      detail: detail ? String(detail).slice(0, 500) : null,
      duree_ms: typeof dureeMs === "number" ? Math.round(dureeMs) : null,
    })
  } catch { /* table absente ou base injoignable : le journal n'est jamais bloquant */ }

  // Purge au fil de l'eau : quelques lignes par jour, trente jours d'historique.
  // Pas besoin d'une tâche planifiée de plus pour nettoyer une tâche planifiée.
  try {
    const limite = new Date(Date.now() - RETENTION_JOURS * 86400000).toISOString()
    const q = (admin as unknown as { from: (t: string) => { delete: () => { lt: (c: string, v: string) => Promise<unknown> } } })
    await q.from("cron_runs").delete().lt("lance_le", limite)
  } catch { /* idem : jamais bloquant */ }
}

/**
 * Une trace de REFUS, au plus une par heure et par tâche.
 *
 * Sans elle, le journal ne distinguait pas « l'hébergeur n'a jamais déclenché la
 * tâche » de « il l'a déclenchée et la route a répondu 401 ». Les deux laissaient
 * exactement zéro ligne — or le second cas est celui d'un `CRON_SECRET` absent ou
 * mal recopié, c'est-à-dire la panne la plus probable, et la plus muette.
 *
 * L'étranglement à une trace par heure existe parce que ce chemin est, lui,
 * atteignable par n'importe qui : sans lui, une boucle sur /api/cron/relance
 * remplirait la table.
 */
export async function noterRefus(
  admin: any,
  tache: Tache,
  motif: string,
): Promise<void> {
  try {
    const depuis = new Date(Date.now() - 3600_000).toISOString()
    const { data } = await admin
      .from("cron_runs").select("id")
      .eq("tache", tache).eq("statut", "refuse").gte("lance_le", depuis)
      .limit(1)
    if (Array.isArray(data) && data.length) return // déjà tracé dans l'heure
  } catch { return /* table absente : rien à tracer, et surtout rien à casser */ }
  await noterPassage(admin, tache, "refuse", motif, 0)
}

/**
 * Un détail de journal sans adresse email.
 *
 * Les tâches y écrivaient « client@resto.fr: rate_limit_exceeded » : le journal
 * devenait un fichier d'adresses, et c'est ce qui obligeait /api/cron/etat à
 * masquer la colonne entière. On garde le message d'erreur, on retire l'adresse.
 */
export function sansAdresses(texte: string): string {
  return texte.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "un destinataire")
}
