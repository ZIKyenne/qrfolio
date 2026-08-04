import { test, expect } from "@playwright/test"
import { loginOrSkip, HAS_ACCOUNT } from "./helpers/auth"

// Builder mobile (projet "mobile" = 390×844 tactile). Vérifie l'ouverture sans overflow
// horizontal et la présence de la barre d'action. Requiert un compte de test + Supabase joignable.
test.describe("Builder mobile", () => {
  test.skip(!HAS_ACCOUNT, "Requiert un compte de test Supabase.")

  test("ouverture du Builder sans overflow horizontal", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Test spécifique au projet mobile (--project=mobile).")
    await loginOrSkip(page)
    await page.goto("/dashboard/builder/new", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("button", { name: /publier/i }).first()).toBeVisible({ timeout: 30_000 })

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, "overflow horizontal involontaire (px)").toBeLessThanOrEqual(1)
    await testInfo.attach("builder-mobile", { body: await page.screenshot(), contentType: "image/png" })
  })
})
