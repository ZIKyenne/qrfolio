import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import Particles from "@/components/Particles"
import QrowgLogo from "@/components/QrowgLogo"
import { serializeJsonLd } from "@/lib/jsonLd"
import { VERTICALS, VERTICAL_SLUGS, getVertical, objectiveForVertical } from "../verticals"
import { GUIDES } from "../../guides/guides"

// Guides fondamentaux montrés sur chaque page d'usage (maillage vers le cluster GEO,
// réciproque du lien guides -> verticales). Pertinents pour tout usage imprimé.
const RELATED_GUIDES = ["comment-creer-un-qr-code", "qr-code-dynamique-vs-statique", "taille-qr-code-impression"]

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(138,132,120,0.9)", BG = "#080808", BOR = "rgba(201,168,76,0.18)"

// SSG : une page statique par usage (meilleur SEO + perf).
export function generateStaticParams() {
  return VERTICAL_SLUGS.map(usage => ({ usage }))
}

export async function generateMetadata({ params }: { params: Promise<{ usage: string }> }): Promise<Metadata> {
  const { usage } = await params
  const v = getVertical(usage)
  if (!v) return { title: "QR code par usage | QRowg" }
  const url = `${APP}/qr-code/${v.slug}`
  return {
    title: v.metaTitle,
    description: v.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: v.metaTitle, description: v.metaDescription, url, siteName: "QRowg", type: "website" },
    twitter: { card: "summary_large_image", title: v.metaTitle, description: v.metaDescription },
  }
}

const card: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: `1px solid ${BOR}`, borderRadius: 18, padding: 22 }
const eyebrowCss: React.CSSProperties = { color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }
const h2Css: React.CSSProperties = { color: INK, fontSize: "clamp(22px,3.2vw,30px)", fontWeight: 800, letterSpacing: "-0.01em", margin: 0 }

