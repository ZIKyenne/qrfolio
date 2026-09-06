import type { Metadata, Viewport } from "next"
import { FOND_APP } from "@/lib/couleursApp"
import "./globals.css"
import { PLAN_LIST } from "@/lib/plans"
import { serializeJsonLd } from "@/lib/jsonLd"
import { Analytics } from "@vercel/analytics/next"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
// Origine du stockage Supabase (avatars, galeries, produits) — preconnect pour eviter
// le handshake DNS/TLS au premier chargement d'image sur les pages publiques.
const SUPABASE_ORIGIN = (() => {
  try { return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "" } catch { return "" }
})()

export const viewport: Viewport = {
  // Même valeur que manifest.ts (theme_color) : le <meta name="theme-color">
  // annonçait l'or et le manifeste le noir. Android suit le manifeste une fois
  // l'app installée, la balise avant : la barre de statut changeait de couleur
  // entre le site et l'icône posée sur l'écran d'accueil. C'est le fond de
  // l'application qui fait foi.
  themeColor: FOND_APP,
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  verification: { google: "j0SKDePzohMoahiN7B09kpx5RGpZaNMdW1N-s-M1IPg" },
  title: {
    default: "QRowg — Carte de visite numérique & QR code dynamique pro",
    template: "%s | QRowg",
  },
  description:
    "Créez une page pro, générez un QR code dynamique et suivez chaque scan. Pour restaurants, commerces, indépendants et créateurs.",
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
    // Image OG : fournie par le fichier-convention app/opengraph-image.tsx
    // (générée dynamiquement -> ne peut jamais renvoyer 404, contrairement à
    // l'ancien /og-image.png statique qui était absent de /public).
  },
  twitter: {
    card: "summary_large_image",
    title: "QRowg — Carte de visite numérique & QR code dynamique pro",
    description:
      "Page mobile pro + QR code dynamique + statistiques. En 5 minutes, sans rien coder.",
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
              // Même @id et même @type que le nœud du @graph de l'accueil
              // (lib/landingJsonLd.ts) : les deux descriptions fusionnent en une
              // seule entité au lieu de se concurrencer.
              "@type": "SoftwareApplication",
              "@id": `${APP_URL}/#software`,
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
                "Statistiques en temps réel",
                "Modèles par métier",
                "Domaine personnalise",
              ],
              inLanguage: "fr-FR",
              screenshot: `${APP_URL}/opengraph-image`,
            }),
          }}
        />
      </head>
      <body>{children}<Analytics /></body>
    </html>
  )
}
