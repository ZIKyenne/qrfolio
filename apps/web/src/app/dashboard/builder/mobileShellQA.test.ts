import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { resolveBuilderRedesignEnabled, REDESIGN_STORAGE_KEY } from "./builderFlags"

const read = (p: string) => readFileSync(join(__dirname, p), "utf8")

// La coquille mobile du Builder (cinq composants, ses propres tests) était écrite,
// testée… et injoignable. Personne n'avait pu la voir tourner dans un navigateur :
// le drapeau qui la commande ne pouvait pas s'allumer.

describe("le drapeau peut réellement s'allumer", () => {
  const flags = read("builderFlags.ts")

  it("la variable d'environnement est lue en toutes lettres", () => {
    // Next remplace `process.env.NEXT_PUBLIC_X` par sa valeur AU BUILD, et seulement
    // quand la clé est littérale. L'ancienne version lisait `process.env[nom]` avec
    // une clé calculée : rien à remplacer, donc `undefined` dans le navigateur.
    // La variable pouvait être posée sur Vercel sans le moindre effet.
    expect(flags).toContain("process.env.NEXT_PUBLIC_BUILDER_REDESIGN")
    // On regarde le CODE, pas les commentaires (qui racontent justement l'ancienne version).
    const code = flags.split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n")
    expect(code, "une clé calculée n'est jamais remplacée au build").not.toContain("process.env[")
  })

  it("l'éditeur écoute le drapeau vivant, pas une constante figée", () => {
    // Sans cela, l'activation par navigateur (localStorage) ne pourrait pas non plus
    // atteindre la coquille.
    expect(read("BuilderV4.tsx")).toContain("const BUILDER_REDESIGN = useBuilderRedesign()")
  })

  it("la production reste éteinte par défaut", () => {
    const off = { envEnabled: false, isProduction: true, localOverride: null, queryOverride: null }
    expect(resolveBuilderRedesignEnabled(off)).toBe(false)
    // …et le paramètre d'adresse ne peut pas l'allumer en production.
    expect(resolveBuilderRedesignEnabled({ ...off, queryOverride: "1" })).toBe(false)
  })

  it("un navigateur peut l'allumer pour lui seul, même en production", () => {
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, isProduction: true, localOverride: "1", queryOverride: null })).toBe(true)
    // Et le couper, même si l'environnement l'active partout.
    expect(resolveBuilderRedesignEnabled({ envEnabled: true, isProduction: true, localOverride: "0", queryOverride: null })).toBe(false)
    expect(REDESIGN_STORAGE_KEY).toBe("qrowg_builder_redesign")
  })
})

describe("ce que la première vraie session dans un navigateur a montré", () => {
  it("la bibliothèque n'affiche plus un second en-tête dans la bottom sheet", () => {
    // Deux fois « Ajouter un bloc », deux croix, l'une sous l'autre : la sheet porte
    // déjà titre et fermeture.
    const lib = read("BlockLibrary.tsx")
    expect(lib).toContain("hideHeader?: boolean")
    expect(lib).toContain("{!props.hideHeader && (")
    expect(read("MobileBuilderShell.tsx")).toContain('recoContext="default" mobile hideHeader')
  })

  it("le panneau Modifier sans sélection propose une issue, pas une consigne impossible", () => {
    // L'ancien éditeur mobile disait « Clique sur un bloc dans le canvas » depuis un
    // écran où le canvas n'était pas visible.
    const panel = read("BlockSettingsPanel.tsx")
    expect(panel).toMatch(/Sélectionnez un bloc pour le modifier/)
    expect(panel).toMatch(/Ajouter un bloc/)
  })
})
