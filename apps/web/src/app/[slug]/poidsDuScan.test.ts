import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")

// Ce qu'un client télécharge en scannant un QR, devant une vitrine, sur son forfait.
//
// Mesuré en conditions réelles (4G lente, processeur divisé par quatre) : la page
// tirait 1 205 Ko de JavaScript décompressé, dont 292 Ko — un quart — de métadonnées
// d'ÉDITEUR : libellés de champs, aides à la saisie, suggestions, contenus par défaut.
// Rien de tout cela ne sert à afficher une page. La cause tenait en une ligne : la
// page publique importe une quarantaine de fonctions d'affichage depuis types.ts, et
// le catalogue des blocs vivait dans le même fichier — il partait avec elles.
//
// Après séparation : 914 Ko, et 444 ms de moins avant que la page soit entièrement
// chargée. Ces tests empêchent le lien de revenir par mégarde.

describe("le catalogue de l'éditeur ne part plus chez le client", () => {
  it("types.ts ne contient plus le catalogue", () => {
    const types = lire("../dashboard/builder/types.ts")
    expect(types).not.toContain("export const BLOCK_DEFS")
  })

  it("et ne le réexporte pas non plus — le lien reviendrait aussitôt", () => {
    const types = lire("../dashboard/builder/types.ts")
    expect(types).not.toMatch(/export .*from ["']\.\/blockDefs["']/)
    expect(types).not.toContain('from "./blockDefs"')
  })

  it("la page publique ne l'importe nulle part", () => {
    for (const f of ["PublicPageClient.tsx", "page.tsx"]) {
      const src = lire(f)
      expect(src, `${f} importe le catalogue de l'éditeur`).not.toContain("blockDefs")
      expect(src, `${f} importe BLOCK_DEFS`).not.toContain("BLOCK_DEFS")
    }
  })

  it("le rendu partagé public reste propre lui aussi", () => {
    const reg = lire("../dashboard/builder/shared-renderer/publicRegistry.tsx")
    expect(reg).not.toContain("BLOCK_DEFS")
    expect(reg).not.toContain("blockDefs")
  })

  it("le catalogue, lui, reste complet", () => {
    const defs = lire("../dashboard/builder/blockDefs.ts")
    expect(defs).toContain("export const BLOCK_DEFS")
    // 178 types de blocs : on vérifie l'ordre de grandeur, pas un compte exact.
    expect((defs.match(/\n  [a-z_0-9]+: \{\n    label:/g) || []).length).toBeGreaterThan(150)
  })
})
