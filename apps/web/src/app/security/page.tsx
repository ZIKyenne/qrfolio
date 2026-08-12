import type { Metadata } from "next"
import Link from "next/link"
import Particles from "@/components/Particles"
import QrowgLogo from "@/components/QrowgLogo"
import { serializeJsonLd } from "@/lib/jsonLd"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(138,132,120,0.92)", BG = "#080808", BOR = "rgba(201,168,76,0.18)"
const URL = `${APP}/security`
const UPDATED = "2026-08-12"

export const metadata: Metadata = {
  title: "Sécurité & confidentialité | QRowg",
  description: "Comment QRowg protège vos données : chiffrement, isolation par utilisateur (RLS), paiements Stripe, hébergement en Europe, export et suppression de vos données.",
  alternates: { canonical: URL },
  openGraph: { title: "Sécurité — QRowg", description: "Chiffrement, isolation des données, paiements Stripe, hébergement en Europe, contrôle total de vos données.", url: URL, siteName: "QRowg", type: "website" },
}

// Contenu 100% factuel, vérifiable dans le code/l'infra. Aucune certification revendiquée.
const SECTIONS: { icon: string; h: string; points: string[] }[] = [
  { icon: "🔒", h: "Chiffrement & transport", points: [
    "Tout le trafic est chiffré en HTTPS/TLS, avec HSTS (Strict-Transport-Security) préchargé.",
    "En-têtes de sécurité stricts sur toutes les pages : X-Frame-Options, X-Content-Type-Options (nosniff), Referrer-Policy et Permissions-Policy.",
    "Les données sont chiffrées au repos par notre base de données managée (PostgreSQL).",
  ] },
  { icon: "🧱", h: "Isolation des données (RLS)", points: [
    "Chaque table est protégée par Row Level Security au niveau de la base : un compte ne peut lire ou modifier que ses propres données.",
    "Cette isolation est appliquée par la base elle-même, pas seulement par l'application — la règle tient même en cas d'erreur applicative.",
    "Des migrations de durcissement dédiées ferment régulièrement les accès trop larges (ex. inserts publics d'analytics/leads).",
  ] },
  { icon: "🔑", h: "Authentification & mots de passe", points: [
    "Vos mots de passe ne sont jamais stockés en clair : ils sont hachés.",
    "Les mots de passe qui protègent un lien QR sont hachés avec scrypt et un sel aléatoire, et comparés à temps constant.",
    "Les clés d'API sont stockées hachées (SHA-256), jamais en clair.",
  ] },
  { icon: "💳", h: "Paiements", points: [
    "Les paiements sont gérés par Stripe, certifié PCI-DSS.",
    "QRowg ne voit ni ne stocke jamais vos données de carte bancaire.",
    "Les événements de facturation reçus de Stripe sont vérifiés par signature cryptographique.",
  ] },
  { icon: "🗄️", h: "Vos données vous appartiennent", points: [
    "Export de vos données et suppression de votre compte disponibles depuis votre espace compte.",
    "Hébergement des données en Europe.",
    "Sauvegardes automatiques de la base de données.",
  ] },
  { icon: "🛡️", h: "Anti-abus & redirections QR", points: [
    "Limitation de débit (rate-limiting) sur les points sensibles pour prévenir les abus.",
    "Les redirections des QR dynamiques sont restreintes à http(s) et durcies contre les redirections ouvertes et le SSRF.",
    "Les liens QR peuvent être protégés par mot de passe, mis en pause ou expirés à tout moment.",
  ] },
]

