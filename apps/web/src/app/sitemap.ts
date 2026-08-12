import { createServerSupabaseClient } from "@/lib/supabase/server"
import { VERTICAL_ORDER } from "./qr-code/verticals"
import { GUIDE_ORDER } from "./guides/guides"

export default async function sitemap() {
  const supabase = await createServerSupabaseClient()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

  // Pages statiques indexables (les pages /auth/* sont volontairement exclues :
  // elles sont bloquees par robots.txt, les lister ici serait contradictoire).
  const staticPages = [
    { url: baseUrl,               lastModified: new Date(), changeFrequency: "weekly",  priority: 1   },
    { url: `${baseUrl}/features`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/examples`, lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
    { url: `${baseUrl}/upgrade`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/contact`,  lastModified: new Date(), changeFrequency: "yearly",  priority: 0.4 },
    { url: `${baseUrl}/legal`,    lastModified: new Date(), changeFrequency: "yearly",  priority: 0.2 },
    { url: `${baseUrl}/security`, lastModified: new Date(), changeFrequency: "yearly",  priority: 0.4 },
    { url: `${baseUrl}/terms`,    lastModified: new Date(), changeFrequency: "yearly",  priority: 0.2 },
    { url: `${baseUrl}/privacy`,  lastModified: new Date(), changeFrequency: "yearly",  priority: 0.2 },
  ]

  // Pages SEO « QR code par usage » (hub + une page par usage) + outil gratuit.
  const verticalPages = [
    { url: `${baseUrl}/generateur-qr-code`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${baseUrl}/generateur-qr-code-wifi`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/qr-code`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    ...VERTICAL_ORDER.map(slug => ({
      url: `${baseUrl}/qr-code/${slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8,
    })),
    { url: `${baseUrl}/guides`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    ...GUIDE_ORDER.map(slug => ({
      url: `${baseUrl}/guides/${slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7,
    })),
  ]

  // Pages publiques des utilisateurs
  const { data: pages } = await supabase
    .from("pages")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(1000)

  const userPages = (pages || []).map(page => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: new Date(page.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  return [...staticPages, ...verticalPages, ...userPages]
}
