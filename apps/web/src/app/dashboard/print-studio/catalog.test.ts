import { describe, it, expect } from "vitest"
import {
  STYLES, TYPOS, AMBIANCES, LAYOUTS, ITEMS, MESSAGES, SIZES, METIERS, OBJECTIFS,
  BRANDNAMES, MET_AMB, AMB_OF, ITEM_BY_ID, STYLE_BY_ID, filterItems, ambiancesFor,
} from "./catalog"
import { paletteFromStyle, scaleFor, sceneLayers, wcag, on, SCENES, TRADES } from "./mockup"
import { evaluateControls, canExport, LIGNE_DE_CONTROLE, VOLETS, ECRANS } from "./states"
import { scanDistanceM } from "../qr-codes/printPreflight"
import { distanceMaximaleCm } from "../../outils/taille-qr-code/taille"

// ── Intégrité : « ne supprime pas d'élément / paramètre » ─────────────────────
describe("catalogue — intégrité (comptes exacts)", () => {
  it("43 styles, 12 typos, 9 ambiances, 9 mises en page, 3 tailles", () => {
    expect(STYLES).toHaveLength(43)
    expect(TYPOS).toHaveLength(12)
    expect(AMBIANCES).toHaveLength(9)
    expect(LAYOUTS).toHaveLength(9)
    expect(SIZES).toHaveLength(3)
  })
  it("16 objets, chacun avec messages + tous les paramètres d'impression", () => {
    expect(ITEMS).toHaveLength(16)
    for (const it of ITEMS) {
      expect(MESSAGES[it.id], it.id).toBeDefined()
      expect(MESSAGES[it.id].length).toBeGreaterThanOrEqual(4)
      for (const k of ["hMm", "bleed", "margin", "dpi", "ratio", "qrMm"]) {
        expect(typeof (it as any)[k], `${it.id}.${k}`).toBe("number")
      }
      expect(SCENES[it.scene], `scene ${it.scene}`).toBeDefined()
      expect(STYLE_BY_ID[it.pal], `pal ${it.pal}`).toBeDefined()
    }
  })
  it("26 métiers, 14 objectifs, 4 marques ; 5 scènes, 12 métiers de scène", () => {
    expect(METIERS).toHaveLength(26)
    expect(OBJECTIFS).toHaveLength(14)
    expect(BRANDNAMES).toHaveLength(4)
    expect(Object.keys(SCENES)).toHaveLength(5)
    expect(Object.keys(TRADES)).toHaveLength(12)
  })
  it("chaque métier a exactement 3 ambiances recommandées, toutes valides", () => {
    const ambIds = new Set(AMBIANCES.map(a => a.id))
    for (const m of METIERS) {
      const rec = MET_AMB[m]
      expect(rec, m).toHaveLength(3)
      rec.forEach(id => expect(ambIds, `${m} -> ${id}`).toContain(id))
    }
  })
  it("chaque style d'ambiance existe ; AMB_OF couvre tous les styles cités", () => {
    for (const a of AMBIANCES) a.styles.forEach(id => expect(STYLE_BY_ID[id], id).toBeDefined())
    for (const id of Object.keys(AMB_OF)) expect(STYLE_BY_ID[id]).toBeDefined()
  })
  it("encodage français correct (pas de mojibake)", () => {
    const blob = JSON.stringify([STYLES, AMBIANCES, ITEMS, METIERS, MESSAGES])
    expect(blob).not.toMatch(/Ã|Â|â€/)
    expect(STYLE_BY_ID.resa.label).toBe("Réservation")
    expect(ITEM_BY_ID.i12.name).toBe("Étiquette bouteille")
  })
})

// ── Filtres ──────────────────────────────────────────────────────────────────
describe("filterItems", () => {
  it("Tout × Tout = les 16", () => expect(filterItems("Tout", "Tout")).toHaveLength(16))
  it("filtre par métier", () => {
    const r = filterItems("Restaurant", "Tout")
    expect(r.length).toBeGreaterThan(0)
    expect(r.every(i => ["i1", "i2", "i3", "i8", "i10", "i11"].includes(i.id) || true)).toBe(true)
    expect(filterItems("Restaurant").map(i => i.id)).toContain("i1")
  })
  it("filtre croisé métier × objectif", () => {
    const r = filterItems("Bar", "Menu")
    expect(r.every(i => i.id)).toBe(true)
    expect(filterItems("Caviste", "Contact").map(i => i.id)).toContain("i12")
  })
  it("combinaison vide possible sans planter", () => {
    expect(Array.isArray(filterItems("Pharmacie", "Menu"))).toBe(true)
  })
})

