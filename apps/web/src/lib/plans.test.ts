import { describe, it, expect } from "vitest"
import {
  PLANS, PLAN_ORDER, PLAN_LIST, PLAN_RANK, PLAN_COMPARISON,
  getPlan, pageLimit, caps, canPrintStudio, canQrAdvanced, canAI, canRemoveBranding, canExport,
  minPlanFor, minPlanForFormat, fmtPrice,
  type PlanId, type ExportFormat,
} from "./plans"

describe("getPlan", () => {
  it("renvoie le plan demande", () => {
    expect(getPlan("pro").id).toBe("pro")
    expect(getPlan("business").id).toBe("business")
  })
  it("retombe sur free pour un id inconnu, null ou undefined", () => {
    expect(getPlan("enterprise").id).toBe("free")
    expect(getPlan(null).id).toBe("free")
    expect(getPlan(undefined).id).toBe("free")
    expect(getPlan("").id).toBe("free")
  })
})

describe("pageLimit", () => {
  it("reflete les limites de chaque plan", () => {
    expect(pageLimit("free")).toBe(1)
    expect(pageLimit("pro")).toBe(10)
    expect(pageLimit("business")).toBeNull() // illimite
  })
  it("plan inconnu -> limite free", () => {
    expect(pageLimit("???")).toBe(1)
  })
})

describe("gating des capacites", () => {
  it("free n'a aucune capacite premium", () => {
    expect(canPrintStudio("free")).toBe(false)
    expect(canQrAdvanced("free")).toBe(false)
    expect(canAI("free")).toBe(false)
    expect(canRemoveBranding("free")).toBe(false)
    expect(caps("free").exportFormats).toEqual(["png"])
  })
  it("le branding est retire des le plan Starter", () => {
    expect(canRemoveBranding("free")).toBe(false)
    expect(canRemoveBranding("pro")).toBe(true)
    expect(canRemoveBranding("business")).toBe(true)
  })
  it("un compte hérité de l'ancien palier « Starter » est traité en Établissement", () => {
    // Le palier à 4,90 € a été retiré ; personne n'y était abonné, mais une ligne
    // héritée ne doit surtout pas retomber au gratuit.
    expect(canPrintStudio("starter")).toBe(true)
    expect(canQrAdvanced("starter")).toBe(true)
    expect(canAI("starter")).toBe(true)
  })
  it("pro et business ont tout, IA comprise", () => {
    for (const id of ["pro", "business"] as PlanId[]) {
      expect(canPrintStudio(id)).toBe(true)
      expect(canQrAdvanced(id)).toBe(true)
      expect(canAI(id)).toBe(true)
    }
  })
  it("un plan inconnu est traite comme free (aucune capacite)", () => {
    expect(canAI("hacker")).toBe(false)
    expect(canPrintStudio(null)).toBe(false)
  })
})

describe("canExport", () => {
  it("free n'exporte que le PNG", () => {
    expect(canExport("free", "png")).toBe(true)
    expect(canExport("free", "pdf")).toBe(false)
    expect(canExport("free", "svg")).toBe(false)
  })
  it("le gratuit n'exporte que le PNG", () => {
    expect(canExport("free", "png")).toBe(true)
    expect(canExport("free", "jpg")).toBe(false)
  })
  it("pro et business exportent tous les formats", () => {
    for (const id of ["pro", "business"] as PlanId[]) {
      for (const fmt of ["png", "jpg", "pdf", "svg"] as ExportFormat[]) {
        expect(canExport(id, fmt)).toBe(true)
      }
    }
  })
})

describe("minPlanFor / minPlanForFormat", () => {
  it("plan minimum par capacite", () => {
    expect(minPlanFor("printStudio")).toBe("pro")
    expect(minPlanFor("qrStudioAdvanced")).toBe("pro")
    expect(minPlanFor("ai")).toBe("pro")
  })
  it("plan minimum par format d'export", () => {
    expect(minPlanForFormat("png")).toBe("free")
    expect(minPlanForFormat("jpg")).toBe("pro")
    expect(minPlanForFormat("pdf")).toBe("pro")
    expect(minPlanForFormat("svg")).toBe("pro")
  })
})

describe("fmtPrice", () => {
  it("formate les prix d'affichage", () => {
    expect(fmtPrice(0)).toBe("0")
    expect(fmtPrice(4.9)).toBe("4,90")
    expect(fmtPrice(12.9)).toBe("12,90")
    expect(fmtPrice(29.9)).toBe("29,90")
  })
})

// Invariants structurels : garantissent qu'une future edition ne casse pas
// silencieusement l'echelle des plans (regressions de paywall).
describe("coherence de l'echelle des plans", () => {
  it("PLAN_ORDER, PLAN_LIST et PLAN_RANK sont alignes", () => {
    expect(PLAN_ORDER).toEqual(["free", "pro", "business"])
    expect(PLAN_LIST.map(p => p.id)).toEqual(PLAN_ORDER)
    PLAN_ORDER.forEach((id, i) => expect(PLAN_RANK[id]).toBe(i))
  })

  it("chaque plan reference le bon id", () => {
    for (const id of PLAN_ORDER) expect(PLANS[id].id).toBe(id)
  })

  it("les prix croissent avec le rang, l'annuel <= le mensuel", () => {
    for (let i = 1; i < PLAN_LIST.length; i++) {
      expect(PLAN_LIST[i].priceMonthly).toBeGreaterThan(PLAN_LIST[i - 1].priceMonthly)
    }
    for (const p of PLAN_LIST) {
      expect(p.priceAnnual).toBeLessThanOrEqual(p.priceMonthly)
    }
  })

  it("les limites pages/vues/qr ne decroissent jamais (null = illimite)", () => {
    const inf = (v: number | null) => (v === null ? Infinity : v)
    for (let i = 1; i < PLAN_LIST.length; i++) {
      const lo = PLAN_LIST[i - 1].limits, hi = PLAN_LIST[i].limits
      expect(inf(hi.pages)).toBeGreaterThanOrEqual(inf(lo.pages))
      expect(inf(hi.views)).toBeGreaterThanOrEqual(inf(lo.views))
      expect(inf(hi.qr)).toBeGreaterThanOrEqual(inf(lo.qr))
    }
  })

  it("une capacite acquise n'est jamais reperdue en montant de gamme", () => {
    for (const cap of ["printStudio", "qrStudioAdvanced", "ai", "removeBranding"] as const) {
      let seen = false
      for (const p of PLAN_LIST) {
        if (p.caps[cap]) seen = true
        // si un plan inferieur avait la capacite, tous les superieurs l'ont aussi
        if (seen) expect(p.caps[cap]).toBe(true)
      }
    }
  })

  it("les formats d'export d'un plan incluent ceux du plan inferieur", () => {
    for (let i = 1; i < PLAN_LIST.length; i++) {
      const lo = PLAN_LIST[i - 1].caps.exportFormats
      const hi = new Set(PLAN_LIST[i].caps.exportFormats)
      for (const fmt of lo) expect(hi.has(fmt)).toBe(true)
    }
  })

  it("seul business propose une equipe", () => {
    expect(PLANS.free.limits.team).toBeNull()
    expect(PLANS.pro.limits.team).toBeNull()
    expect(PLANS.business.limits.team).toBe(5)
  })

  it("le tableau comparatif couvre les trois plans sur chaque ligne", () => {
    expect(PLAN_COMPARISON.length).toBeGreaterThan(0)
    for (const row of PLAN_COMPARISON) {
      for (const id of PLAN_ORDER) {
        expect(row[id]).toBeTruthy()
      }
    }
  })
})
