// Route de banc d'aperçu des modèles (tests). GATÉE : 404 en production.
import { notFound } from "next/navigation"
import { harnessAutorise } from "../gate"
import { TemplateHarness } from "./TemplateHarness"

export const dynamic = "force-dynamic"

export default async function E2ETemplatesPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  if (!harnessAutorise()) notFound()
  const { t } = await searchParams
  return <TemplateHarness templateKey={t} />
}
