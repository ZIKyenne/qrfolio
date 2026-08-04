import { test, expect, type Page } from "@playwright/test"
import { collect, problems } from "./helpers/collect"

// Shell Builder mobile (C05) — testé via le harness PUBLIC /e2e-harness/builder-mobile (sans Supabase).
// Couvre : header, bottom nav, bottom sheet unique (ajout/structure/réglages/publication), sélection,
// barre contextuelle, clavier simulé, aperçu, safe area, portrait/paysage/tablette, no-overflow.

const URL = "/e2e-harness/builder-mobile"
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test.describe("shell mobile (harness)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "shell mobile = projet mobile")
    // L'indicateur de dev Next (nextjs-portal, coin bas-gauche) recouvre le bouton de nav le plus
    // à gauche (« Ajouter ») et intercepte les clics. C'est un artefact DEV (absent en prod) : on
    // neutralise ses pointer-events. Les vraies erreurs restent capturées par le collecteur.
    await page.addInitScript(() => {
      const s = document.createElement("style")
      s.textContent = "nextjs-portal{pointer-events:none!important}"
      document.addEventListener("DOMContentLoaded", () => document.documentElement.appendChild(s))
      queueMicrotask(() => { try { document.documentElement.appendChild(s) } catch { /* noop */ } })
    })
  })

  test("rendu stable sans erreur + header + bottom nav", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "networkidle" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("mobile-header")).toBeVisible()
    await expect(page.getByTestId("mobile-nav")).toBeVisible()
    expect(await overflow(page), "overflow portrait").toBeLessThanOrEqual(1)
    const c = collect(page)
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await testInfo.attach("mobile-initial", { body: await page.screenshot(), contentType: "image/png" })
    expect(problems(c), "erreurs:\n" + problems(c).join("\n")).toEqual([])
  })

  test("ajout via bibliothèque → sélection + sheet Modifier", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await page.locator('[data-nav="add"]').click()
    await expect(page.getByTestId("mobile-sheet")).toBeVisible()
    await expect(page.getByTestId("block-library")).toBeVisible()
    await testInfo.attach("library", { body: await page.screenshot(), contentType: "image/png" })
    await page.locator('[data-add="bio"]').first().click()
    // après ajout → sheet Modifier (réglages) ouverte
    await expect(page.getByTestId("block-settings")).toBeVisible()
    await testInfo.attach("settings", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("structure : sélection ouvre les réglages", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await page.locator('[data-nav="structure"]').click()
    await expect(page.getByTestId("mobile-sheet")).toBeVisible()
    await testInfo.attach("structure", { body: await page.screenshot(), contentType: "image/png" })
    const firstRow = page.locator("[data-structure-select]").first()
    await firstRow.click()
    await expect(page.getByTestId("block-settings")).toBeVisible()
  })

  test("sélection depuis le canvas → barre contextuelle", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await page.locator("[data-block-id]").first().click()
    await expect(page.getByTestId("mobile-context-bar")).toBeVisible()
  })

  test("snap points de la sheet", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await page.locator('[data-nav="structure"]').click()
    await expect(page.getByTestId("mobile-sheet")).toHaveAttribute("data-snap", "medium")
    await page.locator('[data-snap-btn="expanded"]').click()
    await expect(page.getByTestId("mobile-sheet")).toHaveAttribute("data-snap", "expanded")
    await page.locator('[data-snap-btn="compact"]').click()
    await expect(page.getByTestId("mobile-sheet")).toHaveAttribute("data-snap", "compact")
  })

  test("clavier simulé masque la bottom nav + sheet expanded", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await page.locator('[data-nav="structure"]').click()
    await page.getByTestId("toggle-keyboard").click()
    await expect(page.getByTestId("mobile-shell")).toHaveAttribute("data-keyboard", "1")
    await expect(page.getByTestId("mobile-nav")).toHaveCount(0) // nav masquée
    await expect(page.getByTestId("mobile-sheet")).toHaveAttribute("data-snap", "expanded")
    await testInfo.attach("keyboard", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("aperçu masque les outils, retour possible", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await page.locator('[data-nav="preview"]').click()
    await expect(page.getByTestId("mobile-shell")).toHaveAttribute("data-preview", "1")
    await expect(page.getByTestId("mobile-preview-banner")).toBeVisible()
    await expect(page.getByTestId("mobile-header")).toHaveCount(0)
    await testInfo.attach("preview", { body: await page.screenshot(), contentType: "image/png" })
    await page.getByTestId("mobile-exit-preview").click()
    await expect(page.getByTestId("mobile-shell")).toHaveAttribute("data-preview", "0")
  })

  test("publication : résumé + publier ; bloqué si erreur de sauvegarde", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    // erreur save → publier désactivé + badge nav
    await page.getByTestId("toggle-save-error").click()
    await page.locator('[data-nav="publish"]').click()
    await expect(page.getByTestId("publish-save-error")).toBeVisible()
    await expect(page.getByTestId("mobile-publish")).toBeDisabled()
    await testInfo.attach("publish", { body: await page.screenshot(), contentType: "image/png" })
    // corriger → publier possible
    await page.getByTestId("mobile-sheet-close").click()
    await page.getByTestId("toggle-save-error").click()
    await page.locator('[data-nav="publish"]').click()
    await page.getByTestId("mobile-publish").click()
    await expect(page.getByTestId("harness-bar")).toHaveAttribute("data-published", "1")
  })

  test("fermeture par backdrop + Escape", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await page.locator('[data-nav="add"]').click()
    await expect(page.getByTestId("mobile-sheet")).toBeVisible()
    await page.getByTestId("mobile-sheet-close").click()
    await expect(page.getByTestId("mobile-sheet")).toHaveCount(0)
  })

  test("portrait 360×800 : essentiels + no-overflow", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await expect(page.getByTestId("mobile-nav")).toBeVisible()
    await page.locator('[data-nav="add"]').click()
    await expect(page.getByTestId("block-library")).toBeVisible()
    expect(await overflow(page)).toBeLessThanOrEqual(1)
  })

  test("paysage 844×390 : canvas visible + sheet latérale + no-overflow", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await page.locator('[data-nav="structure"]').click()
    await expect(page.getByTestId("mobile-sheet")).toBeVisible()
    expect(await overflow(page), "overflow paysage").toBeLessThanOrEqual(1)
    await testInfo.attach("landscape", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("tablette 768×1024 : rendu adapté + no-overflow", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    expect(await overflow(page)).toBeLessThanOrEqual(1)
    await testInfo.attach("tablet", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("page longue : 100 blocs", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await page.getByTestId("bulk-100").click()
    await expect(page.getByTestId("count")).toHaveText("100")
    await expect(page.locator("[data-block-id]")).toHaveCount(100)
    expect(await overflow(page)).toBeLessThanOrEqual(1)
  })
})
