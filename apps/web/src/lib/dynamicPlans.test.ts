import { describe, it, expect } from "vitest"
import {
  DYN_PLANS, DYN_PLAN_ORDER, DYN_PAID_PLANS, DYN_PLAN_RANK, DYN_TRIAL_DAYS,
  getDynPlan, dynQrLimit, isDynSubscribed, dynCaps,
  canDynDetailedAnalytics, canDynBrandedDomain, canDynLinkSecurity, canDynBulk, canDynApiTeam,
  minDynPlanFor, dynMonthlyLabel, dynAnnualTotal, dynAnnualTotalLabel, dynCanCreatePermanent,
} from "./dynamicPlans"

describe("dynamicPlans — structure", () => {
  it("expose 3 paliers payants dans l'ordre", () => {
    expect(DYN_PLAN_ORDER).toEqual(["basique", "pro", "business"])
    expect(DYN_PAID_PLANS.map(p => p.id)).toEqual(["basique", "pro", "business"])
    expect(DYN_PAID_PLANS.every(p => p.id !== "none")).toBe(true) // none jamais dans la grille de prix
  })

  it("essai = 7 jours", () => {
    expect(DYN_TRIAL_DAYS).toBe(7)
  })

  it("rangs ordonnés none < basique < pro < business", () => {
    expect(DYN_PLAN_RANK.none).toBeLessThan(DYN_PLAN_RANK.basique)
    expect(DYN_PLAN_RANK.basique).toBeLessThan(DYN_PLAN_RANK.pro)
    expect(DYN_PLAN_RANK.pro).toBeLessThan(DYN_PLAN_RANK.business)
  })
})

describe("dynamicPlans — quotas de liens permanents", () => {
  it("none = 0 (essai seul), basique = 3, pro = 25, business = illimité", () => {
    expect(dynQrLimit("none")).toBe(0)
    expect(dynQrLimit("basique")).toBe(3)
    expect(dynQrLimit("pro")).toBe(25)
    expect(dynQrLimit("business")).toBeNull()
  })

  it("plan inconnu ou absent -> none (fallback sûr)", () => {
    expect(getDynPlan(undefined).id).toBe("none")
    expect(getDynPlan(null).id).toBe("none")
    expect(getDynPlan("inexistant").id).toBe("none")
    expect(dynQrLimit("inexistant")).toBe(0)
  })

  it("isDynSubscribed : false pour none, true pour les payants", () => {
    expect(isDynSubscribed("none")).toBe(false)
    expect(isDynSubscribed(null)).toBe(false)
    expect(isDynSubscribed("basique")).toBe(true)
    expect(isDynSubscribed("pro")).toBe(true)
    expect(isDynSubscribed("business")).toBe(true)
  })
})

describe("dynamicPlans — gating des fonctionnalités (progressif)", () => {
  it("Basique : aucune fonctionnalité premium", () => {
    const c = dynCaps("basique")
    expect(c).toEqual({ detailedAnalytics: false, brandedDomain: false, linkSecurity: false, bulk: false, apiTeam: false })
  })

  it("Pro : stats détaillées + domaine + sécurité, mais PAS masse/API", () => {
    expect(canDynDetailedAnalytics("pro")).toBe(true)
    expect(canDynBrandedDomain("pro")).toBe(true)
    expect(canDynLinkSecurity("pro")).toBe(true)
    expect(canDynBulk("pro")).toBe(false)
    expect(canDynApiTeam("pro")).toBe(false)
  })

  it("Business : tout débloqué", () => {
    expect(canDynDetailedAnalytics("business")).toBe(true)
    expect(canDynBrandedDomain("business")).toBe(true)
    expect(canDynLinkSecurity("business")).toBe(true)
    expect(canDynBulk("business")).toBe(true)
    expect(canDynApiTeam("business")).toBe(true)
  })

  it("none : rien de débloqué", () => {
    expect(canDynDetailedAnalytics("none")).toBe(false)
    expect(canDynApiTeam(null)).toBe(false)
  })

  it("minDynPlanFor pointe le premier palier qui débloque la capacité", () => {
    expect(minDynPlanFor("detailedAnalytics")).toBe("pro")
    expect(minDynPlanFor("brandedDomain")).toBe("pro")
    expect(minDynPlanFor("linkSecurity")).toBe("pro")
    expect(minDynPlanFor("bulk")).toBe("business")
    expect(minDynPlanFor("apiTeam")).toBe("business")
  })
})

describe("dynamicPlans — permanent vs essai", () => {
  it("non abonné (none) : jamais permanent, quel que soit le compte", () => {
    expect(dynCanCreatePermanent("none", 0)).toBe(false)
    expect(dynCanCreatePermanent(null, 0)).toBe(false)
    expect(dynCanCreatePermanent(undefined, 0)).toBe(false)
  })

  it("Basique (3) : permanent tant qu'on est sous le quota", () => {
    expect(dynCanCreatePermanent("basique", 0)).toBe(true)
    expect(dynCanCreatePermanent("basique", 2)).toBe(true)
    expect(dynCanCreatePermanent("basique", 3)).toBe(false) // quota atteint
    expect(dynCanCreatePermanent("basique", 4)).toBe(false)
  })

  it("Pro (25) : bascule à 25", () => {
    expect(dynCanCreatePermanent("pro", 24)).toBe(true)
    expect(dynCanCreatePermanent("pro", 25)).toBe(false)
  })

  it("Business (illimité) : toujours permanent", () => {
    expect(dynCanCreatePermanent("business", 0)).toBe(true)
    expect(dynCanCreatePermanent("business", 9999)).toBe(true)
  })
})

describe("dynamicPlans — prix", () => {
  it("prix mensuels conformes aux décisions (1,50 / 5,90 / 20,00)", () => {
    expect(DYN_PLANS.basique.priceMonthly).toBe(1.5)
    expect(DYN_PLANS.pro.priceMonthly).toBe(5.9)
    expect(DYN_PLANS.business.priceMonthly).toBe(20)
  })

  it("prix annuel (par mois) = mensuel × 0,8 (−20%)", () => {
    for (const p of DYN_PAID_PLANS) {
      expect(p.priceAnnual).toBeCloseTo(p.priceMonthly * 0.8, 2)
    }
  })

  it("libellé mensuel/annuel formaté FR (virgule, 2 décimales)", () => {
    expect(dynMonthlyLabel("basique", false)).toBe("1,50")
    expect(dynMonthlyLabel("basique", true)).toBe("1,20")
    expect(dynMonthlyLabel("business", false)).toBe("20,00")
    expect(dynMonthlyLabel("business", true)).toBe("16,00")
  })

  it("total annuel = prix annuel/mois × 12", () => {
    expect(dynAnnualTotal("basique")).toBeCloseTo(14.4, 2)
    expect(dynAnnualTotal("pro")).toBeCloseTo(56.64, 2)
    expect(dynAnnualTotal("business")).toBeCloseTo(192, 2)
    expect(dynAnnualTotalLabel("business")).toBe("192,00")
  })
})
