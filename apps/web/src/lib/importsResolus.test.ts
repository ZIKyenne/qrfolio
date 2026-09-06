import { describe, it, expect } from "vitest"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

// Le 6 septembre, un déploiement a échoué sur « Module not found: Can't resolve
// '@/lib/seoMeta' » — quatorze erreurs de ce type d'un coup. La cause était une
// livraison partielle, mais le symptôme est celui que produit aussi un fichier
// déplacé ou renommé : un import qui ne mène nulle part.
// `tsc --noEmit` ne le voit pas toujours (paths résolus), et Next ne le dit qu'au
// build. Ce test le dit en une seconde, ici.

const SRC = join(__dirname, "..")
const EXT = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", "/index.ts", "/index.tsx", "/index.js"]

function sources(): string[] {
  const out: string[] = []
  const marcher = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) marcher(p)
      // Les fichiers de tests ne sont pas compilés par le build, et ils citent
      // des chemins dans des chaînes : ils n'entrent pas dans cette règle.
      else if (/\.tsx?$/.test(n) && !/\.test\./.test(n)) out.push(p)
    }
  }
  marcher(SRC)
  return out
}

/** Les chemins importés depuis le projet lui-même : « @/… » et les chemins relatifs. */
function importsLocaux(src: string): string[] {
  const out: string[] = []
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*["'](@\/[^"']+|\.\.?\/[^"']+)["']/g)) {
    if (m[1].includes("${")) continue          // chemin construit à l'exécution
    out.push(m[1])
  }
  return out
}

function resout(fichier: string, spec: string): boolean {
  const base = spec.startsWith("@/") ? join(SRC, spec.slice(2)) : resolve(dirname(fichier), spec)
  return EXT.some(e => existsSync(base + e) && statSync(base + e).isFile())
}

describe("tous les imports internes mènent quelque part", () => {
  const fichiers = sources()

  it("le balayage voit bien le projet (sinon la règle ne garde rien)", () => {
    expect(fichiers.length).toBeGreaterThan(250)
  })

  it("aucun « Module not found » ne dort dans le dépôt", () => {
    const casses: string[] = []
    for (const f of fichiers) {
      for (const spec of importsLocaux(readFileSync(f, "utf8"))) {
        if (!resout(f, spec)) casses.push(`${f.replace(SRC, "")}  ->  ${spec}`)
      }
    }
    expect(casses).toEqual([])
  })
})
