// Atelier d'impression (nouveau) — route dédiée. Page serveur : garde d'auth + plan.
// L'UI guidée « objets, pas outils » vit dans PrintStudioClient (îlot client).
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import PrintStudioClient from "./PrintStudioClient"

export const metadata = { title: "Atelier d'impression" }

export default async function PrintStudioPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?redirect=/dashboard/print-studio")

  // Atelier d'impression est GRATUIT pour tous les plans (il n'y a plus de création de QR :
  // on réutilise ses propres QR existants ou on importe un PNG — aucune facturation).
  return <PrintStudioClient canAccess />
}
