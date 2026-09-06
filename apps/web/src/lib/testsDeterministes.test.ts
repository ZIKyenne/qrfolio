import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// La roadmap signalait « un test instable non identifié ». Après huit passages
// complets — dont cinq en ordre aléatoire — aucun échec : le coupable était
// probablement parmi les tests réécrits pendant les lots P1 et P2.
// Ce qui reste, c'est la cause qui produit ce genre de panne : l'ordre dans lequel
// le système de fichiers rend un dossier n'est garanti nulle part. Il diffère entre
// une machine Windows, un Mac et le conteneur d'intégration continue, et un test qui
// en dépend échoue « au hasard », ailleurs, plus tard. Vingt-six fichiers de tests
// parcourent des dossiers : ils trient tous, maintenant, et ce test le maintient.

const SRC = join(__dirname, "..")

function fichiersDeTest(): string[] {
  const out: string[] = []
  const marcher = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) marcher(p)
      else if (/\.test\.tsx?$/.test(n)) out.push(p)
    }
  }
  marcher(SRC)
  return out
}

describe("aucun test ne dépend de l'ordre du système de fichiers", () => {
  it("chaque lecture de dossier est triée", () => {
    const fautifs: string[] = []
    for (const f of fichiersDeTest()) {
      for (const [i, l] of readFileSync(f, "utf8").split("\n").entries()) {
        if (!/readdirSync\(/.test(l)) continue
        if (/^\s*(\/\/|\*)/.test(l)) continue          // un commentaire qui en parle
        if (/^\s*import\b/.test(l)) continue           // la ligne d'import
        if (/\.sort\(/.test(l)) continue               // trié : conforme
        if (/toContain\(|toHaveLength\(|\.length\b/.test(l)) continue  // usage sans ordre
        fautifs.push(`${f.replace(SRC, "")}:${i + 1}`)
      }
    }
    expect(fautifs).toEqual([])
  })

  it("le balayage trouve bien les fichiers de tests (sinon la règle ne garde rien)", () => {
    expect(fichiersDeTest().length).toBeGreaterThan(150)
  })
})

// ── P2-20 : « Cinq fichiers de plus de 3 000 lignes cachent les bugs P0 » ──────
// Un fichier de cette taille ne se relit pas. C'est là qu'on trouve deux moteurs de
// scannabilité qui se contredisent, une règle de plan écrite deux fois, et un
// commentaire faux sur les rangs de plans — tous relevés en le découpant.
// Le plafond ci-dessous n'est pas une opinion de style : c'est un cliquet, pour que
// les fichiers déjà redescendus ne remontent pas.
describe("les fichiers déjà découpés ne regonflent pas", () => {
  const PLAFOND: Record<string, number> = {
    "app/dashboard/qr-codes/QRStudio.tsx": 3000,
    "app/dashboard/profile/page.tsx": 3000,
    "app/dashboard/builder/BuilderV4.tsx": 3050,
    "app/[slug]/renduLegacy.tsx": 2400,
    "app/HomeClient.tsx": 1500,
  }
  for (const [f, max] of Object.entries(PLAFOND)) {
    it(`${f} tient sous ${max} lignes`, () => {
      const n = readFileSync(join(SRC, f), "utf8").split("\n").length
      expect(n).toBeLessThanOrEqual(max)
    })
  }
})
