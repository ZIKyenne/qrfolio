import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DomainsPage from "./DomainsPage"

export const metadata = { title: "Domaines — QRowg" }

export default async function DomainsServerPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const [{ data: profile }, { data: pages }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", user.id).single(),
    supabase.from("pages").select("id, title, slug, status").eq("user_id", user.id).eq("status", "published").order("title"),
  ])

  return (
    <DomainsPage
      pages={pages || []}
      plan={profile?.plan ?? "free"}
    />
  )
}
