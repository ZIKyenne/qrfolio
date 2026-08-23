import type { Metadata } from "next"
import Link from "next/link"
import Particles from "@/components/Particles"
import QrowgLogo from "@/components/QrowgLogo"
import { serializeJsonLd } from "@/lib/jsonLd"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { VERTICAL_ORDER, VERTICALS } from "../qr-code/verticals"
import GeneratorClient from "./GeneratorClient"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(138,132,120,0.9)", BG = "#080808", BOR = "rgba(201,168,76,0.18)"
const URL = `${APP}/generateur-qr-code`

export const metadata: Metadata = {
  title: "Générateur de QR code gratuit — en ligne, PNG & SVG",
  description: "Créez un QR code en ligne : lien, texte, WiFi, email, téléphone. Couleurs, logo, téléchargement PNG et SVG haute résolution. Compte gratuit, sans filigrane.",
  alternates: { canonical: URL },
  openGraph: { title: "Générateur de QR code gratuit | QRowg", description: "Créez un QR code en ligne (lien, WiFi, texte…) avec couleurs et logo. Téléchargement PNG/SVG, compte gratuit.", url: URL, siteName: "QRowg", type: "website" },
  twitter: { card: "summary_large_image", title: "Générateur de QR code gratuit | QRowg", description: "Créez un QR code en ligne avec un compte gratuit. PNG/SVG haute résolution." },
}

const FAQ = [
  { q: "Le générateur de QR code est-il gratuit ?", a: "Oui. Avec un compte gratuit, vous créez et téléchargez vos QR codes sans filigrane, en haute résolution. Le compte permet de gérer vos codes et d'en faire des QR dynamiques." },
  { q: "Le QR code expire-t-il un jour ?", a: "Non. Un QR code statique encode directement son contenu : il fonctionne pour toujours, même sans connexion." },
  { q: "Puis-je modifier le QR code après l'avoir créé ?", a: "Un QR code statique est figé. Pour changer la destination sans réimprimer et suivre les scans, créez un compte et générez un QR code dynamique." },
  { q: "Quels formats puis-je télécharger ?", a: "PNG en haute résolution (1024 px) et SVG vectoriel — parfaits pour l'impression sur cartes, flyers, menus ou affiches." },
  { q: "Puis-je ajouter mon logo et mes couleurs ?", a: "Oui, gratuitement. Choisissez les couleurs, le style des modules, le niveau de correction et ajoutez votre logo au centre." },
]
const STEPS = [
  "Choisissez le type (lien, texte, WiFi, email ou téléphone) et saisissez votre contenu.",
  "Personnalisez les couleurs, le style et, si vous voulez, ajoutez votre logo.",
  "Vérifiez que le QR est bien scannable (indicateur en direct).",
  "Téléchargez-le en PNG ou SVG haute résolution, prêt à imprimer.",
]

