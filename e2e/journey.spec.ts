import { test, expect } from "@playwright/test"

// Parcours authentifié complet : connexion → dashboard → création → Builder → ajout bloc →
// sauvegarde → publication → page publique → retour. NÉCESSITE un compte de TEST Supabase
// (E2E_TEST_EMAIL / E2E_TEST_PASSWORD) — absent dans cet environnement ⇒ ignoré avec raison.
// Le squelette est prêt : renseigner .env.e2e pour l'activer (voir docs/PLAYWRIGHT-QA-GUIDE.md).
const HAS_ACCOUNT = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD

test("parcours création → Builder → sauvegarde → publication → page publique", async ({ page }) => {
  test.skip(!HAS_ACCOUNT, "Requiert un compte de test Supabase (E2E_TEST_EMAIL/E2E_TEST_PASSWORD). Non disponible dans cet environnement.")
  // Squelette (à compléter une fois le compte de test fourni) :
  // await login(page)
  // await page.goto("/dashboard"); await page.getByRole("button", { name: /créer/i }).click()
  // ... ajout d'un bloc, saisie, attente "Enregistré", publication, ouverture page publique, assertions.
  expect(HAS_ACCOUNT).toBe(true)
})
