// Route de harness E2E (C03) — panneau de réglages refondu, SANS Supabase. GATÉE 404 en production.
import { notFound } from "next/navigation"
import { BlockSettingsHarness } from "./BlockSettingsHarness"

export const dynamic = "force-dynamic"

export default function E2EBlockSettingsPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <BlockSettingsHarness />
}
