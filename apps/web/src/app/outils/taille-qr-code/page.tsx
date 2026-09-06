import type { Metadata } from "next"
import Link from "next/link"
import Particles from "@/components/Particles"
import QrowgLogo from "@/components/QrowgLogo"
import { serializeJsonLd } from "@/lib/jsonLd"
import { creerUrl } from "../../creer/entry"
import TailleClient from "./TailleClient"
import { SUPPORTS, calculerTaille, modulesDeLaVersion, versionPourContenu } from "./taille"
import { ogFor } from "@/lib/seoMeta"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(138,132,120,0.9)", BG = "#080808", BOR = "rgba(201,168,76,0.18)"
const URL = `${APP}/outils/taille-qr-code`

export const metadata: Metadata = {
  title: "Quelle taille imprimer un QR code — calculateur",
  description: "Calculez le côté minimal de votre QR code selon le support et la distance de lecture : carte, menu, vitrine, affiche, véhicule. Gratuit et immédiat.",
  alternates: { canonical: URL },
  ...ogFor({ url: URL, title: "Calculateur de taille de QR code | QRowg", description: "Le côté minimal de votre QR code selon le support et la distance de lecture." }),
}

const FAQ = [
  { q: "Quelle taille minimale pour un QR code ?", a: "Comptez environ un dixième de la distance de lecture : 3 cm de côté pour un code scanné à 30 cm, 30 cm pour une affiche lue à 3 m. En dessous de 2 cm de côté, un QR code devient capricieux même de tout près." },
  { q: "Pourquoi mon QR code doit-il être plus grand que la règle du dixième ?", a: "Parce qu'il contient beaucoup de données. Un code long a plus de carrés ; à taille égale, chacun devient plus petit. En dessous d'environ 0,4 mm par carré, l'encre bave et les carrés se touchent. Raccourcir l'adresse est souvent la meilleure solution." },
  { q: "Faut-il laisser une marge autour du code ?", a: "Oui, une marge blanche large d'environ quatre carrés — à peu près l'épaisseur d'un des trois grands carrés d'angle. C'est la première chose que supprime un recadrage un peu serré, et une des premières causes de code illisible." },
  { q: "Quelle taille pour un QR code sur une carte de visite ?", a: "Une carte se tient en main, à environ 20 cm : 2 cm de côté suffisent pour une adresse courte. Si votre lien est long, il faudra monter à 3 cm — ou raccourcir le lien." },
  { q: "Quelle taille pour un QR code sur une vitrine ?", a: "On s'approche du verre sans le toucher, comptez 60 cm de lecture, soit environ 6 cm de côté. Pensez aussi au reflet : évitez de le coller face au soleil de l'après-midi." },
  { q: "Un QR code sur un véhicule, ça marche ?", a: "Seulement à l'arrêt. Personne ne scanne un code sur un véhicule en mouvement. Pour un utilitaire garé qu'on lit à 5 m, comptez 50 cm de côté." },
]

