import type { Metadata } from "next"
import { ogFor } from "@/lib/seoMeta"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Exemples de pages QR code par métier",
  description:
    "Des exemples de pages QRowg par métier : restaurant, créateur, immobilier, indépendant, commerce. Inspirez-vous avant de créer la vôtre.",
  alternates: { canonical: `${APP}/examples` },
  ...ogFor({ url: `${APP}/examples`, title: "Exemples de pages | QRowg", description: "Des exemples de pages QRowg par métier : restaurant, créateur, immobilier, indépendant, commerce. Inspirez-vous avant de créer la vôtre." }),
}

export default function ExamplesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
