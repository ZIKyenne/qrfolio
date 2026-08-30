import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PAGE_TEMPLATES } from "../builder/page-templates"

// Une page métier comme /qr-code/salon envoie vers /creer?metier=Beaute. Le tri
// ne connaissait que des IDENTIFIANTS de modèles, alors que les 20 modèles
// partagés portent le NOM DE LEUR GROUPE comme catégorie. Aucun ne remontait :
// le premier écran d'un visiteur venu du référencement était « Salon Beauté »,
// un modèle payant, avec son cadenas — pendant que cinq modèles beauté gratuits
// dormaient plus bas dans la liste.
const src = readFileSync(join(__dirname, "./page.tsx"), "utf8")

/** La carte secteur → clés, relue depuis le fichier réel. */
function carte(): Record<string, string[]> {
  const bloc = src.slice(src.indexOf("const CATEGORY_MAP"), src.indexOf("const TEMPLATES"))
  const out: Record<string, string[]> = {}
  for (const m of bloc.matchAll(/(\w+):\s*\[([^\]]*)\]/g)) {
    out[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map(x => x[1])
  }
  return out
}

describe("un visiteur venu d'une page métier voit des modèles de son métier", () => {
  const map = carte()
  const groupes = new Set(PAGE_TEMPLATES.map(t => t.group))

  it("chaque secteur pointe vers au moins un groupe de modèles réellement existant", () => {
    const orphelins: string[] = []
    for (const [secteur, cles] of Object.entries(map)) {
      if (!cles.some(c => groupes.has(c))) orphelins.push(secteur)
    }
    expect(orphelins, "ces secteurs ne peuvent remonter aucun modèle partagé").toEqual([])
  })

  it("aucune clé ne désigne un groupe qui n'existe pas", () => {
    // Une faute de frappe dans un nom de groupe le rendrait silencieusement inerte.
    const ids = new Set(["restaurant","freelance","agence","coach","artiste","createur","influenceur","immobilier","coiffeur","medecin","event","startup","ecommerce","vente_produits"])
    const anciennesCategories = new Set(["Food","Business","Creatif","Bien-etre","Beaute","Sante","Event","Tech","Commerce","Immobilier"])
    const inconnues: string[] = []
    for (const [secteur, cles] of Object.entries(map)) {
      for (const c of cles) {
        if (!ids.has(c) && !groupes.has(c) && !anciennesCategories.has(c)) inconnues.push(`${secteur} → ${c}`)
      }
    }
    expect(inconnues).toEqual([])
  })

  it("les secteurs des pages métier les plus visitées sont couverts", () => {
    for (const s of ["Restaurant", "Beaute", "Sante", "Ecommerce", "Evenement", "Immobilier"]) {
      expect(map[s], `secteur ${s} absent`).toBeTruthy()
      expect(map[s].length).toBeGreaterThan(1)
    }
  })
})

describe("les modèles utilisables passent devant les modèles verrouillés", () => {
  it("le tri sépare bien ouverts et fermés à l'intérieur du secteur", () => {
    const bloc = src.slice(src.indexOf("const ordonnes"), src.indexOf("const ordonnes") + 900)
    expect(bloc).toContain("canUse(t.plan)")
    expect(bloc, "l'ordre doit être : ouverts, fermés, puis le reste").toMatch(/\[\.\.\.ouverts, \.\.\.fermes, \.\.\.dehors\]/)
  })

  it("le tri se recalcule quand le plan change", () => {
    const bloc = src.slice(src.indexOf("const ordonnes"), src.indexOf("const ordonnes") + 1000)
    expect(bloc, "userPlan absent des dépendances : un changement de plan ne réordonnerait rien").toMatch(/\[filtered, fromEntry, userPlan\]/)
  })

  it("les modèles payants restent visibles, seulement plus bas", () => {
    // On ne cache rien : un modèle verrouillé reste une vitrine légitime.
    const bloc = src.slice(src.indexOf("const ordonnes"), src.indexOf("const ordonnes") + 900)
    expect(bloc).toContain("...fermes")
  })
})
