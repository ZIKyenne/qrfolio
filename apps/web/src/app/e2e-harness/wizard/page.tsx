// Route de banc d'essai de l'assistant (tests). GATÉE : 404 en production.
import { notFound } from "next/navigation"
import { harnessAutorise } from "../gate"
import { WizardHarness } from "./WizardHarness"

export const dynamic = "force-dynamic"

export default async function E2EWizardPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  if (!harnessAutorise()) notFound()
  const { t } = await searchParams
  return <WizardHarness templateKey={t} />
}
