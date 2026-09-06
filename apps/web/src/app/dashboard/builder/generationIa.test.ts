import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Sans ANTHROPIC_API_KEY, l'éditeur faisait rédiger une description, attendre,
// puis répondait « arrive très bientôt ». Et « réservé aux plans Pro » était un
// texte sans lien.

const src = readFileSync(join(__dirname, "BuilderV4.tsx"), "utf8")
const config = readFileSync(join(__dirname, "../../../../next.config.mjs"), "utf8")

describe("génération de page par IA", () => {
  it("le build dérive un booléen public de la clé serveur", () => {
    expect(config).toContain('NEXT_PUBLIC_GENERATION_IA: process.env.ANTHROPIC_API_KEY ? "1" : "0"')
  })

  it("l'éditeur ne monte le bloc que si la fonction existe", () => {
    expect(src).toContain('import { GENERATION_IA_ACTIVE } from "@/lib/generationIa"')
    expect(src).toContain("{GENERATION_IA_ACTIVE && <div style={{ padding: \"12px 20px\"")
  })

  it("un plan insuffisant mène aux offres au lieu d'un texte mort", () => {
    expect(src).toContain("setAiGenUpgrade(!!data?.upgrade)")
    expect(src).toContain('href="/upgrade?reason=ia"')
  })
})
