import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import OnboardingClient from "./OnboardingClient"

export const metadata = { title: "Créer par objectif — QRowg" }

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return <OnboardingClient />
}
