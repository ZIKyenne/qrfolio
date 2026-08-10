import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { BLOCK_DEFS } from "../dashboard/builder/types"
import { SHARED_RENDERER_BLOCKS } from "../dashboard/builder/shared-renderer/architecture"

// GARDE ANTI-DERIVE DES RENDERERS
// -----------------------------------------------------------------------------
// Bug historique recurrent (cf memoire renderer-public-drift) : un bloc ajoute au
// builder mais sans `case` dans le renderer public devient INVISIBLE une fois la
// page publiee. Ce test lit le source de PublicPageClient.tsx et verifie que
// CHAQUE type de BLOCK_DEFS possede un `case "<type>"`. Si tu ajoutes un bloc,
// ce test echoue tant que son rendu public n'existe pas.
// Un bloc est couvert s'il a un `case` inline OU s'il est servi par le shared-renderer
// (SHARED_RENDERER_BLOCKS → adapters public+editeur garantis par registry.test).

const casesOf = (relUrl: string) => {
  const src = readFileSync(fileURLToPath(new URL(relUrl, import.meta.url)), "utf8")
  return new Set([...src.matchAll(/case\s+"([a-z0-9_]+)"/g)].map(m => m[1]))
}

// Labels `case "xxx"` des deux renderers.
// Le rendu de bloc du builder vit dans builderPreview.tsx (BlockPreview, extrait
// de BuilderV4). On lit les deux fichiers en union pour rester robuste à un futur
// re-découpage.
const publicCases = casesOf("./PublicPageClient.tsx")
const builderCases = new Set([
  ...casesOf("../dashboard/builder/builderPreview.tsx"),
  ...casesOf("../dashboard/builder/BuilderV4.tsx"),
])

const blockTypes = Object.keys(BLOCK_DEFS)

describe("parite des renderers (builder <-> page publique)", () => {
  it("BLOCK_DEFS n'est pas vide et le source public a bien ete lu", () => {
    expect(blockTypes.length).toBeGreaterThan(50)
    expect(publicCases.size).toBeGreaterThan(50)
  })

  it("chaque type de bloc a un rendu public (case inline ou shared-renderer)", () => {
    const missing = blockTypes.filter(t => !publicCases.has(t) && !SHARED_RENDERER_BLOCKS.has(t))
    expect(missing, `Blocs sans rendu public (invisibles une fois publies) : ${missing.join(", ")}`).toEqual([])
  })

  it("chaque type de bloc a un rendu canvas builder (case inline ou shared-renderer)", () => {
    const missing = blockTypes.filter(t => !builderCases.has(t) && !SHARED_RENDERER_BLOCKS.has(t))
    expect(missing, `Blocs sans rendu canvas builder (placeholder generique dans l'editeur) : ${missing.join(", ")}`).toEqual([])
  })
})
