// Route de harness E2E (C05) — shell Builder mobile, SANS Supabase. GATÉE 404 en production.
import { notFound } from "next/navigation"
import { harnessAutorise } from "../gate"
import { BuilderMobileHarness } from "./BuilderMobileHarness"

export const dynamic = "force-dynamic"

export default function E2EBuilderMobilePage() {
  if (!harnessAutorise()) notFound()
  return <BuilderMobileHarness />
}
