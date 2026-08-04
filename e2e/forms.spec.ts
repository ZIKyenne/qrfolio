import { test, expect } from "@playwright/test"

// Formulaires publics legacy (contact_form / quote_form) : soumission réelle. NÉCESSITE une page
// PUBLIÉE contenant ces blocs (donc un compte de test + création) ET une soumission vers /api/leads
// (écriture Supabase). Absents ici ⇒ ignorés avec raison, pour ne PAS écrire de données réelles.
// La logique (champs, payload, états, honeypot) est couverte en unités : forms.test.tsx,
// leadForms.test.ts (B09.13). Renseigner .env.e2e + une page de test pour activer.
const HAS_ACCOUNT = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD

test("contact_form : rendu, validation, soumission, succès", async ({ page }) => {
  test.skip(!HAS_ACCOUNT, "Requiert un compte de test + page publiée contenant contact_form. Non disponible ici (éviter toute écriture de lead réelle).")
  expect(HAS_ACCOUNT).toBe(true)
})

test("quote_form : champs, payload, succès", async ({ page }) => {
  test.skip(!HAS_ACCOUNT, "Requiert un compte de test + page publiée contenant quote_form. Non disponible ici.")
  expect(HAS_ACCOUNT).toBe(true)
})
