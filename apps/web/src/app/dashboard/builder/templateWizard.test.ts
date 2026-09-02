import { describe, it, expect } from "vitest"
import { PAGE_TEMPLATES } from "./page-templates"
import {
  buildWizard, applyAnswers, reviewBlocks, finalizeBlocks, isStyleKey,
  repeaterToText, textToRepeater,
} from "./templateWizard"

// Le questionnaire est DÉRIVÉ des blocs : ces tests vérifient qu'il reste cohérent
// pour les 34 modèles, sans qu'on ait à maintenir une liste de questions à la main.

describe("questionnaire dérivé des blocs", () => {
  it("chaque modèle produit des questions", () => {
    for (const t of PAGE_TEMPLATES) {
      const { steps } = buildWizard(t.blocks)
      expect(steps.length, `${t.key} : aucune question`).toBeGreaterThan(3)
    }
  })

  it("le nom de l'établissement est toujours demandé en premier", () => {
    for (const t of PAGE_TEMPLATES) {
      const { steps } = buildWizard(t.blocks)
      if (!steps.some(s => s.id === "businessName")) continue
      expect(steps[0].id, `${t.key}`).toBe("businessName")
    }
  })

  it("aucune question ne porte sur un réglage de style", () => {
    const bad: string[] = []
    for (const t of PAGE_TEMPLATES) {
      for (const s of buildWizard(t.blocks).steps) {
        if (s.kind === "group") continue                 // carte multi-champs, pas une clé de bloc
        const m = s.id.match(/^b(\d+)\.(.+)$/)
        const key = m ? m[2] : s.id
        const type = m ? t.blocks[Number(m[1])]?.type : undefined
        if (key !== "__list" && isStyleKey(key, type)) bad.push(`${t.key}:${s.id}`)
      }
    }
    expect(bad, `questions de style : ${bad.join(", ")}`).toEqual([])
  })

  it("les identifiants de question sont uniques dans un modèle", () => {
    for (const t of PAGE_TEMPLATES) {
      const ids = buildWizard(t.blocks).steps.map(s => s.id)
      expect(new Set(ids).size, `${t.key} : doublons`).toBe(ids.length)
    }
  })

  it("chaque question pointe vers au moins un bloc existant", () => {
    for (const t of PAGE_TEMPLATES) {
      for (const s of buildWizard(t.blocks).steps) {
        expect(s.blockIndexes.length).toBeGreaterThan(0)
        for (const i of s.blockIndexes) expect(t.blocks[i]).toBeTruthy()
      }
    }
  })

  it("les valeurs du modèle préremplissent les champs", () => {
    const resto = PAGE_TEMPLATES.find(t => t.key === "studio_gastro")!
    const { initial } = buildWizard(resto.blocks)
    expect(initial.businessName).toBe("La Table d'Auguste")
    expect(initial.address).toContain("Reims")
  })
})

describe("listes : aller-retour texte", () => {
  it("un répétitif se relit à l'identique après édition", () => {
    const spec = { label: "x", format: "a ; b", max: 4, keys: (i: number) => [`r${i}_label`, `r${i}_value`] }
    const content = { r1_label: "Durée", r1_value: "45 min", r2_label: "Tarif", r2_value: "60 €" }
    const text = repeaterToText(content, spec as any)
    expect(text).toBe("Durée ; 45 min\nTarif ; 60 €")
    const back = textToRepeater(text, spec as any)
    expect(back.r1_label).toBe("Durée")
    expect(back.r2_value).toBe("60 €")
    expect(back.r3_label).toBe("")
  })
})

describe("application des réponses", () => {
  const resto = PAGE_TEMPLATES.find(t => t.key === "studio_gastro")!

  it("le nom saisi remplace celui du modèle PARTOUT", () => {
    const out = applyAnswers(resto.blocks, { businessName: "Chez Mireille" })
    expect(out[0].content.title).toBe("Chez Mireille")   // la bannière d'ouverture
    expect(out.find(b => b.type === "google_maps_embed")?.content.label).toBe("Chez Mireille")
    expect(JSON.stringify(out).includes("La Table d'Auguste")).toBe(false)
  })

  it("une réponse vide efface le champ (aucune donnée de démonstration publiée)", () => {
    const out = applyAnswers(resto.blocks, { address: "" })
    expect(out.find(b => b.type === "google_maps_embed")?.content.address).toBe("")
  })

  it("une question jamais atteinte laisse le modèle intact", () => {
    const out = applyAnswers(resto.blocks, {})
    expect(out[0].content.title).toBe("La Table d'Auguste")
  })

  it("ne modifie pas les blocs d'origine", () => {
    const before = JSON.stringify(resto.blocks)
    applyAnswers(resto.blocks, { businessName: "X" })
    expect(JSON.stringify(resto.blocks)).toBe(before)
  })
})

