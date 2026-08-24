import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Le parcours d'un visiteur sur téléphone. Chaque règle vient d'un défaut vu à
// l'écran pendant le parcours joué au navigateur, en 390 px.

const read = (p: string) => readFileSync(join(__dirname, p), "utf8")
const BUILDER = read("builder/BuilderV4.tsx")
const GALERIE = read("templates/page.tsx")
const APERCU = read("templates/TemplatePreviewModal.tsx")

describe("aperçu d'un modèle sur téléphone", () => {
  it("les actions s'empilent au lieu de se comprimer", () => {
    // Côte à côte, « Fermer » et « Utiliser tel quel » ne se comprimaient pas :
    // l'action principale se retrouvait tronquée en plein milieu d'un mot.
    expect(APERCU).toContain('flexDirection: "column" as const, position: "sticky" as const')
  })

  it("« Fermer » disparaît au profit de la croix de l'en-tête", () => {
    expect(APERCU).toContain("{!isMobile && (")
    expect(APERCU).toMatch(/Fermer\s*\n\s*<\/button>\s*\n\s*\)\}/)
  })

  it("l'aperçu est atteignable autrement qu'en devinant", () => {
    // Taper la carte l'ouvrait déjà, mais rien ne le laissait deviner et
    // « Utiliser » attirait tous les appuis — donc on manquait l'assistant.
    expect(GALERIE).toContain('aria-label={`Aperçu de ${template.name}`}')
    expect(GALERIE).not.toContain("{!isMobile && <button type=\"button\" onClick={(e) => { e.stopPropagation(); setPreview(template.id) }}")
  })
})

describe("modale de création sur téléphone", () => {
  it("l'apparence est repliée : le nom et le bouton restent atteignables", () => {
    // 28 pastilles de couleur repoussaient le formulaire à plus de mille pixels
    // sous le pli sur un écran de 390 px.
    expect(GALERIE).toContain("const [lookOpen, setLookOpen] = useState(false)")
    expect(GALERIE).toContain("{lookOpen && styleOptions && styleOptions.length > 0 && (")
    expect(GALERIE).toContain("{lookOpen && layoutOptions && layoutOptions.length > 0 && (")
  })

  it("le repli annonce le style courant, pas juste un chevron", () => {
    expect(GALERIE).toContain('aria-expanded={lookOpen}')
    expect(GALERIE).toContain("styleOptions?.find(s => s.key === styleKey)?.label")
  })
})

describe("barre du haut de l'éditeur sur téléphone", () => {
  it("le logo cède la place à une simple flèche", () => {
    // « ← QRowg » passait à la ligne et recouvrait la flèche de retour.
    expect(BUILDER).toContain('{isMobile ? "←" : "← QRowg"}')
    expect(BUILDER).toContain('aria-label="Retour au tableau de bord"')
  })

  it("le nom de la page s'ellipse au lieu d'être coupé net", () => {
    expect(BUILDER).toContain('textOverflow: "ellipsis", ...(isMobile ? { flex: "1 1 0" }')
  })

  it("l'indicateur de brouillon n'apparaît pas deux fois", () => {
    // Le bandeau du canvas porte déjà la même information, juste en dessous.
    expect(BUILDER).toContain('{guest && !isMobile && draftState === "saved"')
  })

  it("les avertissements de brouillon tiennent sur une ligne", () => {
    expect(BUILDER).toContain('whiteSpace: "nowrap" }} title="Le brouillon dépasse')
    expect(BUILDER).toContain('{isMobile ? "Trop lourd" : "Brouillon trop lourd"}')
    expect(BUILDER).toContain('{isMobile ? "Non gardé" : "Rien ne peut être gardé ici"}')
  })
})
