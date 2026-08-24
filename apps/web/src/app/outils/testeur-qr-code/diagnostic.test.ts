import { describe, it, expect } from "vitest"
import {
  contraste, tailleModule, margeEnModules, analyserDestination,
  diagnostiquer, diagnosticIllisible, modulesDeLaVersion, distance, mesurerLuminances, type Lecture,
} from "./diagnostic"

const lecture = (o: Partial<Lecture> = {}): Lecture => ({
  texte: "https://qrowg.com/chez-marcel",
  hautGauche: { x: 40, y: 40 },
  hautDroit: { x: 250, y: 40 },
  basGauche: { x: 40, y: 250 },
  largeurImage: 290,
  hauteurImage: 290,
  luminanceSombre: 0,
  luminanceClaire: 255,
  ...o,
})

describe("contraste", () => {
  it("noir sur blanc est le maximum", () => {
    expect(Math.round(contraste(0, 255))).toBe(21)
  })
  it("l'ordre des deux couleurs ne change rien", () => {
    expect(contraste(0, 255)).toBeCloseTo(contraste(255, 0), 6)
  })
  it("deux gris proches donnent un contraste proche de 1", () => {
    expect(contraste(120, 130)).toBeLessThan(1.2)
  })
  it("gris moyen sur blanc reste sous le seuil confortable", () => {
    expect(contraste(128, 255)).toBeLessThan(7)
  })
})

describe("taille du module", () => {
  it("21 modules sur 210 pixels font 10 pixels par module", () => {
    expect(tailleModule(210, 21)).toBe(10)
  })
  it("zéro module ne fait pas exploser le calcul", () => {
    expect(tailleModule(210, 0)).toBe(0)
  })
  it("la version 1 fait 21 modules, la version 40 en fait 177", () => {
    expect(modulesDeLaVersion(1)).toBe(21)
    expect(modulesDeLaVersion(40)).toBe(177)
    expect(modulesDeLaVersion(2)).toBe(25)
  })
})

describe("marge blanche", () => {
  it("se mesure sur le côté le plus serré, pas sur la moyenne", () => {
    // 40 px de marge à gauche et en haut, 10 modules de 10 px = code de 210 px,
    // donc 40 px de marge = 4 modules. Mais on colle le code à droite :
    const l = lecture({ largeurImage: 260, hautDroit: { x: 250, y: 40 } })
    expect(margeEnModules(l, 10)).toBe(1)
  })
  it("un code collé au bord donne zéro", () => {
    const l = lecture({ hautGauche: { x: 0, y: 0 }, hautDroit: { x: 210, y: 0 }, basGauche: { x: 0, y: 210 }, largeurImage: 210, hauteurImage: 210 })
    expect(margeEnModules(l, 10)).toBe(0)
  })
  it("un module de taille nulle ne divise pas par zéro", () => {
    expect(margeEnModules(lecture(), 0)).toBe(0)
  })
})

describe("destination", () => {
  it("HTTPS est un bon point", () => {
    expect(analyserDestination("https://qrowg.com/chez-marcel").gravite).toBe("bon")
  })
  it("HTTP est signalé comme un risque, pas comme un blocage", () => {
    const c = analyserDestination("http://qrowg.com")
    expect(c.gravite).toBe("risque")
    expect(c.correction).toMatch(/HTTPS/)
  })
  it("un raccourcisseur est signalé", () => {
    expect(analyserDestination("https://bit.ly/3xYz").gravite).toBe("risque")
    expect(analyserDestination("https://tinyurl.com/abc").gravite).toBe("risque")
  })
  it("un domaine qui contient le nom d'un raccourcisseur n'est pas confondu", () => {
    expect(analyserDestination("https://monbit.ly-traiteur.fr/carte").gravite).toBe("bon")
  })
  it("les actions directes sont reconnues", () => {
    for (const t of ["tel:+33612345678", "mailto:contact@exemple.fr", "WIFI:S:Bar;T:WPA;P:motdepasse;;", "BEGIN:VCARD"]) {
      expect(analyserDestination(t).gravite).toBe("bon")
    }
  })
  it("du texte simple ne déclenche aucune alerte", () => {
    expect(analyserDestination("Table 12").gravite).toBe("bon")
  })
})

