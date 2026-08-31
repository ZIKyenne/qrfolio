import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  STYLES_QR, STYLE_QR_DEFAUT, presetQr, formeQr,
  ENCRES_QR, FONDS_QR, nommerCouleur,
  NIVEAUX_ECC, ECC_DEFAUT, estEcc, eccOuDefaut,
  TYPES_QR, typesQr, estTypeDynamique, libelleTypeQr,
} from "./stylesQr"

const lire = (rel: string) => readFileSync(join(__dirname, rel), "utf8")
const TABLEAU_DE_BORD = lire("../app/dashboard/qr-link/page.tsx")
const GENERATEUR = lire("../app/generateur-qr-code/GeneratorClient.tsx")
const API = lire("../app/api/qr-instant/route.ts")

// Le générateur public et le tableau de bord fabriquent le MÊME objet, enregistré
// dans la MÊME colonne — et chacun recopiait ses tables. Elles avaient divergé.

describe("les deux écrans ne gardent aucune table locale", () => {
  it("aucun des deux ne redéclare les styles, les pastilles ou les niveaux", () => {
    for (const [nom, src] of [["tableau de bord", TABLEAU_DE_BORD], ["générateur public", GENERATEUR]] as const) {
      expect(src, `${nom} importe la table partagée`).toContain('from "@/lib/stylesQr"')
      for (const table of ["STYLE_PRESETS", "FG_SWATCHES", "BG_SWATCHES", "ECC_OPTS", "NOM_COULEUR"]) {
        expect(src, `${nom} redéclare ${table}`).not.toContain(`const ${table}`)
      }
      expect(src, `${nom} redéclare l'union des types`).not.toMatch(/type QrType\s*=/)
    }
  })

  it("aucun des deux ne réécrit une couleur ou un niveau par défaut en dur", () => {
    for (const [nom, src] of [["tableau de bord", TABLEAU_DE_BORD], ["générateur public", GENERATEUR]] as const) {
      expect(src, `${nom} : useState("carre")`).not.toMatch(/useState\(\s*"carre"\s*\)/)
      expect(src, `${nom} : couleur par défaut en dur`).not.toMatch(/useState\(\s*"#080808"\s*\)/)
    }
  })
})

describe("les styles", () => {
  it("le style « Luxe » existe et rend bien un QR luxe", () => {
    // C'était le défaut : 5 styles d'un côté, 4 de l'autre. Un QR enregistré en
    // « Luxe » relu par l'écran à 4 entrées retombait silencieusement sur « Carré ».
    expect(STYLES_QR.map(s => s.k)).toContain("luxe")
    expect(formeQr("luxe")).toEqual({ dotStyle: "luxury", cornerStyle: "luxury" })
  })

  it("chaque clé enregistrée se relit à l'identique", () => {
    for (const s of STYLES_QR) expect(presetQr(s.k)).toBe(s)
  })

  it("une clé inconnue retombe sur un style scannable, jamais sur rien", () => {
    for (const mauvais of ["", "  ", "inexistant", null, undefined, 7, {}]) {
      expect(presetQr(mauvais as never).k, String(mauvais)).toBe(STYLE_QR_DEFAUT)
    }
    expect(presetQr(STYLE_QR_DEFAUT).k).toBe(STYLE_QR_DEFAUT)
  })

  it("les clés sont uniques et les libellés aussi", () => {
    expect(new Set(STYLES_QR.map(s => s.k)).size).toBe(STYLES_QR.length)
    expect(new Set(STYLES_QR.map(s => s.label)).size).toBe(STYLES_QR.length)
  })
})

