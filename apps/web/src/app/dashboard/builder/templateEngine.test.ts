import { describe, it, expect } from "vitest"
import {
  TEMPLATE_STYLES, TEMPLATE_STYLE_LIST, TEMPLATE_STRUCTURES, DEFAULT_LAYOUT, TEMPLATE_LAYOUTS,
  TEMPLATE_LAYOUT_LIST, composeTemplate, composeByKeys, structureFromTemplate, unknownBlockTypes,
  type TemplateLayout,
} from "./templateEngine"
import { PAGE_TEMPLATES, AMBIANCE_THEMES, AMBIANCE_KEYS } from "./page-templates"
import { EXTRA_STRUCTURES } from "./templateStructures.extra"
import { BLOCK_DEFS } from "./types"

describe("registres du moteur", () => {
  it("TEMPLATE_STYLES reflète les thèmes d'ambiance", () => {
    expect(Object.keys(TEMPLATE_STYLES).sort()).toEqual([...AMBIANCE_KEYS].sort())
    expect(TEMPLATE_STYLE_LIST.length).toBe(AMBIANCE_KEYS.length)
    for (const s of TEMPLATE_STYLE_LIST) {
      expect(s.key).toBeTruthy()
      expect(s.label).toBeTruthy()
      expect(s.theme).toBe(AMBIANCE_THEMES[s.key])
    }
  })
  it("TEMPLATE_STRUCTURES = templates existants + verticales ajoutées (sans thème)", () => {
    expect(TEMPLATE_STRUCTURES.length).toBeGreaterThanOrEqual(PAGE_TEMPLATES.length)
    for (const s of TEMPLATE_STRUCTURES) {
      expect(s).not.toHaveProperty("theme")
      expect(Array.isArray(s.blocks)).toBe(true)
      expect(s.blocks.length).toBeGreaterThan(0)
    }
  })
  it("clés de structure uniques (aucune collision)", () => {
    const keys = TEMPLATE_STRUCTURES.map(s => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe("intégrité des structures (types de blocs réels)", () => {
  it("aucune structure ne référence un type de bloc inconnu", () => {
    for (const s of TEMPLATE_STRUCTURES) {
      expect(unknownBlockTypes(s), `${s.key}: types inconnus`).toEqual([])
    }
  })
})

describe("composeTemplate — rétrocompatibilité (round-trip)", () => {
  it("reproduit blocs + thème de chaque template existant", () => {
    for (const t of PAGE_TEMPLATES) {
      const style = { key: "x", label: t.theme.name, theme: t.theme }
      const composed = composeTemplate(structureFromTemplate(t), style)
      expect(composed.blocks, `${t.key}: blocs`).toEqual(t.blocks)
      expect(composed.theme, `${t.key}: thème`).toBe(t.theme)
      expect(composed.group).toBe(t.group)
      expect(composed.label).toBe(t.label)
    }
  })
})

describe("composeTemplate — pureté & déterminisme", () => {
  it("ne mute pas la structure d'entrée (contenu cloné)", () => {
    const s = TEMPLATE_STRUCTURES[0]
    const before = JSON.stringify(s.blocks)
    const composed = composeTemplate(s, TEMPLATE_STYLE_LIST[0])
    composed.blocks[0].content.__mutated = "x"
    expect(JSON.stringify(s.blocks)).toBe(before) // original intact
  })
  it("déterministe (deux compositions identiques)", () => {
    const a = composeTemplate(TEMPLATE_STRUCTURES[0], TEMPLATE_STYLES.gold)
    const b = composeTemplate(TEMPLATE_STRUCTURES[0], TEMPLATE_STYLES.gold)
    expect(a).toEqual(b)
  })
})

describe("composeTemplate — combinaisons croisées (le cœur du moteur)", () => {
  it("une structure × un AUTRE style = thème appliqué, blocs conservés, tous types valides", () => {
    const resto = TEMPLATE_STRUCTURES.find(s => s.group === "Restauration")!
    const composed = composeTemplate(resto, TEMPLATE_STYLES.slate) // style volontairement différent
    expect(composed.theme).toBe(AMBIANCE_THEMES.slate)
    expect(composed.blocks.length).toBe(resto.blocks.length)
    expect(composed.blocks.every(b => !!BLOCK_DEFS[b.type])).toBe(true)
    expect(composed.styleKey).toBe("slate")
  })
  it("clé composée = structure__style, unique par combinaison", () => {
    const keys = new Set<string>()
    for (const s of TEMPLATE_STRUCTURES.slice(0, 5)) {
      for (const st of TEMPLATE_STYLE_LIST.slice(0, 5)) {
        keys.add(composeTemplate(s, st).key)
      }
    }
    expect(keys.size).toBe(25) // 5 structures × 5 styles = 25 clés distinctes
  })
})

describe("axe layout (T1 : identité + transform pur)", () => {
  it("DEFAULT_LAYOUT = identité", () => {
    const s = TEMPLATE_STRUCTURES[0]
    expect(composeTemplate(s, TEMPLATE_STYLE_LIST[0], DEFAULT_LAYOUT).blocks).toEqual(
      s.blocks.map(b => ({ type: b.type, content: { ...b.content } })),
    )
    expect(TEMPLATE_LAYOUTS.default).toBe(DEFAULT_LAYOUT)
  })
  it("un layout avec transformBlocks est appliqué + suffixe de clé", () => {
    const reverse: TemplateLayout = { key: "reverse", label: "Inversé", transformBlocks: bs => [...bs].reverse() }
    const s = TEMPLATE_STRUCTURES[0]
    const composed = composeTemplate(s, TEMPLATE_STYLES.gold, reverse)
    expect(composed.blocks[0].type).toBe(s.blocks[s.blocks.length - 1].type)
    expect(composed.key).toBe(`${s.key}__gold__reverse`)
  })
})

describe("layouts T2 (densité, clés universelles réelles)", () => {
  it("3 layouts : default, compact, airy", () => {
    expect(Object.keys(TEMPLATE_LAYOUTS).sort()).toEqual(["airy", "compact", "default"])
    expect(TEMPLATE_LAYOUT_LIST.length).toBe(3)
  })
  it("compact injecte __space=Compact sur tous les blocs", () => {
    const c = composeTemplate(TEMPLATE_STRUCTURES[0], TEMPLATE_STYLES.gold, TEMPLATE_LAYOUTS.compact)
    expect(c.blocks.every(b => b.content.__space === "Compact")).toBe(true)
    expect(c.layoutKey).toBe("compact")
  })
  it("airy injecte __space=Aéré", () => {
    const c = composeTemplate(TEMPLATE_STRUCTURES[0], TEMPLATE_STYLES.gold, TEMPLATE_LAYOUTS.airy)
    expect(c.blocks.every(b => b.content.__space === "Aéré")).toBe(true)
  })
  it("__space utilise des valeurs réelles (BLOCK_SPACE_OPTIONS)", () => {
    const valid = ["Défaut", "Compact", "Aéré"]
    for (const lk of ["compact", "airy"]) {
      const c = composeTemplate(TEMPLATE_STRUCTURES[0], TEMPLATE_STYLES.gold, TEMPLATE_LAYOUTS[lk])
      expect(c.blocks.every(b => valid.includes(b.content.__space))).toBe(true)
    }
  })
  it("le layout ne mute pas la structure d'origine", () => {
    const s = TEMPLATE_STRUCTURES[0]
    const had = "__space" in s.blocks[0].content
    composeTemplate(s, TEMPLATE_STYLES.gold, TEMPLATE_LAYOUTS.compact)
    expect("__space" in s.blocks[0].content).toBe(had)
  })
})

describe("verticales métier ajoutées (T5)", () => {
  it("EXTRA_STRUCTURES intégrées au registre + types de blocs valides", () => {
    for (const s of EXTRA_STRUCTURES) {
      expect(TEMPLATE_STRUCTURES.find(x => x.key === s.key), `${s.key} absente du registre`).toBeTruthy()
      expect(unknownBlockTypes(s), `${s.key}: types inconnus`).toEqual([])
      expect(s.group && s.label && s.emoji && s.desc).toBeTruthy()
    }
  })
  it("anti-fake : tout avis d'exemple est marqué « (exemple) »", () => {
    for (const s of EXTRA_STRUCTURES) {
      for (const b of s.blocks) {
        if (b.type === "testimonials") {
          for (const k of ["text1", "text2", "text3"]) {
            const v = (b.content as any)[k]
            if (v) expect(String(v).includes("(exemple)"), `${s.key}.${k}`).toBe(true)
          }
        }
      }
    }
  })
  it("une nouvelle verticale se compose avec n'importe quel style", () => {
    const plombier = TEMPLATE_STRUCTURES.find(s => s.key === "artisan_plombier")!
    const c = composeTemplate(plombier, TEMPLATE_STYLES.slate, TEMPLATE_LAYOUTS.compact)
    expect(c.theme).toBe(AMBIANCE_THEMES.slate)
    expect(c.blocks.every(b => !!BLOCK_DEFS[b.type])).toBe(true)
    expect(c.blocks.every(b => b.content.__space === "Compact")).toBe(true)
  })
})

describe("composeByKeys", () => {
  it("résout structure + style + layout connus", () => {
    const k = TEMPLATE_STRUCTURES[0].key
    const c = composeByKeys(k, "gold")
    expect(c).not.toBeNull()
    expect(c!.theme).toBe(AMBIANCE_THEMES.gold)
  })
  it("null si une clé est inconnue", () => {
    expect(composeByKeys("inconnu", "gold")).toBeNull()
    expect(composeByKeys(TEMPLATE_STRUCTURES[0].key, "inconnu")).toBeNull()
    expect(composeByKeys(TEMPLATE_STRUCTURES[0].key, "gold", "inconnu")).toBeNull()
  })
})
