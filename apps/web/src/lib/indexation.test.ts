import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { jugerPage, titreReel, texteDuBloc, pourquoiPasReferencee, TEXTE_MINIMUM } from "./indexation"

// Les blocs réels stockent leur contenu à plat, avec les réglages de style
// préfixés par « __ ». Ces fixtures reproduisent la forme exacte observée en base.
const profil = {
  content: {
    name: "THE RED FISH", badge: "Bar à cocktails",
    tagline: "L'art du cocktail, dans une ambiance unique",
    avatar: "", avatar_bg: "halo", __anim: "Glissé →", __text_scale: "130", __visible: true,
  },
}
const horaires = {
  content: {
    title: "Horaires", lundi: "Fermé", mardi: "11h - 23h", mercredi: "11h - 23h",
    jeudi: "11h - 23h", vendredi: "10h - 2h00", samedi: "10h - 2h00", dimanche: "11h - 20h",
    note: "Fermé du 9 au 23 août, réouverture le 24", __locked: false,
  },
}

describe("ce qui compte comme du texte", () => {
  it("les réglages de style ne comptent pas", () => {
    const t = texteDuBloc(profil.content)
    expect(t).toContain("L'art du cocktail")
    expect(t).not.toContain("Glissé")
    expect(t).not.toContain("halo")
  })
  it("les adresses, couleurs et tailles ne comptent pas", () => {
    const t = texteDuBloc({ url: "https://exemple.fr/page", couleur: "#C9A84C", taille: "24px", texte: "Réservez une table" })
    expect(t).toBe("Réservez une table")
  })
  it("le texte imbriqué compte (listes de produits, onglets)", () => {
    const t = texteDuBloc({ sections: [{ titre: "Cocktails", items: [{ nom: "Mojito cubain" }] }] })
    expect(t).toContain("Cocktails")
    expect(t).toContain("Mojito cubain")
  })
})

describe("titres posés par l'éditeur, pas par le client", () => {
  for (const t of ["Ma Page", "ma page", "Sans titre", "Nouvelle page", "Page 2", "TEST 135", "Test bar", "Essai", "Demo", "Untitled"]) {
    it(`« ${t} » n'est pas un titre à soi`, () => expect(titreReel(t)).toBe(false))
  }
  for (const t of ["The Red Fish", "Location saisonnière", "Freelance Pro", "Chez Testu", "Testeur de sols"]) {
    it(`« ${t} » est un vrai titre`, () => expect(titreReel(t)).toBe(true))
  }
})

// Un commerçant qui s'appelle « Testu » ou dont le métier est « testeur » ne doit
// pas être écarté : la règle vise le mot entier en début de titre, pas le début d'un mot.
it("un vrai nom qui commence par les mêmes lettres passe", () => {
  expect(titreReel("Testu & Fils")).toBe(true)
  expect(titreReel("Demolition Pro")).toBe(true)
})

describe("verdict sur les sept premières pages publiées (données réelles)", () => {
  const long = (n: number) => ({ content: { texte: "a".repeat(n) } })

  it("The Red Fish : titre à soi, adresse choisie, 5191 caractères → proposée", () => {
    expect(jugerPage({ slug: "the-red-fish", title: "The Red Fish", blocks: [profil, horaires, long(5000)] }).indexable).toBe(true)
  })
  it("Ma Page : adresse générée automatiquement → écartée", () => {
    const v = jugerPage({ slug: "ma-page-qicd4d", title: "Ma Page", blocks: [long(237)] })
    expect(v.indexable).toBe(false)
    expect(v.motif).toBe("slug_automatique")
  })
  it("TEST 135 : adresse générée et aucun bloc → écartée", () => {
    expect(jugerPage({ slug: "ma-page-yql6pv", title: "TEST 135", blocks: [] }).indexable).toBe(false)
  })
  it("Test bar : adresse choisie mais titre d'essai → écartée", () => {
    const v = jugerPage({ slug: "test-bar", title: "Test bar", blocks: [long(629)] })
    expect(v.indexable).toBe(false)
    expect(v.motif).toBe("titre_par_defaut")
  })
  it("Location saisonnière : 565 caractères → proposée", () => {
    expect(jugerPage({ slug: "location-saisonniere", title: "Location saisonnière", blocks: [long(565)] }).indexable).toBe(true)
  })
})

describe("les garde-fous", () => {
  it("une page sans aucun bloc est écartée", () => {
    const v = jugerPage({ slug: "chez-marcel", title: "Chez Marcel", blocks: [] })
    expect(v.motif).toBe("sans_bloc")
  })
  it("une page avec des blocs mais presque pas de texte est écartée", () => {
    const v = jugerPage({ slug: "chez-marcel", title: "Chez Marcel", blocks: [{ content: { texte: "Bonjour" } }] })
    expect(v.motif).toBe("texte_insuffisant")
    expect(v.texte).toBeLessThan(TEXTE_MINIMUM)
  })
  it("blocks absent (jamais chargé) n'explose pas", () => {
    expect(jugerPage({ slug: "chez-marcel", title: "Chez Marcel" }).indexable).toBe(false)
    expect(jugerPage({ slug: "chez-marcel", title: "Chez Marcel", blocks: null }).indexable).toBe(false)
  })
  it("un titre vide ou absent est écarté sans planter", () => {
    expect(jugerPage({ slug: "x", title: null, blocks: [profil] }).indexable).toBe(false)
    expect(jugerPage({ slug: "x", title: "", blocks: [profil] }).indexable).toBe(false)
  })
})

describe("ce qu'on dit au client", () => {
  it("chaque motif a une phrase claire, en français, qui dit quoi faire", () => {
    for (const m of ["slug_automatique", "titre_par_defaut", "sans_bloc", "texte_insuffisant"] as const) {
      const phrase = pourquoiPasReferencee(m)
      expect(phrase.length).toBeGreaterThan(30)
      expect(phrase).toMatch(/Google/)
      expect(phrase).not.toMatch(/noindex|sitemap|crawl/i)
    }
  })
})

// Le pire scénario n'est pas qu'une page soit écartée : c'est que le sitemap la
// propose pendant que la page elle-même dit « ne m'indexe pas », ou l'inverse.
// Un moteur qui reçoit deux ordres contraires fait moins confiance au domaine.
describe("le sitemap et la page publique appliquent le même critère", () => {
  const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")

  it("le sitemap filtre avec jugerPage", () => {
    const src = lire("../app/sitemap.ts")
    expect(src).toContain("jugerPage")
    expect(src).toMatch(/blocks\(content\)/)
  })

  it("la page publique pose noindex avec le même jugerPage", () => {
    const src = lire("../app/[slug]/page.tsx")
    expect(src).toContain("jugerPage")
    expect(src).toMatch(/index:\s*false/)
    // follow reste vrai : les liens sortants de la page continuent de compter.
    expect(src).toMatch(/follow:\s*true/)
  })

  it("aucun des deux ne réimplémente le critère dans son coin", () => {
    for (const p of ["../app/sitemap.ts", "../app/[slug]/page.tsx"]) {
      expect(lire(p)).not.toMatch(/ma-page-\[a-z/)
    }
  })
})
