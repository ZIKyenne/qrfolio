import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Deux familles de défauts sur les suppressions :
//  - immédiates, sans confirmation, sur des cibles de 26-28 px (Profil, Domaines,
//    Redirections, Objectifs) ;
//  - « optimistes » : l'élément disparaissait avant la réponse, et revenait au
//    rechargement (QR, Messages, Domaines, Redirections, Objectifs).

const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")

function corps(src: string, signature: string): string {
  const i = src.indexOf(signature)
  expect(i, signature).toBeGreaterThan(-1)
  return src.slice(i, src.indexOf("\n  }\n", i))
}

const CAS: [string, string, string][] = [
  ["./profile/page.tsx", "async function deleteDomain(", "deleteDomain(dm.id)"],
  ["./domains/DomainsPage.tsx", "async function deleteDomain(", "deleteDomain(rec.id)"],
  ["./redirects/RedirectsPanel.tsx", "async function del(", "del(r.id)"],
  ["./analytics/GoalsDashboard.tsx", "async function deleteGoal(", "deleteGoal(goal.id)"],
]

describe("chaque suppression demande confirmation avant d'agir", () => {
  for (const [fichier, fn] of CAS) {
    it(`${fichier} › ${fn}`, () => {
      const c = corps(lire(fichier), fn)
      const conf = c.indexOf("await confirm({")
      expect(conf, "confirm absent").toBeGreaterThan(-1)
      expect(c.slice(conf, conf + 400)).toContain("danger: true")
      // La confirmation précède le premier effet (état de chargement ou fetch).
      const effet = Math.min(...["setDeleting", "fetch("].map(k => c.indexOf(k)).filter(i => i > -1))
      expect(conf).toBeLessThan(effet)
    })
  }
})

describe("les corbeilles font au moins 40 px et ont un nom", () => {
  for (const [fichier, , appel] of CAS) {
    it(`${fichier} › ${appel}`, () => {
      const src = lire(fichier)
      const i = src.indexOf(`onClick={() => ${appel}}`)
      expect(i, appel).toBeGreaterThan(-1)
      const bouton = src.slice(i, i + 500)
      expect(bouton).toContain("aria-label=")
      expect(bouton).toMatch(/width:\s*40,\s*height:\s*40/)
    })
  }
})

describe("l'écran ne retire l'élément qu'après la réponse", () => {
  const apres = (c: string, retrait: string, verif: string) => {
    const r = c.indexOf(retrait), v = c.indexOf(verif)
    expect(v, verif).toBeGreaterThan(-1)
    expect(r, retrait).toBeGreaterThan(v)
  }

  it("QR (suppression directe Supabase)", () => {
    const c = corps(lire("./qr-codes/QRStudio.tsx"), "async function deleteQR(")
    expect(c).toContain('.select("id")')
    apres(c, "setQRCodes(rest)", "error || !data?.length")
  })

  it("messages : suppression et changement de statut", () => {
    const src = lire("./leads/LeadsClient.tsx")
    const rm = src.slice(src.indexOf("const remove = async"), src.indexOf("const exportCsv"))
    apres(rm, "setLeads(prev => prev.filter", "error || !data?.length")
    const st = src.slice(src.indexOf("const setStatus = async"), src.indexOf("const remove = async"))
    expect(st).toContain("if (error && avant)")
    expect(st).toContain("prev.map(l => l.id === id ? avant : l)")
  })

  it("objectifs", () => {
    const c = corps(lire("./analytics/GoalsDashboard.tsx"), "async function deleteGoal(")
    apres(c, "setGoals(prev => prev.filter", "!res.ok")
  })
})

describe("aucun nom de composant n'est lu par l'utilisateur", () => {
  it("« ImageIcon trop lourde » est redevenu « Image trop lourde »", () => {
    const src = lire("./profile/page.tsx")
    expect(src).not.toContain("ImageIcon trop lourde")
    expect(src).toContain('"Image trop lourde (max 5 Mo)"')
  })
})
