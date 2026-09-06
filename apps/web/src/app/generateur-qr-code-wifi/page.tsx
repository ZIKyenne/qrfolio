import type { Metadata } from "next"
import Link from "next/link"
import Particles from "@/components/Particles"
import QrowgLogo from "@/components/QrowgLogo"
import { serializeJsonLd } from "@/lib/jsonLd"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import GeneratorClient from "../generateur-qr-code/GeneratorClient"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
import { creerUrl } from "../creer/entry"
import { ogFor } from "@/lib/seoMeta"

const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(138,132,120,0.9)", BG = "#080808", BOR = "rgba(201,168,76,0.18)"
const URL = `${APP}/generateur-qr-code-wifi`

export const metadata: Metadata = {
  title: "Générateur de QR code Wi-Fi gratuit",
  description: "Créez un QR code Wi-Fi gratuit : vos invités se connectent en un scan, sans taper le mot de passe. Fonctionne hors ligne, PNG/SVG à imprimer. Sans compte.",
  alternates: { canonical: URL },
  ...ogFor({ url: URL, title: "Générateur de QR code Wi-Fi gratuit | QRowg", description: "Créez un QR code Wi-Fi gratuit : connexion automatique en un scan, sans mot de passe à taper. À imprimer." }),
}

const FAQ = [
  { q: "Le QR code Wi-Fi fonctionne-t-il sans Internet ?", a: "Oui. Il encode directement le nom du réseau et le mot de passe : il fonctionne même sans connexion au moment du scan, et pour toujours." },
  { q: "Est-ce compatible iPhone et Android ?", a: "Oui. Les appareils récents iOS et Android proposent de rejoindre le réseau automatiquement dès le scan, sans application à installer." },
  { q: "Le mot de passe est-il visible dans le QR code ?", a: "Le QR contient le mot de passe, comme une affichette classique. Pour un lieu public, créez un réseau invité dédié plutôt que d'exposer votre Wi-Fi principal." },
  { q: "Quel type de sécurité choisir ?", a: "WPA/WPA2 pour la plupart des box récentes, WEP pour les anciens équipements, ou « Ouvert » pour un réseau sans mot de passe." },
  { q: "Le générateur de QR code Wi-Fi est-il gratuit ?", a: "Oui. Sans compte, vous créez et téléchargez votre QR code Wi-Fi en PNG ou SVG haute résolution, sans filigrane." },
]
const STEPS = [
  "Entrez le nom du réseau (SSID) et le mot de passe.",
  "Choisissez le type de sécurité (WPA/WPA2, WEP ou ouvert).",
  "Personnalisez les couleurs et, si vous voulez, ajoutez un logo.",
  "Téléchargez le QR en PNG ou SVG et imprimez-le (table, mur, affichette).",
]

