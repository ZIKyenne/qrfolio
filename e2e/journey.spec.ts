import { test, expect } from "@playwright/test"
import { loginOrSkip, HAS_ACCOUNT } from "./helpers/auth"
import { collect, problems } from "./helpers/collect"

// Parcours authentifié (compte de TEST). Étend au fil des increments : socle = connexion →
// dashboard → ouverture du Builder (sélecteurs code-vérifiés). L'ajout de bloc / sauvegarde /
// publication / vérification publique se branche ensuite (nécessite un run avec Supabase joignable).
test.describe("parcours authentifié", () => {
  test.skip(!HAS_ACCOUNT, "Requiert E2E_TEST_EMAIL/E2E_TEST_PASSWORD dans .env.e2e.")

  test("connexion → dashboard → ouverture du Builder", async ({ page }, testInfo) => {
    const c = collect(page)
    await loginOrSkip(page)
    // Dashboard authentifié : CTA de création visible (pas de redirection login).
    await expect(page.getByRole("link", { name: /nouvelle page/i }).first()).toBeVisible({ timeout: 15_000 })
    await testInfo.attach("dashboard", { body: await page.screenshot(), contentType: "image/png" })

    // Ouverture du Builder (page vierge).
    await page.goto("/dashboard/builder/new", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("button", { name: /publier/i }).first()).toBeVisible({ timeout: 30_000 })
    await testInfo.attach("builder", { body: await page.screenshot(), contentType: "image/png" })

    expect(problems(c), "erreurs navigateur:\n" + problems(c).join("\n")).toEqual([])
  })
})
