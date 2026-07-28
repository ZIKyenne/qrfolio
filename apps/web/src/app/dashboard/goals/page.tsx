import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import GoalsShell from "./GoalsShell"

export const metadata = { title: "Objectifs — QRowg" }

export default async function GoalsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: pages } = await supabase
    .from("pages")
    .select("id, title, slug")
    .eq("user_id", user.id)
    .order("title")

  const since90 = new Date()
  since90.setDate(since90.getDate() - 90)

  const { data: clicks } = await supabase
    .from("block_clicks")
    .select("block_id, click_target, clicked_at, page_id, blocks(type)")
    .in("page_id", (pages || []).map(p => p.id))
    .gte("clicked_at", since90.toISOString())
    .order("clicked_at", { ascending: false })

  const { data: views } = await supabase
    .from("page_views")
    .select("viewed_at, page_id")
    .in("page_id", (pages || []).map(p => p.id))
    .gte("viewed_at", since90.toISOString())

  const normalizedClicks = (clicks || []).map((c: any) => ({
    block_id:     c.block_id,
    click_target: c.click_target,
    clicked_at:   c.clicked_at,
    page_id:      c.page_id,
    block_type:   c.blocks?.type || "cta_button",
  }))

  return (
    <div style={{ minHeight: "100vh", background: "#080808", padding: "32px 24px 80px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <GoalsShell
          clicks={normalizedClicks}
          pageViews={views || []}
          pages={pages || []}
        />
      </div>
    </div>
  )
}