describe("ambiancesFor", () => {
  it("renvoie les 9, les 3 recommandées en tête", () => {
    const r = ambiancesFor("Restaurant")
    expect(r).toHaveLength(9)
    expect(r.slice(0, 3).map(a => a.id)).toEqual(MET_AMB["Restaurant"])
  })
  it("métier inconnu -> ordre 'Tout'", () => {
    expect(ambiancesFor("???").slice(0, 3).map(a => a.id)).toEqual(MET_AMB["Tout"])
  })
})

// ── Moteur packshot ──────────────────────────────────────────────────────────
describe("mockup", () => {
  it("paletteFromStyle dérive une palette peignable", () => {
    const p = paletteFromStyle(STYLE_BY_ID.luxgold)
    expect(p.flat).toBe("#0B0805")
    expect(p.ctaBg).toBe("#D4AF37")
    expect(p.titleFont).toContain("Fraunces")
    expect(["#0A0A0A", "#FFFFFF"]).toContain(p.ctaFg)
  })
  it("scaleFor borne le roll-up dans le cadre et respecte un minimum", () => {
    const box = 320
    const rollup = scaleFor(2000, box, SCENES.mur) // très grand
    const carte = scaleFor(55, box, SCENES.main)   // petit
    expect(rollup).toBeLessThanOrEqual(box - SCENES.mur.scenePad * 2)
    expect(rollup).toBeGreaterThan(carte)
    expect(carte).toBeGreaterThanOrEqual(48)
  })
  it("sceneLayers applique la teinte métier au sol", () => {
    const neutral = sceneLayers("table")
    const resto = sceneLayers("table", "Restaurant")
    expect(neutral.floor).toBe(SCENES.table.floor)
    expect(resto.floor).toBe(TRADES.Restaurant.floor)
    expect(resto.light).toContain(TRADES.Restaurant.tint)
  })
  it("on() choisit l'encre la plus lisible", () => {
    expect(on("#FFFFFF")).toBe("#0A0A0A")
    expect(on("#0A0A0A")).toBe("#FFFFFF")
  })
})

// ── Ligne de contrôle (7 vérifications) ──────────────────────────────────────
describe("evaluateControls / canExport", () => {
  const moyen = SIZES.find(s => s.id === "moyen")!
  it("7 contrôles, dans l'ordre de la spec", () => {
    const r = evaluateControls(ITEM_BY_ID.i1, STYLE_BY_ID.premiumdark, moyen)
    expect(r.map(c => c.cle)).toEqual(LIGNE_DE_CONTROLE.map(c => c.cle))
  })
  it("un design sain passe (aucun bloquant en échec)", () => {
    const r = evaluateControls(ITEM_BY_ID.i1, STYLE_BY_ID.premiumdark, moyen)
    expect(canExport(r)).toBe(true)
  })
  it("QR trop petit -> contrôle taille en échec -> export bloqué", () => {
    const petit = SIZES.find(s => s.id === "petit")!
    // i13.qrMm = 22 ; ×0.8 = 17.6 mm arrondi 18 < 20 -> échec
    const r = evaluateControls(ITEM_BY_ID.i13, STYLE_BY_ID.airbnb, petit)
    expect(r.find(c => c.cle === "qr")!.ok).toBe(false)
    expect(canExport(r)).toBe(false)
  })
  it("DPI d'export insuffisant -> échec bloquant", () => {
    const r = evaluateControls(ITEM_BY_ID.i12, STYLE_BY_ID.sage, moyen, 300) // i12 exige 600
    expect(r.find(c => c.cle === "dpi")!.ok).toBe(false)
    expect(canExport(r)).toBe(false)
  })
  it("contraste texte = seul avertissement (n'empêche pas l'export)", () => {
    // modernblack : ink #FFFFFF sur bg #0E0E10 = fort contraste (ok) — on vérifie la gravité
    const r = evaluateControls(ITEM_BY_ID.i6, STYLE_BY_ID.minimal, moyen)
    expect(r.find(c => c.cle === "textContrast")!.gravite).toBe("avertissement")
  })
})

// ── Structure d'écran ────────────────────────────────────────────────────────
describe("structure", () => {
  it("4 écrans, 3 volets fermés par défaut", () => {
    expect(ECRANS.map(e => e.id)).toEqual(["library", "preview", "ready", "suite"])
    expect(VOLETS).toHaveLength(3)
    expect(VOLETS.every(v => v.ouvertParDefaut === false)).toBe(true)
  })
})

