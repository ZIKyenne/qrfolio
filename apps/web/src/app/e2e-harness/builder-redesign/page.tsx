// Route de harness E2E (C06) — Builder refondu INTÉGRÉ (C01-C05 ensemble), SANS Supabase.
// GATÉE 404 en production.
import { notFound } from "next/navigation"
import { BuilderRedesignHarness } from "./BuilderRedesignHarness"

export const dynamic = "force-dynamic"

export default function E2EBuilderRedesignPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <BuilderRedesignHarness />
}