export default async function WifiGeneratorPage() {
  // Ouvert à tous, comme le générateur principal. La page redirigeait les visiteurs
  // anonymes vers l'inscription : Googlebot n'étant jamais connecté, elle recevait un
  // 307 et ne pouvait pas être indexée — alors qu'elle est au sitemap, canonique,
  // balisée FAQ, et qu'elle vise « générateur QR code Wi-Fi gratuit ».
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const authed = !!user

  const appLd = {
    "@context": "https://schema.org", "@type": "WebApplication", "@id": `${URL}/#tool`,
    name: "Générateur de QR code Wi-Fi gratuit QRowg", url: URL,
    applicationCategory: "UtilitiesApplication", operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    description: "Générateur de QR code Wi-Fi gratuit : connexion automatique au réseau en un scan, export PNG/SVG.",
  }
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: APP },
      { "@type": "ListItem", position: 2, name: "Générateur de QR code", item: `${APP}/generateur-qr-code` },
      { "@type": "ListItem", position: 3, name: "QR code Wi-Fi", item: URL },
    ],
  }
  const h2: React.CSSProperties = { color: INK, fontSize: "clamp(22px,3.2vw,30px)", fontWeight: 800, letterSpacing: "-0.01em", margin: 0, textAlign: "center" }
  const cardCss: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: `1px solid ${BOR}`, borderRadius: 18, padding: 20 }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: BG, color: INK, fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(appLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(crumbLd) }} />
      <Particles behind />

      <header className="qf-entete" style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "18px clamp(13px,4vw,22px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link href="/" aria-label="QRowg — accueil" style={{ textDecoration: "none" }}><QrowgLogo size={22} /></Link>
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(9px,2.6vw,14px)" }}>
          <Link href="/auth/login" style={{ color: MUT, textDecoration: "none", fontSize: "clamp(11.5px,3.2vw,13px)", fontWeight: 600, whiteSpace: "nowrap" }}>Connexion</Link>
          <Link href={creerUrl()} style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: "clamp(12px,3.4vw,13.5px)", fontWeight: 700, padding: "9px clamp(10px,3vw,16px)", borderRadius: 10, whiteSpace: "nowrap" }}>Composer ma page</Link>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto", padding: "18px 22px 80px" }}>
        <nav aria-label="Fil d'Ariane" style={{ color: MUT, fontSize: 12.5, marginBottom: 18 }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}
          <Link href="/generateur-qr-code" style={{ color: MUT, textDecoration: "none" }}>Générateur de QR code</Link>{" · "}
          <span style={{ color: INK }}>QR code Wi-Fi</span>
        </nav>

        <section style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 30px" }}>
          <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>📶 Outil gratuit</p>
          <h1 style={{ color: INK, fontSize: "clamp(30px,6vw,50px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "12px 0 16px", textWrap: "balance" }}>Générateur de QR code Wi-Fi gratuit</h1>
          <p style={{ color: MUT, fontSize: "clamp(15px,2.4vw,18px)", lineHeight: 1.6, margin: "0 auto", maxWidth: 620 }}>Vos invités se connectent au Wi-Fi en un scan, sans taper le mot de passe. Idéal sur une table, un mur ou une affichette. Fonctionne hors ligne, une fois créé.</p>
        </section>

        {/* L'outil, pré-réglé sur Wi-Fi */}
        <section aria-label="Générateur de QR code Wi-Fi" style={{ marginBottom: 52 }}>
          <GeneratorClient defaultType="wifi" authed={authed} />
        </section>

        {/* Comment ça marche */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ ...h2, marginBottom: 22 }}>Comment créer un QR code Wi-Fi</h2>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12, maxWidth: 640, marginInline: "auto" }}>
            {STEPS.map((s, i) => (
              <li key={i} style={{ display: "flex", gap: 14, alignItems: "center", ...cardCss, padding: "14px 18px" }}>
                <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: "rgba(201,168,76,0.12)", border: `1px solid ${BOR}`, color: G, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                <span style={{ color: INK, fontSize: 14.5 }}>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Pourquoi / points clés */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ ...h2, marginBottom: 22 }}>Pourquoi un QR code Wi-Fi ?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
            {[
              ["Connexion automatique", "Le QR encode le réseau et le mot de passe : le téléphone propose de rejoindre en un geste, sans saisie."],
              ["Fonctionne hors ligne", "Le contenu est encodé dans le QR — aucune connexion n'est nécessaire au moment du scan, et il ne périme jamais."],
              ["Compatible iOS & Android", "Les appareils récents détectent le réseau au scan, sans application à installer."],
              ["Idéal pour les lieux d'accueil", "Restaurants, cafés, hôtels, locations, bureaux, salles d'attente — à afficher sur une table ou un mur."],
            ].map(([t, d], i) => (
              <div key={i} style={cardCss}>
                <p style={{ color: INK, fontSize: 15.5, fontWeight: 700, margin: "0 0 6px" }}>{t}</p>
                <p style={{ color: MUT, fontSize: 13.5, margin: 0, lineHeight: 1.55 }}>{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sécurité */}
        <section style={{ ...cardCss, marginBottom: 48, padding: "24px 22px", background: "rgba(251,191,36,0.05)", borderColor: "rgba(251,191,36,0.25)" }}>
          <p style={{ color: "#FBBF24", fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>⚠️ Conseil sécurité pour un lieu public</p>
          <p style={{ color: MUT, fontSize: 14, margin: 0, lineHeight: 1.6 }}>Un QR code Wi-Fi contient votre mot de passe. Dans un commerce ou un hôtel, créez de préférence un <strong style={{ color: INK }}>réseau invité dédié</strong> (séparé de votre réseau principal) : vous partagez la connexion sans exposer vos appareils internes.</p>
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

        {/* Maillage */}
        <section style={{ textAlign: "center" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            <Link href="/qr-code/wifi" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.03)", border: `1px solid ${BOR}`, color: INK, textDecoration: "none", fontSize: 13.5, fontWeight: 600, padding: "10px 15px", borderRadius: 11 }}>📶 QR code Wi-Fi pour votre établissement</Link>
            <Link href="/qr-code/hotel" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.03)", border: `1px solid ${BOR}`, color: INK, textDecoration: "none", fontSize: 13.5, fontWeight: 600, padding: "10px 15px", borderRadius: 11 }}>🏨 Hôtels & locations</Link>
            <Link href="/generateur-qr-code" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(201,168,76,0.08)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: 13.5, fontWeight: 700, padding: "10px 15px", borderRadius: 11 }}>Générateur (tous types) →</Link>
          </div>
        </section>
      </main>

      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${BOR}`, padding: "24px 22px", textAlign: "center", color: MUT, fontSize: 12.5 }}>
        <QrowgLogo size={16} />
        <p style={{ margin: "10px 0 0" }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}
          <Link href="/generateur-qr-code" style={{ color: MUT, textDecoration: "none" }}>Générateur de QR code</Link>{" · "}
          <Link href="/guides" style={{ color: MUT, textDecoration: "none" }}>Guides</Link>{" · "}
          <Link href="/qr-code" style={{ color: MUT, textDecoration: "none" }}>QR codes par usage</Link>
        </p>
      </footer>
    </div>
  )
}
