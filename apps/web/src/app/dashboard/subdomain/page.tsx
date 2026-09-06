import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SubdomainPanel from "./SubdomainPanel"

export const metadata = { title: "Sous-domaine — QRowg" }

export default async function SubdomainServerPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single()

  return (
    <div style={{ minHeight:"100vh", background:"#080808", padding:"40px 24px 80px", fontFamily:"DM Sans, sans-serif" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <SubdomainPanel currentUsername={profile?.username ?? null} />
      </div>
    </div>
  )
}
