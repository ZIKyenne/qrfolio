import { describe, it, expect } from "vitest"
import { createSaveController } from "./saveController"
import { persistSnapshot } from "./savePage"

// Laisse s'écouler la file de microtâches (les persist sont enchaînés via des promesses).
const tick = () => new Promise<void>(r => setTimeout(r, 0))

// Harnais de persistance contrôlable : chaque appel renvoie une promesse que le test
// résout/rejette à la main, et on mémorise l'ordre exact des snapshots reçus.
function makePersist() {
  const calls: any[] = []
  const pending: Array<{ resolve: () => void; reject: (e: any) => void }> = []
  const persist = (snap: any) =>
    new Promise<void>((resolve, reject) => { calls.push(snap); pending.push({ resolve, reject }) })
  return { persist, calls, pending }
}

const A = "11111111-1111-4111-8111-111111111111"
const B = "22222222-2222-4222-8222-222222222222"
const C = "33333333-3333-4333-8333-333333333333"

describe("saveController — single-flight", () => {
  it("Test 1 — jamais deux sauvegardes réseau en parallèle", async () => {
    const h = makePersist()
    const ctrl = createSaveController({ persist: h.persist })
    ctrl.request("a"); ctrl.request("b"); ctrl.request("c")
    await tick()
    expect(h.calls).toEqual(["a"])          // une seule sauvegarde démarrée
    h.pending[0].resolve(); await tick()
    expect(h.calls).toEqual(["a", "c"])     // la suivante démarre APRÈS (dernier snapshot = c)
    expect(h.pending.length).toBe(2)        // jamais plus d'une en vol à la fois
  })

  it("Test 9 — dernière écriture gagnante (V1, V2, V3 → seul V3 après V1)", async () => {
    const h = makePersist()
    const ctrl = createSaveController({ persist: h.persist })
    ctrl.request("V1"); await tick()
    ctrl.request("V2"); ctrl.request("V3")  // deux changements pendant la sauvegarde
    h.pending[0].resolve(); await tick()     // V1 finit → relance avec le DERNIER (V3), saute V2
    expect(h.calls).toEqual(["V1", "V3"])
    h.pending[1].resolve(); await tick()
    expect(ctrl.getState().status).toBe("saved")
    expect(ctrl.getState().dirty).toBe(false)
  })
})

describe("saveController — changements pendant la sauvegarde", () => {
  it("Test 2 — un ajout pendant la sauvegarde n'est pas perdu", async () => {
    const h = makePersist()
    const ctrl = createSaveController({ persist: h.persist })
    ctrl.request([A, B]); await tick()
    ctrl.request([A, B, C])                  // l'utilisateur ajoute C pendant l'envoi
    expect(ctrl.getState().status).toBe("queued")
    h.pending[0].resolve(); await tick()      // 1re sauvegarde ([A,B]) terminée
    expect(h.calls[1]).toEqual([A, B, C])     // la 2e part avec l'état le plus récent
    h.pending[1].resolve(); await tick()
    expect(ctrl.getState().dirty).toBe(false)
  })

  it("Test 3 — un save dépassé ne remet pas dirty à false", async () => {
    const h = makePersist()
    const ctrl = createSaveController({ persist: h.persist })
    ctrl.request([A, B]); await tick()
    ctrl.request([A, B, C])                    // seq 2 en file
    h.pending[0].resolve(); await tick()        // seq 1 (dépassé) se termine
    expect(ctrl.getState().dirty).toBe(true)    // reste sale tant que seq 2 n'est pas confirmé
    expect(ctrl.getState().saving).toBe(true)   // seq 2 est déjà reparti
    h.pending[1].resolve(); await tick()
    expect(ctrl.getState().dirty).toBe(false)
  })
})

describe("saveController — erreurs & retry", () => {
  it("Test 4 — échec → dirty reste vrai ; retry sauvegarde le dernier état", async () => {
    const h = makePersist()
    const ctrl = createSaveController({ persist: h.persist })
    ctrl.request("v1"); await tick()
    h.pending[0].reject(new Error("réseau")); await tick()
    expect(ctrl.getState().status).toBe("error")
    expect(ctrl.getState().dirty).toBe(true)
    expect(ctrl.getState().saving).toBe(false)
    ctrl.retry(); await tick()
    expect(h.calls).toEqual(["v1", "v1"])       // retry rejoue le DERNIER snapshot
    h.pending[1].resolve(); await tick()
    expect(ctrl.getState().status).toBe("saved")
    expect(ctrl.getState().dirty).toBe(false)
  })

  it("Test 6 — un persist qui rejette ne produit jamais de faux succès", async () => {
    const h = makePersist()
    const seen: string[] = []
    const ctrl = createSaveController({ persist: h.persist, onChange: s => seen.push(s.status) })
    ctrl.request("v1"); await tick()
    h.pending[0].reject(new Error("boom")); await tick()
    expect(seen).not.toContain("saved")
    expect(ctrl.getState().error?.message).toBe("boom")
  })

  it("une erreur ne boucle pas à l'infini (pas de relance auto du même snapshot)", async () => {
    const h = makePersist()
    const ctrl = createSaveController({ persist: h.persist })
    ctrl.request("v1"); await tick()
    h.pending[0].reject(new Error("x")); await tick()
    await tick(); await tick()
    expect(h.calls).toEqual(["v1"])             // aucune relance automatique
  })
})

