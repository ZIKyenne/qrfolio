import type { Metadata, Viewport } from "next"
import "./globals.css"
import { PLAN_LIST } from "@/lib/plans"
import { serializeJsonLd } from "@/lib/jsonLd"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
// Origine du stockage Supabase (avatars, galeries, produits) — preconnect pour eviter
// le handshake DNS/TLS au premier chargement d'image sur les pages publiques.
const SUPABASE_ORIGIN = (() => {
  try { return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "" } catch { return "" }
})()

export const viewport: Viewport = {
  themeColor: "#C9A84C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "QRowg — Carte de visite numérique & QR code dynamique pro",
    template: "%s | QRowg",
  },
  description:
    "Créez une page de présentation professionnelle, générez un QR code dynamique et suivez chaque scan. Idéal pour restaurants (menu numérique), indépendants, créateurs (portfolio, lien en bio) et commerces.",
  keywords: [
    "carte de visite numérique",
    "QR code professionnel",
    "QR code dynamique",
    "page de présentation professionnelle",
    "portfolio digital",
    "menu numérique restaurant",
    "lien en bio",
    "page mobile professionnelle",
    "générateur de QR code",
  ],
  authors: [{ name: "QRowg", url: APP_URL }],
  creator: "QRowg",
  publisher: "QRowg",
  // Experience "ajouter a l'ecran d'accueil" sur iOS (barre de statut sombre, titre court).
  appleWebApp: { capable: true, title: "QRowg", statusBarStyle: "black-translucent" },
  // Pas de canonical global ici : en App Router il serait HERITE par toutes les
  // pages enfants (features, examples, contact, upgrade) qui se canoniseraient
  // alors vers la home -> desindexation. Chaque page definit son propre canonical.
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: APP_URL,
    siteName: "QRowg",
    title: "QRowg — Carte de visite numérique & QR code dynamique pro",
    description:
      "Créez une page de présentation professionnelle, générez un QR code dynamique et suivez chaque scan. Idéal pour restaurants (menu numérique), indépendants, créateurs (portfolio, lien en bio) et commerces.",
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "QRowg — Page professionnelle avec QR code dynamique",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QRowg — Carte de visite numérique & QR code dynamique pro",
    description:
      "Page mobile pro + QR code dynamique + statistiques. En 5 minutes, sans rien coder.",
    images: [`${APP_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {SUPABASE_ORIGIN && <link rel="preconnect" href={SUPABASE_ORIGIN} />}
        {/* Police de marque self-hostée (voir @font-face dans globals.css) :
            préchargement du sous-ensemble latin critique — Inter (titres + corps). */}
        <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "QRowg",
              url: APP_URL,
              description:
                "Créez une page mobile professionnelle, générez un QR code dynamique et suivez chaque scan.",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              // Offres derivees de la source unique lib/plans (prix TTC mensuels) -> jamais de drift.
              offers: PLAN_LIST.map(p => ({
                "@type": "Offer",
                name: p.label,
                price: p.priceMonthly.toFixed(2),
                priceCurrency: "EUR",
              })),
              featureList: [
                "QR code dynamique",
                "Page mobile professionnelle",
                "Analytics en temps reel",
                "Templates metiers",
                "Domaine personnalise",
              ],
              inLanguage: "fr-FR",
              screenshot: `${APP_URL}/og-image.png`,
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
