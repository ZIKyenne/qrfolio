import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  SOURCES_CONNUES, SOURCE_SCAN, SOURCE_PAR_DEFAUT,
  estUnCode, codeDansUrl, sourceRetenue, appareilRetenu,
} from "./sourceVue"

// L'identifiant de la page est dans le HTML de chaque page publique. Il suffisait
// de le relever et de boucler POST /api/track {"source":"qr_scan"} pour fabriquer
// des scans — et le premier appel envoyait « Votre premier scan » au propriétaire.

describe("la source ne se déclare plus librement", () => {
  it("« qr_scan » sans preuve ne passe pas", () => {
    expect(sourceRetenue("qr_scan", false)).toBe(SOURCE_PAR_DEFAUT)
  })

  it("« qr_scan » avec preuve passe", () => {
    expect(sourceRetenue("qr_scan", true)).toBe(SOURCE_SCAN)
    // La preuve prime : même une source annoncée fantaisiste devient un scan.
    expect(sourceRetenue("n'importe quoi", true)).toBe(SOURCE_SCAN)
  })

  it("une source inconnue devient « direct » au lieu d'entrer brute en base", () => {
    for (const brut of ["<script>", "", null, undefined, 42, "GOOGLE!!", "x".repeat(200)]) {
      expect(sourceRetenue(brut as never, false), String(brut)).toBe(SOURCE_PAR_DEFAUT)
    }
  })

  it("laisse passer les sources que le produit sait nommer", () => {
    for (const s of SOURCES_CONNUES) {
      if (s === SOURCE_SCAN) continue
      expect(sourceRetenue(s, false), s).toBe(s)
      expect(sourceRetenue(s.toUpperCase(), false), s).toBe(s)
    }
  })

  it("l'appareil aussi est borné", () => {
    expect(appareilRetenu("mobile")).toBe("mobile")
    expect(appareilRetenu("Desktop")).toBe("desktop")
    expect(appareilRetenu("frigo connecté")).toBe("unknown")
    expect(appareilRetenu(null)).toBe("unknown")
  })
})

describe("le code de support lu dans l'URL de la page", () => {
  it("est extrait du paramètre posé par la redirection", () => {
    expect(codeDansUrl("https://qrowg.com/menu?s=abc123")).toBe("abc123")
    expect(codeDansUrl("https://qrowg.com/menu?utm_source=x&s=A-b_9")).toBe("A-b_9")
  })

  it("vaut null quand il n'y en a pas, ou qu'il est douteux", () => {
    expect(codeDansUrl("https://qrowg.com/menu")).toBeNull()
    expect(codeDansUrl("https://qrowg.com/menu?s=" + "x".repeat(41))).toBeNull()
    expect(codeDansUrl("https://qrowg.com/menu?s=../../etc")).toBeNull()
    expect(codeDansUrl("pas une url")).toBeNull()
    expect(codeDansUrl(null)).toBeNull()
  })

  it("reconnaît un code valide et refuse le reste", () => {
    expect(estUnCode("abc123")).toBe(true)
    expect(estUnCode("a b")).toBe(false)
    expect(estUnCode("")).toBe(false)
    expect(estUnCode(7)).toBe(false)
  })
})

describe("la route applique bien ces règles", () => {
  const route = readFileSync(join(__dirname, "../app/api/track/route.ts"), "utf8")

  it("n'écrit plus la source annoncée telle quelle", () => {
    expect(route).toContain("sourceRetenue(body.source, scanProuve)")
    expect(route, "l'ancienne lecture brute est encore là").not.toContain('const source = str(body.source, 40)')
  })

  it("vérifie que le code de support mène bien à cette page", () => {
    expect(route).toContain("codeMeneALaPage")
    expect(route, "le code doit être cherché en base").toMatch(/from\("qr_codes"\)[\s\S]{0,120}short_code/)
    expect(route, "une destination modifiée vers une page compte aussi").toContain("dest_override")
  })

  it("l'email « premier scan » exige la preuve", () => {
    expect(route).toContain("if (scanProuve && estUnScan(source))")
  })

  it("limite aussi par page, pas seulement par adresse", () => {
    // La limite globale de 60/min par IP laissait boucler sur une seule page.
    expect(route).toMatch(/rateLimit\(`track:vue:\$\{pageId\}/)
  })
})