export default function SecurityPage() {
  const orgLd = {
    "@context": "https://schema.org", "@type": "WebPage",
    name: "Sécurité & confidentialité — QRowg", url: URL,
    dateModified: UPDATED,
    publisher: { "@type": "Organization", name: "QRowg", url: APP },
    inLanguage: "fr",
  }
  const h2: React.CSSProperties = { color: INK, fontSize: 17, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 10 }
  const cardCss: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: `1px solid ${BOR}`, borderRadius: 18, padding: "22px 24px" }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: BG, color: INK, fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(orgLd) }} />
      <Particles behind />

      <header style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" aria-label="QRowg — accueil" style={{ textDecoration: "none" }}><QrowgLogo size={22} /></Link>
        <Link href="/auth/signup" style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: 13.5, fontWeight: 700, padding: "9px 16px", borderRadius: 10 }}>Créer un compte</Link>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "24px 22px 80px" }}>
        <nav aria-label="Fil d'Ariane" style={{ color: MUT, fontSize: 12.5, marginBottom: 20 }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}<span style={{ color: INK }}>Sécurité</span>
        </nav>

        <section style={{ maxWidth: 680, marginBottom: 36 }}>
          <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>🔒 Sécurité & confidentialité</p>
          <h1 style={{ color: INK, fontSize: "clamp(28px,5vw,44px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.12, margin: "12px 0 14px", textWrap: "balance" }}>Vos données, protégées et sous votre contrôle</h1>
          <p style={{ color: MUT, fontSize: "clamp(15px,2.2vw,17px)", lineHeight: 1.6, margin: 0 }}>Vous nous confiez votre image, vos liens, parfois vos paiements. Voici, concrètement et sans jargon, comment nous protégeons vos données — et celles des visiteurs de vos pages.</p>
        </section>

        <section style={{ display: "grid", gap: 14 }}>
          {SECTIONS.map((s, i) => (
            <div key={i} style={cardCss}>
              <h2 style={h2}><span aria-hidden style={{ fontSize: 20 }}>{s.icon}</span> {s.h}</h2>
              <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 9 }}>
                {s.points.map((p, j) => (
                  <li key={j} style={{ color: "#D8D2C6", fontSize: 14.5, lineHeight: 1.55, paddingLeft: 22, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: G }}>✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* Données visiteurs vs utilisateur */}
        <section style={{ ...cardCss, marginTop: 14, background: "rgba(255,255,255,0.02)" }}>
          <h2 style={h2}><span aria-hidden style={{ fontSize: 20 }}>⚖️</span> RGPD & données des visiteurs</h2>
          <p style={{ color: "#D8D2C6", fontSize: 14.5, lineHeight: 1.6, margin: "12px 0 0" }}>
            Nous distinguons vos <strong style={{ color: INK }}>données de compte</strong> (email, contenu de vos pages) des <strong style={{ color: INK }}>données des visiteurs</strong> de vos pages publiques. Les statistiques de scan reposent sur des données <strong style={{ color: INK }}>agrégées</strong> (compteurs, type d'appareil, pays) — pas sur l'identité des personnes. Si vous collectez des données via un formulaire, vous en êtes responsable et devez informer vos visiteurs conformément au RGPD.
          </p>
          <p style={{ color: MUT, fontSize: 13, margin: "12px 0 0" }}>Voir aussi notre <Link href="/privacy" style={{ color: G, textDecoration: "none" }}>politique de confidentialité</Link> et nos <Link href="/terms" style={{ color: G, textDecoration: "none" }}>conditions d'utilisation</Link>.</p>
        </section>

        {/* Divulgation responsable */}
        <section style={{ ...cardCss, marginTop: 14, borderColor: "rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.05)" }}>
          <h2 style={h2}><span aria-hidden style={{ fontSize: 20 }}>📣</span> Signaler une vulnérabilité</h2>
          <p style={{ color: "#D8D2C6", fontSize: 14.5, lineHeight: 1.6, margin: "12px 0 0" }}>
            Vous avez identifié un problème de sécurité ? Écrivez-nous à <a href="mailto:contact@qrowg.com" style={{ color: G, textDecoration: "none", fontWeight: 700 }}>contact@qrowg.com</a>. Merci de nous laisser un délai raisonnable pour corriger avant toute divulgation publique — nous étudions chaque signalement.
          </p>
        </section>

        <p style={{ color: "#6E685E", fontSize: 12, textAlign: "center", margin: "28px 0 0" }}>Dernière mise à jour : {new Date(UPDATED).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
      </main>

      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${BOR}`, padding: "24px 22px", textAlign: "center", color: MUT, fontSize: 12.5 }}>
        <QrowgLogo size={16} />
        <p style={{ margin: "10px 0 0" }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}
          <Link href="/privacy" style={{ color: MUT, textDecoration: "none" }}>Confidentialité</Link>{" · "}
          <Link href="/terms" style={{ color: MUT, textDecoration: "none" }}>Conditions</Link>{" · "}
          <Link href="/legal" style={{ color: MUT, textDecoration: "none" }}>Mentions légales</Link>
        </p>
      </footer>
    </div>
  )
}
