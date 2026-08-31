import { describe, it, expect } from "vitest"
import { etatLien, dateLisible, styleSur, type InstantQr } from "./instantQr"

const T0 = Date.parse("2026-08-30T12:00:00Z")
const qr = (p: Partial<InstantQr>): Pick<InstantQr, "dynamic" | "status" | "expires_at"> =>
  ({ dynamic: true, status: "active", expires_at: null, ...p })

describe("l'état d'un QR se dit d'une seule voix", () => {
  it("badge et phrase décrivent toujours la même situation", () => {
    // Deux fonctions séparées se contredisaient dans la même fenêtre : l'une
    // annonçait un essai qui expire, l'autre un lien permanent.
    const cas = [
      qr({ dynamic: false }),
      qr({ status: "expired" }),
      qr({ status: "paused" }),
      qr({ expires_at: null }),
      qr({ expires_at: "2026-09-05T12:00:00Z" }),
      qr({ expires_at: "2026-08-01T12:00:00Z" }),
    ]
    for (const c of cas) {
      const e = etatLien(c, T0)
      const badgeDitExpire = e.badge === "Expiré"
      const phraseDitExpire = e.phrase === "Expiré"
      expect(badgeDitExpire, JSON.stringify(c)).toBe(e.expire)
      expect(phraseDitExpire, JSON.stringify(c)).toBe(e.expire)
      // Un compte à rebours annoncé dans la pastille doit l'être aussi en toutes lettres.
      expect(e.badge.startsWith("Expire dans"), JSON.stringify(c)).toBe(e.phrase.startsWith("Expire dans"))
    }
  })

  it("un QR sans date de fin ne parle jamais d'expiration", () => {
    const e = etatLien(qr({ expires_at: null }), T0)
    expect(e.badge).toBe("Actif")
    expect(e.phrase).not.toMatch(/xpir/i)
    expect(e.expire).toBe(false)
  })

  it("compte les jours qui restent avant une date programmée", () => {
    const e = etatLien(qr({ expires_at: "2026-09-05T12:00:00Z" }), T0)
    expect(e.badge).toBe("Expire dans 6 j")   // 30 août midi -> 5 septembre midi
    expect(e.phrase).toContain("6 j")
    expect(e.phrase).toContain("5 septembre")
    expect(e.expire).toBe(false)
  })

  it("passe aux heures puis aux minutes quand l'échéance approche", () => {
    expect(etatLien(qr({ expires_at: "2026-08-30T15:30:00Z" }), T0).phrase).toMatch(/3 h 30 min/)
    expect(etatLien(qr({ expires_at: "2026-08-30T12:07:00Z" }), T0).phrase).toMatch(/^Expire dans 7 min/)
  })

  it("une date déjà passée est expirée, même si le statut dit actif", () => {
    const e = etatLien(qr({ status: "active", expires_at: "2026-08-01T12:00:00Z" }), T0)
    expect(e.expire).toBe(true)
    expect(e.badge).toBe("Expiré")
  })

  it("un QR statique n'a ni pause ni expiration", () => {
    const e = etatLien(qr({ dynamic: false, expires_at: "2026-01-01T00:00:00Z" }), T0)
    expect(e.expire).toBe(false)
    expect(e.phrase).toContain("n'expire pas")
  })

  it("ne jette jamais sur une donnée abîmée", () => {
    for (const c of [null, undefined, qr({ expires_at: "pas-une-date" })]) {
      expect(() => etatLien(c as never, T0)).not.toThrow()
    }
    expect(etatLien(qr({ expires_at: "pas-une-date" }), T0).badge).toBe("Actif")
  })
})

describe("le style enregistré", () => {
  it("refuse un niveau de correction inventé", () => {
    // `ecc` était passé tel quel à un type littéral : une valeur abîmée en base
    // passait la compilation et cassait le rendu.
    expect(styleSur({ style: { ecc: "Z" as never } }).ecc).toBe("M")
    expect(styleSur({ style: { ecc: "H" } }).ecc).toBe("H")
  })

  it("donne des couleurs lisibles quand rien n'est enregistré", () => {
    const s = styleSur(null)
    expect(s.fg).toBe("#080808")
    expect(s.bg).toBe("#FFFFFF")
    expect(s.styleKey).toBe("carre")
  })
})

describe("les dates affichées", () => {
  it("restent vides plutôt que d'écrire « Invalid Date »", () => {
    expect(dateLisible(null)).toBe("")
    expect(dateLisible("")).toBe("")
    expect(dateLisible("n'importe quoi")).toBe("")
  })

  it("s'écrivent à la française", () => {
    expect(dateLisible("2026-08-30T12:00:00Z")).toMatch(/30 août/)
  })
})
