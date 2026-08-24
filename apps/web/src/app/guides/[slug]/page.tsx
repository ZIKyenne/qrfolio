import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import Particles from "@/components/Particles"
import QrowgLogo from "@/components/QrowgLogo"
import { serializeJsonLd } from "@/lib/jsonLd"
import { GUIDES, GUIDE_SLUGS, getGuide, GUIDES_UPDATED } from "../guides"
import { VERTICALS } from "../../qr-code/verticals"
import { creerUrl } from "../../creer/entry"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(138,132,120,0.92)", BG = "#080808", BOR = "rgba(201,168,76,0.18)"

export function generateStaticParams() {
  return GUIDE_SLUGS.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const g = getGuide(slug)
  if (!g) return { title: "Guides QR code" }
  const url = `${APP}/guides/${g.slug}`
  return {
    title: g.metaTitle,
    description: g.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: g.metaTitle, description: g.metaDescription, url, siteName: "QRowg", type: "article" },
    twitter: { card: "summary_large_image", title: g.metaTitle, description: g.metaDescription },
  }
}

const cardCss: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: `1px solid ${BOR}`, borderRadius: 16, padding: 18 }

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const g = getGuide(slug)
  if (!g) notFound()

  const url = `${APP}/guides/${g.slug}`
  // Destination déclarée par le guide quand elle est évidente ; sinon on retombe
  // sur l'ancienne règle. Deviner à partir du LIBELLÉ envoyait « Créer mes supports
  // imprimables » vers le générateur de QR. Un guide n'indique aucun métier :
  // l'essai s'ouvre donc sur la galerie complète.
  const ctaHref = g.ctaHref || (/dynamique|statistiques/i.test(g.cta) ? creerUrl() : "/generateur-qr-code")
  const articleLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: g.h1, description: g.metaDescription,
    datePublished: GUIDES_UPDATED, dateModified: GUIDES_UPDATED,
    author: { "@type": "Organization", name: "QRowg", url: APP },
    publisher: { "@type": "Organization", name: "QRowg", url: APP },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "fr",
  }
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: g.faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: APP },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${APP}/guides` },
      { "@type": "ListItem", position: 3, name: g.category, item: url },
    ],
  }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: BG, color: INK, fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(crumbLd) }} />
      <Particles behind />

      <header style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" aria-label="QRowg — accueil" style={{ textDecoration: "none" }}><QrowgLogo size={22} /></Link>
        <Link href="/generateur-qr-code" style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: 13.5, fontWeight: 700, padding: "9px 16px", borderRadius: 10 }}>Générateur gratuit</Link>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", padding: "24px 22px 80px" }}>
        <nav aria-label="Fil d'Ariane" style={{ color: MUT, fontSize: 12.5, marginBottom: 20 }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>
          {" · "}<Link href="/guides" style={{ color: MUT, textDecoration: "none" }}>Guides</Link>
          {" · "}<span style={{ color: INK }}>{g.category}</span>
        </nav>

        {/* En-tête */}
        <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", margin: 0 }}>{g.emoji} {g.category}</p>
        <h1 style={{ color: INK, fontSize: "clamp(28px,5vw,42px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.12, margin: "12px 0 14px", textWrap: "balance" }}>{g.h1}</h1>
        <p style={{ color: MUT, fontSize: "clamp(15px,2.2vw,17px)", lineHeight: 1.6, margin: "0 0 8px" }}>{g.lede}</p>
        <p style={{ color: "#6E685E", fontSize: 12, margin: "0 0 24px" }}>Mis à jour le {new Date(GUIDES_UPDATED).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>

        {/* En bref (réponse directe — GEO / featured snippet) */}
        <div style={{ ...cardCss, borderColor: "rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.06)", marginBottom: 32 }}>
          <p style={{ color: G, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.4, margin: "0 0 7px" }}>En bref</p>
          <p style={{ color: INK, fontSize: 15.5, lineHeight: 1.55, margin: 0, fontWeight: 500 }}>{g.tldr}</p>
        </div>

        {/* Sections */}
        <article style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {g.sections.map((s, i) => (
            <section key={i}>
              <h2 style={{ color: INK, fontSize: "clamp(19px,3vw,24px)", fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 12px" }}>{s.h2}</h2>
              {s.body?.map((p, j) => <p key={j} style={{ color: "#D8D2C6", fontSize: 15, lineHeight: 1.7, margin: "0 0 12px" }}>{p}</p>)}
              {s.bullets && (
                <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 9 }}>
                  {s.bullets.map((b, j) => (
                    <li key={j} style={{ color: "#D8D2C6", fontSize: 15, lineHeight: 1.5, paddingLeft: 22, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, color: G }}>{b.startsWith("✅") || b.startsWith("❌") ? "" : "•"}</span>{b}
                    </li>
                  ))}
                </ul>
              )}
              {s.table && (
                <div style={{ overflowX: "auto", border: `1px solid ${BOR}`, borderRadius: 12, marginTop: 6 }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 420 }}>
                    <thead><tr>{s.table.head.map((h, j) => (
                      <th key={j} style={{ textAlign: "left", padding: "11px 14px", borderBottom: `1px solid ${BOR}`, color: G, fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, background: "rgba(255,255,255,0.02)" }}>{h}</th>
                    ))}</tr></thead>
                    <tbody>{s.table.rows.map((row, r) => (
                      <tr key={r}>{row.map((cell, c) => (
                        <td key={c} style={{ padding: "11px 14px", borderBottom: r < s.table!.rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", color: c === 0 ? INK : "#D8D2C6", fontSize: 14, fontWeight: c === 0 ? 600 : 400 }}>{cell}</td>
                      ))}</tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </article>

        {/* CTA */}
        <div style={{ ...cardCss, textAlign: "center", padding: "28px 20px", marginTop: 36, background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.1), transparent 60%), rgba(255,255,255,0.02)" }}>
          <Link href={ctaHref} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(90deg,${G},#b8953f)`, color: "#080808", textDecoration: "none", fontSize: 15, fontWeight: 800, padding: "13px 28px", borderRadius: 12, boxShadow: "0 6px 26px rgba(201,168,76,0.3)" }}>{g.cta} →</Link>
        </div>

        {/* FAQ */}
        <section style={{ marginTop: 40 }}>
          <h2 style={{ color: INK, fontSize: "clamp(20px,3vw,26px)", fontWeight: 800, margin: "0 0 18px" }}>Questions fréquentes</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {g.faq.map((f, i) => (
              <details key={i} style={{ ...cardCss, padding: "16px 18px" }}>
                <summary style={{ color: INK, fontSize: 15, fontWeight: 700, cursor: "pointer", listStyle: "none" }}>{f.q}</summary>
                <p style={{ color: MUT, fontSize: 14.5, lineHeight: 1.6, margin: "10px 0 0" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Maillage */}
        <section style={{ marginTop: 40, borderTop: `1px solid ${BOR}`, paddingTop: 26 }}>
          {g.related.length > 0 && (<>
            <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 12px" }}>Guides liés</p>
            <div style={{ display: "grid", gap: 8, marginBottom: 22 }}>
              {g.related.map(s => { const r = GUIDES[s]; return r ? (
                <Link key={s} href={`/guides/${s}`} style={{ color: INK, textDecoration: "none", fontSize: 14.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 }}><span aria-hidden>{r.emoji}</span> {r.h1}</Link>
              ) : null })}
            </div>
          </>)}
          <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 12px" }}>QR codes par usage</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {g.relatedUsages.map(s => { const v = VERTICALS[s]; return v ? (
              <Link key={s} href={`/qr-code/${s}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.03)", border: `1px solid ${BOR}`, color: INK, textDecoration: "none", fontSize: 13.5, fontWeight: 600, padding: "9px 14px", borderRadius: 11 }}><span aria-hidden>{v.emoji}</span> {v.eyebrow}</Link>
            ) : null })}
            <Link href="/qr-code" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(201,168,76,0.08)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: 13.5, fontWeight: 700, padding: "9px 14px", borderRadius: 11 }}>Tous les usages →</Link>
          </div>
        </section>
      </main>

      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${BOR}`, padding: "24px 22px", textAlign: "center", color: MUT, fontSize: 12.5 }}>
        <QrowgLogo size={16} />
        <p style={{ margin: "10px 0 0" }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}
          <Link href="/guides" style={{ color: MUT, textDecoration: "none" }}>Guides</Link>{" · "}
          <Link href="/qr-code" style={{ color: MUT, textDecoration: "none" }}>QR codes par usage</Link>{" · "}
          <Link href="/generateur-qr-code" style={{ color: MUT, textDecoration: "none" }}>Générateur gratuit</Link>
        </p>
      </footer>
    </div>
  )
}
