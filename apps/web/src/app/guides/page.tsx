import type { Metadata } from "next"
import Link from "next/link"
import Particles from "@/components/Particles"
import QrowgLogo from "@/components/QrowgLogo"
import { serializeJsonLd } from "@/lib/jsonLd"
import { GUIDES, GUIDE_ORDER } from "./guides"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(138,132,120,0.9)", BG = "#080808", BOR = "rgba(201,168,76,0.18)"

export const metadata: Metadata = {
  title: "Guides QR code : créer, imprimer, suivre les scans | QRowg",
  description: "Guides pratiques sur les QR codes : dynamique vs statique, comment en créer un, quelle taille pour l'impression, le rendre scannable et suivre les scans.",
  alternates: { canonical: `${APP}/guides` },
  openGraph: { title: "Guides QR code | QRowg", description: "Guides pratiques : dynamique vs statique, création, taille d'impression, scannabilité, statistiques.", url: `${APP}/guides`, siteName: "QRowg", type: "website" },
}

export default function GuidesHub() {
  const items = GUIDE_ORDER.map(s => GUIDES[s]).filter(Boolean)
  const listLd = {
    "@context": "https://schema.org", "@type": "CollectionPage",
    name: "Guides QR code", url: `${APP}/guides`,
    hasPart: items.map(g => ({ "@type": "Article", headline: g.h1, url: `${APP}/guides/${g.slug}` })),
  }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: BG, color: INK, fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(listLd) }} />
      <Particles behind />

      <header style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" aria-label="QRowg — accueil" style={{ textDecoration: "none" }}><QrowgLogo size={22} /></Link>
        <Link href="/generateur-qr-code" style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: 13.5, fontWeight: 700, padding: "9px 16px", borderRadius: 10 }}>Générateur gratuit</Link>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "24px 22px 80px" }}>
        <section style={{ textAlign: "center", maxWidth: 680, margin: "10px auto 40px" }}>
          <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>Guides</p>
          <h1 style={{ color: INK, fontSize: "clamp(30px,6vw,48px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "12px 0 16px", textWrap: "balance" }}>Tout comprendre sur les QR codes</h1>
          <p style={{ color: MUT, fontSize: "clamp(15px,2.4vw,18px)", lineHeight: 1.6, margin: "0 auto", maxWidth: 600 }}>Des guides clairs et honnêtes pour créer, imprimer et piloter vos QR codes — du choix statique/dynamique au suivi des scans.</p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
          {items.map(g => (
            <Link key={g.slug} href={`/guides/${g.slug}`} style={{ textDecoration: "none", display: "block", background: "rgba(255,255,255,0.025)", border: `1px solid ${BOR}`, borderRadius: 18, padding: 22 }}>
              <p style={{ color: G, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>{g.emoji} {g.category}</p>
              <p style={{ color: INK, fontSize: 17, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.25 }}>{g.h1}</p>
              <p style={{ color: MUT, fontSize: 13.5, margin: 0, lineHeight: 1.55 }}>{g.tldr.length > 130 ? g.tldr.slice(0, 128).trimEnd() + "…" : g.tldr}</p>
              <p style={{ color: G, fontSize: 13.5, fontWeight: 700, margin: "12px 0 0" }}>Lire le guide →</p>
            </Link>
          ))}
        </section>
      </main>

      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${BOR}`, padding: "24px 22px", textAlign: "center", color: MUT, fontSize: 12.5 }}>
        <QrowgLogo size={16} />
        <p style={{ margin: "10px 0 0" }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}
          <Link href="/qr-code" style={{ color: MUT, textDecoration: "none" }}>QR codes par usage</Link>{" · "}
          <Link href="/generateur-qr-code" style={{ color: MUT, textDecoration: "none" }}>Générateur gratuit</Link>{" · "}
          <Link href="/upgrade" style={{ color: MUT, textDecoration: "none" }}>Tarifs</Link>
        </p>
      </footer>
    </div>
  )
}
