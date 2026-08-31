import { describe, it, expect } from "vitest"
import { estDuPourEnvoi, ESPACEMENT_JOURS, TOLERANCE_JOURS } from "./abonnementsRapport"

const jours = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)
const LUNDI = new Date("2026-09-07T08:50:00Z")

describe("qui reçoit son rapport aujourd'hui", () => {
  it("un abonné qui n'a jamais rien reçu le reçoit", () => {
    expect(estDuPourEnvoi("weekly", null, LUNDI)).toBe(true)
    expect(estDuPourEnvoi("monthly", undefined, LUNDI)).toBe(true)
  })

  it("le rendez-vous hebdomadaire ne glisse pas d'un jour par semaine", () => {
    // Envoyé lundi 8h50, la tâche repasse le lundi suivant à 8h00 : 6,96 jours.
    // Avec un seuil strict à 7, il partait le mardi, puis le mercredi…
    const lundiSuivant = new Date("2026-09-14T08:00:00Z")
    expect((lundiSuivant.getTime() - LUNDI.getTime()) / 86_400_000).toBeLessThan(7)
    expect(estDuPourEnvoi("weekly", LUNDI.toISOString(), lundiSuivant)).toBe(true)
  })

  it("mais ne renvoie pas deux fois dans la même semaine", () => {
    expect(estDuPourEnvoi("weekly", LUNDI.toISOString(), jours(LUNDI, 1))).toBe(false)
    expect(estDuPourEnvoi("weekly", LUNDI.toISOString(), jours(LUNDI, 6))).toBe(false)
    expect(estDuPourEnvoi("weekly", LUNDI.toISOString(), jours(LUNDI, 6.4))).toBe(false)
  })

  it("le mensuel attend son mois", () => {
    expect(estDuPourEnvoi("monthly", LUNDI.toISOString(), jours(LUNDI, 20))).toBe(false)
    expect(estDuPourEnvoi("monthly", LUNDI.toISOString(), jours(LUNDI, 29.6))).toBe(true)
  })

  it("une fréquence inconnue est traitée comme la plus espacée, jamais comme un envoi quotidien", () => {
    expect(estDuPourEnvoi("quotidien", LUNDI.toISOString(), jours(LUNDI, 2))).toBe(false)
  })

  it("une date illisible n'enferme pas l'abonné dans le silence", () => {
    expect(estDuPourEnvoi("weekly", "pas une date", LUNDI)).toBe(true)
  })

  it("la tolérance reste inférieure à l'espacement le plus court", () => {
    expect(TOLERANCE_JOURS).toBeLessThan(ESPACEMENT_JOURS.weekly)
  })
})
