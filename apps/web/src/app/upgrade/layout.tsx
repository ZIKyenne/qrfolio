import type { Metadata } from "next"
import { ogFor } from "@/lib/seoMeta"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Tarifs QRowg : quel plan pour votre activité ?",
  description:
    "Comparez les plans QRowg : Gratuit, Établissement et Multi-sites. Pages, QR modifiables, statistiques et domaine. Sans engagement, résiliable en un clic.",
  alternates: { canonical: `${APP}/upgrade` },
  ...ogFor({ url: `${APP}/upgrade`, title: "Tarifs & abonnements | QRowg", description: "Comparez les plans QRowg : Gratuit, Établissement et Multi-sites. Pages, QR modifiables, statistiques et domaine. Sans engagement, résiliable en un clic." }),
}

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
