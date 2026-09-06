import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// La roadmap affirmait que le glisser-déposer de l'atelier d'impression n'avait
// jamais été construit pour le téléphone. Relecture faite : il l'est — tout passe
// par des PointerEvents, qui couvrent la souris ET le doigt.
//
// Ce qui manque à un glissement tactile, quand il échoue, c'est presque toujours
// `touch-action`. Sans lui, le navigateur interprète le premier mouvement du doigt
// comme un défilement, émet un `pointercancel`, et le glissement meurt à la
// première tentative — alors qu'à la souris tout fonctionne. C'est invisible en
// développement sur PC. Ce test garde la règle : toute surface qui écoute
// `onPointerDown` pour déplacer quelque chose déclare son `touch-action`.

const SRC = join(__dirname, "..")

function sources(): string[] {
  const out: string[] = []
  const marcher = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) marcher(p)
      else if (/\.tsx$/.test(n) && !/\.test\./.test(n)) out.push(p)
    }
  }
  marcher(join(SRC, "app")); marcher(join(SRC, "components"))
  return out
}

/** Les lignes qui ouvrent un glissement, hors celles qui annulent juste l'événement. */
function surfacesDeGlissement(src: string): number[] {
  const out: number[] = []
  for (const [i, l] of src.split("\n").entries()) {
    if (!/onPointerDown[={]/.test(l)) continue
    if (/e\.preventDefault\(\)\s*\}/.test(l)) continue      // garder le focus, pas glisser
    if (/e\.stopPropagation\(\)\s*\}/.test(l)) continue      // isoler un clic, pas glisser
    if (/^\s*const onPointerDown\b/.test(l)) continue        // la définition du gestionnaire
    out.push(i + 1)
  }
  return out
}

describe("tout ce qui se glisse à la souris se glisse au doigt", () => {
  const fichiers = sources()

  it("le balayage trouve des surfaces (sinon la règle ne garde rien)", () => {
    const total = fichiers.reduce((n, f) => n + surfacesDeGlissement(readFileSync(f, "utf8")).length, 0)
    expect(total).toBeGreaterThanOrEqual(6)
  })

  it("chacune déclare touch-action, sur elle-même ou dans son style", () => {
    const fautifs: string[] = []
    for (const f of fichiers) {
      const src = readFileSync(f, "utf8")
      const lignes = src.split("\n")
      for (const n of surfacesDeGlissement(src)) {
        // Le style peut précéder ou suivre l'écouteur : on lit l'élément entier.
        const fenetre = lignes.slice(Math.max(0, n - 4), n + 6).join("\n")
        if (!/touchAction\s*:/.test(fenetre)) fautifs.push(`${f.replace(SRC, "")}:${n}`)
      }
    }
    expect(fautifs).toEqual([])
  })

  it("l'atelier d'impression : les éléments libres et leurs poignées", () => {
    const src = readFileSync(join(SRC, "app/dashboard/print-studio/PrintStudioClient.tsx"), "utf8")
    // L'élément lui-même (texte, icône, forme) — il ne dépendait que de son parent.
    expect(src).toContain('cursor: "move", userSelect: "none", touchAction: "none"')
    // Le QR déplaçable, la poignée de redimensionnement, et le support qui les porte.
    expect((src.match(/touchAction: "none"/g) || []).length).toBeGreaterThanOrEqual(4)
  })

  it("le carrousel public défile verticalement mais se balaie horizontalement", () => {
    // `pan-y` et non `none` : le doigt doit encore pouvoir faire défiler la page.
    const src = ["app/[slug]/PublicPageClient.tsx", "app/[slug]/renduLegacy.tsx", "app/[slug]/blocsPublics.tsx"].map(f => readFileSync(join(SRC, f), "utf8")).join("\n")
    expect(src).toContain('touchAction: "pan-y"')
    expect(src).not.toContain('touchAction: "none"')
  })
})
