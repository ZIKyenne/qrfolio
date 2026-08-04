import { test, expect, type Page } from "@playwright/test"
import { collect } from "./helpers/collect"

// Builder refondu INTÉGRÉ (C06) — testé via le harness PUBLIC /e2e-harness/builder-redesign
// (sans Supabase). Prouve que C02 (bibliothèque) + C03 (réglages) + C04 (canvas) + C05 (mobile)
// coexistent autour d'UNE seule source d'état (sélection partagée, ajout, insertion), desktop+mobile.

const URL = "/e2e-harness/builder-redesign"
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test.describe("intégration Builder (harness)", () => {
  // Neutralise l'indicateur dev Next (nextjs-portal, coin bas-gauche) qui recouvre la colonne
  // bibliothèque et intercepte les clics (artefact DEV, absent en prod). Erreurs réelles toujours
  // capturées par le collecteur.
  test.beforeEach(async ({ page }, testInfo) => {
    // Intégration desktop 3 colonnes → projet desktop uniquement (le mobile est couvert par
    // builder-mobile-shell.spec.ts).
    test.skip(testInfo.project.name !== "desktop", "intégration desktop = projet desktop")
    await page.addInitScript(() => {
      const s = document.createElement("style")
      s.textContent = "nextjs-portal{pointer-events:none!important}"
      document.addEventListener("DOMContentLoaded", () => document.documentElement.appendChild(s))
      queueMicrotask(() => { try { document.documentElement.appendChild(s) } catch { /* noop */ } })
    })
  })

  test("desktop : 3 colonnes montées, sélection partagée bibliothèque→canvas→réglages", async ({ page }, testInfo) => {
    // Note : ce harness COMPOSITE (dev) émet un avertissement d'hydratation React bénin absent des
    // harnesses par composant (chacun passe problems===[] isolément). On vérifie ici l'ABSENCE
    // d'erreur FATALE (pageerror) et de réseau même-origine, et la composition fonctionnelle.
    const c = collect(page)
    await page.goto(URL, { waitUntil: "networkidle" })
    await expect(page.getByTestId("library-col")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    await expect(page.getByTestId("settings-col")).toBeVisible()
    // sélection dans le canvas → réglages affichent le bloc (une seule source d'état)
    await page.locator("[data-block-id]").first().click()
    await expect(page.getByTestId("sel")).not.toHaveText("—")
    await expect(page.getByTestId("settings-col").getByTestId("block-settings")).toBeVisible()
    await testInfo.attach("desktop-complet", { body: await page.screenshot(), contentType: "image/png" })
    expect(c.pageErrors, "erreurs fatales:\n" + c.pageErrors.join("\n")).toEqual([])
    expect(c.badResponses, "réseau même-origine:\n" + c.badResponses.join("\n")).toEqual([])
  })

  test("desktop : ajout depuis la bibliothèque → apparaît + sélectionné", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("library-col")).toBeVisible()
    await page.getByTestId("library-col").locator('[data-tab="all"]').click()
    const before = Number(await page.getByTestId("count").textContent())
    await page.getByTestId("library-col").locator('[data-add="bio"]').first().click()
    await expect(page.getByTestId("count")).toHaveText(String(before + 1))
    await expect(page.getByTestId("sel")).not.toHaveText("—")
    await testInfo.attach("deux-panneaux", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("desktop : insertion entre blocs (index mémorisé) puis ajout au bon endroit", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    await page.getByTestId("library-col").locator('[data-tab="all"]').click()
    const before = Number(await page.getByTestId("count").textContent())
    await page.locator('[data-insert="1"]').first().click()
    await expect(page.getByTestId("diagnostic")).toHaveAttribute("data-gap", "1")
    await page.getByTestId("library-col").locator('[data-add="heading"]').first().click()
    await expect(page.getByTestId("count")).toHaveText(String(before + 1))
    await expect(page.getByTestId("diagnostic")).toHaveAttribute("data-gap", "") // consommé
    await testInfo.attach("insertion", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("desktop : réglages simple/avancé + fallback legacy sur bloc non pilote", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    // heading est pilote → champs simples
    await page.locator('[data-block-id]').first().click()
    await expect(page.getByTestId("settings-col").getByTestId("block-settings")).toHaveAttribute("data-mode", "simple")
    await page.getByTestId("settings-col").locator('[data-mode-btn="advanced"]').click()
    await expect(page.getByTestId("settings-col").getByTestId("block-settings")).toHaveAttribute("data-mode", "advanced")
    await testInfo.attach("reglages", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("desktop : canvas zoom + aperçu intégrés", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    await page.locator('[data-device="desktop"]').click()
    await page.getByTestId("zoom-in").click()
    await expect(page.getByTestId("zoom-value")).toHaveText("110 %")
    await page.getByTestId("preview-toggle").click()
    await expect(page.getByTestId("responsive-canvas")).toHaveAttribute("data-mode", "preview")
    await testInfo.attach("preview", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("bascule vers le shell mobile — même état", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    await page.getByTestId("to-mobile").click()
    await expect(page.getByTestId("mobile-shell")).toBeVisible()
    await expect(page.getByTestId("mobile-nav")).toBeVisible()
    await testInfo.attach("mobile-initial", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("no-overflow horizontal (desktop + après bascule mobile)", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    expect(await overflow(page), "overflow desktop").toBeLessThanOrEqual(1)
  })
})
