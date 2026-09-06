import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { SANS_ACCENT, estProse, motsSansAccent } from "./accents"

const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")

// Les surfaces que lisent des humains — le commerçant dans l'éditeur, et surtout
// SES clients sur la page publiée. Ailleurs (code interne, commentaires), on laisse.
const SURFACES = [
  "../app/dashboard/templates/page.tsx",      // noms, descriptions et contenu des modèles
  "../app/dashboard/builder/blockDefs.ts",    // libellés et aides de la bibliothèque
  "../app/[slug]/PublicPageClient.tsx",       // ce que voit un client qui scanne
  "../app/[slug]/renduLegacy.tsx",           // et le rendu legacy, charge a la demande
  "../app/dashboard/qr-codes/QRStudio.tsx",
  "../app/dashboard/profile/page.tsx",
]

describe("le français lu par les clients est écrit correctement", () => {
  for (const f of SURFACES) {
    it(`${f.split("/").pop()} n'a plus de mot sans accent`, () => {
      const fautes = motsSansAccent(lire(f))
      expect(fautes, `mots à corriger dans ${f}`).toEqual([])
    })
  }
})

describe("la règle ne s'applique qu'à la prose", () => {
  it("laisse tranquilles les identifiants, clés et couleurs", () => {
    for (const t of ["event_info", "reservation", "#C9A84C", "evenement", "Bien-etre"]) {
      expect(estProse(t), t).toBe(false)
    }
  })

  it("laisse tranquille le CSS — une leçon apprise à la dure", () => {
    // L'outil de correction a transformé `text-decoration:none` en `text-décoration`
    // dans une feuille de style d'email avant qu'on lui interdise.
    expect(estProse("text-decoration:none;color:#F5F0E8;")).toBe(false)
    expect(estProse("display:inline-block;padding:15px 34px;")).toBe(false)
    expect(motsSansAccent('const s = "text-decoration:none; font-family:Arial;"')).toEqual([])
  })

  it("laisse tranquille le code et les URL", () => {
    expect(estProse("https://exemple.fr/ma page")).toBe(false)
    expect(estProse("() => setOpen(true)")).toBe(false)
  })

  it("mais attrape bien une vraie phrase", () => {
    expect(estProse("Cuisine francaise depuis 1985")).toBe(true)
    expect(motsSansAccent('const t = "Cuisine francaise depuis 1985"')).toEqual(["francaise"])
    expect(motsSansAccent('const t = "Reserver une table"')).toEqual(["Reserver"])
  })
})

describe("le dictionnaire reste sans ambiguïté", () => {
  it("n'accentue jamais un mot qui existe aussi sans accent", () => {
    // « cree » (créé/crée), « des » (dès), « ou » (où), « a » (à) : impossibles à
    // trancher sans comprendre la phrase. Ils n'ont rien à faire ici.
    for (const piege of ["cree", "des", "ou", "a", "sur", "la", "mur", "cote", "tache", "pecheur"]) {
      expect(Object.keys(SANS_ACCENT), `${piege} est ambigu`).not.toContain(piege)
    }
  })

  it("chaque correction change réellement quelque chose", () => {
    for (const [avant, apres] of Object.entries(SANS_ACCENT)) {
      expect(apres, avant).not.toBe(avant)
      expect(apres.normalize("NFD").replace(/[̀-ͯ]/g, "")).toBe(avant)
    }
  })
})
