import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const SRC = readFileSync(join(__dirname, "PrintStudioClient.tsx"), "utf8")

// « Trop de défauts partout, l'interface doit être méga simplifiée, pas 30 onglets
// à ouvrir et à faire défiler. » Cinq accordéons empilés dans une colonne de
// 372 px : pour changer une couleur puis une marge, il fallait replier l'un,
// déplier l'autre, et retrouver sa place dans le défilement.

describe("l'atelier : créer à gauche, régler à droite", () => {
  it("plus aucun accordéon", () => {
    expect(SRC, "le composant Panel (accordéon) est encore là").not.toMatch(/function Panel\(\{ id, title, resume/)
    expect(SRC, "un volet accordéon subsiste").not.toMatch(/<Panel\s+id=/)
  })

  it("un rail d'outils à gauche, avant l'aperçu", () => {
    const rail = SRC.indexOf('className="ps-rail"')
    const apercu = SRC.indexOf('className="ps-aside"')
    expect(rail, "le rail est absent").toBeGreaterThan(0)
    // En grille CSS, l'ordre des colonnes suit l'ordre du DOM : rail placé après
    // l'aperçu = rail au milieu et aperçu écrasé dans 64 px.
    expect(rail, "le rail doit précéder l'aperçu dans le DOM").toBeLessThan(apercu)
  })

  it("trois onglets de réglages, toujours visibles", () => {
    expect(SRC).toContain('role="tablist"')
    expect(SRC).toMatch(/const ONGLETS_DROITE = \[/)
    for (const l of ["Contenu", "Style", "Page"]) expect(SRC).toContain(`label: "${l}"`)
  })

  it("sélectionner un élément amène ses réglages sans rien chercher", () => {
    expect(SRC).toContain('useEffect(() => { if (selEl) setOngletDroite("selection") }, [selEl])')
  })

  it("les rangées de choix s'enroulent au lieu de cacher des options", () => {
    // Le défilement horizontal masquait la cinquième finition dans 356 px.
    const rail = SRC.slice(SRC.indexOf("function RailInline"), SRC.indexOf("function RailInline") + 500)
    expect(rail).toContain('flexWrap: "wrap"')
    expect(rail).not.toContain('overflowX: "auto"')
  })
})

describe("le contenu ne déborde plus du support", () => {
  it("le rendu passe par le calcul d'ajustement", () => {
    expect(SRC).toContain("from \"./ajustement\"")
    expect(SRC).toContain("const fit = pileVerticale ? ajusterAuSupport(besoin,")
  })

  it("le facteur s'applique au titre, aux textes et aux écarts", () => {
    expect(SRC).toContain("fontSize: titleSize * k")
    expect(SRC).toContain("fontSize: sizeRef * 0.05 * k")
    expect(SRC).toContain("const gap = ecartBloc * k")
  })

  it("le QR rendu est celui qu'on a ajusté", () => {
    expect(SRC).not.toMatch(/size=\{Math\.round\(qrPx\)\}/)
    expect(SRC).toContain("Math.round(qrPxFit)")
  })
})

describe("un modèle remplace le design, il ne se pose pas dessus", () => {
  const bloc = SRC.slice(SRC.indexOf("function applyTemplate"), SRC.indexOf("function updateEl"))

  it("remet à zéro ce qui appartenait au design précédent", () => {
    // Un titre agrandi à la main, un bloc décalé, un QR déplacé survivaient au
    // modèle suivant : c'est ce qui donnait le titre géant hors du cercle.
    for (const remise of ["setETitle(1)", "setEPad(1)", "setBlockY(0)", 'setQrPos("centre")', "setQrDx(0)", "setQrScale(1)", 'setTitleColor("")'])
      expect(bloc, `${remise} manque`).toContain(remise)
  })

  it("efface ce qui a été posé automatiquement, garde ce que l'utilisateur a ajouté", () => {
    expect(bloc).toContain('!e.id.startsWith("fc_")')
    expect(bloc).toMatch(/\^f_\\d\+_\\d\+\$/)
  })
})

describe("le support rond est traité comme un rond", () => {
  it("les équerres carrées cèdent la place au filet", () => {
    const i = SRC.indexOf('frame === "coins"')
    expect(SRC.slice(i, i + 700)).toContain("isRound")
  })

  it("le décor orné ne redessine pas les mêmes équerres par-dessus", () => {
    expect(SRC).toContain('layout.deco === "ornate" && frame !== "coins" && !isRound')
  })

  it("la vignette d'un modèle prend la forme du support", () => {
    const i = SRC.indexOf("function TemplateThumb")
    const bloc = SRC.slice(i, i + 1400)
    expect(bloc).toContain('const rond = item?.shape === "round"')
    expect(bloc).toContain('borderRadius: rond ? "50%"')
  })
})

// « Print Studio mobile » — l'aperçu passait DERRIÈRE la feuille de réglages :
// on réglait « Taille du QR » et « Pastille » sans jamais voir le QR. Capturé au
// téléphone (390 × 844) avant/après.
describe("mobile : la feuille ne cache jamais le support", () => {
  it("l'aperçu se dimensionne sur la bande, plus de 320 × 400 en dur", () => {
    expect(SRC, "taille d'aperçu figée encore présente").not.toMatch(/isMobile \? 320 : 500/)
    expect(SRC).toContain("dimensionsApercuMobile(")
    expect(SRC).toContain("bandeApercuMobile(")
  })

  it("la feuille ET l'aperçu partagent la MÊME hauteur calculée", () => {
    // Deux valeurs indépendantes finissent toujours par diverger : c'est comme ça
    // que le plafond du panneau (72 %) et celui du rendu (44 %) s'étaient
    // contredits sur le curseur de taille du QR.
    expect(SRC).toMatch(/const vhFeuille = isMobile/)
    expect(SRC).toMatch(/height: kb \? `calc\(74vh - \$\{kb\}px\)` : `\$\{vhFeuille\}vh`/)
    expect(SRC).toMatch(/bandeApercuMobile\(hauteurEcran, sheetOpen, vhFeuille\)/)
    // La hauteur brute de la position ne doit plus servir directement à la feuille.
    expect(SRC).not.toMatch(/`\$\{SHEET_VH\[sheetPos\]\}vh`/)
  })

  it("le nom du support est visible sur mobile aussi", () => {
    // L'entête ne disait que « Bibliothèque » : impossible de savoir ce qu'on réglait.
    expect(SRC).not.toMatch(/\{!isMobile && <span[^>]*>\{item\.name\}/)
  })

  it("le bouton plein écran ne se pose plus SUR le support", () => {
    // Ancré en haut à droite du conteneur, il recouvrait le coin des supports
    // larges (carte de visite, chevalet). Sur mobile il rejoint la légende.
    expect(SRC).toMatch(/\{!isMobile && <button onClick=\{e => \{ e\.stopPropagation\(\); setFsOpen\(true\) \}\}/)
  })

  it("plus de réserve de 172 px sous un aperçu déjà dimensionné", () => {
    expect(SRC).not.toContain('isMobile ? "0 12px 172px"')
  })
})
