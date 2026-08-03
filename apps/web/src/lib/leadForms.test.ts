import { describe, it, expect } from "vitest"
import { contactFormFields } from "./leadForms"

describe("contactFormFields", () => {
  it("par défaut : Nom, Email, Message (téléphone masqué)", () => {
    const f = contactFormFields({})
    expect(f.map(x => x.key)).toEqual(["name", "email", "message"])
  })

  it("les deux premiers champs = name puis email (contrat des champs requis)", () => {
    // LeadFormPublic exige les 2 premiers champs : ils DOIVENT être name + email.
    const f = contactFormFields({ show_phone: "yes" })
    expect(f[0].key).toBe("name")
    expect(f[1].key).toBe("email")
  })

  it("show_phone === 'yes' insère le téléphone entre email et message", () => {
    const f = contactFormFields({ show_phone: "yes" })
    expect(f.map(x => x.key)).toEqual(["name", "email", "phone", "message"])
  })

  it("toute autre valeur de show_phone laisse le téléphone masqué", () => {
    expect(contactFormFields({ show_phone: "no" }).map(x => x.key)).toEqual(["name", "email", "message"])
    expect(contactFormFields({ show_phone: "" }).map(x => x.key)).toEqual(["name", "email", "message"])
    expect(contactFormFields(undefined).map(x => x.key)).toEqual(["name", "email", "message"])
  })

  it("le message est une zone de texte (area), pas les autres", () => {
    const f = contactFormFields({ show_phone: "yes" })
    expect(f.find(x => x.key === "message")?.area).toBe(true)
    expect(f.find(x => x.key === "name")?.area).toBeUndefined()
    expect(f.find(x => x.key === "email")?.area).toBeUndefined()
  })
})
