import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import { resolvePublicBlock } from "./publicRegistry"

// Garde-fou de poids. Les 87 vues publiques étaient importées en dur : elles
// partaient toutes sur chaque scan (162 Ko mesurés) même pour une carte de
// restaurant qui en utilise trois. Si quelqu'un remet un import statique ici,
// le poids revient sans que personne s'en aperçoive — d'où ce test.
const SRC = readFileSync(join(__dirname, "publicRegistry.tsx"), "utf8")

describe("le registre public ne charge que les blocs présents sur la page", () => {
  it("aucun bloc n'est importé en dur", () => {
    const statiques = SRC.split("\n").filter(l => /^import\s/.test(l) && l.includes('"./blocks/'))
    expect(statiques).toEqual([])
  })

  it("chaque bloc a son import à la demande", () => {
    const demande = SRC.match(/dynamic\(\(\) => import\("\.\/blocks\//g) ?? []
    expect(demande.length).toBeGreaterThanOrEqual(SHARED_RENDERER_BLOCKS.size)
  })

  it("le rendu serveur reste actif (pas de ssr: false, sinon page blanche au scan)", () => {
    expect(SRC).not.toMatch(/ssr\s*:\s*false/)
  })

  it("tous les blocs activés se résolvent encore", () => {
    for (const t of SHARED_RENDERER_BLOCKS) {
      expect(resolvePublicBlock(t)).not.toBeNull()
    }
  })
})
