import { describe, it, expect } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

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
    })
  }

  it("aucune tâche n'est planifiée deux fois sur le même horaire et le même chemin", () => {
    const vus = crons.map(c => `${c.path} @ ${c.schedule}`)
    expect(new Set(vus).size).toBe(vus.length)
  })

  it("une seule tâche envoie le rapport hebdomadaire", () => {
    // Il en existait deux versions ; en planifier deux aurait doublé l'email.
    const hebdo = crons.filter(c => /weekly|hebdo/.test(c.path))
    expect(hebdo.map(c => c.path)).toEqual(["/api/emails/weekly"])
  })
})
