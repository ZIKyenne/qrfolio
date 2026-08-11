import type { Metadata } from "next"
import Link from "next/link"
import Particles from "@/components/Particles"
import QrowgLogo from "@/components/QrowgLogo"
import { serializeJsonLd } from "@/lib/jsonLd"
import { VERTICALS, VERTICAL_ORDER } from "./verticals"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(138,132,120,0.9)", BG = "#080808", BOR = "rgba(201,168,76,0.18)"

export const metadata: Metadata = {
  title: "QR codes par usage : restaurant, menu, avis Google, WiFi… | QRowg",
  description: "Créez le QR code adapté à votre besoin : restaurant, menu numérique, avis Google, WiFi, événement, carte de visite. Dynamique, modifiable, prêt à imprimer.",
  alternates: { canonical: `${APP}/qr-code` },
  openGraph: { title: "QR codes par usage | QRowg", description: "Le QR code adapté à chaque besoin : restaurant, menu, avis Google, WiFi, événement, carte de visite.", url: `${APP}/qr-code`, siteName: "QRowg", type: "website" },
}

export default function QrCodeHub() {
  const items = VERTICAL_ORDER.map(s => VERTICALS[s]).filter(Boolean)
  const listLd = {
    "@context": "https://schema.org", "@type": "CollectionPage",
    name: "QR codes par usage", url: `${APP}/qr-code`,
    hasPart: items.map(v => ({ "@type": "WebPage", name: v.eyebrow, url: `${APP}/qr-code/${v.slug}` })),
  }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: BG, color: INK, fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(listLd) }} />
      <Particles behind />

      <header style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" aria-label="QRowg — accueil" style={{ textDecoration: "none" }}><QrowgLogo size={22} /></Link>
        <Link href="/auth/signup" style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: 13.5, fontWeight: 700, padding: "9px 16px", borderRadius: 10 }}>Créer gratuitement</Link>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "24px 22px 80px" }}>
        <section style={{ textAlign: "center", maxWidth: 700, margin: "10px auto 40px" }}>
          <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>QR codes par usage</p>
          <h1 style={{ color: INK, fontSize: "clamp(30px,6vw,50px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "12px 0 16px", textWrap: "balance" }}>Le bon QR code pour chaque besoin</h1>
          <p style={{ color: MUT, fontSize: "clamp(15px,2.4vw,18px)", lineHeight: 1.6, margin: "0 auto", maxWidth: 600 }}>Restaurant, menu, avis Google, WiFi, événement ou carte de visite — choisissez votre usage et créez un QR code dynamique, modifiable et prêt à imprimer.</p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
          {items.map(v => (
            <Link key={v.slug} href={`/qr-code/${v.slug}`} style={{ textDecoration: "none", display: "block", background: "rgba(255,255,255,0.025)", border: `1px solid ${BOR}`, borderRadius: 18, padding: 22 }}>
              <div style={{ fontSize: 30, marginBottom: 10 }} aria-hidden>{v.emoji}</div>
              <p style={{ color: INK, fontSize: 17, fontWeight: 800, margin: "0 0 6px" }}>{v.eyebrow}</p>
              <p style={{ color: MUT, fontSize: 13.5, margin: 0, lineHeight: 1.55 }}>{v.intro.length > 110 ? v.intro.slice(0, 108).trimEnd() + "…" : v.intro}</p>
              <p style={{ color: G, fontSize: 13.5, fontWeight: 700, margin: "12px 0 0" }}>Créer ce QR code →</p>
            </Link>
          ))}
        </section>

        <section style={{ textAlign: "center", marginTop: 44 }}>
          <Link href="/auth/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(90deg,${G},#b8953f)`, color: "#080808", textDecoration: "none", fontSize: 15, fontWeight: 800, padding: "14px 30px", borderRadius: 12, boxShadow: "0 6px 26px rgba(201,168,76,0.32)" }}>Créer mon QR code gratuitement →</Link>
          <p style={{ color: MUT, fontSize: 12.5, margin: "10px 0 0" }}>Sans carte bancaire · Modifiable à tout moment</p>
        </section>
      </main>

      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${BOR}`, padding: "24px 22px", textAlign: "center", color: MUT, fontSize: 12.5 }}>
        <QrowgLogo size={16} />
        <p style={{ margin: "10px 0 0" }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}
          <Link href="/features" style={{ color: MUT, textDecoration: "none" }}>Fonctionnalités</Link>{" · "}
          <Link href="/examples" style={{ color: MUT, textDecoration: "none" }}>Exemples</Link>{" · "}
          <Link href="/upgrade" style={{ color: MUT, textDecoration: "none" }}>Tarifs</Link>
        </p>
      </footer>
    </div>
  )
}
