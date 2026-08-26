import type { Metadata } from "next"
import Link from "next/link"
import Particles from "@/components/Particles"
import QrowgLogo from "@/components/QrowgLogo"
import { serializeJsonLd } from "@/lib/jsonLd"
import { creerUrl } from "../creer/entry"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(138,132,120,0.9)", BG = "#080808", BOR = "rgba(201,168,76,0.18)"
const URL = `${APP}/outils`

export const metadata: Metadata = {
  title: "Outils QR code gratuits — créer et vérifier",
  description: "Quatre outils gratuits pour vos QR codes : le générateur, le générateur WiFi, le testeur avant impression et le calculateur de taille. Sans compte, sans filigrane, dans le navigateur.",
  alternates: { canonical: URL },
  openGraph: { title: "Outils QR code gratuits | QRowg", description: "Générer, tester et dimensionner un QR code. Quatre outils gratuits, sans compte.", url: URL, siteName: "QRowg", type: "website" },
  twitter: { card: "summary_large_image", title: "Outils QR code gratuits | QRowg", description: "Générer, tester et dimensionner un QR code — gratuitement." },
}

// Chaque outil dit ce qu'il fait ET quand on s'en sert : sans ça, la page n'est
// qu'un menu, et un menu ne se cite pas.
const OUTILS = [
  {
    href: "/generateur-qr-code",
    emoji: "⚙️",
    nom: "Générateur de QR code",
    quoi: "Créez un QR code pour un lien, un texte, un email ou un numéro. Couleurs, logo, export PNG et SVG.",
    quand: "Quand vous partez de zéro.",
  },
  {
    href: "/generateur-qr-code-wifi",
    emoji: "📶",
    nom: "Générateur de QR code WiFi",
    quoi: "Un code qui connecte au réseau sans dicter le mot de passe. Nom du réseau, sécurité, mot de passe.",
    quand: "Pour une salle d'attente, un gîte, un bar.",
  },
  {
    href: "/outils/testeur-qr-code",
    emoji: "🔎",
    nom: "Testeur de QR code",
    quoi: "Un décodeur lit vraiment votre image, puis mesure le contraste, la marge blanche, la définition et vérifie la destination.",
    quand: "Avant de lancer un tirage.",
  },
  {
    href: "/outils/taille-qr-code",
    emoji: "📐",
    nom: "Taille d'impression",
    quoi: "Le côté minimal selon le support et la distance de lecture, en tenant compte de la longueur du contenu.",
    quand: "Avant de maquetter le support.",
  },
]

export default function OutilsPage() {
  const listeLd = {
    "@context": "https://schema.org", "@type": "CollectionPage", "@id": `${URL}/#page`,
    name: "Outils QR code gratuits", url: URL,
    description: "Quatre outils gratuits pour créer, vérifier et dimensionner un QR code.",
    hasPart: OUTILS.map(o => ({
      "@type": "WebApplication", name: o.nom, url: `${APP}${o.href}`,
      applicationCategory: "UtilitiesApplication", operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    })),
  }
  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: APP },
      { "@type": "ListItem", position: 2, name: "Outils gratuits", item: URL },
    ],
  }

  const cardCss: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: `1px solid ${BOR}`, borderRadius: 18, padding: 22 }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: BG, color: INK, fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(listeLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(crumbLd) }} />
      <Particles behind />

      <header style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "18px clamp(13px,4vw,22px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link href="/" aria-label="QRowg — accueil" style={{ textDecoration: "none" }}><QrowgLogo size={22} /></Link>
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(9px,2.6vw,14px)" }}>
          <Link href="/guides" style={{ color: MUT, textDecoration: "none", fontSize: "clamp(11.5px,3.2vw,13px)", fontWeight: 600, whiteSpace: "nowrap" }}>Guides</Link>
          <Link href={creerUrl()} style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: "clamp(12px,3.4vw,13.5px)", fontWeight: 700, padding: "9px clamp(10px,3vw,16px)", borderRadius: 10, whiteSpace: "nowrap" }}>Composer ma page</Link>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto", padding: "18px 22px 80px" }}>
        <nav aria-label="Fil d'Ariane" style={{ color: MUT, fontSize: 12.5, marginBottom: 18 }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}<span style={{ color: INK }}>Outils gratuits</span>
        </nav>

        <section style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 36px" }}>
          <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>Gratuit, sans compte</p>
          <h1 style={{ color: INK, fontSize: "clamp(30px,6vw,50px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "12px 0 16px", textWrap: "balance" }}>Outils QR code</h1>
          <p style={{ color: MUT, fontSize: "clamp(15px,2.4vw,18px)", lineHeight: 1.6, margin: "0 auto", maxWidth: 620 }}>
            Quatre outils pour couvrir le cycle complet d&apos;un QR code : le créer, vérifier qu&apos;il
            passera l&apos;impression, et savoir à quelle taille l&apos;imprimer. Tout se calcule dans votre
            navigateur, rien n&apos;est envoyé.
          </p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginBottom: 48 }}>
          {OUTILS.map(o => (
            <Link key={o.href} href={o.href} style={{ ...cardCss, textDecoration: "none", display: "block" }}>
              <p style={{ fontSize: 24, margin: "0 0 10px" }} aria-hidden>{o.emoji}</p>
              <p style={{ color: INK, fontSize: 16.5, fontWeight: 800, margin: "0 0 8px" }}>{o.nom}</p>
              <p style={{ color: MUT, fontSize: 13.5, lineHeight: 1.65, margin: "0 0 10px" }}>{o.quoi}</p>
              <p style={{ color: G, fontSize: 13, fontWeight: 700, margin: 0 }}>{o.quand}</p>
            </Link>
          ))}
        </section>

        <section style={{ ...cardCss, padding: "28px 22px", background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.1), transparent 60%), rgba(255,255,255,0.02)", textAlign: "center" }}>
          <h2 style={{ color: INK, fontSize: "clamp(20px,3vw,27px)", fontWeight: 800, margin: "0 0 14px" }}>Un code qu&apos;on peut corriger après impression</h2>
          <p style={{ color: MUT, fontSize: 14.5, lineHeight: 1.7, margin: "0 auto", maxWidth: 620 }}>
            Ces outils fabriquent des QR codes statiques : leur destination est gravée dedans. Un QR code
            dynamique garde la même image imprimée et vous laisse changer où il mène — un menu qui change,
            une offre qui se termine, un numéro qui bouge.
          </p>
          <div style={{ marginTop: 22 }}>
            <Link href={creerUrl(undefined, "outils")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(90deg,${G},#b8953f)`, color: "#080808", textDecoration: "none", fontSize: 15, fontWeight: 800, padding: "13px 28px", borderRadius: 12, boxShadow: "0 6px 26px rgba(201,168,76,0.3)" }}>Composer ma page — sans compte →</Link>
          </div>
        </section>
      </main>

      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${BOR}`, padding: "24px 22px", textAlign: "center", color: MUT, fontSize: 12.5 }}>
        <QrowgLogo size={16} />
        <p style={{ margin: "10px 0 0" }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}
          <Link href="/qr-code" style={{ color: MUT, textDecoration: "none" }}>QR codes par usage</Link>{" · "}
          <Link href="/guides" style={{ color: MUT, textDecoration: "none" }}>Guides</Link>{" · "}
          <Link href="/upgrade" style={{ color: MUT, textDecoration: "none" }}>Tarifs</Link>
        </p>
      </footer>
    </div>
  )
}
