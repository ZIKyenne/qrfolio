// Route de harness — LA PAGE PUBLIÉE, celle que découvre un client qui scanne.
// Monte le vrai PublicPageClient avec un modèle de la galerie, sans Supabase.
// GATÉE : 404 en production (sauf E2E_HARNESS=1, jamais défini sur Vercel).
import { notFound } from "next/navigation"
import { harnessAutorise } from "../gate"
import { PublicPageHarness } from "./PublicPageHarness"

export const dynamic = "force-dynamic"

export default async function E2EPublicPage({ searchParams }: { searchParams: Promise<{ t?: string; theme?: string; epreuve?: string; images?: string }> }) {
  if (!harnessAutorise()) notFound()
  const { t, theme, epreuve, images } = await searchParams
  return <PublicPageHarness modele={t} theme={theme} epreuve={epreuve} images={images} />
}
