import { describe, it, expect } from "vitest"
import {
  buildLibraryItems, libraryCategories, orphanBlockTypes, searchLibrary, scoreLibraryItem,
  normalizeSearch, toggleFavorite, pushRecentType, sanitizeRecents, recommendedForContext,
  resolveInsertIndex, isDuplicateAdd, nearbyCategories, premiumInfo, PREMIUM_BLOCK_TYPES,
  RECENT_MAX, LIBRARY_LABEL_OVERRIDES,
} from "./builderLibrary"
import { BLOCK_CATEGORIES } from "./types"
import { BLOCK_DEFS, BLOCS_MASQUES } from "./blockDefs"

const ALL = buildLibraryItems()
const find = (t: string) => ALL.find(i => i.type === t)!

describe("modèle de bibliothèque", () => {
  it("un item par bloc proposable — les blocs masqués n'y figurent pas", () => {
    // BLOCS_MASQUES : des blocs conservés (les pages qui en contiennent un
    // fonctionnent) mais retirés du choix, faute d'exister sur la page publiée.
    expect(ALL.length).toBe(Object.keys(BLOCK_DEFS).length - BLOCS_MASQUES.size)
    expect(ALL.length).toBeGreaterThan(100)
    expect(ALL.some(i => BLOCS_MASQUES.has(i.type))).toBe(false)
  })
  it("chaque item a titre, description, catégorie, icône", () => {
    for (const i of ALL) {
      expect(i.title.length, i.type).toBeGreaterThan(0)
      expect(i.category.length, i.type).toBeGreaterThan(0)
      expect(i.icon.length, i.type).toBeGreaterThan(0)
    }
  })
  it("les overrides de libellé sont appliqués (CTA → Bouton d'action)", () => {
    expect(find("cta_button").title).toBe("Bouton d'action")
    expect(find("pricing").title).toBe("Tarifs")
    expect(find("spacer").title).toBe("Espace")
    // le libellé brut reste consultable (recherche par ancien nom)
    expect(find("cta_button").rawLabel).toContain("CTA")
  })
  it("les flags favoris/récents/recommandés reflètent les options", () => {
    const items = buildLibraryItems({ favorites: ["bio"], recents: ["pricing"], recommended: ["profile"] })
    expect(items.find(i => i.type === "bio")!.isFavorite).toBe(true)
    expect(items.find(i => i.type === "pricing")!.isRecent).toBe(true)
    expect(items.find(i => i.type === "profile")!.isRecommended).toBe(true)
  })
})

describe("catégories — couverture totale, aucun orphelin", () => {
  it("chaque bloc appartient à une catégorie visible", () => {
    expect(orphanBlockTypes(ALL)).toEqual([])
  })
  it("libraryCategories retourne les 10 catégories avec un compte > 0", () => {
    const cats = libraryCategories(ALL)
    expect(cats.length).toBe(BLOCK_CATEGORIES.length)
    expect(cats.every(c => c.count > 0)).toBe(true)
    // la somme des comptes = nombre total de blocs
    expect(cats.reduce((n, c) => n + c.count, 0)).toBe(ALL.length)
  })
})

describe("recherche — normalisée, insensible casse/accents, multi-mots", () => {
  it("normalizeSearch retire accents et casse", () => {
    expect(normalizeSearch("Réservér ")).toBe("reserver")
    expect(normalizeSearch("PRIX")).toBe("prix")
  })
  const has = (res: ReturnType<typeof searchLibrary>, type: string) => res.some(i => i.type === type)

  it("« réserver » trouve réservation / booking / table", () => {
    const r = searchLibrary(ALL, "réserver")
    expect(has(r, "table_booking") || has(r, "reservation_form") || has(r, "booking_button")).toBe(true)
  })
  it("« Instagram » trouve réseaux / feed", () => {
    const r = searchLibrary(ALL, "Instagram")
    expect(has(r, "instagram_feed")).toBe(true)
    expect(has(r, "social_links")).toBe(true)
  })
  it("« prix » trouve tarifs / pricing / offre", () => {
    const r = searchLibrary(ALL, "prix")
    expect(has(r, "pricing")).toBe(true)
  })
  it("« CV » trouve expérience / compétences / documents", () => {
    const r = searchLibrary(ALL, "CV")
    expect(has(r, "skills") || has(r, "expertise") || has(r, "journey") || has(r, "documents")).toBe(true)
  })
  it("« restaurant » trouve menu / horaires / réservation / avis", () => {
    const r = searchLibrary(ALL, "restaurant")
    expect(has(r, "menu_section")).toBe(true)
    expect(has(r, "opening_hours") || has(r, "table_booking")).toBe(true)
  })
  it("« musique » trouve albums / concerts / spotify / audio", () => {
    const r = searchLibrary(ALL, "musique")
    expect(has(r, "album_block") || has(r, "concerts") || has(r, "spotify_embed") || has(r, "audio_player")).toBe(true)
  })
  it("multi-mots (ET) : « tarifs pro » exige les deux termes", () => {
    const r = searchLibrary(ALL, "réservation restaurant")
    // chaque résultat doit matcher les deux termes
    expect(r.length).toBeGreaterThan(0)
  })
  it("requête vide → liste complète, résultat déterministe", () => {
    expect(searchLibrary(ALL, "").length).toBe(ALL.length)
    const a = searchLibrary(ALL, "avis").map(i => i.type)
    const b = searchLibrary(ALL, "avis").map(i => i.type)
    expect(a).toEqual(b)
  })
  it("correspondance exacte prioritaire sur inclusion", () => {
    // « Tarifs » (titre exact de pricing) doit classer pricing en tête
    const r = searchLibrary(ALL, "Tarifs")
    expect(r[0].type).toBe("pricing")
  })
  it("terme sans aucun match → 0", () => {
    expect(scoreLibraryItem(find("bio"), "zzzxxx")).toBe(0)
  })
})

