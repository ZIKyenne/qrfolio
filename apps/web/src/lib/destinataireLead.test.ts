import { describe, it, expect } from "vitest"
import { adresseEmailValide, destinataireDuBloc } from "./destinataireLead"

// « Email destinataire » (quote_form) et « Email de contact booking »
// (booking_request) etaient proposes au commercant et lus par personne : les
// demandes partaient toujours vers l'adresse du compte. Un artisan qui routait
// ses devis vers devis@son-entreprise.fr ne recevait rien la-bas, et ne pouvait
// pas s'en apercevoir puisque les messages arrivaient quand meme, ailleurs.

describe("adresseEmailValide", () => {
  it("accepte une adresse simple", () => {
    expect(adresseEmailValide("devis@mon-entreprise.fr")).toBe("devis@mon-entreprise.fr")
    expect(adresseEmailValide("  contact@a.co  ")).toBe("contact@a.co")
    expect(adresseEmailValide("prenom.nom+devis@sous.domaine.example")).toBe("prenom.nom+devis@sous.domaine.example")
  })

  it("refuse ce qui n'est pas une adresse", () => {
    for (const v of ["", "   ", "pasdarobase", "a@b", "@b.co", "a@.co", "a@b.c", null, undefined, 42, {}, []]) {
      expect(adresseEmailValide(v as any), String(v)).toBeNull()
    }
  })

  it("refuse tout ce qui pourrait fabriquer un en-tete d'e-mail", () => {
    // Un en-tete se termine a la ligne : une adresse qui contient un retour a la
    // ligne permettrait d'en ajouter d'autres (Bcc, Reply-To…).
    for (const v of [
      "a@b.co\nBcc: victime@x.co",
      "a@b.co\r\nBcc: victime@x.co",
      "a@b.co\tx",
      "a@b.co, autre@x.co",
      "a@b.co;autre@x.co",
      "Nom <a@b.co>",
      'a"@b.co',
    ]) {
      expect(adresseEmailValide(v), v.replace(/[\r\n]/g, "\\n")).toBeNull()
    }
  })

  it("refuse une adresse demesuree", () => {
    expect(adresseEmailValide("a".repeat(250) + "@b.co")).toBeNull()
  })
})

describe("destinataireDuBloc", () => {
  const blocs = [
    { id: "b1", type: "quote_form", content: { title: "Devis", email_dest: "devis@atelier.fr" } },
    { id: "b2", type: "contact_form", content: { title: "Contact" } },
    { id: "b3", type: "booking_request", content: { email_dest: "  booking@agence.com  " } },
    { id: "b4", type: "quote_form", content: { email_dest: "a@b.co\nBcc: x@y.co" } },
  ]

  it("renvoie l'adresse saisie sur le bloc a l'origine du message", () => {
    expect(destinataireDuBloc(blocs, "b1")).toBe("devis@atelier.fr")
    expect(destinataireDuBloc(blocs, "b3")).toBe("booking@agence.com")
  })

  it("renvoie null quand il n'y a rien d'exploitable — l'appelant garde l'adresse du compte", () => {
    expect(destinataireDuBloc(blocs, "b2")).toBeNull()      // champ absent
    expect(destinataireDuBloc(blocs, "b4")).toBeNull()      // adresse piegee
    expect(destinataireDuBloc(blocs, "inconnu")).toBeNull()
    expect(destinataireDuBloc(blocs, "")).toBeNull()
    expect(destinataireDuBloc(blocs, null)).toBeNull()
    expect(destinataireDuBloc(null, "b1")).toBeNull()
    expect(destinataireDuBloc("pas un tableau", "b1")).toBeNull()
    expect(destinataireDuBloc([{ id: "b1" }], "b1")).toBeNull()
    expect(destinataireDuBloc([{ id: "b1", content: "texte" }], "b1")).toBeNull()
  })

  it("ne se laisse pas influencer par un autre bloc de la page", () => {
    // Le bloc vise est celui qui a envoye le message, pas le premier venu.
    expect(destinataireDuBloc(blocs, "b2")).toBeNull()
    expect(destinataireDuBloc([...blocs].reverse(), "b1")).toBe("devis@atelier.fr")
  })

  it("ne lit rien d'autre que email_dest", () => {
    const piege = [{ id: "b1", content: { email: "compte@x.co", to: "autre@x.co" } }]
    expect(destinataireDuBloc(piege, "b1")).toBeNull()
  })
})
