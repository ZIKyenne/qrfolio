import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Téléphone, éditeur classique : la page et le panneau de réglages vivent sur deux
// onglets. Taper un bloc le sélectionnait… sur l'onglet Page, et l'onglet Réglages
// affichait « Clique sur un bloc dans le canvas » — un canvas qu'on ne voit pas.

const src = readFileSync(join(__dirname, "BuilderV4.tsx"), "utf8")

describe("taper un bloc sur téléphone", () => {
  it("ouvre l'onglet Réglages", () => {
    const i = src.indexOf("// Clic simple")
    expect(i).toBeGreaterThan(-1)
    const clic = src.slice(i, src.indexOf("}", src.indexOf("setRightTab(\"edit\")", i) + 200))
    expect(clic).toContain("setSelectedId(blockId)")
    expect(clic).toContain('if (isMobile) setMobileTab("panel")')
  })

  it("l'état vide propose de revenir à la page au lieu de parler d'un canvas invisible", () => {
    expect(src).not.toContain("Clique sur un bloc dans le canvas")
    expect(src).toContain("Touchez un bloc de la page pour le modifier")
    const i = src.indexOf("Touchez un bloc de la page")
    expect(src.slice(i, i + 400)).toContain('onClick={() => setMobileTab("canvas")}')
    expect(src.slice(i, i + 400)).toContain("Voir la page")
  })
})