function Cta({ label, sub, href = "/auth/signup" }: { label: string; sub?: string; href?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <Link href={href} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(90deg,${G},#b8953f)`, color: "#080808", textDecoration: "none", fontSize: 15, fontWeight: 800, padding: "14px 30px", borderRadius: 12, boxShadow: "0 6px 26px rgba(201,168,76,0.32)" }}>
        {label} →
      </Link>
      {sub && <span style={{ color: MUT, fontSize: 12.5 }}>{sub}</span>}
    </div>
  )
}

export default async function VerticalPage({ params }: { params: Promise<{ usage: string }> }) {
  const { usage } = await params
  const v = getVertical(usage)
  if (!v) notFound()

  const url = `${APP}/qr-code/${v.slug}`
  // Deep-link : après inscription, atterrir sur l'onboarding avec l'objectif pré-sélectionné.
  const objectif = objectiveForVertical(v.slug)
  const signupHref = objectif
    ? `/auth/signup?redirect=${encodeURIComponent(`/dashboard/onboarding?objectif=${objectif}`)}`
    : "/auth/signup"
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: v.faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  }
  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: APP },
      { "@type": "ListItem", position: 2, name: "QR codes par usage", item: `${APP}/qr-code` },
      { "@type": "ListItem", position: 3, name: v.eyebrow, item: url },
    ],
  }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: BG, color: INK, fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(crumbLd) }} />
      <Particles behind />

      {/* Header */}
      <header style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" aria-label="QRowg — accueil" style={{ textDecoration: "none" }}><QrowgLogo size={22} /></Link>
        <Link href="/auth/signup" style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: 13.5, fontWeight: 700, padding: "9px 16px", borderRadius: 10 }}>Créer gratuitement</Link>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto", padding: "24px 22px 80px" }}>
        {/* Fil d'Ariane */}
        <nav aria-label="Fil d'Ariane" style={{ color: MUT, fontSize: 12.5, marginBottom: 22 }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>
          {" · "}<Link href="/qr-code" style={{ color: MUT, textDecoration: "none" }}>QR codes par usage</Link>
          {" · "}<span style={{ color: INK }}>{v.eyebrow}</span>
        </nav>

        {/* Hero */}
        <section style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 44px" }}>
          <div style={{ fontSize: 46, marginBottom: 12 }} aria-hidden>{v.emoji}</div>
          <p style={eyebrowCss}>{v.eyebrow}</p>
          <h1 style={{ color: INK, fontSize: "clamp(30px,6vw,50px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "12px 0 16px", textWrap: "balance" }}>{v.h1}</h1>
          <p style={{ color: MUT, fontSize: "clamp(15px,2.4vw,18px)", lineHeight: 1.6, margin: "0 auto 26px", maxWidth: 620 }}>{v.intro}</p>
          <Cta label="Créer mon QR code gratuitement" sub="Sans carte bancaire · Prêt à imprimer en 5 minutes" href={signupHref} />
        </section>

        {/* Problème → solution */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ ...h2Css, textAlign: "center", marginBottom: 22 }}>Ce que ça change pour vous</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
            {v.problems.map((p, i) => (
              <div key={i} style={card}>
                <p style={{ color: "#FF8A8A", fontSize: 13.5, margin: "0 0 10px", lineHeight: 1.5 }}>✕ {p.pain}</p>
                <p style={{ color: INK, fontSize: 14.5, fontWeight: 600, margin: 0, lineHeight: 1.5 }}><span style={{ color: "var(--success,#39FF8F)" }}>✓</span> {p.gain}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fonctionnalités */}
        <section style={{ marginBottom: 48 }}>
          <p style={{ ...eyebrowCss, textAlign: "center" }}>Tout inclus</p>
          <h2 style={{ ...h2Css, textAlign: "center", margin: "8px 0 24px" }}>Une page pensée pour cet usage</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
            {v.features.map((f, i) => (
              <div key={i} style={card}>
                <p style={{ color: INK, fontSize: 15.5, fontWeight: 700, margin: "0 0 6px" }}>{f.title}</p>
                <p style={{ color: MUT, fontSize: 13.5, margin: 0, lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Étapes */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ ...h2Css, textAlign: "center", marginBottom: 24 }}>Comment ça marche</h2>
          <ol style={{ listStyle: "none", counterReset: "s", margin: 0, padding: 0, display: "grid", gap: 12, maxWidth: 620, marginInline: "auto" }}>
            {v.steps.map((s, i) => (
              <li key={i} style={{ counterIncrement: "s", display: "flex", gap: 14, alignItems: "center", ...card, padding: "14px 18px" }}>
                <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: "rgba(201,168,76,0.12)", border: `1px solid ${BOR}`, color: G, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                <span style={{ color: INK, fontSize: 14.5 }}>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA milieu */}
        <section style={{ ...card, textAlign: "center", padding: "34px 22px", marginBottom: 48, background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.12), transparent 60%), rgba(255,255,255,0.02)", border: `1px solid ${BOR}` }}>
          <h2 style={{ ...h2Css, marginBottom: 16 }}>{v.ctaTitle}</h2>
          <Cta label="Commencer gratuitement" sub="Modifiable à tout moment · sans réimprimer" href={signupHref} />
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ ...h2Css, textAlign: "center", marginBottom: 22 }}>Questions fréquentes</h2>
          <div style={{ display: "grid", gap: 10, maxWidth: 720, marginInline: "auto" }}>
            {v.faq.map((f, i) => (
              <details key={i} style={{ ...card, padding: "16px 18px" }}>
                <summary style={{ color: INK, fontSize: 15, fontWeight: 700, cursor: "pointer", listStyle: "none" }}>{f.q}</summary>
                <p style={{ color: MUT, fontSize: 14, lineHeight: 1.6, margin: "10px 0 0" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Maillage interne */}
        <section style={{ marginBottom: 20 }}>
          <p style={{ ...eyebrowCss, textAlign: "center", marginBottom: 14 }}>Autres usages</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {v.related.map(slug => { const r = VERTICALS[slug]; return r ? (
              <Link key={slug} href={`/qr-code/${slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${BOR}`, color: INK, textDecoration: "none", fontSize: 13.5, fontWeight: 600, padding: "10px 15px", borderRadius: 11 }}>
                <span aria-hidden>{r.emoji}</span> {r.eyebrow}
              </Link>
            ) : null })}
            <Link href="/qr-code" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.08)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: 13.5, fontWeight: 700, padding: "10px 15px", borderRadius: 11 }}>Tous les usages →</Link>
          </div>
        </section>

        {/* Guides pour aller plus loin (maillage vers le cluster GEO) */}
        <section style={{ marginBottom: 20 }}>
          <p style={{ ...eyebrowCss, textAlign: "center", marginBottom: 14 }}>Pour aller plus loin</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {RELATED_GUIDES.map(slug => { const g = GUIDES[slug]; return g ? (
              <Link key={slug} href={`/guides/${slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${BOR}`, color: INK, textDecoration: "none", fontSize: 13.5, fontWeight: 600, padding: "10px 15px", borderRadius: 11 }}>
                <span aria-hidden>{g.emoji}</span> {g.h1}
              </Link>
            ) : null })}
            <Link href="/guides" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.08)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: 13.5, fontWeight: 700, padding: "10px 15px", borderRadius: 11 }}>Tous les guides →</Link>
          </div>
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
