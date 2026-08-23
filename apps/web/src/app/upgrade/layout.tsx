import type { Metadata } from "next"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Tarifs & abonnements",
  description:
    "Comparez les plans QRowg — Free, Starter, Pro et Business. Essai gratuit de 7 jours, sans engagement, annulable à tout moment.",
  alternates: { canonical: `${APP}/upgrade` },
  openGraph: { title: "Tarifs & abonnements | QRowg", description: "Comparez les plans QRowg — Free, Starter, Pro et Business. Essai gratuit de 7 jours, sans engagement, annulable à tout moment.", url: `${APP}/upgrade`, siteName: "QRowg", type: "website" },
  twitter: { card: "summary_large_image", title: "Tarifs & abonnements | QRowg", description: "Comparez les plans QRowg — Free, Starter, Pro et Business. Essai gratuit de 7 jours, sans engagement, annulable à tout moment." },
}

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
