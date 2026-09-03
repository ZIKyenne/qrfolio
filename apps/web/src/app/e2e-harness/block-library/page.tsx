// Route de harness E2E (C02) — rend la bibliothèque de blocs refondue pour Playwright, SANS
// authentification Supabase (état favoris/récents en mémoire). GATÉE : 404 en production.
import { notFound } from "next/navigation"
import { harnessAutorise } from "../gate"
import { BlockLibraryHarness } from "./BlockLibraryHarness"

export const dynamic = "force-dynamic"

export default function E2EBlockLibraryPage() {
  if (!harnessAutorise()) notFound()
  return <BlockLibraryHarness />
}
