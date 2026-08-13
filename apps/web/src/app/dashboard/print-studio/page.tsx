// Print Studio (nouveau) — route dédiée. Page serveur : garde d'auth + plan.
// L'UI guidée « objets, pas outils » vit dans PrintStudioClient (îlot client).
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { canPrintStudio } from "@/lib/plans"
import PrintStudioClient from "./PrintStudioClient"

export const metadata = { title: "Print Studio" }

export default async function PrintStudioPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?redirect=/dashboard/print-studio")

  const { data: prof } = await supabase.from("profiles").select("plan").eq("id", user.id).single()
  const plan = (prof?.plan as string) ?? "free"

  return <PrintStudioClient canAccess={canPrintStudio(plan)} />
}
