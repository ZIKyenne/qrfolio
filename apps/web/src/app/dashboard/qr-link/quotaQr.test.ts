import { describe, it, expect } from "vitest"
import { etatQuota } from "./quotaQr"

const stat = (n: number) => Array.from({ length: n }, () => ({ dynamic: false }))
const modif = (n: number) => Array.from({ length: n }, () => ({ dynamic: true }))

describe("un compte gratuit", () => {
  it("part avec trois QR dont un modifiable", () => {
    const e = etatQuota("free", [])
    expect(e.restants).toBe(3)
    expect(e.restantsModifiables).toBe(1)
    expect(e.peutEnregistrer).toBe(true)
    expect(e.peutCreerModifiable).toBe(true)
    expect(e.raison).toBeNull()
  })

  it("garde ses QR simples quand le modifiable est pris", () => {
    const e = etatQuota("free", modif(1))
    expect(e.peutCreerModifiable).toBe(false)
    expect(e.peutEnregistrer).toBe(true)
    expect(e.raisonModifiable).toContain("QR modifiable")
    expect(e.raisonModifiable).toContain("non modifiable") // dit ce qui reste possible
    expect(e.raison).toBeNull()                            // ...et ne bloque pas le reste
  })

  it("est complet à trois QR, quelle qu'en soit la nature", () => {
    const e = etatQuota("free", [...stat(2), ...modif(1)])
    expect(e.peutEnregistrer).toBe(false)
    expect(e.peutCreerModifiable).toBe(false)
    expect(e.raison).toContain("3 QR")
    expect(e.raison).toContain("Gratuit")
  })
})

describe("le refus dit quoi faire", () => {
  it("nomme le plan, le nombre, et la sortie", () => {
    const e = etatQuota("starter", stat(7))
    expect(e.raison).toContain("7 QR")
    expect(e.raison).toContain("Starter")
    expect(e.raison).toContain("Supprimez-en un")
  })

  it("ne parle jamais d'essai ni d'expiration", () => {
    // Un QR collé sur une table ne meurt plus au bout de 30 jours : plus aucun
    // message ne doit le laisser croire.
    for (const p of ["free", "starter", "pro", "business"]) {
      const e = etatQuota(p, [...stat(40), ...modif(40)])
      for (const t of [e.raison, e.raisonModifiable]) {
        if (!t) continue
        expect(t).not.toMatch(/essai|expir|30 jours|\/ ?mois/i)
      }
    }
  })

  it("ne se contredit jamais : bloquer tout implique bloquer le modifiable", () => {
    for (const p of ["free", "starter", "pro"]) {
      const e = etatQuota(p, stat(99))
      expect(e.peutEnregistrer).toBe(false)
      expect(e.peutCreerModifiable).toBe(false)
      expect(e.raisonModifiable).toBe(e.raison) // une seule phrase, pas deux
    }
  })
})

describe("le plan Business", () => {
  it("n'annonce aucune limite", () => {
    const e = etatQuota("business", [...stat(500), ...modif(500)])
    expect(e.restants).toBeNull()
    expect(e.restantsModifiables).toBeNull()
    expect(e.peutEnregistrer).toBe(true)
    expect(e.peutCreerModifiable).toBe(true)
    expect(e.raison).toBeNull()
    expect(e.raisonModifiable).toBeNull()
  })
})

describe("les paliers intermédiaires", () => {
  it("Pro donne 35 QR dont 25 modifiables", () => {
    const e = etatQuota("pro", [])
    expect(e.restants).toBe(35)
    expect(e.restantsModifiables).toBe(25)
  })

  it("un plan inconnu retombe sur le gratuit, jamais sur l'illimité", () => {
    const e = etatQuota("plan_qui_nexiste_pas", stat(3))
    expect(e.peutEnregistrer).toBe(false)
  })
})
