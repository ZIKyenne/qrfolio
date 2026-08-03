// saveController.ts — coordinateur de sauvegarde « single-flight » PUR (sans React).
//
// Problème résolu (concurrence DANS UN MÊME CLIENT) :
//   - deux autosaves ne doivent JAMAIS s'exécuter en parallèle ;
//   - un changement arrivé pendant une sauvegarde ne doit pas être perdu ;
//   - une sauvegarde ancienne ne doit jamais marquer un état plus récent comme
//     « enregistré », ni supprimer un bloc ajouté après son démarrage.
//
// Mécanisme : à tout instant, ZÉRO ou UNE seule sauvegarde active. Chaque demande
// reçoit un numéro de séquence croissant et remplace le « dernier snapshot » à
// sauvegarder (last-write-wins). Quand la sauvegarde active se termine, si un
// snapshot plus récent existe, on relance AUTOMATIQUEMENT avec CE snapshot.
//
// Ce module est générique sur le type de snapshot S ; il ne connaît rien de Supabase
// (la persistance est injectée via `persist`). Testable sans React ni réseau.

export type SaveStatus = "idle" | "saving" | "queued" | "saved" | "error"

export type SaveState = {
  status: SaveStatus
  dirty: boolean        // vrai tant que le dernier snapshot demandé n'est pas persisté
  saving: boolean       // une sauvegarde réseau est en cours
  error: Error | null
}

export type SaveControllerOptions<S> = {
  persist: (snapshot: S) => Promise<void>
  onChange?: (state: SaveState) => void
}

export type SaveController<S> = {
  // Demande la sauvegarde du snapshot fourni (= état le plus récent). Coalescé :
  // si une sauvegarde tourne déjà, ce snapshot devient le prochain à enregistrer.
  request(snapshot: S): void
  // Attend que le DERNIER snapshot demandé soit persisté. Résout true si tout est
  // enregistré, false en cas d'échec. Utilisé par la publication (flush avant publish).
  flush(): Promise<boolean>
  // Réessaie après une erreur, avec le DERNIER snapshot (jamais un ancien).
  retry(): void
  // À appeler au démontage : coupe les notifications et libère les attentes de flush.
  dispose(): void
  // Introspection (tests / UI).
  getState(): SaveState
}

export function createSaveController<S>(opts: SaveControllerOptions<S>): SaveController<S> {
  let latest: { snap: S; seq: number } | null = null // dernier snapshot demandé
  let seqCounter = 0
  let inFlight = false
  let lastPersistedSeq = 0
  let failedSeq = 0                                   // seq du dernier échec (garde anti-boucle)
  let status: SaveStatus = "idle"
  let error: Error | null = null
  let disposed = false
  const waiters: Array<{ seq: number; resolve: (ok: boolean) => void }> = []

  const isDirty = () => latest != null && latest.seq !== lastPersistedSeq

  const emit = () => {
    if (disposed) return
    opts.onChange?.({ status, dirty: isDirty(), saving: inFlight, error })
  }

  // Résout les attentes de flush : succès → toutes celles dont la cible est atteinte ;
  // échec → toutes celles couvertes par le snapshot qui vient d'échouer.
  const settleWaiters = (ok: boolean, failedUpTo: number) => {
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (ok && lastPersistedSeq >= waiters[i].seq) { waiters[i].resolve(true); waiters.splice(i, 1) }
      else if (!ok && waiters[i].seq <= failedUpTo) { waiters[i].resolve(false); waiters.splice(i, 1) }
    }
  }

  // Démarre une sauvegarde si c'est légitime : rien en vol, un snapshot plus récent
  // que le dernier persisté, et pas bloqué sur une erreur en attente de retry.
  const maybeStart = () => {
    if (disposed || inFlight || latest == null) return
    if (latest.seq === lastPersistedSeq) return
    if (status === "error" && latest.seq <= failedSeq) return // attend retry()/flush() ou un snapshot plus récent
    run(latest.snap, latest.seq)
  }

  const run = (snap: S, seq: number) => {
    inFlight = true
    status = "saving"
    error = null
    emit()
    // Promise.resolve() garantit que `persist` s'exécute de façon asynchrone même s'il
    // est synchrone : `request` rend toujours la main avant le premier effet.
    Promise.resolve()
      .then(() => opts.persist(snap))
      .then(
        () => { lastPersistedSeq = seq; onDone(seq, null) },
        (e: any) => onDone(seq, e instanceof Error ? e : new Error(String(e?.message ?? e ?? "Erreur de sauvegarde"))),
      )
  }

  const onDone = (seq: number, err: Error | null) => {
    inFlight = false
    if (err) {
      error = err
      failedSeq = seq
      status = "error"
      settleWaiters(false, seq)
      emit()
      // On ne relance PAS le même snapshot échoué (anti-boucle). Mais si un snapshot
      // strictement plus récent est arrivé pendant l'échec, on le tente (legit).
      if (latest && latest.seq > seq) maybeStart()
      return
    }
    error = null
    settleWaiters(true, seq)
    if (latest && latest.seq > lastPersistedSeq) {
      // Des changements sont arrivés pendant la sauvegarde → relance avec le dernier.
      maybeStart()
    } else {
      status = "saved"
      emit()
    }
  }

  return {
    request(snap: S) {
      if (disposed) return
      seqCounter += 1
      latest = { snap, seq: seqCounter }
      if (inFlight) { status = "queued"; emit() } // en file : sera repris à la fin du save courant
      else maybeStart()
    },
    flush() {
      if (disposed) return Promise.resolve(false)
      if (latest == null || latest.seq === lastPersistedSeq) return Promise.resolve(true)
      const target = latest.seq
      return new Promise<boolean>(resolve => {
        waiters.push({ seq: target, resolve })
        // Force un essai même si on est bloqué sur une erreur (flush = intention explicite).
        if (!inFlight) { failedSeq = 0; maybeStart() }
      })
    },
    retry() {
      if (disposed || inFlight) return
      failedSeq = 0
      maybeStart()
    },
    dispose() {
      disposed = true
      for (const w of waiters) w.resolve(false)
      waiters.length = 0
    },
    getState() {
      return { status, dirty: isDirty(), saving: inFlight, error }
    },
  }
}
