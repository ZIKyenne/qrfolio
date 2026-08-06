// Route de harness E2E (T2) — preview des templates composés (structure × style × layout), rendu
// avec le vrai renderer de blocs, SANS Supabase. GATÉE 404 en production.
import { notFound } from "next/navigation"
import { TemplatePreviewHarness } from "./TemplatePreviewHarness"

export const dynamic = "force-dynamic"

export default function E2ETemplatePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <TemplatePreviewHarness />
}
