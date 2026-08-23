import type { Metadata } from "next"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Exemples de pages",
  description:
    "Des exemples de pages QRowg par métier : restaurant, créateur, immobilier, indépendant, commerce. Inspirez-vous avant de créer la vôtre.",
  alternates: { canonical: `${APP}/examples` },
  openGraph: { title: "Exemples de pages | QRowg", description: "Des exemples de pages QRowg par métier : restaurant, créateur, immobilier, indépendant, commerce. Inspirez-vous avant de créer la vôtre.", url: `${APP}/examples`, siteName: "QRowg", type: "website" },
  twitter: { card: "summary_large_image", title: "Exemples de pages | QRowg", description: "Des exemples de pages QRowg par métier : restaurant, créateur, immobilier, indépendant, commerce. Inspirez-vous avant de créer la vôtre." },
}

export default function ExamplesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
