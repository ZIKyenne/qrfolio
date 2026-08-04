import { test, expect } from "@playwright/test"
import { collect, problems } from "./helpers/collect"

// Formulaire contact public. Teste une page PUBLIÉE de TEST contenant un bloc contact_form,
// fournie via E2E_CONTACT_PAGE_URL (ex. http://localhost:3100/mon-slug-de-test). Sans cette
// variable → ignoré. Par défaut on NE SOUMET PAS (évite un lead + emails réels) : on valide le
// rendu, la validation email et l'état désactivé du bouton. Mettre E2E_ALLOW_LEAD_SUBMIT=1 pour
// tester la soumission réelle (compte de test uniquement, données factices).
const PAGE_URL = process.env.E2E_CONTACT_PAGE_URL
const ALLOW_SUBMIT = process.env.E2E_ALLOW_LEAD_SUBMIT === "1"

test.describe("contact_form (page publique de test)", () => {
  test.skip(!PAGE_URL, "Définir E2E_CONTACT_PAGE_URL vers une page publiée contenant contact_form.")

  test("rendu, validation email, bouton désactivé tant que requis manquants", async ({ page }) => {
    const c = collect(page)
    await page.goto(PAGE_URL!, { waitUntil: "domcontentloaded" })

    const email = page.locator('input[type="email"]').first()
    await expect(email, "champ email du formulaire").toBeVisible({ timeout: 15_000 })
    const submit = page.getByRole("button").filter({ hasText: /envoyer/i }).first()
    await expect(submit, "bouton désactivé sans champs requis").toBeDisabled()

    // Email invalide → message d'erreur inline.
    await page.locator("input").first().fill("Testeur E2E")
    await email.fill("pas-un-email")
    await expect(page.getByText(/email invalide/i)).toBeVisible()
    await email.fill("e2e-visiteur@example.com")

    if (ALLOW_SUBMIT) {
      await expect(submit).toBeEnabled()
      await submit.click()
      await expect(page.getByText(/envoyée|merci/i)).toBeVisible({ timeout: 15_000 })
    }
    expect(problems(c), "erreurs navigateur:\n" + problems(c).join("\n")).toEqual([])
  })
})
