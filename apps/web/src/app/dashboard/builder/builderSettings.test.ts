import { describe, it, expect } from "vitest"
import {
  resolveSettingsMode, toUxMode, isPilotBlock, PILOT_BLOCKS, PILOT_SIMPLE_FIELDS,
  contentFieldsFor, fieldMeta, contentChangedKeys, universalChangedKeys,
  blockSettingsSections, resolveActiveSection, resetContentFields, resetSectionContent,
  resetBlockContent, blockStateBadges, isBlockEmpty,
} from "./builderSettings"
import { type Block } from "./types"
import { BLOCK_DEFS } from "./blockDefs"
import { SETTINGS_SECTIONS } from "./builderUx"

const mk = (type: string, content: Record<string, string> = {}): Block => ({
  id: "b1", type, content: { ...(BLOCK_DEFS[type]?.defaultContent as any), ...content }, visible: true,
})

describe("mode simple/avancé", () => {
  it("resolveSettingsMode : défaut simple, 'advanced' explicite", () => {
    expect(resolveSettingsMode(null)).toBe("simple")
    expect(resolveSettingsMode("advanced")).toBe("advanced")
    expect(resolveSettingsMode("x")).toBe("simple")
  })
  it("toUxMode : advanced → expert", () => {
    expect(toUxMode("advanced")).toBe("expert")
    expect(toUxMode("simple")).toBe("simple")
  })
})

describe("blocs pilotes", () => {
  it("10 pilotes, tous existants", () => {
    expect(PILOT_BLOCKS.size).toBe(10)
    for (const t of PILOT_BLOCKS) expect(!!BLOCK_DEFS[t], t).toBe(true)
  })
  it("les champs simples curatés existent dans le bloc", () => {
    for (const [type, keys] of Object.entries(PILOT_SIMPLE_FIELDS)) {
      const defKeys = new Set(BLOCK_DEFS[type].fields.map(f => f.key))
      for (const k of keys) expect(defKeys.has(k), `${type}.${k}`).toBe(true)
    }
  })
})

describe("champs de contenu selon le mode", () => {
  it("simple = sous-ensemble strict pour un pilote riche", () => {
    const simple = contentFieldsFor("pricing", "simple")
    const all = contentFieldsFor("pricing", "advanced")
    expect(simple.length).toBeLessThan(all.length)
    expect(simple.every(f => PILOT_SIMPLE_FIELDS.pricing.includes(f.key))).toBe(true)
  })
  it("avancé = tous les champs métier", () => {
    expect(contentFieldsFor("timeline", "advanced").length).toBe(BLOCK_DEFS.timeline.fields.length)
  })
  it("bloc non pilote : simple = tous les champs (fallback)", () => {
    expect(contentFieldsFor("cta_button", "simple").length).toBe(BLOCK_DEFS.cta_button.fields.length)
  })
})

describe("classification de champ", () => {
  it("champ simple d'un pilote → minimumMode simple", () => {
    expect(fieldMeta("heading", "text").minimumMode).toBe("simple")
    expect(fieldMeta("heading", "color").minimumMode).toBe("advanced")
  })
  it("priorité = index dans def.fields", () => {
    expect(fieldMeta("heading", "text").priority).toBe(0)
  })
})

describe("comptage des modifications", () => {
  it("aucun changement au défaut", () => {
    expect(contentChangedKeys(mk("heading")).length).toBe(0)
  })
  it("détecte un champ modifié non vide", () => {
    const b = mk("heading", { text: "Bonjour le monde" })
    expect(contentChangedKeys(b)).toContain("text")
  })
  it("ignore une valeur vide", () => {
    const b = mk("heading", { text: "" })
    expect(contentChangedKeys(b)).not.toContain("text")
  })
  it("universalChangedKeys détecte les clés __", () => {
    const b = mk("heading", { __width: "Large", __radius: "" })
    expect(universalChangedKeys(b)).toEqual(["__width"])
  })
})

describe("sections dérivées", () => {
  it("simple masque les sections avancées", () => {
    const simple = blockSettingsSections(mk("heading"), "simple")
    const advanced = blockSettingsSections(mk("heading"), "advanced")
    expect(advanced.length).toBe(SETTINGS_SECTIONS.length)
    expect(simple.length).toBeLessThan(advanced.length)
    expect(simple.every(s => !s.advancedOnly)).toBe(true)
  })
  it("changedCount du contenu remonte dans la section content", () => {
    const b = mk("heading", { text: "X", subtitle: "Y" })
    const content = blockSettingsSections(b, "advanced").find(s => s.id === "content")!
    expect(content.changedCount).toBe(2)
  })
  it("resolveActiveSection conserve la section si visible, sinon la première", () => {
    const b = mk("heading")
    expect(resolveActiveSection(b, "advanced", "responsive")).toBe("responsive")
    // "responsive" est advancedOnly → en simple, retombe sur la première (content)
    expect(resolveActiveSection(b, "simple", "responsive")).toBe("content")
  })
})

describe("reset (pur, non destructif du reste)", () => {
  it("resetContentFields ramène au défaut sans muter", () => {
    const b = mk("heading", { text: "Modifié", subtitle: "Gardé" })
    const next = resetContentFields(b, ["text"])
    expect(next.text).toBe(BLOCK_DEFS.heading.defaultContent.text)
    expect(next.subtitle).toBe("Gardé")
    expect((b.content as any).text).toBe("Modifié") // original non muté
  })
  it("resetSectionContent(content) réinitialise tous les champs métier", () => {
    const b = mk("heading", { text: "A", subtitle: "B" })
    const next = resetSectionContent(b, "content")
    expect(next.text).toBe(BLOCK_DEFS.heading.defaultContent.text)
  })
  it("resetSectionContent(design) retire les clés __", () => {
    const b = mk("heading", { __width: "Large", text: "Gardé" })
    const next = resetSectionContent(b, "design")
    expect(next.__width).toBeUndefined()
    expect(next.text).toBe("Gardé")
  })
  it("resetBlockContent = defaultContent (nouvel objet)", () => {
    const d = resetBlockContent("heading")
    expect(d).toEqual(BLOCK_DEFS.heading.defaultContent)
    expect(d).not.toBe(BLOCK_DEFS.heading.defaultContent)
  })
})

describe("états du bloc", () => {
  it("visible par défaut", () => {
    expect(blockStateBadges(mk("heading")).map(b => b.id)).toEqual(["visible"])
  })
  it("priorise verrouillé + masqué, limite à 3", () => {
    const b: Block = { ...mk("heading"), visible: false, locked: true, draft: true }
    const ids = blockStateBadges(b, { isPremium: true, max: 3 }).map(x => x.id)
    expect(ids.length).toBe(3)
    expect(ids).toContain("locked")
    expect(ids).toContain("hidden")
  })
  it("isBlockEmpty vrai si tout vide", () => {
    const b: Block = { id: "x", type: "heading", content: {}, visible: true }
    expect(isBlockEmpty(b)).toBe(true)
    expect(isBlockEmpty(mk("heading", { text: "Salut" }))).toBe(false)
  })
})
