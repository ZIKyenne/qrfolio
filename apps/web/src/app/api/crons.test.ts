import { describe, it, expect } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { TACHES, INTERVALLE_H } from "@/lib/journalCron"

// Une tâche planifiée est du code qu'on n'exécute jamais soi-même : quand elle est
// mal branchée, rien ne le dit. Le rapport hebdomadaire n'exportait que POST alors
// que Vercel Cron appelle en GET — il aurait répondu 405 chaque lundi en silence.
// Ce test relit vercel.json et vérifie que chaque tâche mène quelque part.

const RACINE = join(__dirname, "../../../../..")
const crons: { path: string; schedule: string }[] = JSON.parse(readFileSync(join(RACINE, "vercel.json"), "utf8")).crons

const fichierDe = (chemin: string) => join(__dirname, "..", chemin.split("?")[0], "route.ts")

describe("les tâches planifiées mènent quelque part", () => {
  it("il y en a bien à surveiller", () => {
    expect(crons.length).toBeGreaterThan(0)
  })

  for (const c of crons) {
    describe(c.path, () => {
      it("pointe une route qui existe", () => {
        expect(existsSync(fichierDe(c.path)), `${c.path} : aucune route à ce chemin`).toBe(true)
      })

      it("répond en GET, le seul verbe qu'un cron Vercel sache poser", () => {
        const src = readFileSync(fichierDe(c.path), "utf8")
        expect(/export\s+(async\s+function|const)\s+GET/.test(src), `${c.path} : pas de GET`).toBe(true)
      })

      it("passe par le garde commun, qui trace les refus", () => {
        // Les cinq routes recopiaient le même contrôle, avec trois messages
        // différents — et toutes refusaient AVANT d'écrire dans le journal : un
        // CRON_SECRET absent des variables d'environnement laissait exactement la
        // même trace qu'une tâche jamais déclenchée, c'est-à-dire aucune.
        const src = readFileSync(fichierDe(c.path), "utf8")
        expect(src, `${c.path} : n'utilise pas gardeCron`).toContain("gardeCron(req, TACHE")
        expect(src, `${c.path} : redéclare son propre contrôle de secret`).not.toContain("CRON_SECRET ===")
      })

      it("a un horaire lisible par cron", () => {
        expect(c.schedule.trim().split(/\s+/)).toHaveLength(5)
      })

      it("laisse une trace de son passage", () => {
        // Sans journal, personne ne pouvait dire si une tâche s'exécutait : elles
        // n'écrivent rien quand il n'y a rien à envoyer, et les journaux
        // d'exécution de l'hébergeur ne remontent qu'une heure ou deux.
        const src = readFileSync(fichierDe(c.path), "utf8")
        expect(src, `${c.path} : n'importe pas le journal`).toContain("noterPassage")
        expect(src, `${c.path} : pas de nom de tâche`).toMatch(/const TACHE = "[^"]+"/)
      })

      it("note aussi ses échecs", () => {
        // Une tâche qui plante est exactement le cas qu'on veut voir.
        const src = readFileSync(fichierDe(c.path), "utf8")
        const i = src.lastIndexOf("} catch")
        expect(src.slice(i), `${c.path} : le catch final ne note rien`).toContain('"erreur"')
      })
    })
  }

  it("aucune tâche n'est planifiée deux fois sur le même horaire et le même chemin", () => {
    const vus = crons.map(c => `${c.path} @ ${c.schedule}`)
    expect(new Set(vus).size).toBe(vus.length)
  })

  it("chaque tâche journalisée porte un nom connu du journal", () => {
    const noms = crons.map(c => (readFileSync(fichierDe(c.path), "utf8").match(/const TACHE = "([^"]+)"/) || [])[1])
    for (const n of noms) {
      expect(n, "nom de tâche absent").toBeTruthy()
      expect(TACHES as readonly string[], `${n} n'est pas déclaré dans lib/journalCron`).toContain(n)
      expect(INTERVALLE_H[n as string], `${n} n'a pas d'intervalle déclaré`).toBeGreaterThan(0)
    }
    expect(new Set(noms).size, "deux tâches portent le même nom").toBe(noms.length)
  })

  it("l'écran Réglages affiche l'état de ces tâches", () => {
    // C'est là que trois interrupteurs promettent un email.
    const reglages = readFileSync(join(__dirname, "../dashboard/settings/page.tsx"), "utf8")
    expect(reglages).toContain("Envois automatiques")
    expect(reglages).toContain("jugerPassage")
  })

  it("le journal ne renvoie jamais le détail des erreurs au client", () => {
    // Le champ `detail` cite les adresses email des destinataires.
    const etat = readFileSync(join(__dirname, "cron/etat/route.ts"), "utf8")
    expect(etat).toContain('select("tache, lance_le, statut")')
    expect(etat).not.toMatch(/select\([^)]*detail/)
  })


  it("le refus est tracé, et au plus une fois par heure", () => {
    // Ce chemin-là est atteignable par n'importe qui : sans étranglement, une
    // boucle sur une route de cron remplirait la table du journal.
    const garde = readFileSync(join(__dirname, "../../lib/gardeCron.ts"), "utf8")
    expect(garde).toContain("noterRefus")
    const journal = readFileSync(join(__dirname, "../../lib/journalCron.ts"), "utf8")
    expect(journal).toMatch(/eq\("statut", "refuse"\)/)
    expect(journal).toContain("3600_000")
  })

  it("le journal ne conserve aucune adresse email", () => {
    // `detail` citait « client@resto.fr: rate_limit_exceeded » : le journal
    // devenait un fichier d'adresses.
    for (const c of crons) {
      const src = readFileSync(fichierDe(c.path), "utf8")
      const lignes = src.split("\n").filter(l => l.includes('.join(" · ")'))
      expect(lignes.length, `${c.path} : plus aucune liste d'erreurs ?`).toBeGreaterThan(0)
      for (const l of lignes) {
        expect(l.includes("sansAdresses("), `${c.path} : ${l.trim()}`).toBe(true)
      }
    }
  })

  it("les abonnements hebdomadaires sont réellement envoyés", () => {
    // La tâche passait « ?frequency=monthly » et ne tournait que le 1er du mois :
    // l'abonnement hebdomadaire, proposé dans l'écran Analytics et réservé aux
    // plans payants, n'était envoyé à personne.
    const rapport = crons.find(c => c.path.startsWith("/api/reports/send"))
    expect(rapport, "la tâche des rapports n'est plus planifiée").toBeTruthy()
    expect(rapport!.path, "un filtre de fréquence exclut une partie des abonnés").not.toContain("frequency=")
    const src = readFileSync(fichierDe(rapport!.path), "utf8")
    expect(src, "c'est last_sent_at qui doit espacer les envois").toContain("last_sent_at")
  })

  it("une seule tâche envoie le rapport hebdomadaire", () => {
    // Il en existait deux versions ; en planifier deux aurait doublé l'email.
    const hebdo = crons.filter(c => /weekly|hebdo/.test(c.path))
    expect(hebdo.map(c => c.path)).toEqual(["/api/emails/weekly"])
  })
})
