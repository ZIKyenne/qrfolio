// publish.ts — logique PURE du flux de publication (testable sans React ni next/cache).
// Deux briques indépendantes :
//   1) persistPublishedStatus : passe une page au statut "published" (vérifie CHAQUE
//      erreur Supabase, préserve la date de 1re publication) — client injecté, mockable ;
//   2) createPublishController : orchestre « intention → flush → mutation » avec une
//      garde single-flight (anti double-clic) et un résultat typé PAR ÉTAPE.
// La revalidation ISR est réalisée par l'action serveur qui consomme persistPublishedStatus
// (revalidatePath ne peut pas vivre dans un module pur).

export type SupabaseLike = { from(table: string): any }

// Date de publication : on ne RÉINITIALISE PAS la date de 1re publication (valeur SEO /
// analytics). Première publication → maintenant ; publication ultérieure → date conservée.
export function computePublishedAt(existing: string | null | undefined, now: string): string {
  return existing || now
}

// Forme aplatie (ok + champs optionnels) : le dépôt est en `strict: false`, où le
// narrowing des unions discriminées à la lecture n'est pas fiable.
export type PublishStatusResult = { ok: boolean; publishedAt?: string; slug?: string; alreadyPublished?: boolean; message?: string }

// Passe la page en "published". L'accès/propriété est garanti par les RLS du client
// fourni (client utilisateur, côté serveur). Le slug utilisé ensuite pour la revalidation
// provient de la ligne lue via RLS — jamais d'une entrée client (pas de chemin arbitraire).
export async function persistPublishedStatus(client: SupabaseLike, pageId: string, now: string): Promise<PublishStatusResult> {
  const { data: page, error: readErr } = await client.from("pages").select("slug,status,published_at").eq("id", pageId).single()
  if (readErr || !page) return { ok: false, message: "Page introuvable ou accès refusé." }
  const alreadyPublished = page.status === "published"
  const publishedAt = computePublishedAt(page.published_at, now)
  const { error } = await client.from("pages").update({ status: "published", published_at: publishedAt }).eq("id", pageId)
  if (error) return { ok: false, message: error.message || "Mise à jour du statut impossible." }
  return { ok: true, publishedAt, slug: page.slug, alreadyPublished }
}

// ── Contrôleur de publication (orchestration) ───────────────────────────────
export type PublishResult =
  | { ok: true; publishedAt: string; alreadyPublished: boolean }
  | { ok: false; stage: "save" | "publish"; message: string }

export type PublishPhase = "idle" | "publishing" | "published" | "error"
export type PublishUiState = { phase: PublishPhase; message: string; alreadyPublished: boolean }

// Messages DISTINCTS sauvegarde ↔ publication (aucun faux « Publié »).
export const SAVE_FAIL_MSG = "Impossible de publier : les dernières modifications n'ont pas pu être enregistrées. Vérifiez votre connexion puis réessayez."
export const PUBLISH_FAIL_MSG = "Vos modifications sont enregistrées, mais la publication a échoué. Réessayez sans quitter cette page."

export type PublishDeps = {
  // Persiste le dernier snapshot local ; true si tout est enregistré (= saveController.flush).
  flush: () => Promise<boolean>
  // Mutation serveur de publication (statut + revalidation ISR). Résultat aplati.
  publish: () => Promise<{ ok: boolean; publishedAt?: string; alreadyPublished?: boolean; message?: string }>
  onChange?: (s: PublishUiState) => void
}

export function createPublishController(deps: PublishDeps) {
  let inFlight = false
  const emit = (s: PublishUiState) => deps.onChange?.(s)

  // Contrat : intention → flush (attend la persistance du DERNIER snapshot) → mutation de
  // statut → succès. Toute étape échouée interrompt le flux SANS passer « publié ».
  async function publishLatest(): Promise<PublishResult> {
    // Garde IMPÉRATIVE anti double-clic : deux appels rapprochés → un seul flux réel
    // (le `disabled` du bouton est asynchrone et ne suffit pas).
    if (inFlight) return { ok: false, stage: "publish", message: "Publication déjà en cours." }
    inFlight = true
    emit({ phase: "publishing", message: "", alreadyPublished: false })
    try {
      const saved = await deps.flush()
      if (!saved) {
        emit({ phase: "error", message: SAVE_FAIL_MSG, alreadyPublished: false })
        return { ok: false, stage: "save", message: SAVE_FAIL_MSG }
      }
      const res = await deps.publish()
      if (!res.ok) {
        const message = res.message || PUBLISH_FAIL_MSG
        emit({ phase: "error", message, alreadyPublished: false })
        return { ok: false, stage: "publish", message }
      }
      const alreadyPublished = res.alreadyPublished ?? false
      emit({ phase: "published", message: "", alreadyPublished })
      return { ok: true, publishedAt: res.publishedAt, alreadyPublished }
    } finally {
      inFlight = false
    }
  }

  return { publishLatest, isPublishing: () => inFlight }
}
