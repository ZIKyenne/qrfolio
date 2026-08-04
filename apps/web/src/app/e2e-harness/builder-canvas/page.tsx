// Route de harness E2E (C04) — canvas responsive, SANS Supabase. GATÉE 404 en production.
import { notFound } from "next/navigation"
import { BuilderCanvasHarness } from "./BuilderCanvasHarness"

export const dynamic = "force-dynamic"

export default function E2EBuilderCanvasPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <BuilderCanvasHarness />
}
