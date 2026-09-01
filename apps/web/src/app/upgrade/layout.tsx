import type { Metadata } from "next"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Tarifs & abonnements",
  description:
    "Comparez les plans QRowg — Gratuit, Établissement et Multi-sites. Sans engagement, résiliable à tout moment.",
  alternates: { canonical: `${APP}/upgrade` },
  openGraph: { title: "Tarifs & abonnements | QRowg", description: "Comparez les plans QRowg — Gratuit, Établissement et Multi-sites. Sans engagement, résiliable à tout moment.", url: `${APP}/upgrade`, siteName: "QRowg", type: "website" },
  twitter: { card: "summary_large_image", title: "Tarifs & abonnements | QRowg", description: "Comparez les plans QRowg — Gratuit, Établissement et Multi-sites. Sans engagement, résiliable à tout moment." },
}

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
