import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Mesuré dans l'éditeur le 4 septembre : quatre chemins mènent à la suppression
// d'un bloc — le panneau de réglages, la feuille « ⋯ » du bloc, la barre d'actions
// mobile, et la touche Suppr. Un seul ouvrait une fenêtre de confirmation. La même
// action se comportait donc de deux façons selon l'endroit d'où on la déclenchait,
// et rien n'annonçait qu'elle était réversible.
// Règle unique retenue : on ne demande rien, on supprime, et on propose « Annuler »
// dans une notification — y compris pour une sélection multiple.

const ICI = __dirname
const lire = (f: string) => readFileSync(join(ICI, f), "utf8")

const v4 = lire("BuilderV4.tsx")

/** Le corps d'une fonction de l'éditeur, lue jusqu'à sa parenthèse fermante. */
function corps(nom: string): string {
  const i = v4.indexOf(`function ${nom}(`)
  expect(i).toBeGreaterThan(-1)
  const debut = v4.indexOf("{", i)
  let n = 0
  for (let k = debut; k < v4.length; k++) {
    if (v4[k] === "{") n++
    else if (v4[k] === "}" && --n === 0) return v4.slice(debut, k + 1)
  }
  throw new Error(`fonction ${nom} non refermée`)
}

describe("une seule fonction retire les blocs", () => {
  it("deleteBlock et deleteMulti passent tous deux par retirerBlocs", () => {
    expect(corps("deleteBlock")).toContain("retirerBlocs([id]")
    expect(corps("deleteMulti")).toContain("retirerBlocs(ids")
  })

  it("elle refuse les blocs verrouillés, sans bloquer les autres", () => {
    const c = corps("retirerBlocs")
    expect(c).toContain("ids.filter(id => !blocks.find(b => b.id === id)?.locked)")
    expect(c).toContain("if (supprimables.length === 0) return")
  })

  it("elle nettoie la sélection : un bloc supprimé ne reste pas sélectionné", () => {
    const c = corps("retirerBlocs")
    expect(c).toContain("setSelectedId(null)")
    expect(c).toContain("setMultiSelection(prev => prev.filter(id => !supprimables.includes(id)))")
  })
})

describe("la marche arrière est offerte, pas seulement possible", () => {
  const c = corps("retirerBlocs")

  it("une notification avec un bouton « Annuler »", () => {
    expect(c).toContain("toast.info(message")
    expect(c).toContain('label: "Annuler"')
  })

  it("« Annuler » remet chaque bloc à sa place, pas à la fin", () => {
    // On mémorise l'index d'origine AVANT de filtrer, et on réinsère dessus.
    expect(c).toContain(".map((b, i) => ({ b, i }))")
    expect(c).toContain("next.splice(Math.min(i, next.length), 0, b)")
  })

  it("le message dit ce qui a disparu", () => {
    expect(corps("deleteBlock")).toContain('"Bloc supprimé."')
    expect(corps("deleteMulti")).toContain("bloc${n > 1")
  })
})

describe("plus aucun chemin ne demande confirmation pour supprimer un bloc", () => {
  it("le panneau de réglages appelle directement onDelete", () => {
    const panneau = lire("BlockSettingsPanel.tsx")
    expect(panneau).toContain("delete: props.onDelete,")
    expect(panneau).not.toContain("Supprimer ce bloc ?")
  })

  it("la barre de sélection multiple non plus", () => {
    expect(v4).not.toContain('title: "Supprimer les blocs ?"')
    expect(v4).toContain("onClick={() => deleteMulti()}")
  })

  it("la confirmation reste là où elle a du sens : appliquer un modèle remplace tout", () => {
    expect(v4).toContain('title: "Appliquer ce modèle ?"')
  })
})
