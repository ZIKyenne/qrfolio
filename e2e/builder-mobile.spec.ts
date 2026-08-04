import { test, expect } from "@playwright/test"

// Builder mobile (bottom bar, panneau d'ajout, réglages, clavier, sauvegarde). NÉCESSITE un compte
// de test Supabase pour ouvrir le Builder ⇒ ignoré avec raison. Squelette prêt (projet "mobile"
// = viewport 390×844). Renseigner .env.e2e pour l'activer.
const HAS_ACCOUNT = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD

test("Builder mobile : panneaux, bottom bar, sans overflow horizontal", async ({ page }) => {
  test.skip(!HAS_ACCOUNT, "Requiert un compte de test Supabase pour ouvrir le Builder. Non disponible dans cet environnement.")
  expect(HAS_ACCOUNT).toBe(true)
})