describe("les pastilles de couleur", () => {
  it("chacune a un nom lisible — un lecteur d'écran annonçait « dièse C 9 A 8 4 C »", () => {
    for (const c of [...ENCRES_QR, ...FONDS_QR]) {
      expect(nommerCouleur(c), c).not.toBe(c)
      expect(nommerCouleur(c).length, c).toBeGreaterThan(1)
    }
  })

  it("une couleur du sélecteur libre garde son code plutôt que rien", () => {
    expect(nommerCouleur("#123456")).toBe("#123456")
    expect(nommerCouleur(null)).toBe("")
  })

  it("le sarcelle, présent d'un seul côté, est bien dans la table commune", () => {
    expect(ENCRES_QR).toContain("#0F766E")
  })

  it("aucune pastille en double", () => {
    expect(new Set(ENCRES_QR).size).toBe(ENCRES_QR.length)
    expect(new Set(FONDS_QR).size).toBe(FONDS_QR.length)
  })
})

describe("la correction d'erreur", () => {
  it("couvre exactement les quatre niveaux, avec un seul libellé chacun", () => {
    // « Maximum » ici, « Max » là : deux mots pour le même réglage.
    expect(NIVEAUX_ECC.map(n => n.k)).toEqual(["L", "M", "Q", "H"])
    expect(new Set(NIVEAUX_ECC.map(n => n.label)).size).toBe(4)
  })

  it("un niveau abîmé en base retombe sur le défaut au lieu de passer", () => {
    expect(estEcc("Z")).toBe(false)
    expect(eccOuDefaut("Z")).toBe(ECC_DEFAUT)
    expect(eccOuDefaut(undefined)).toBe(ECC_DEFAUT)
    expect(eccOuDefaut("H")).toBe("H")
  })
})

describe("les types de QR", () => {
  const setDe = (nom: string) => {
    const m = API.match(new RegExp(`const ${nom} = new Set\\(\\[([^\\]]*)\\]`))
    if (!m) throw new Error(`${nom} introuvable dans l'API`)
    return m[1].split(",").map(x => x.trim().replace(/^"|"$/g, "")).filter(Boolean)
  }

  it("tout type que l'API accepte a un libellé français", () => {
    // La liste des QR enregistrés affichait la valeur brute de la colonne :
    // « link », « wifi », « sms » — les clés techniques, à des clients français.
    for (const kind of setDe("KINDS")) {
      const l = libelleTypeQr(kind)
      expect(l, kind).not.toBe(kind)
      expect(l, kind).toBeTruthy()
    }
  })

  it("un type inconnu ne casse rien et ne montre pas de vide", () => {
    expect(libelleTypeQr(null)).toBe("QR")
    expect(libelleTypeQr("")).toBe("QR")
    expect(libelleTypeQr("mystere")).toBe("mystere")
  })

  it("« redirigeable » veut dire la même chose ici et côté serveur", () => {
    const serveur = new Set(setDe("DYNAMIC_KINDS").filter(k => k !== "call")) // `call` = ancien alias de `phone`
    const client = new Set(TYPES_QR.filter(t => t.dynamique).map(t => t.k))
    expect([...client].sort()).toEqual([...serveur].sort())
  })

  it("WiFi et contact restent statiques : ils doivent marcher hors ligne", () => {
    expect(estTypeDynamique("wifi")).toBe(false)
    expect(estTypeDynamique("contact")).toBe(false)
    expect(estTypeDynamique("inconnu")).toBe(false)
  })

  it("un écran choisit son ordre sans recopier les libellés", () => {
    const offerts = typesQr(["link", "wifi", "text"])
    expect(offerts.map(t => t.k)).toEqual(["link", "wifi", "text"])
    expect(offerts.map(t => t.label)).toEqual(["Lien", "WiFi", "Texte"])
  })
})

describe("la fiche d'un QR enregistré montre ce qu'elle télécharge", () => {
  it("l'aperçu de la fiche applique le style enregistré", () => {
    // Elle affichait un QR carré quel que soit le style choisi, juste au-dessus
    // d'un bouton qui téléchargeait, lui, le vrai style.
    const fiche = TABLEAU_DE_BORD.slice(TABLEAU_DE_BORD.indexOf("size={196}") - 400, TABLEAU_DE_BORD.indexOf("size={196}") + 200)
    expect(fiche).toContain("formeQr(st.styleKey)")
    expect(fiche).toContain("ecc={st.ecc}")
  })
})
