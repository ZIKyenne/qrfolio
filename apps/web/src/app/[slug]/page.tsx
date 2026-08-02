import { createAdminClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import PublicPageClient from "./PublicPageClient"
import { canRemoveBranding, canPageIntro } from "@/lib/plans"
import { serializeJsonLd } from "@/lib/jsonLd"
import type { Metadata } from "next"

interface Props { params: Promise<{ slug: string }> }

// ISR : la page publique est identique pour tous (lue via service role, sans
// cookie) -> on la met en cache et on la régénère au plus toutes les 60s. Réduit
// le TTFB (cache CDN) et la charge Supabase (2 requêtes -> 1 fois / 60s / slug).
// Le tracking reste temps réel (client, dans PublicPageClient).
export const revalidate = 60

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  // Service role : lecture publique contrôlée côté serveur (RLS anon retirée sur profiles).
  const supabase = createAdminClient()
  const { data: page } = await supabase
    .from("pages")
    .select("title, seo_title, seo_description, og_image_url, slug, profiles(full_name, username)")
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  if (!page) return { title: "Page introuvable" }

  const profile = page.profiles as any
  const title = page.seo_title || page.title
  const description = page.seo_description || `Decouvre la page de ${profile?.full_name || page.title} sur QRowg`
  // Image OG : custom si definie, sinon image de marque generee dynamiquement par page.
  const image = page.og_image_url || `${APP_URL}/${page.slug}/og`
  const url = `${APP_URL}/${page.slug}`

  return {
    title,
    description,
    openGraph: {
      type: "profile",
      url,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      siteName: "QRowg",
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    alternates: { canonical: url },
  }
}

export default async function PublicPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: page } = await supabase
    .from("pages")
    .select("*, profiles(full_name, username, avatar_url, plan)")
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  if (!page) notFound()

  // "Sans branding" est un avantage payant : on n'affiche le footer QRowg que
  // si le plan du proprietaire ne retire pas le branding (free).
  const showBranding = !canRemoveBranding((page.profiles as any)?.plan)
  // Animation d'entrée : avantage Pro+, ENFORCÉ ici (le flag intro_enabled du thème
  // est éditable côté client, donc on revérifie le plan du propriétaire au rendu).
  const introEligible = canPageIntro((page.profiles as any)?.plan)
  // Fond appliqué à html/body DÈS le HTML initial : supprime toute frame blanche
  // avant le 1er paint (navigation), avant même que le cache SSR ne soit peint.
  // Sanitizé (hexa uniquement) → aucune injection possible dans le <style>.
  const safeBg = /^#[0-9a-fA-F]{3,8}$/.test((page as any).theme?.bg || "") ? (page as any).theme.bg : "#080808"

  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("page_id", page.id)
    .eq("is_visible", true)
    .order("position")

  // JSON-LD structured data
  const profile = page.profiles as any
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "name": page.title,
    "description": page.seo_description || `Page de ${profile?.full_name || page.title}`,
    "url": `${APP_URL}/${page.slug}`,
    "mainEntity": {
      "@type": "Person",
      "name": profile?.full_name || page.title,
      "url": `${APP_URL}/${page.slug}`,
      ...(profile?.avatar_url ? { "image": profile.avatar_url } : {}),
    }
  }

  // Le tracking est fait côté client dans PublicPageClient
  // pour détecter la vraie source (referrer HTTP, paramètres UTM)

  // Ne pas exposer au client (HTML/hydratation, visible par tout visiteur) des
  // colonnes internes inutiles au rendu public : id propriétaire, domaine perso,
  // modèle d'origine. (Vérifié : PublicPageClient ne les lit pas.)
  const { user_id, custom_domain, template_id, ...publicPage } = page as any

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `html,body{background:${safeBg}}` }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <PublicPageClient page={publicPage} blocks={blocks || []} showBranding={showBranding} introEligible={introEligible} />
    </>
  )
}