export default function TaillePage() {
  const appLd = {
    "@context": "https://schema.org", "@type": "WebApplication", "@id": `${URL}/#tool`,
    name: "Calculateur de taille de QR code QRowg", url: URL,
    applicationCategory: "UtilitiesApplication", operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    description: "Calcule le côté minimal d'un QR code selon le support, la distance de lecture et la quantité de contenu.",
  }
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: APP },
      { "@type": "ListItem", position: 2, name: "Outils gratuits", item: `${APP}/outils` },
      { "@type": "ListItem", position: 3, name: "Taille d'impression d'un QR code", item: URL },
    ],
  }

  // Table de référence rendue côté serveur : elle doit être lisible sans
  // JavaScript, et c'est elle qu'un moteur ou un assistant citera.
  const modulesCourt = modulesDeLaVersion(versionPourContenu(24))
  const table = SUPPORTS.map(s => ({ ...s, calcul: calculerTaille(s.distanceCm, modulesCourt) }))

  const h2: React.CSSProperties = { color: INK, fontSize: "clamp(22px,3.2vw,30px)", fontWeight: 800, letterSpacing: "-0.01em", margin: 0, textAlign: "center" }
  const cardCss: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: `1px solid ${BOR}`, borderRadius: 18, padding: 20 }
  const td: React.CSSProperties = { padding: "12px 14px", borderTop: `1px solid ${BOR}`, fontSize: 14, color: INK, textAlign: "left" }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: BG, color: INK, fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(appLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(crumbLd) }} />
      <Particles behind />

      <header className="qf-entete" style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "18px clamp(13px,4vw,22px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link href="/" aria-label="QRowg — accueil" style={{ textDecoration: "none" }}><QrowgLogo size={22} /></Link>
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(9px,2.6vw,14px)" }}>
          <Link href="/outils" style={{ color: MUT, textDecoration: "none", fontSize: "clamp(11.5px,3.2vw,13px)", fontWeight: 600, whiteSpace: "nowrap" }}>Outils</Link>
          <Link href={creerUrl()} style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: "clamp(12px,3.4vw,13.5px)", fontWeight: 700, padding: "9px clamp(10px,3vw,16px)", borderRadius: 10, whiteSpace: "nowrap" }}>Composer ma page</Link>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto", padding: "18px 22px 80px" }}>
        <nav aria-label="Fil d'Ariane" style={{ color: MUT, fontSize: 12.5, marginBottom: 18 }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}
          <Link href="/outils" style={{ color: MUT, textDecoration: "none" }}>Outils</Link>{" · "}
          <span style={{ color: INK }}>Taille d&apos;impression</span>
        </nav>

        <section style={{ textAlign: "center", maxWidth: 740, margin: "0 auto 30px" }}>
          <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>Outil gratuit</p>
          <h1 style={{ color: INK, fontSize: "clamp(28px,5.6vw,48px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "12px 0 16px", textWrap: "balance" }}>Quelle taille imprimer un QR code</h1>
          {/* Réponse directe en tête de page : c'est ce paragraphe qu'un moteur ou
              un assistant reprendra pour répondre à la question. */}
          <p style={{ color: MUT, fontSize: "clamp(15px,2.4vw,18px)", lineHeight: 1.6, margin: "0 auto", maxWidth: 660 }}>
            Le côté d&apos;un QR code fait environ un dixième de la distance à laquelle on le scanne :
            3 cm pour un menu lu à 30 cm, 30 cm pour une affiche lue à 3 m. Mais si le code contient
            beaucoup de texte, il faut le monter davantage — sinon ses carrés deviennent trop petits
            pour l&apos;impression. Le calculateur ci-dessous tient compte des deux.
          </p>
        </section>

        <section aria-label="Calculateur de taille" style={{ marginBottom: 52 }}>
          <TailleClient />
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ ...h2, marginBottom: 22 }}>Taille conseillée par support</h2>
          <p style={{ color: MUT, fontSize: 13.5, textAlign: "center", margin: "0 0 18px" }}>
            Pour une adresse courte. Un contenu plus long demande davantage.
          </p>
          <div style={{ ...cardCss, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
              <thead>
                <tr>
                  <th style={{ ...td, borderTop: "none", color: MUT, fontSize: 12.5, fontWeight: 700 }}>Support</th>
                  <th style={{ ...td, borderTop: "none", color: MUT, fontSize: 12.5, fontWeight: 700 }}>Distance</th>
                  <th style={{ ...td, borderTop: "none", color: MUT, fontSize: 12.5, fontWeight: 700 }}>Côté minimal</th>
                </tr>
              </thead>
              <tbody>
                {table.map(l => (
                  <tr key={l.cle}>
                    <td style={td}>{l.nom}</td>
                    <td style={{ ...td, color: MUT }}>{l.distanceCm} cm</td>
                    <td style={{ ...td, color: G, fontWeight: 800 }}>{Math.round(l.calcul.coteMm) / 10} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ ...cardCss, marginBottom: 48, padding: "28px 22px", background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.1), transparent 60%), rgba(255,255,255,0.02)" }}>
          <h2 style={{ ...h2, marginBottom: 14 }}>La taille ne fait pas tout</h2>
          <p style={{ color: MUT, fontSize: 14.5, lineHeight: 1.7, margin: "14px auto 0", maxWidth: 620, textAlign: "center" }}>
            Un code de la bonne taille peut rester illisible : contraste trop faible, marge blanche
            rognée, image trop peu définie. Passez votre fichier dans le testeur avant de lancer le tirage.
          </p>
          <div style={{ textAlign: "center", marginTop: 22 }}>
            <Link href="/outils/testeur-qr-code" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(90deg,${G},#b8953f)`, color: "#080808", textDecoration: "none", fontSize: 15, fontWeight: 800, padding: "13px 28px", borderRadius: 12, boxShadow: "0 6px 26px rgba(201,168,76,0.3)" }}>Tester mon QR code →</Link>
          </div>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ ...h2, marginBottom: 22 }}>Questions fréquentes</h2>
          <div style={{ display: "grid", gap: 10, maxWidth: 720, marginInline: "auto" }}>
            {FAQ.map(f => (
              <details key={f.q} style={{ ...cardCss, padding: "14px 18px" }}>
                <summary style={{ color: INK, fontSize: 14.5, fontWeight: 700, cursor: "pointer", listStyle: "none" }}>{f.q}</summary>
                <p style={{ color: MUT, fontSize: 13.5, lineHeight: 1.65, margin: "10px 0 0" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section style={{ textAlign: "center" }}>
          <p style={{ color: MUT, fontSize: 13.5, lineHeight: 1.8, margin: 0 }}>
            À lire aussi :{" "}
            <Link href="/guides/taille-qr-code-impression" style={{ color: G }}>le guide complet de l&apos;impression</Link>{" · "}
            <Link href="/guides/qr-code-scannable" style={{ color: G }}>rendre un QR code scannable</Link>{" · "}
            <Link href="/generateur-qr-code" style={{ color: G }}>générateur de QR code gratuit</Link>
          </p>
        </section>
      </main>
    </div>
  )
}
