import { test, expect } from "@playwright/test"

// Snapshots visuels du Builder refondu (C07). GATÉS : ne s'exécutent que si VISUAL=1 — le rendu
// pixel dépend des polices/AA de l'environnement (cf. docs/PLAYWRIGHT-QA-GUIDE.md), donc ces
// snapshots ne font PAS partie de `pnpm test:e2e` par défaut (aucune régression CI due aux polices).
// Générer/mettre à jour les références par environnement :
//   VISUAL=1 pnpm test:e2e e2e/builder-visual.spec.ts --update-snapshots
// Vues stables uniquement, reduced-motion activé, tolérance modeste et justifiée.

const URL = "/e2e-harness/builder-redesign"
const VISUAL = process.env.VISUAL === "1"
// Tolérance : absorbe l'anti-crénelage des polices selon l'environnement, sans masquer une vraie
// dérive de mise en page.
const OPT = { maxDiffPixelRatio: 0.03 as number, animations: "disabled" as const }

test.describe("snapshots visuels Builder (C07)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VISUAL, "Snapshots visuels : lancer avec VISUAL=1 (références dépendantes de l'environnement).")
    await page.emulateMedia({ reducedMotion: "reduce" })
    // Neutralise l'indicateur dev Next (recouvre le coin bas-gauche → intercepte la bottom nav).
    await page.addInitScript(() => {
      const s = document.createElement("style")
      s.textContent = "nextjs-portal{pointer-events:none!important}"
      document.addEventListener("DOMContentLoaded", () => document.documentElement.appendChild(s))
      queueMicrotask(() => { try { document.documentElement.appendChild(s) } catch { /* noop */ } })
    })
    void testInfo
  })

  test("desktop — vues stables", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop")
    await page.goto(URL, { waitUntil: "networkidle" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveScreenshot("desktop-complet.png", OPT)
    await expect(page.getByTestId("library-col")).toHaveScreenshot("bibliotheque.png", OPT)
    // sélection → réglages
    await page.locator("[data-block-id]").first().click()
    await expect(page.getByTestId("settings-col").getByTestId("block-settings")).toBeVisible()
    await expect(page.getByTestId("settings-col")).toHaveScreenshot("reglages.png", OPT)
  })

  test("mobile — vues stables", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile")
    await page.goto(URL, { waitUntil: "networkidle" })
    await expect(page.getByTestId("to-mobile")).toBeVisible({ timeout: 30_000 })
    await page.getByTestId("to-mobile").click()
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await expect(page).toHaveScreenshot("mobile-initial.png", OPT)
    await page.locator('[data-nav="structure"]').click()
    await expect(page.getByTestId("mobile-sheet")).toBeVisible()
    await expect(page).toHaveScreenshot("mobile-sheet.png", OPT)
  })
})
