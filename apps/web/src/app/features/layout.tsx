import type { Metadata } from "next"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Fonctionnalités",
  description:
    "Pages personnalisables, QR codes dynamiques, statistiques en temps réel, modèles par métier et supports imprimables : tout QRowg en détail.",
  alternates: { canonical: `${APP}/features` },
  openGraph: { title: "Fonctionnalités | QRowg", description: "Pages personnalisables, QR codes dynamiques, statistiques en temps réel, modèles par métier et supports imprimables : tout QRowg en détail.", url: `${APP}/features`, siteName: "QRowg", type: "website" },
  twitter: { card: "summary_large_image", title: "Fonctionnalités | QRowg", description: "Pages personnalisables, QR codes dynamiques, statistiques en temps réel, modèles par métier et supports imprimables : tout QRowg en détail." },
}

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