describe("saveController — file & démontage", () => {
  it("Test 8 — après succès, aucune sauvegarde fantôme ne reste active", async () => {
    const h = makePersist()
    const ctrl = createSaveController({ persist: h.persist })
    ctrl.request("v1"); await tick()
    h.pending[0].resolve(); await tick()
    expect(ctrl.getState().saving).toBe(false)
    expect(ctrl.getState().status).toBe("saved")
  })

  it("Test 10 — dispose : plus aucune notification ni promesse en suspens", async () => {
    const h = makePersist()
    const seen: string[] = []
    const ctrl = createSaveController({ persist: h.persist, onChange: s => seen.push(s.status) })
    ctrl.request("v1"); await tick()
    const before = seen.length
    ctrl.dispose()
    h.pending[0].resolve(); await tick()
    expect(seen.length).toBe(before)            // aucun setState après démontage
    expect(await ctrl.flush()).toBe(false)      // flush post-dispose ne bloque pas
  })
})

describe("saveController — flush (pour la publication B03)", () => {
  it("résout true quand le dernier snapshot est persisté", async () => {
    const h = makePersist()
    const ctrl = createSaveController({ persist: h.persist })
    ctrl.request("v1"); await tick()
    const p = ctrl.flush()
    h.pending[0].resolve(); await tick()
    expect(await p).toBe(true)
  })

  it("résout true immédiatement si rien n'est en attente", async () => {
    const h = makePersist()
    const ctrl = createSaveController({ persist: h.persist })
    expect(await ctrl.flush()).toBe(true)
  })

  it("force un nouvel essai même après une erreur", async () => {
    const h = makePersist()
    const ctrl = createSaveController({ persist: h.persist })
    ctrl.request("v1"); await tick()
    h.pending[0].reject(new Error("net")); await tick()
    const p = ctrl.flush()
    await tick()
    expect(h.calls).toEqual(["v1", "v1"])       // flush relance l'essai bloqué
    h.pending[1].resolve()
    expect(await p).toBe(true)
  })

  it("résout false si la sauvegarde échoue", async () => {
    const h = makePersist()
    const ctrl = createSaveController({ persist: h.persist })
    ctrl.request("v1"); await tick()
    const p = ctrl.flush()
    h.pending[0].reject(new Error("net")); await tick()
    expect(await p).toBe(false)
  })
})

// ── Intégration contrôleur + persistSnapshot : preuve anti-course de suppression ──
// Un faux « DB » en mémoire ; on force le chevauchement (2 demandes avant tout tick)
// et on vérifie qu'aucune suppression issue de l'ancien snapshot ne retire le bloc neuf.
function makeStatefulDb(initial: string[]) {
  const db = new Map<string, any>(initial.map(id => [id, { id }]))
  const deleted: string[] = []
  const from = (table: string) => {
    let kind = ""; let payload: any; const filters: any[] = []
    const api: any = {
      update(p: any) { kind = "update"; payload = p; return api },
      upsert(rows: any) { kind = "upsert"; payload = rows; return api },
      insert(rows: any) { kind = "insert"; payload = rows; return api },
      select() { kind = "select"; return api },
      delete() { kind = "delete"; return api },
      eq(k: any, v: any) { filters.push(["eq", k, v]); return api },
      in(k: any, v: any) { filters.push(["in", k, v]); return api },
      then(onF: any, onR: any) {
        let res: any = { data: null, error: null }
        if (table === "blocks") {
          if (kind === "upsert") for (const r of payload) db.set(r.id, r)
          else if (kind === "select") res = { data: [...db.values()].map(r => ({ id: r.id })), error: null }
          else if (kind === "delete") {
            const inF = filters.find(f => f[0] === "in")
            if (inF) for (const id of inF[2]) { db.delete(id); deleted.push(id) }
            else for (const id of [...db.keys()]) { db.delete(id); deleted.push(id) }
          }
        }
        return Promise.resolve(res).then(onF, onR)
      },
    }
    return api
  }
  return { client: { from } as any, db, deleted }
}

const snap = (ids: string[]) => ({ liveId: "p", pageName: "t", theme: {}, blocks: ids.map(id => ({ id, type: "text", content: {}, visible: true })) })

describe("saveController + persistSnapshot — intégration", () => {
  it("Test 5 — un ancien snapshot ne supprime jamais le bloc ajouté après lui", async () => {
    const { client, db, deleted } = makeStatefulDb([A, B])
    const ctrl = createSaveController({ persist: (s: any) => persistSnapshot(client, s) })
    ctrl.request(snap([A, B]))       // seq 1 démarre (inFlight synchrone)
    ctrl.request(snap([A, B, C]))    // seq 2 mis en file AVANT tout await → chevauchement forcé
    await tick(); await tick(); await tick(); await tick()
    expect([...db.keys()].sort()).toEqual([A, B, C].sort()) // C survit
    expect(deleted).not.toContain(C)                        // jamais supprimé par seq 1
    expect(ctrl.getState().dirty).toBe(false)
  })

  it("Test 7 — le chemin moderne conserve les UUID existants (upsert, pas de recréation)", async () => {
    const { client, db } = makeStatefulDb([A, B])
    const ctrl = createSaveController({ persist: (s: any) => persistSnapshot(client, s) })
    ctrl.request(snap([A, B])); await tick(); await tick()
    expect([...db.keys()].sort()).toEqual([A, B].sort())    // mêmes IDs, pas de nouveaux UUID
  })

  it("une suppression légitime retire bien le bloc absent du dernier snapshot", async () => {
    const { client, db, deleted } = makeStatefulDb([A, B])
    const ctrl = createSaveController({ persist: (s: any) => persistSnapshot(client, s) })
    ctrl.request(snap([A])); await tick(); await tick(); await tick()
    expect([...db.keys()]).toEqual([A])
    expect(deleted).toContain(B)
  })
})
