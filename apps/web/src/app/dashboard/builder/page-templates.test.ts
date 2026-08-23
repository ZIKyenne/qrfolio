import { describe, it, expect } from "vitest"
import {
  PAGE_TEMPLATES, PAGE_TEMPLATE_GROUPS, AMBIANCE_THEMES, AMBIANCE_KEYS, themeForAmbiance,
} from "./page-templates"
import { safeImageUrl, isLightTheme } from "./shared-renderer/models/layoutStyle"

describe("themeForAmbiance", () => {
  it("cle connue -> son theme", () => {
    expect(themeForAmbiance("velvet")).toBe(AMBIANCE_THEMES.velvet)
    expect(themeForAmbiance("gold")).toBe(AMBIANCE_THEMES.gold)
  })
  it("cle inconnue / vide -> repli sur gold", () => {
    expect(themeForAmbiance("inexistant")).toBe(AMBIANCE_THEMES.gold)
    expect(themeForAmbiance("")).toBe(AMBIANCE_THEMES.gold)
  })
  it("chaque cle d'ambiance donne un theme nomme", () => {
    for (const k of AMBIANCE_KEYS) {
      const th = themeForAmbiance(k) as { name?: string }
      expect(th).toBeTruthy()
      expect(th.name).toBeTruthy()
    }
  })
  it("AMBIANCE_KEYS reflete les cles des themes et contient gold", () => {
    expect(AMBIANCE_KEYS).toEqual(Object.keys(AMBIANCE_THEMES))
    expect(AMBIANCE_KEYS).toContain("gold")
  })
})

describe("PAGE_TEMPLATE_GROUPS", () => {
  it("liste des groupes distincts, sans doublon", () => {
    expect(PAGE_TEMPLATE_GROUPS.length).toBeGreaterThan(0)
    expect(new Set(PAGE_TEMPLATE_GROUPS).size).toBe(PAGE_TEMPLATE_GROUPS.length)
  })
  it("couvre exactement les groupes presents dans les modeles", () => {
    const fromData = new Set(PAGE_TEMPLATES.map(t => t.group))
    expect(new Set(PAGE_TEMPLATE_GROUPS)).toEqual(fromData)
  })
  it("preserve l'ordre de premiere apparition", () => {
    const seen: string[] = []
    for (const t of PAGE_TEMPLATES) if (!seen.includes(t.group)) seen.push(t.group)
    expect(PAGE_TEMPLATE_GROUPS).toEqual(seen)
  })
})

// Invariants structurels : un modele casse (cle dupliquee, blocs vides, theme
// manquant) briserait l'application du modele en runtime. Ces tests l'attrapent.
describe("integrite des PAGE_TEMPLATES", () => {
  it("au moins un modele", () => {
    expect(PAGE_TEMPLATES.length).toBeGreaterThan(0)
  })
  it("cles uniques (pas de collision dans le selecteur)", () => {
    const keys = PAGE_TEMPLATES.map(t => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it("champs d'affichage renseignes", () => {
    for (const t of PAGE_TEMPLATES) {
      expect(t.key, `key manquante`).toBeTruthy()
      expect(t.group, `group manquant sur ${t.key}`).toBeTruthy()
      expect(t.label, `label manquant sur ${t.key}`).toBeTruthy()
      expect(t.emoji, `emoji manquant sur ${t.key}`).toBeTruthy()
      expect(t.desc, `desc manquante sur ${t.key}`).toBeTruthy()
    }
  })
  it("chaque modele a un theme et au moins un bloc valide", () => {
    for (const t of PAGE_TEMPLATES) {
      expect(t.theme, `theme manquant sur ${t.key}`).toBeTruthy()
      expect(Array.isArray(t.blocks)).toBe(true)
      expect(t.blocks.length, `aucun bloc sur ${t.key}`).toBeGreaterThan(0)
      for (const b of t.blocks) {
        expect(typeof b.type, `type de bloc invalide sur ${t.key}`).toBe("string")
        expect(b.type.length).toBeGreaterThan(0)
        expect(b.content && typeof b.content === "object", `content invalide sur ${t.key}`).toBe(true)
      }
    }
  })
})

// Les modèles « studio » embarquent des visuels générés (data-URI SVG) et des thèmes
// sur mesure. Ces garde-fous attrapent les régressions qui les rendraient invisibles :
// un visuel rejeté par la validation d'URL, ou un thème absent des ambiances (le
// sélecteur de style de la galerie ne saurait alors plus reproduire le look d'origine).
describe("modèles studio", () => {
  const studio = PAGE_TEMPLATES.filter(t => t.key.startsWith("studio_"))

  it("au moins dix modèles studio", () => {
    expect(studio.length).toBeGreaterThanOrEqual(10)
  })

  it("chaque thème studio est une ambiance connue (identité de référence)", () => {
    const ambiances = Object.values(AMBIANCE_THEMES)
    for (const t of studio) {
      expect(ambiances.includes(t.theme), `${t.key}: thème hors ambiances`).toBe(true)
    }
  })

  it("chaque visuel embarqué passe la validation d'URL d'image", () => {
    const KEYS = ["image", "bg_image", "img1", "img2", "img3", "img4", "img5",
      "c1_image", "c2_image", "c3_image", "logo1", "logo2"]
    const bad: string[] = []
    for (const t of studio) {
      for (const b of t.blocks) {
        for (const k of KEYS) {
          const v = (b.content as any)[k]
          if (typeof v === "string" && v.startsWith("data:") && !safeImageUrl(v)) bad.push(`${t.key}.${b.type}.${k}`)
        }
      }
    }
    expect(bad, `visuels rejetés : ${bad.join(", ")}`).toEqual([])
  })

  it("les modèles clairs et sombres coexistent (variété réelle)", () => {
    const light = studio.filter(t => isLightTheme(t.theme as any)).length
    expect(light, "aucun modèle clair").toBeGreaterThan(0)
    expect(studio.length - light, "aucun modèle sombre").toBeGreaterThan(0)
  })
})
