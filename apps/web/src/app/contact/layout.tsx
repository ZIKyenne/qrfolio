import type { Metadata } from "next"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Une question sur QRowg ? Écrivez-nous : nous répondons sous 24 h ouvrées pour vous aider à créer votre page et votre QR code.",
  alternates: { canonical: `${APP}/contact` },
  openGraph: { title: "Contact | QRowg", description: "Une question sur QRowg ? Écrivez-nous : nous répondons sous 24 h ouvrées pour vous aider à créer votre page et votre QR code.", url: `${APP}/contact`, siteName: "QRowg", type: "website" },
  twitter: { card: "summary_large_image", title: "Contact | QRowg", description: "Une question sur QRowg ? Écrivez-nous : nous répondons sous 24 h ouvrées pour vous aider à créer votre page et votre QR code." },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
