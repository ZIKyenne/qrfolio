import { describe, it, expect, vi } from "vitest"
import { dernierPassage, jugerPassage, noterPassage, INTERVALLE_H, TACHES, type Passage, noterRefus, sansAdresses } from "./journalCron"

const T0 = Date.parse("2026-08-31T12:00:00Z")
const ilYA = (heures: number) => new Date(T0 - heures * 3600000).toISOString()
const p = (tache: string, heures: number, statut = "ok"): Passage => ({ tache, lance_le: ilYA(heures), statut })

describe("le dernier passage de chaque tâche", () => {
  it("retient le plus récent, quel que soit l'ordre reçu", () => {
    const d = dernierPassage([p("cron/relance", 50), p("cron/relance", 2), p("cron/relance", 26)])
    expect(d.get("cron/relance")!.lance_le).toBe(ilYA(2))
  })

  it("sépare les tâches", () => {
    const d = dernierPassage([p("cron/relance", 2), p("emails/weekly", 5)])
    expect(d.size).toBe(2)
  })

  it("ignore les lignes sans nom de tâche", () => {
    expect(dernierPassage([{ tache: "", lance_le: ilYA(1), statut: "ok" }]).size).toBe(0)
  })
})

describe("ce qu'on affiche au propriétaire", () => {
  it("dit clairement qu'une tâche n'a jamais tourné", () => {
    // C'est LA réponse qui manquait : trois fonctionnalités livrées pouvaient ne
    // rien faire depuis des semaines sans que rien ne le montre.
    const v = jugerPassage(undefined, 24, T0)
    expect(v.niveau).toBe("jamais")
    expect(v.texte).toBe("Jamais exécutée")
  })

  it("ne s'inquiète pas d'un simple retard", () => {
    // L'hébergeur annonce ±59 minutes sur le plan Hobby : une tâche quotidienne
    // vue il y a 25 h est normale, pas en panne.
    expect(jugerPassage(p("cron/relance", 25), 24, T0).niveau).toBe("ok")
  })

  it("alerte quand la tâche a sauté son tour", () => {
    expect(jugerPassage(p("cron/relance", 49), 24, T0).niveau).toBe("attention")
    expect(jugerPassage(p("emails/weekly", 24 * 15), INTERVALLE_H["emails/weekly"], T0).niveau).toBe("attention")
  })

  it("signale un échec même s'il est récent", () => {
    const v = jugerPassage(p("cron/relance", 1, "erreur"), 24, T0)
    expect(v.niveau).toBe("attention")
    expect(v.texte).toContain("échec")
  })

  it("s'écrit en français lisible", () => {
    expect(jugerPassage(p("cron/relance", 0.5), 24, T0).texte).toContain("moins d'une heure")
    expect(jugerPassage(p("cron/relance", 5), 24, T0).texte).toContain("il y a 5 h")
    expect(jugerPassage(p("cron/relance", 72), 24, T0).texte).toContain("il y a 3 j")
  })

  it("ne jette pas sur une date abîmée", () => {
    const v = jugerPassage({ tache: "x", lance_le: "pas-une-date", statut: "ok" }, 24, T0)
    expect(v.niveau).toBe("jamais")
  })
})

describe("chaque tâche planifiée est connue du journal", () => {
  it("les cinq tâches ont un intervalle déclaré", () => {
    for (const t of TACHES) expect(INTERVALLE_H[t], t).toBeGreaterThan(0)
  })
})

describe("noter un passage ne casse jamais la tâche", () => {
  it("avale une table absente", async () => {
    const casse = { from: () => ({ insert: () => { throw new Error('relation "cron_runs" does not exist') } }) }
    await expect(noterPassage(casse as never, "cron/relance", "ok")).resolves.toBeUndefined()
  })

  it("avale une base injoignable", async () => {
    const casse = { from: () => { throw new Error("réseau") } }
    await expect(noterPassage(casse as never, "cron/relance", "ok")).resolves.toBeUndefined()
  })

  it("tronque un détail trop long plutôt que de faire échouer l'insertion", async () => {
    let recu: Record<string, unknown> | null = null
    const base = { from: () => ({ insert: async (row: Record<string, unknown>) => { recu = row; return {} } }) }
    await noterPassage(base as never, "cron/relance", "erreur", "x".repeat(2000))
    expect(String((recu as any).detail).length).toBe(500)
  })

  it("enregistre la tâche et son statut", async () => {
    let recu: any = null
    const base = { from: (t: string) => ({ insert: async (row: any) => { recu = { t, row }; return {} } }) }
    await noterPassage(base as never, "emails/weekly", "rien", null, 1234.6)
    expect(recu.t).toBe("cron_runs")
    expect(recu.row.tache).toBe("emails/weekly")
    expect(recu.row.statut).toBe("rien")
    expect(recu.row.duree_ms).toBe(1235)
  })
})


// ── Le refus : la trace qui manquait ────────────────────────────────────────

// Le journal existe pour répondre à « est-ce que mes emails partent ? ». Il ne
// distinguait pas « l'hébergeur n'a jamais déclenché la tâche » de « il l'a
// déclenchée et la route a répondu 401 » : les deux laissaient zéro ligne. Or le
// second cas — un CRON_SECRET absent des variables d'environnement — est la panne
// la plus probable, et la seule qu'on ne peut pas voir autrement.

function faussebase(dejaTrace: boolean) {
  const inserts: any[] = []
  const requete = {
    select: () => requete,
    eq: () => requete,
    gte: () => requete,
    limit: async () => ({ data: dejaTrace ? [{ id: 1 }] : [] }),
    insert: async (row: any) => { inserts.push(row); return {} },
    delete: () => ({ lt: async () => ({}) }),
  }
  return { client: { from: () => requete }, inserts }
}

describe("la trace d'un refus", () => {
  it("est écrite quand rien n'a été tracé dans l'heure", async () => {
    const { client, inserts } = faussebase(false)
    await noterRefus(client as never, "cron/relance", "appel sans secret")
    expect(inserts).toHaveLength(1)
    expect(inserts[0].statut).toBe("refuse")
    expect(inserts[0].detail).toBe("appel sans secret")
  })

  it("ne se répète pas dans l'heure — ce chemin est ouvert à tout le monde", async () => {
    // Sans cet étranglement, une boucle sur /api/cron/relance remplit la table.
    const { client, inserts } = faussebase(true)
    await noterRefus(client as never, "cron/relance", "appel sans secret")
    expect(inserts).toHaveLength(0)
  })

  it("ne casse rien si la table n'existe pas", async () => {
    const casse = { from: () => { throw new Error('relation "cron_runs" does not exist') } }
    await expect(noterRefus(casse as never, "emails/weekly", "x")).resolves.toBeUndefined()
  })
})

describe("le détail du journal ne garde aucune adresse", () => {
  it("remplace l'adresse et garde le message", () => {
    expect(sansAdresses("client@resto.fr: rate_limit_exceeded"))
      .toBe("un destinataire: rate_limit_exceeded")
    expect(sansAdresses("a@b.fr · c.d+tag@sous.domaine.co.uk: 403"))
      .toBe("un destinataire · un destinataire: 403")
  })

  it("laisse intact un message sans adresse", () => {
    expect(sansAdresses("2 envoyé(s)")).toBe("2 envoyé(s)")
  })
})
