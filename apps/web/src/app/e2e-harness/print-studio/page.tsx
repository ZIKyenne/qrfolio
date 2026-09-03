// Banc d'essai du Print Studio (tests) : monte l'îlot client sans la garde d'auth,
// pour vérifier l'arrivée depuis une page publiée (?metier/?objectif/?brand/?message/?cta/?item).
// GATÉE : 404 en production.
import { notFound } from "next/navigation"
import { harnessAutorise } from "../gate"
import PrintStudioClient from "@/app/dashboard/print-studio/PrintStudioClient"

export const dynamic = "force-dynamic"

export default async function E2EPrintStudioPage() {
  if (!harnessAutorise()) notFound()
  return <PrintStudioClient canAccess />
}
