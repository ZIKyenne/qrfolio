import { createAdminClient } from "@/lib/supabase/server"
import { VERTICAL_ORDER } from "./qr-code/verticals"
import { GUIDE_ORDER } from "./guides/guides"
import { jugerPage } from "@/lib/indexation"

// Dernière révision réelle du contenu éditorial. À mettre à jour quand on
// retouche les pages marketing ou le cluster SEO — surtout PAS `new Date()` :
// une date toujours fraîche est un signal que Google apprend à ignorer.
const CONTENT_REVISED = new Date("2026-08-24T00:00:00.000Z")

export default async function sitemap() {
  const supabase = createAdminClient()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

  // Pages statiques indexables (les pages /auth/* sont volontairement exclues :
  // elles sont bloquees par robots.txt, les lister ici serait contradictoire).
  const staticPages = [
    { url: baseUrl,               lastModified: CONTENT_REVISED, changeFrequency: "weekly",  priority: 1   },
    { url: `${baseUrl}/creer`,    lastModified: CONTENT_REVISED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/features`, lastModified: CONTENT_REVISED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/examples`, lastModified: CONTENT_REVISED, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${baseUrl}/upgrade`,  lastModified: CONTENT_REVISED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/contact`,  lastModified: CONTENT_REVISED, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${baseUrl}/legal`,    lastModified: CONTENT_REVISED, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${baseUrl}/security`, lastModified: CONTENT_REVISED, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${baseUrl}/terms`,    lastModified: CONTENT_REVISED, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${baseUrl}/privacy`,  lastModified: CONTENT_REVISED, changeFrequency: "yearly",  priority: 0.2 },
  ]

  // Pages SEO « QR code par usage » (hub + une page par usage) + outil gratuit.
  const verticalPages = [
    { url: `${baseUrl}/generateur-qr-code`, lastModified: CONTENT_REVISED, changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${baseUrl}/generateur-qr-code-wifi`, lastModified: CONTENT_REVISED, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/outils/testeur-qr-code`, lastModified: CONTENT_REVISED, changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${baseUrl}/qr-code`, lastModified: CONTENT_REVISED, changeFrequency: "monthly" as const, priority: 0.8 },
    ...VERTICAL_ORDER.map(slug => ({
      url: `${baseUrl}/qr-code/${slug}`, lastModified: CONTENT_REVISED, changeFrequency: "monthly" as const, priority: 0.8,
    })),
    { url: `${baseUrl}/guides`, lastModified: CONTENT_REVISED, changeFrequency: "monthly" as const, priority: 0.7 },
    ...GUIDE_ORDER.map(slug => ({
      url: `${baseUrl}/guides/${slug}`, lastModified: CONTENT_REVISED, changeFrequency: "monthly" as const, priority: 0.7,
    })),
  ]

  // Pages publiques des utilisateurs.
  //
  // On ne déclare PAS tout ce qui est publié. Une page d'essai — titre « Ma Page »,
  // adresse générée automatiquement, deux lignes de charabia — apprend au moteur
  // que ce domaine publie du vide, et ce jugement retombe sur les vraies pages.
  // Les pages écartées restent en ligne et leur QR code fonctionne : elles ne sont
  // simplement pas proposées. Voir lib/indexation.ts pour le détail du critère.
  const { data: pages } = await supabase
    .from("pages")
    .select("slug, title, updated_at, blocks(content)")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(1000)

  const userPages = (pages || [])
    .filter(page => jugerPage({
      slug: page.slug,
      title: page.title,
      blocks: (page as { blocks?: { content?: unknown }[] }).blocks,
    }).indexable)
    .map(page => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified: new Date(page.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))

  return [...staticPages, ...verticalPages, ...userPages]
}