describe("diagnostic complet", () => {
  it("un code parfait est déclaré prêt à imprimer", () => {
    const d = diagnostiquer(lecture(), 21)
    expect(d.lisible).toBe(true)
    expect(d.verdict).toMatch(/prêt à imprimer/)
    expect(d.constats.every(c => c.gravite === "bon")).toBe(true)
  })

  it("un contraste faible bloque, même si le code se lit ici", () => {
    const d = diagnostiquer(lecture({ luminanceSombre: 150, luminanceClaire: 200 }), 21)
    expect(d.lisible).toBe(true)
    expect(d.verdict).toMatch(/ne survivra pas/)
    expect(d.constats.find(c => c.cle === "contraste")?.gravite).toBe("bloquant")
  })

  it("un code sans marge est bloquant", () => {
    const l = lecture({ hautGauche: { x: 0, y: 0 }, hautDroit: { x: 210, y: 0 }, basGauche: { x: 0, y: 210 }, largeurImage: 210, hauteurImage: 210 })
    expect(diagnostiquer(l, 21).constats.find(c => c.cle === "marge")?.gravite).toBe("bloquant")
  })

  it("une image minuscule est bloquante", () => {
    const l = lecture({ hautGauche: { x: 2, y: 2 }, hautDroit: { x: 32, y: 2 }, basGauche: { x: 2, y: 32 }, largeurImage: 34, hauteurImage: 34 })
    expect(diagnostiquer(l, 21).constats.find(c => c.cle === "module")?.gravite).toBe("bloquant")
  })

  it("un seul point d'attention est annoncé au singulier", () => {
    const d = diagnostiquer(lecture({ texte: "http://qrowg.com" }), 21)
    expect(d.verdict).toMatch(/un point à corriger/)
  })

  it("chaque constat sérieux dit quoi faire", () => {
    const d = diagnostiquer(lecture({ luminanceSombre: 150, luminanceClaire: 200, texte: "http://x.fr" }), 21)
    for (const c of d.constats) {
      if (c.gravite !== "bon") expect(c.correction, c.titre).toBeTruthy()
    }
  })

  it("aucun texte affiché ne parle en jargon", () => {
    const d = diagnostiquer(lecture(), 21)
    const tout = JSON.stringify(d)
    for (const mot of ["quiet zone", "luminance relative", "ratio WCAG", "px/module", "ECC"]) {
      expect(tout).not.toContain(mot)
    }
  })

  it("image illisible : un seul constat, bloquant, avec une piste", () => {
    const d = diagnosticIllisible()
    expect(d.lisible).toBe(false)
    expect(d.constats).toHaveLength(1)
    expect(d.constats[0].gravite).toBe("bloquant")
    expect(d.constats[0].correction).toBeTruthy()
  })
})

it("la distance entre deux points est la bonne", () => {
  expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
})

