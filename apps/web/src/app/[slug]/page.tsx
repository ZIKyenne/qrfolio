import { createAdminClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { jugerPage } from "@/lib/indexation"
import PublicPageClient from "./PublicPageClient"
import { canRemoveBranding, canPageIntro } from "@/lib/plans"
import { serializeJsonLd } from "@/lib/jsonLd"
import { normalizePageTheme } from "../dashboard/builder/types"
import type { Metadata } from "next"

interface Props { params: Promise<{ slug: string }> }

// ISR : la page publique est identique pour tous (lue via service role, sans
// cookie) -> on la met en cache et on la régénère au plus toutes les 60s. Réduit
// le TTFB (cache CDN) et la charge Supabase (2 requêtes -> 1 fois / 60s / slug).
// Le tracking reste temps réel (client, dans PublicPageClient).
export const revalidate = 60

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

/** Le gabarit racine ajoute « | QRowg » (8 caractères) : on garde le tout sous ~60. */
function clampTitle(t: string): string {
  const s = (t || "").trim()
  if (s.length <= 52) return s
  const cut = s.slice(0, 51)
  const sp = cut.lastIndexOf(" ")
  return (sp > 24 ? cut.slice(0, sp) : cut).trimEnd() + "…"
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  // Service role : lecture publique contrôlée côté serveur (RLS anon retirée sur profiles).
  const supabase = createAdminClient()
  const { data: page } = await supabase
    .from("pages")
    .select("title, seo_title, seo_description, og_image_url, slug, profiles(full_name, username), blocks(content)")
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  if (!page) return { title: "Page introuvable" }

  const proposable = jugerPage({
    slug: page.slug,
    title: page.title,
    blocks: (page as { blocks?: { content?: unknown }[] }).blocks,
  }).indexable

  const profile = page.profiles as any
  // Le titre part dans le gabarit « %s | QRowg » du layout racine : on le borne pour
  // que l'ensemble tienne dans la fenêtre de la SERP (~60 caractères).
  const title = clampTitle(page.seo_title || page.title)
  // Repli quand l'utilisateur n'a pas rempli sa description : une phrase correcte
  // et vouvoyée plutôt qu'un gabarit non accentué de trente caractères.
  const who = (profile?.full_name || page.title || "").trim()
  const description = page.seo_description
    || `${who} sur QRowg : coordonnées, horaires, liens et contact réunis sur une seule page, accessible en un scan.`.slice(0, 158)
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
    // Une page d'essai reste en ligne et scannable, mais n'est pas proposée aux
    // moteurs : sinon le domaine entier passe pour un domaine qui publie du vide.
    // `follow` est conservé pour que les liens sortants de la page comptent quand
    // même. Le sitemap applique exactement le même critère (lib/indexation.ts).
    robots: proposable ? undefined : { index: false, follow: true },
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
  // Thème normalisé (même frontière que le rendu public) : gère les anciens formats.
  const safeThemeBg = normalizePageTheme((page as any).theme).bg
  const safeBg = /^#[0-9a-fA-F]{3,8}$/.test(safeThemeBg) ? safeThemeBg : "#080808"

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
