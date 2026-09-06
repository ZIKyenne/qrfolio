import type { Metadata } from "next"
import { ogFor } from "@/lib/seoMeta"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Fonctionnalités : QR dynamique et statistiques",
  description:
    "Pages personnalisables, QR codes dynamiques, statistiques en temps réel, modèles par métier et supports imprimables : tout QRowg en détail.",
  alternates: { canonical: `${APP}/features` },
  ...ogFor({ url: `${APP}/features`, title: "Fonctionnalités | QRowg", description: "Pages personnalisables, QR codes dynamiques, statistiques en temps réel, modèles par métier et supports imprimables : tout QRowg en détail." }),
}

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
