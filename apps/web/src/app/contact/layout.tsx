import type { Metadata } from "next"
import { ogFor } from "@/lib/seoMeta"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Contact — une question sur QRowg ?",
  description:
    "Une question sur QRowg, une page à créer, un QR code qui pose problème ? Écrivez-nous : nous répondons sous 24 heures ouvrées, en français.",
  alternates: { canonical: `${APP}/contact` },
  ...ogFor({ url: `${APP}/contact`, title: "Contact | QRowg", description: "Une question sur QRowg, une page à créer, un QR code qui pose problème ? Écrivez-nous : nous répondons sous 24 heures ouvrées, en français." }),
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
