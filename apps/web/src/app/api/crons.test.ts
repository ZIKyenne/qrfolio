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

      it("refuse un appel sans le secret", () => {
        const src = readFileSync(fichierDe(c.path), "utf8")
        expect(src).toContain("CRON_SECRET")
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

  it("une seule tâche envoie le rapport hebdomadaire", () => {
    // Il en existait deux versions ; en planifier deux aurait doublé l'email.
    const hebdo = crons.filter(c => /weekly|hebdo/.test(c.path))
    expect(hebdo.map(c => c.path)).toEqual(["/api/emails/weekly"])
  })
})