export default async function GeneratorPage() {
  // Ouvert à tous : un visiteur anonyme peut générer ET télécharger un QR STATIQUE
  // (le rendu se fait à 100% dans le navigateur). Le compte n'est requis que pour le
  // QR dynamique, la sauvegarde dans le compte et le suivi des scans.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const authed = !!user

  const appLd = {
    "@context": "https://schema.org", "@type": "WebApplication", "@id": `${URL}/#tool`,
    name: "Générateur de QR code gratuit QRowg", url: URL,
    applicationCategory: "UtilitiesApplication", operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    description: "Générateur de QR code gratuit en ligne (lien, WiFi, texte, email, téléphone) avec couleurs, logo et export PNG/SVG.",
  }
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: APP },
      { "@type": "ListItem", position: 2, name: "Générateur de QR code gratuit", item: URL },
    ],
  }
  const usages = VERTICAL_ORDER.map(s => VERTICALS[s]).filter(Boolean).slice(0, 6)
  const h2: React.CSSProperties = { color: INK, fontSize: "clamp(22px,3.2vw,30px)", fontWeight: 800, letterSpacing: "-0.01em", margin: 0, textAlign: "center" }
  const cardCss: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: `1px solid ${BOR}`, borderRadius: 18, padding: 20 }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: BG, color: INK, fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(appLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(crumbLd) }} />
      <Particles behind />

      <header style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" aria-label="QRowg — accueil" style={{ textDecoration: "none" }}><QrowgLogo size={22} /></Link>
        <Link href="/auth/signup" style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: 13.5, fontWeight: 700, padding: "9px 16px", borderRadius: 10 }}>Créer un compte</Link>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto", padding: "18px 22px 80px" }}>
        <nav aria-label="Fil d'Ariane" style={{ color: MUT, fontSize: 12.5, marginBottom: 18 }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}<span style={{ color: INK }}>Générateur de QR code gratuit</span>
        </nav>

        {/* Hero */}
        <section style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 30px" }}>
          <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>Outil gratuit</p>
          <h1 style={{ color: INK, fontSize: "clamp(30px,6vw,50px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "12px 0 16px", textWrap: "balance" }}>Générateur de QR code gratuit</h1>
          <p style={{ color: MUT, fontSize: "clamp(15px,2.4vw,18px)", lineHeight: 1.6, margin: "0 auto", maxWidth: 620 }}>Créez votre QR code en ligne — lien, texte, WiFi, email ou téléphone. Couleurs, logo, aperçu en direct, téléchargement PNG et SVG. Compte gratuit, sans filigrane.</p>
        </section>

        {/* L'outil (îlot client) */}
        <section aria-label="Générateur de QR code" style={{ marginBottom: 52 }}>
          <GeneratorClient authed={authed} />
        </section>

        {/* Comment ça marche */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ ...h2, marginBottom: 22 }}>Comment créer un QR code gratuit</h2>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12, maxWidth: 640, marginInline: "auto" }}>
            {STEPS.map((s, i) => (
              <li key={i} style={{ display: "flex", gap: 14, alignItems: "center", ...cardCss, padding: "14px 18px" }}>
                <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: "rgba(201,168,76,0.12)", border: `1px solid ${BOR}`, color: G, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                <span style={{ color: INK, fontSize: 14.5 }}>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Statique vs dynamique */}
        <section style={{ ...cardCss, marginBottom: 48, padding: "28px 22px", background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.1), transparent 60%), rgba(255,255,255,0.02)", border: `1px solid ${BOR}` }}>
          <h2 style={{ ...h2, marginBottom: 14 }}>QR code statique ou dynamique ?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginTop: 18 }}>
            <div>
              <p style={{ color: INK, fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>Statique (cet outil)</p>
              <p style={{ color: MUT, fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>Le contenu est encodé directement dans le QR. Gratuit, permanent, fonctionne hors ligne — mais la destination ne peut plus changer une fois imprimé.</p>
            </div>
            <div>
              <p style={{ color: G, fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>Dynamique (avec un compte)</p>
              <p style={{ color: MUT, fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>Le QR pointe vers une adresse que vous pouvez <strong style={{ color: INK }}>modifier à tout moment sans réimprimer</strong>, avec le <strong style={{ color: INK }}>suivi des scans</strong>. Idéal pour un usage professionnel.</p>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 22 }}>
            <Link href="/auth/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(90deg,${G},#b8953f)`, color: "#080808", textDecoration: "none", fontSize: 15, fontWeight: 800, padding: "13px 28px", borderRadius: 12, boxShadow: "0 6px 26px rgba(201,168,76,0.3)" }}>Créer un QR code dynamique gratuitement →</Link>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ ...h2, marginBottom: 22 }}>Questions fréquentes</h2>
          <div style={{ display: "grid", gap: 10, maxWidth: 720, marginInline: "auto" }}>
            {FAQ.map((f, i) => (
              <details key={i} style={{ ...cardCss, padding: "16px 18px" }}>
                <summary style={{ color: INK, fontSize: 15, fontWeight: 700, cursor: "pointer", listStyle: "none" }}>{f.q}</summary>
                <p style={{ color: MUT, fontSize: 14, lineHeight: 1.6, margin: "10px 0 0" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Maillage : usages */}
        <section>
          <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", textAlign: "center", marginBottom: 14 }}>QR codes par usage</p>
          <p style={{ textAlign: "center", margin: "0 0 14px" }}><Link href="/generateur-qr-code-wifi" style={{ color: G, textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}>📶 Besoin d'un QR code WiFi ? Utilisez le générateur WiFi dédié →</Link></p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {usages.map(v => (
              <Link key={v.slug} href={`/qr-code/${v.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${BOR}`, color: INK, textDecoration: "none", fontSize: 13.5, fontWeight: 600, padding: "10px 15px", borderRadius: 11 }}>
                <span aria-hidden>{v.emoji}</span> {v.eyebrow}
              </Link>
            ))}
            <Link href="/qr-code" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.08)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: 13.5, fontWeight: 700, padding: "10px 15px", borderRadius: 11 }}>Tous les usages →</Link>
          </div>
        </section>
      </main>

      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${BOR}`, padding: "24px 22px", textAlign: "center", color: MUT, fontSize: 12.5 }}>
        <QrowgLogo size={16} />
        <p style={{ margin: "10px 0 0" }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}
          <Link href="/qr-code" style={{ color: MUT, textDecoration: "none" }}>QR codes par usage</Link>{" · "}
          <Link href="/guides" style={{ color: MUT, textDecoration: "none" }}>Guides</Link>{" · "}
          <Link href="/features" style={{ color: MUT, textDecoration: "none" }}>Fonctionnalités</Link>{" · "}
          <Link href="/upgrade" style={{ color: MUT, textDecoration: "none" }}>Tarifs</Link>
        </p>
      </footer>
    </div>
  )
}