describe("revue des blocs", () => {
  const resto = PAGE_TEMPLATES.find(t => t.key === "studio_gastro")!

  it("distingue rempli, exemple et décoratif", () => {
    const { steps } = buildWizard(resto.blocks)
    const answers = { businessName: "Chez Mireille" }
    const applied = applyAnswers(resto.blocks, answers)
    const review = reviewBlocks(resto.blocks, applied, steps, answers)
    expect(review.length).toBe(resto.blocks.length)
    expect(review.some(r => r.state === "filled")).toBe(true)
    expect(review.some(r => r.state === "example")).toBe(true)
    expect(review.some(r => r.state === "decorative")).toBe(true)
  })

  it("propose de retirer ce qui n'est resté que de l'exemple", () => {
    const { steps } = buildWizard(resto.blocks)
    const review = reviewBlocks(resto.blocks, resto.blocks, steps, {})
    for (const r of review.filter(x => x.state === "example")) expect(r.suggested).toBe("remove")
  })
})

describe("décisions finales", () => {
  it("masquer garde le bloc mais invisible ; retirer le supprime", () => {
    const blocks = [{ type: "profile", content: { name: "A" } }, { type: "bio", content: { text: "B" } }, { type: "divider", content: {} }]
    const out = finalizeBlocks(blocks, { 1: "hide", 2: "remove" })
    expect(out.length).toBe(2)
    expect(out[0].visible).toBe(true)
    expect(out[1].visible).toBe(false)
    expect(out.some(b => b.type === "divider")).toBe(false)
  })
})

import { blocsDeLEtape } from "./templateWizard"

describe("blocsDeLEtape — l'aperçu ciblé du téléphone", () => {
  const liste = [{ srcIndex: 0, t: "a" }, { srcIndex: 2, t: "c" }, { srcIndex: 3, t: "d" }]

  it("ne garde que les blocs que l'étape modifie", () => {
    expect(blocsDeLEtape(liste, [2]).map(b => b.t)).toEqual(["c"])
    expect(blocsDeLEtape(liste, [0, 3]).map(b => b.t)).toEqual(["a", "d"])
  })

  it("suit l'index D'ORIGINE, pas la position dans la liste d'aperçu", () => {
    // Le bloc 1 a été retiré : la liste d'aperçu est [0, 2, 3]. Chercher « 2 »
    // par position renverrait « d ». C'est exactement le décalage qui faisait
    // surligner le mauvais bloc côté ordinateur.
    expect(blocsDeLEtape(liste, [2]).map(b => b.t)).toEqual(["c"])
    expect(blocsDeLEtape(liste, [1])).toEqual([])   // bloc retiré : plus rien à montrer
  })

  it("garde l'ordre de la page, quel que soit l'ordre des index", () => {
    expect(blocsDeLEtape(liste, [3, 0]).map(b => b.t)).toEqual(["a", "d"])
  })

  it("aucune étape, aucun index : liste vide, jamais d'erreur", () => {
    expect(blocsDeLEtape(liste, undefined)).toEqual([])
    expect(blocsDeLEtape(liste, [])).toEqual([])
    expect(blocsDeLEtape([], [1])).toEqual([])
  })
})

describe("l'assistant montre quelque chose sur téléphone", () => {
  it("un aperçu ciblé existe, et le surlignage suit l'index d'origine", async () => {
    const { readFileSync } = await import("node:fs")
    const { join, dirname } = await import("node:path")
    const { fileURLToPath } = await import("node:url")
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../templates/TemplateWizardModal.tsx"), "utf-8")
    // Avant : `{!isMobile && (` autour du seul aperçu — zéro aperçu au téléphone,
    // seize questions à l'aveugle.
    expect(src).toContain('isMobile && phase === "questions"')
    expect(src).toContain("blocsDeLEtape(previewBlocks, step?.blockIndexes)")
    expect(src).toContain("Ce que cette question modifie")
    expect(src).toContain("Voir toute la page")
    // Le décalage d'index : plus jamais de `includes(i)` sur la position filtrée.
    expect(src).toContain("step?.blockIndexes.includes(b.srcIndex)")
    expect(src).not.toMatch(/blockIndexes\.includes\(i\)/)
  })
})
