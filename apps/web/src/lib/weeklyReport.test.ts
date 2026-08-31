import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { semaineEcoulee, resumeSemaine, nombre, JOUR_MS } from "./weeklyReport"

const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")

describe("les bornes de la semaine", () => {
  it("remontent exactement sept jours", () => {
    const maintenant = new Date("2026-08-24T10:00:00Z")
    const { debutIso } = semaineEcoulee(maintenant)
    expect(maintenant.getTime() - Date.parse(debutIso)).toBe(7 * JOUR_MS)
  })

  it("se lisent comme une phrase, pas comme une date technique", () => {
    expect(semaineEcoulee(new Date("2026-08-24T10:00:00Z")).libelle).toBe("du 17 au 24 août")
  })

  it("nomment les deux mois quand la semaine est à cheval", () => {
    expect(semaineEcoulee(new Date("2026-09-02T10:00:00Z")).libelle).toBe("du 26 août au 2 septembre")
  })
})

describe("ce que dit l'email", () => {
  it("annonce les chiffres de la SEMAINE, pas les cumuls", () => {
    const r = resumeSemaine({ vues: 40, scans: 12, scansTotal: 999 })
    expect(r.phrase).toContain("12 scans")
    expect(r.phrase).toContain("40 visites")
    expect(r.phrase).toContain("cette semaine")
    expect(r.phrase).not.toContain("999")
    expect(r.creux).toBe(false)
  })

  it("accorde les singuliers", () => {
    expect(resumeSemaine({ vues: 1, scans: 1, scansTotal: 1 }).phrase).toBe("1 scan et 1 visite cette semaine.")
  })

  it("ne mentionne pas ce qui vaut zéro", () => {
    expect(resumeSemaine({ vues: 5, scans: 0, scansTotal: 3 }).phrase).toBe("5 visites cette semaine.")
    expect(resumeSemaine({ vues: 0, scans: 3, scansTotal: 3 }).phrase).toBe("3 scans cette semaine.")
  })

  it("traite honnêtement la semaine sans rien — c'est la plus fréquente au début", () => {
    const jamais = resumeSemaine({ vues: 0, scans: 0, scansTotal: 0 })
    expect(jamais.creux).toBe(true)
    expect(jamais.phrase).toContain("pas posé")           // dit quoi faire, sans reproche
    const deja = resumeSemaine({ vues: 0, scans: 0, scansTotal: 120 })
    expect(deja.phrase).toContain("hors de vue")          // pas le même conseil : il a déjà eu des scans
    expect(deja.phrase).not.toContain("Personne n'a encore")
  })
})

describe("le rapport interroge vraiment la période", () => {
  const route = lire("../app/api/emails/weekly/route.ts")

  it("compte les vues et les scans depuis le début de la semaine", () => {
    expect(route).toContain('gte("viewed_at", debutIso)')
    // Ce test épinglait `created_at` — la colonne que la table `scans` n'a PAS.
    // Le test et le code étaient d'accord ; seul le schéma disait le contraire, et
    // c'est lui qui décide. L'email annonçait « 0 scan cette semaine » à tout le
    // monde. La vérification contre le schéma vit désormais dans
    // app/api/emails/weekly/rapportHebdo.test.ts.
    expect(route).toContain('gte("scanned_at", debutIso)')
  })

  it("n'affiche plus les cumuls comme s'ils étaient l'activité du moment", () => {
    expect(route).not.toContain('statCard(scans, "Scans au total"')
    expect(route).toContain('"Scans cette semaine"')
    expect(route).toContain('"Visites cette semaine"')
  })

  it("un comptage en échec ne prive personne de son email", () => {
    const i = route.indexOf('gte("viewed_at", debutIso)')
    expect(route.slice(i, i + 700)).toContain("catch")
  })

  it("l'objet du message annonce la semaine, pas une date seule", () => {
    expect(route).toContain("cette semaine — QRowg")
    expect(route).toContain("Semaine calme sur QRowg")
  })
})

describe("le cadre des emails tient sur un téléphone", () => {
  it("le gabarit devient fluide sous 600 px", () => {
    // Mesuré : 624 px de contenu dans une fenêtre de 390 px. Outlook ignore les
    // media queries et garde ses 600 px ; les clients mobiles les appliquent.
    const shell = lire("./emailLayout.ts")
    expect(shell).toContain(".wrap{width:100%!important}")
    expect(shell).toContain('class="wrap"')
    expect(lire("../app/api/emails/welcome/route.ts")).toContain(".wrap{width:100%!important}")
  })

  it("le pied de page suit les mêmes marges que le reste", () => {
    const shell = lire("./emailLayout.ts")
    const i = shell.indexOf("border-top:1px solid rgba(255,255,255,0.06)")
    expect(shell.slice(Math.max(0, i - 120), i)).toContain('class="px"')
  })
})

describe("nombre", () => {
  it("s'écrit à la française", () => {
    expect(nombre(1234)).toMatch(/1\s?234/)
    expect(nombre(0)).toBe("0")
  })
})
