import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import LeadsClient from "./LeadsClient"
import { accessibleOwnerIds } from "@/lib/team"

export const metadata = { title: "Messages — QRowg" }

export default async function LeadsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const ownerIds = await accessibleOwnerIds(supabase, user.id)
  const { data: pages } = await supabase
    .from("pages")
    .select("id, title, slug")
    .in("user_id", ownerIds)

  // Requete directe via leads.user_id (denormalise, migration 20260726) : plus
  // besoin de recuperer les pages puis .in(pageIds).
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, page_id, block_id, type, name, email, phone, message, data, is_read, status, created_at")
    .in("user_id", ownerIds)
    .order("created_at", { ascending: false })
    .limit(500)

  // Table absente (migration 016 non appliquee) -> on signale la config a faire au lieu d'un vide muet.
  const setupNeeded = !!error && (error.code === "42P01" || error.code === "PGRST205" || /relation .*leads.* does not exist|could not find the table/i.test(error.message || ""))

  return <LeadsClient leads={leads || []} pages={pages || []} setupNeeded={setupNeeded} />
}
