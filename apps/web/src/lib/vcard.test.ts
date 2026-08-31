import { describe, it, expect } from "vitest"
import { construireVCard, separerNom, echapperVCard } from "./vcard"

describe("la vCard respecte la norme", () => {
  it("sépare ses lignes en CRLF", () => {
    // Le générateur de QR joignait en LF simple : une partie des lecteurs
    // Android et des importeurs de contacts refusent une vCard ainsi formée.
    const v = construireVCard({ prenom: "Sophie", nom: "Martin" })
    expect(v).toContain("\r\n")
    expect(v.split("\r\n").join("")).not.toContain("\n")
  })

  it("ouvre et ferme correctement", () => {
    const l = construireVCard({ prenom: "Sophie" }).split("\r\n")
    expect(l[0]).toBe("BEGIN:VCARD")
    expect(l[1]).toBe("VERSION:3.0")
    expect(l[l.length - 1]).toBe("END:VCARD")
  })

  it("porte toujours un FN, obligatoire dans la norme", () => {
    expect(construireVCard({ prenom: "Sophie", nom: "Martin" })).toContain("FN:Sophie Martin")
    expect(construireVCard({ nomComplet: "Jean Dupont" })).toContain("FN:Jean Dupont")
  })

  it("remplit le nom structuré N dans l'ordre nom;prénom", () => {
    expect(construireVCard({ prenom: "Sophie", nom: "Martin" })).toContain("N:Martin;Sophie;;;")
    expect(construireVCard({ nomComplet: "Jean Paul Dupont" })).toContain("N:Dupont;Jean Paul;;;")
  })
})

describe("ce qu'elle refuse de produire", () => {
  it("rien du tout quand il n'y a pas de quoi nommer la fiche", () => {
    for (const c of [{}, { telephone: "0612345678" }, { prenom: "   " }, { nomComplet: "  " }]) {
      expect(construireVCard(c), JSON.stringify(c)).toBe("")
    }
  })
})

describe("les champs facultatifs", () => {
  it("n'apparaissent que s'ils sont renseignés", () => {
    const nu = construireVCard({ prenom: "Sophie" })
    for (const champ of ["ORG:", "TITLE:", "TEL", "EMAIL", "URL:", "ADR"]) {
      expect(nu, champ).not.toContain(champ)
    }
  })

  it("sont tous portés quand ils le sont", () => {
    const v = construireVCard({
      prenom: "Sophie", nom: "Martin", organisation: "Le Comptoir", fonction: "Gérante",
      telephone: "+33 6 12 34 56 78", email: "sophie@comptoir.fr",
      siteWeb: "https://comptoir.fr", adresse: "12 rue des Lilas, Lyon",
    })
    expect(v).toContain("ORG:Le Comptoir")
    expect(v).toContain("TITLE:Gérante")
    expect(v).toContain("TEL;TYPE=CELL:+33 6 12 34 56 78")
    expect(v).toContain("EMAIL;TYPE=INTERNET:sophie@comptoir.fr")
    expect(v).toContain("URL:https://comptoir.fr")
    // L'adresse n'existait que dans l'un des deux générateurs.
    expect(v).toContain("ADR;TYPE=WORK:;;12 rue des Lilas\\, Lyon;;;;")
  })
})

describe("l'échappement", () => {
  it("protège les caractères réservés", () => {
    expect(echapperVCard("a,b")).toBe("a\\,b")
    expect(echapperVCard("a;b")).toBe("a\\;b")
    expect(echapperVCard("a\\b")).toBe("a\\\\b")
    expect(echapperVCard("a\nb")).toBe("a\\nb")
  })

  it("empêche un nom de casser la structure de la fiche", () => {
    // Sans échappement, un nom contenant un retour à la ligne insérerait une
    // fausse propriété dans la vCard.
    const v = construireVCard({ prenom: "Sophie\nTEL:0000000000", nom: "Martin" })
    expect(v.split("\r\n").filter(l => l.startsWith("TEL"))).toEqual([])
  })

  it("survit à une valeur absente", () => {
    expect(echapperVCard(null)).toBe("")
    expect(echapperVCard(undefined)).toBe("")
  })
})

describe("la séparation du nom", () => {
  it("met le dernier mot en nom de famille", () => {
    expect(separerNom("Jean Dupont")).toEqual({ prenom: "Jean", nom: "Dupont" })
    expect(separerNom("Jean Paul Dupont")).toEqual({ prenom: "Jean Paul", nom: "Dupont" })
  })

  it("laisse un mot unique en prénom", () => {
    expect(separerNom("Sophie")).toEqual({ prenom: "Sophie", nom: "" })
  })

  it("ne jette pas sur du vide", () => {
    expect(separerNom("")).toEqual({ prenom: "", nom: "" })
    expect(separerNom(undefined)).toEqual({ prenom: "", nom: "" })
  })
})