describe("mesure des deux couleurs du code", () => {
  const grille = (valeurs: number[], largeur: number) => ({ gris: valeurs, largeur })

  it("sépare correctement du noir et du blanc", () => {
    const { gris, largeur } = grille([0, 255, 0, 255, 255, 0, 255, 0, 0], 3)
    const m = mesurerLuminances(gris, largeur, { x0: 0, y0: 0, x1: 2, y1: 2 })
    expect(m.sombre).toBe(0)
    expect(m.claire).toBe(255)
  })

  it("sépare deux couleurs qui ne sont ni noires ni blanches", () => {
    // Bleu nuit sur crème : « sombre » ne veut pas dire « proche du noir ».
    const { gris, largeur } = grille([40, 235, 40, 235, 235, 40, 235, 40, 40], 3)
    const m = mesurerLuminances(gris, largeur, { x0: 0, y0: 0, x1: 2, y1: 2 })
    expect(m.sombre).toBeCloseTo(40, 0)
    expect(m.claire).toBeCloseTo(235, 0)
    expect(contraste(m.sombre, m.claire)).toBeGreaterThan(7)
  })

  it("une zone vide ne plante pas", () => {
    const m = mesurerLuminances([], 0, { x0: 0, y0: 0, x1: 0, y1: 0 })
    expect(m.sombre).toBe(0)
    expect(m.claire).toBe(255)
  })

  it("une image d'une seule couleur ne prétend pas voir du contraste", () => {
    const m = mesurerLuminances([128, 128, 128, 128], 2, { x0: 0, y0: 0, x1: 1, y1: 1 })
    expect(contraste(m.sombre, m.claire)).toBeLessThan(1.1)
  })
})

// Six vraies images de QR codes ont été fabriquées puis passées dans le
// décodeur ; les valeurs ci-dessous sont celles qu'il a réellement rendues.
// Deux défauts du diagnostic ont été trouvés ainsi, invisibles en théorie :
// un contraste inventé sur une image unie, et une marge de 4 modules signalée
// comme trop courte alors qu'elle affichait « 4 modules ».
describe("six vraies images passées dans le décodeur", () => {
  const reel = (o: Partial<Lecture>, modules = 25): [Lecture, number] => [{
    texte: "https://qrowg.com/le-bistrot-parisien",
    hautGauche: { x: 72, y: 72 }, hautDroit: { x: 528, y: 72 }, basGauche: { x: 72, y: 528 },
    largeurImage: 600, hauteurImage: 600, luminanceSombre: 0, luminanceClaire: 255, ...o,
  }, modules]

  it("noir sur blanc, 600 px, marge 4 → prêt à imprimer", () => {
    expect(diagnostiquer(...reel({})).verdict).toMatch(/prêt à imprimer/)
  })

  it("bleu nuit sur crème → prêt à imprimer (une jolie couleur n'est pas un défaut)", () => {
    const d = diagnostiquer(...reel({ luminanceSombre: 24, luminanceClaire: 239 }))
    expect(d.verdict).toMatch(/prêt à imprimer/)
  })

  it("gris sur gris clair → contraste bloquant, mesuré à 2,5:1", () => {
    const d = diagnostiquer(...reel({ luminanceSombre: 133, luminanceClaire: 214 }))
    const c = d.constats.find(x => x.cle === "contraste")!
    expect(c.gravite).toBe("bloquant")
    expect(c.mesure).toMatch(/^2\.[456]:1$/)
  })

  it("sans marge → bloquant, et la mesure affichée est bien 0", () => {
    const d = diagnostiquer(...reel({
      hautGauche: { x: 0, y: 0 }, hautDroit: { x: 600, y: 0 }, basGauche: { x: 0, y: 600 },
    }))
    const m = d.constats.find(x => x.cle === "marge")!
    expect(m.gravite).toBe("bloquant")
    expect(m.mesure).toBe("0 modules")
  })

  it("60 px de côté → définition bloquante", () => {
    const d = diagnostiquer(...reel({
      hautGauche: { x: 8, y: 8 }, hautDroit: { x: 52, y: 8 }, basGauche: { x: 8, y: 52 },
      largeurImage: 60, hauteurImage: 60,
    }))
    expect(d.constats.find(x => x.cle === "module")!.gravite).toBe("bloquant")
  })

  it("la mesure affichée ne contient jamais la tolérance de mesure", () => {
    const d = diagnostiquer(...reel({
      hautGauche: { x: 0, y: 0 }, hautDroit: { x: 600, y: 0 }, basGauche: { x: 0, y: 600 },
    }))
    expect(JSON.stringify(d)).not.toContain("0.5 modules")
  })
})
