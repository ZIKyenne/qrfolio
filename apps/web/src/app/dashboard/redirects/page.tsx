import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import RedirectsPanel from "./RedirectsPanel"

export const metadata = { title: "Redirections — QRowg" }

export default async function RedirectsServerPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Récupérer les domaines vérifiés de l'user
  const { data: domains } = await supabase
    .from("domain_verifications")
    .select("domain")
    .eq("user_id", user.id)
    .eq("verified", true)

  const userDomains = (domains ?? []).map(d => d.domain)

  return <RedirectsPanel userDomains={userDomains} />
}