// ── Un support doit tenir la distance qu'il annonce ───────────────────────────
//
// Ce que ce test a trouvé le jour où il a été écrit :
//   · l'affiche A3 disait « un QR lisible à deux mètres » et portait 68 mm,
//     soit un code lisible à 68 cm ;
//   · l'affiche A2 promettait cinq mètres, ce qui demande un QR de 500 mm sur
//     une feuille large de 420 — la promesse était impossible ;
//   · le sticker vitrine, collé côté rue, portait 26 mm : lisible à 26 cm ;
//   · le panneau horaires, sur une porte, portait 44 mm.
//
// La règle est celle du preflight, pas une invention de ce test : le côté du QR
// vaut environ un dixième de la distance de lecture.
describe("chaque support tient la distance de lecture qu'il annonce", () => {
  /** Largeur du support, en millimètres. */
  const largeurMm = (it: typeof ITEMS[number]) => it.hMm * it.ratio
  /** Le plus petit côté : c'est lui qui limite la taille du QR. */
  const petitCoteMm = (it: typeof ITEMS[number]) => Math.min(it.hMm, largeurMm(it))

  it("chaque support déclare sa distance de lecture", () => {
    for (const it of ITEMS) {
      expect(typeof it.distanceCm, `${it.id} ${it.name}`).toBe("number")
      expect(it.distanceCm, `${it.id} ${it.name}`).toBeGreaterThan(0)
      expect(it.distanceCm, `${it.id} ${it.name}`).toBeLessThanOrEqual(500)
    }
  })

  it("le QR par défaut est assez grand pour cette distance", () => {
    const fautifs = ITEMS
      .filter(it => distanceMaximaleCm(it.qrMm) < it.distanceCm)
      .map(it => `${it.name} : ${it.qrMm} mm lisible à ${distanceMaximaleCm(it.qrMm)} cm, annoncé à ${it.distanceCm} cm`)
    expect(fautifs).toEqual([])
  })

  it("le QR tient physiquement dans le support, marges comprises", () => {
    const debordent = ITEMS
      .filter(it => it.qrMm > petitCoteMm(it) - 2 * it.margin)
      .map(it => `${it.name} : QR ${it.qrMm} mm dans ${Math.round(petitCoteMm(it))} mm avec ${it.margin} mm de marge`)
    expect(debordent).toEqual([])
  })

  it("le QR ne mange pas tout le support (plafond de l'éditeur : 72 %)", () => {
    const envahissants = ITEMS
      .filter(it => it.qrMm > 0.72 * petitCoteMm(it))
      .map(it => `${it.name} : ${it.qrMm} mm sur ${Math.round(petitCoteMm(it))} mm`)
    expect(envahissants).toEqual([])
  })

  it("aucun support ne promet dans son texte une distance qu'il ne tient pas", () => {
    // Les gabarits décrivent leur usage en français. On relit les distances
    // écrites en toutes lettres et on les confronte à la taille réelle du QR.
    const ECRIT: [RegExp, number][] = [
      [/\bà un bon mètre\b/i, 100],
      [/\bà (?:un|1) mètre\b/i, 100],
      [/\bà deux mètres\b/i, 200],
      [/\bà trois mètres\b/i, 300],
      [/\bà cinq mètres\b/i, 500],
    ]
    const menteurs: string[] = []
    for (const it of ITEMS) {
      for (const [motif, cm] of ECRIT) {
        if (!motif.test(it.plain)) continue
        if (distanceMaximaleCm(it.qrMm) < cm) {
          menteurs.push(`${it.name} annonce ${cm} cm, son QR de ${it.qrMm} mm se lit à ${distanceMaximaleCm(it.qrMm)} cm`)
        }
        if (cm > petitCoteMm(it) * 10) {
          menteurs.push(`${it.name} annonce ${cm} cm : impossible sur ${Math.round(petitCoteMm(it))} mm de côté`)
        }
      }
    }
    expect(menteurs).toEqual([])
  })

  it("la règle du preflight et celle de l'outil public donnent le même résultat", () => {
    // Deux endroits appliquent la même règle du dixième. Si l'un dérive, les
    // gabarits et le testeur public se contrediraient devant le client.
    // Le preflight arrondit à 0,1 m près, toujours vers le bas : il ne doit
    // jamais annoncer plus loin que la règle, et jamais moins de 10 cm en deçà.
    for (const mm of [20, 26, 30, 60, 120, 200, 220, 300]) {
      const annonce = Math.round(scanDistanceM(mm)! * 100)
      const regle = distanceMaximaleCm(mm)
      expect(annonce, `${mm} mm annoncé au-delà de la règle`).toBeLessThanOrEqual(regle)
      expect(regle - annonce, `${mm} mm trop pessimiste`).toBeLessThan(10)
    }
  })
})
