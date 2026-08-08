import { test, expect } from "@playwright/test"

// Modale de recadrage d'image via le harness PUBLIC /e2e-harness/image-crop (sans Supabase).
// Vérifie le rendu, le changement de ratio et l'export recadré (dimensions du blob).

const URL = "/e2e-harness/image-crop"

test.describe("recadrage d'image (upload)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "harness = projet desktop")
    await page.addInitScript(() => {
      const s = document.createElement("style"); s.textContent = "nextjs-portal{pointer-events:none!important}"
      queueMicrotask(() => { try { document.documentElement.appendChild(s) } catch { /* noop */ } })
    })
  })

  test("modale + presets de ratio + export carré", async ({ page }) => {
    await page.goto(URL, { waitUntil: "networkidle" })
    await expect(page.getByTestId("crop-frame")).toBeVisible({ timeout: 30_000 })
    // 5 ratios proposés
    expect(await page.locator("[data-testid^='aspect-']").count()).toBe(5)
    await page.getByTestId("aspect-square").click()
    await page.getByTestId("crop-apply").click()
    const res = page.getByTestId("crop-result")
    await expect(res).toHaveAttribute("data-w", /\d+/, { timeout: 10_000 })
    const w = await res.getAttribute("data-w")
    const h = await res.getAttribute("data-h")
    expect(w).toBe(h) // ratio 1:1 → sortie carrée
  })
})
