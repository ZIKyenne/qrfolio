// Route de harness E2E (B11) — rend les 51 blocs shared pour Playwright.
// GATÉE : renvoie 404 en production (jamais exposée aux visiteurs).
import { notFound } from "next/navigation"
import { BlocksHarness } from "./BlocksHarness"

export const dynamic = "force-dynamic"

export default function E2EBlocksPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <BlocksHarness />
}
