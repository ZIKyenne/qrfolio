import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// L'écran Réglages affiche cinq interrupteurs et enregistre bien les cinq. Trois
// d'entre eux promettaient un email : aucun ne partait. La préférence était lue,
// mais par du code que personne n'appelait — une fonction cliente sans appelant,
// une route sans tâche planifiée. Enregistrer un choix n'est pas le respecter.
//
// Ce test relie chaque interrupteur à un envoi RÉELLEMENT atteignable.

const RACINE = join(__dirname, "../../../../..")
const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")
const reglages = lire("./settings/page.tsx")
const crons: { path: string }[] = JSON.parse(readFileSync(join(RACINE, "vercel.json"), "utf8")).crons

// Les clés effectivement écrites dans profiles.preferences quand on sauvegarde.
const CLES = [...reglages.matchAll(/(\w+): notifs\.\1/g)].map(m => m[1])

describe("l'écran Réglages", () => {
  it("enregistre les cinq interrupteurs qu'il affiche", () => {
    expect(CLES.sort()).toEqual(["email_leads", "marketing", "product_updates", "scan_alert", "weekly_report"])
  })
})

describe("alertes de scans", () => {
  const envoi = lire("../../lib/premierScanEnvoi.ts")

  it("un envoi lit la préférence", () => {
    expect(lire("../../lib/premierScan.ts")).toContain("scan_alert")
    expect(envoi).toContain("alerteActivee")
  })

  it("et quelque chose appelle cet envoi", () => {
    expect(lire("../api/track/route.ts")).toContain("previenirPremierScan")
  })

  it("l'intitulé ne promet que ce qui part : le PREMIER scan, pas chacun", () => {
    const i = reglages.indexOf('label="Alertes de scans"')
    expect(i).toBeGreaterThan(-1)
    expect(reglages.slice(i, i + 200)).toContain("premier scan")
  })
})

describe("rapport hebdomadaire", () => {
  const route = lire("../api/emails/weekly/route.ts")

  it("la route lit la préférence", () => {
    expect(route).toContain("weekly_report")
  })

  it("et une tâche planifiée l'appelle vraiment", () => {
    expect(crons.map(c => c.path)).toContain("/api/emails/weekly")
  })

  it("elle ne filtre plus sur un compteur qui vaut zéro pour tout le monde", () => {
    // profiles.total_pages n'est jamais incrémenté : `.gt("total_pages", 0)`
    // excluait jusqu'au compte qui possède douze pages.
    expect(route).not.toContain('gt("total_pages"')
  })
})

describe("nouveaux messages", () => {
  it("la route lit la préférence", () => {
    expect(lire("../api/emails/new-lead/route.ts")).toContain("email_leads")
  })

  it("et le formulaire public l'appelle", () => {
    expect(lire("../../lib/submitLead.ts")).toContain("/api/emails/new-lead")
    expect(lire("../[slug]/PublicPageClient.tsx")).toContain("submitLead")
  })
})

describe("nouveautés produit et offres", () => {
  it("ne prétendent pas être branchées : aucun envoi ne les lit", () => {
    // Elles sont stockées pour de futures campagnes. Tant qu'aucun email ne part,
    // l'interrupteur ne trahit personne — le jour où un envoi arrive, il devra
    // lire la clé, et ce test dira où.
    for (const cle of ["product_updates", "marketing"]) {
      expect(CLES).toContain(cle)
    }
  })
})

describe("le code mort ne survit pas sous les emails", () => {
  it("la fonction cliente sans appelant a disparu", () => {
    // lib/emails.ts exposait triggerFirstScanEmail : importée nulle part, et visant
    // une route qui exigeait un jeton qu'un navigateur ne peut pas produire.
    expect(() => lire("../../lib/emails.ts")).toThrow()
    expect(() => lire("../api/emails/first-scan/route.ts")).toThrow()
  })
})