describe("favoris (pur)", () => {
  it("toggle ajoute puis retire, sans muter", () => {
    const a = ["bio"]
    const b = toggleFavorite(a, "pricing")
    expect(b).toEqual(["bio", "pricing"]); expect(a).toEqual(["bio"])
    expect(toggleFavorite(b, "bio")).toEqual(["pricing"])
  })
})

describe("récents (pur)", () => {
  it("dernier en premier, sans doublon, borné", () => {
    let r: string[] = []
    r = pushRecentType(r, "a"); r = pushRecentType(r, "b"); r = pushRecentType(r, "a")
    expect(r).toEqual(["a", "b"])
    for (let i = 0; i < 12; i++) r = pushRecentType(r, "t" + i)
    expect(r.length).toBe(RECENT_MAX)
    expect(r[0]).toBe("t11")
  })
  it("sanitize retire les types disparus", () => {
    expect(sanitizeRecents(["bio", "bloc_supprimé", "pricing"])).toEqual(["bio", "pricing"])
  })
})

describe("recommandations déterministes", () => {
  it("chaque contexte renvoie des blocs existants", () => {
    for (const ctx of ["default", "pro", "creator", "restaurant", "event", "commerce", "music"] as const) {
      const reco = recommendedForContext(ctx)
      expect(reco.length).toBeGreaterThan(0)
      expect(reco.every(t => !!BLOCK_DEFS[t]), ctx).toBe(true)
    }
  })
  it("restaurant recommande menu + réservation", () => {
    const r = recommendedForContext("restaurant")
    expect(r).toContain("menu_section")
    expect(r).toContain("table_booking")
  })
  it("déterministe (deux appels identiques)", () => {
    expect(recommendedForContext("pro")).toEqual(recommendedForContext("pro"))
  })
})

describe("premium (affichage)", () => {
  it("premiumInfo cohérent avec le set", () => {
    for (const t of PREMIUM_BLOCK_TYPES) expect(premiumInfo(t).isPremium).toBe(true)
    expect(premiumInfo("bio").isPremium).toBe(false)
    expect(premiumInfo("instagram_feed").plan).toBe("Pro")
  })
  it("tous les types premium existent réellement", () => {
    for (const t of PREMIUM_BLOCK_TYPES) expect(!!BLOCK_DEFS[t], t).toBe(true)
  })
})

describe("insertion + anti-double-ajout", () => {
  it("resolveInsertIndex borne et défaut = fin", () => {
    expect(resolveInsertIndex(5)).toBe(5)
    expect(resolveInsertIndex(5, 2)).toBe(2)
    expect(resolveInsertIndex(5, -3)).toBe(0)
    expect(resolveInsertIndex(5, 99)).toBe(5)
  })
  it("isDuplicateAdd ignore un même bloc trop rapproché", () => {
    expect(isDuplicateAdd("bio", 1000, "bio", 1100)).toBe(true)   // 100ms < 350
    expect(isDuplicateAdd("bio", 1000, "bio", 1500)).toBe(false)  // 500ms
    expect(isDuplicateAdd("bio", 1000, "pricing", 1100)).toBe(false) // type différent
    expect(isDuplicateAdd(null, 0, "bio", 100)).toBe(false)
  })
})

describe("état sans résultat", () => {
  it("nearbyCategories propose des catégories proches non vides", () => {
    const near = nearbyCategories(ALL, "réseaux")
    expect(near.length).toBeGreaterThan(0)
    expect(near.length).toBeLessThanOrEqual(3)
  })
  it("requête vide → aucune suggestion", () => {
    expect(nearbyCategories(ALL, "")).toEqual([])
  })
})

describe("garde-fou libellés", () => {
  it("les overrides ciblent des blocs réels", () => {
    for (const t of Object.keys(LIBRARY_LABEL_OVERRIDES)) expect(!!BLOCK_DEFS[t], t).toBe(true)
  })
})
