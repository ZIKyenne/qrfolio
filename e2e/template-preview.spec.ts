import { test, expect } from "@playwright/test"
import { collect } from "./helpers/collect"

// Preview des templates composés (moteur T1/T2) via le harness PUBLIC /e2e-harness/template-preview
// (rendu réel des blocs, sans Supabase). Vérifie que structure × style × layout produit une page
// complète, que les axes changent réellement le rendu, et qu'aucune erreur fatale n'apparaît.

const URL = "/e2e-harness/template-preview"

test.describe("preview templates composés (moteur)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "preview = projet desktop")
    await page.addInitScript(() => {
      const s = document.createElement("style"); s.textContent = "nextjs-portal{pointer-events:none!important}"
      document.addEventListener("DOMContentLoaded", () => document.documentElement.appendChild(s))
      queueMicrotask(() => { try { document.documentElement.appendChild(s) } catch { /* noop */ } })
    })
  })

  test("rendu d'un template composé complet, sans erreur fatale", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "networkidle" })
    await expect(page.getByTestId("preview-page")).toBeVisible({ timeout: 30_000 })
    // page complète = plusieurs blocs réels rendus
    expect(await page.locator("[data-block-type]").count()).toBeGreaterThanOrEqual(5)
    expect(await page.locator("[data-block-error]").count(), "aucun bloc en erreur").toBe(0)
    const c = collect(page)
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("preview-page")).toBeVisible()
    await testInfo.attach("resto-gold", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" })
    // Erreurs FATALES uniquement (les iframes tierces type Google Maps émettent des console.error filtrés).
    expect(c.pageErrors, "erreurs fatales:\n" + c.pageErrors.join("\n")).toEqual([])
    expect(c.badResponses, "réseau même-origine:\n" + c.badResponses.join("\n")).toEqual([])
  })

  test("l'axe STYLE change réellement le rendu", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("preview-page")).toBeVisible()
    await page.getByTestId("sel-style").selectOption("slate")
    await expect(page.getByTestId("preview-page")).toHaveAttribute("data-style", "slate")
    await expect(page.getByTestId("preview-controls")).toHaveAttribute("data-key", /__slate/)
    await expect(page.locator("[data-block-error]")).toHaveCount(0)
    await testInfo.attach("resto-slate", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" })
  })

  test("l'axe LAYOUT change la densité (compact)", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("preview-page")).toBeVisible()
    await page.getByTestId("sel-layout").selectOption("compact")
    await expect(page.getByTestId("preview-page")).toHaveAttribute("data-layout", "compact")
    await expect(page.getByTestId("preview-controls")).toHaveAttribute("data-key", /__compact/)
    await testInfo.attach("resto-compact", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" })
  })

  test("changer de structure (métier) recompose sans erreur", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("preview-page")).toBeVisible()
    const options = await page.getByTestId("sel-structure").locator("option").evaluateAll(els => els.map(e => (e as HTMLOptionElement).value))
    expect(options.length).toBeGreaterThanOrEqual(10)
    // teste 3 structures variées
    for (const v of [options[0], options[Math.floor(options.length / 2)], options[options.length - 1]]) {
      await page.getByTestId("sel-structure").selectOption(v)
      await expect(page.getByTestId("preview-page")).toBeVisible()
      expect(await page.locator("[data-block-error]").count(), `structure ${v}`).toBe(0)
      expect(await page.locator("[data-block-type]").count()).toBeGreaterThan(0)
    }
  })
})
