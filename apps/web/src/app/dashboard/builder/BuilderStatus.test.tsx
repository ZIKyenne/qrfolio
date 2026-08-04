import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { BuilderStatus, type BuilderStatusProps } from "./BuilderStatus"

// Vérifie la STRUCTURE rendue de l'indicateur de statut unifié (sans navigateur).
// role="status" + aria-live="polite" (annonce lecteur d'écran), libellés selon l'état,
// bouton cliquable pour les états actionnables.

const H = (p: BuilderStatusProps) => renderToStaticMarkup(createElement(BuilderStatus, p))
const OFF: BuilderStatusProps = { saving: false, saved: false, saveError: false, hasUnsaved: false }

describe("BuilderStatus", () => {
  it("idle → pas de statut visible (aria-hidden, display none)", () => {
    const html = H(OFF)
    expect(html).toContain("aria-hidden")
    expect(html).not.toContain("Enregistré")
  })

  it("saved → texte Enregistré + role status/aria-live", () => {
    const html = H({ ...OFF, saved: true })
    expect(html).toContain("Enregistré")
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).not.toContain("<button") // informatif, pas de bouton
  })

  it("saving → texte Enregistrement…", () => {
    expect(H({ ...OFF, saving: true })).toContain("Enregistrement")
  })

  it("unsaved → bouton actionnable, libellé desktop long", () => {
    const html = H({ ...OFF, hasUnsaved: true })
    expect(html).toContain("<button")
    expect(html).toContain("non enregistrées")
  })

  it("unsaved en mobile → texte visible court, aria-label complet conservé", () => {
    const html = H({ ...OFF, hasUnsaved: true, mobile: true })
    // Le texte VISIBLE du bouton est court…
    expect(html).toContain(">Enregistrer</button>")
    // …mais l'aria-label reste explicite pour les lecteurs d'écran.
    expect(html).toContain('aria-label="Modifications non enregistrées · Enregistrer"')
  })

  it("error → bouton Réessayer + aria-label complet incluant le message", () => {
    const html = H({ ...OFF, saveError: true, saveErrorMsg: "Réseau" })
    expect(html).toContain("<button")
    expect(html).toContain("Réseau")
    expect(html.toLowerCase()).toContain("réessayer")
  })

  it("aucun littéral d'erreur brut #EF4444 (tokenisé via --danger)", () => {
    const html = H({ ...OFF, saveError: true })
    expect(html).not.toContain("#EF4444")
    expect(html).toContain("--danger")
  })
})
