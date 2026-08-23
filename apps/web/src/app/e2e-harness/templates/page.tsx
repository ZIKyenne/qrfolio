// Route de banc d'aperçu des modèles (tests). GATÉE : 404 en production.
import { notFound } from "next/navigation"
import { TemplateHarness } from "./TemplateHarness"

export const dynamic = "force-dynamic"

export default async function E2ETemplatesPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound()
  const { t } = await searchParams
  return <TemplateHarness templateKey={t} />
}
