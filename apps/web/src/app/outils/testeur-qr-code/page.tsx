import type { Metadata } from "next"
import Link from "next/link"
import Particles from "@/components/Particles"
import QrowgLogo from "@/components/QrowgLogo"
import { serializeJsonLd } from "@/lib/jsonLd"
import { creerUrl } from "../../creer/entry"
import TesteurClient from "./TesteurClient"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(138,132,120,0.9)", BG = "#080808", BOR = "rgba(201,168,76,0.18)"
const URL = `${APP}/outils/testeur-qr-code`

export const metadata: Metadata = {
  title: "Testeur de QR code — vérifiez avant d'imprimer",
  description: "Déposez l'image de votre QR code : contraste, marge blanche, définition et destination sont vérifiés en quelques secondes. Gratuit, sans compte, l'image ne quitte pas votre appareil.",
  alternates: { canonical: URL },
  openGraph: { title: "Testeur de QR code gratuit | QRowg", description: "Vérifiez qu'un QR code passera l'impression : contraste, marge, définition, destination.", url: URL, siteName: "QRowg", type: "website" },
  twitter: { card: "summary_large_image", title: "Testeur de QR code gratuit | QRowg", description: "Vérifiez qu'un QR code passera l'impression, avant de lancer le tirage." },
}

// Ce que l'outil vérifie, dit dans l'ordre où ça fait échouer un tirage.
const POINTS = [
  { t: "Il se lit, ou il ne se lit pas", d: "Un décodeur essaie réellement de lire votre image. C'est la seule preuve qui compte : le reste n'est qu'une estimation de sa solidité." },
  { t: "Le contraste entre les modules et le fond", d: "C'est la première cause de code capricieux. Un code se lit sur votre téléphone dans votre bureau, et ne se lit plus sur la vitrine à 19 h." },
  { t: "La marge blanche autour du code", d: "Quatre modules de blanc sont demandés par la norme. C'est aussi la première chose que supprime un recadrage un peu serré." },
  { t: "La définition de l'image", d: "Un code qui fait 200 pixels de large passe à l'écran et bave à l'impression. On mesure le nombre de pixels par module." },
  { t: "Ce que contient le code", d: "Adresse en HTTP plutôt qu'en HTTPS, passage par un raccourcisseur qui peut fermer : deux façons de perdre un tirage entier." },
]

const ETAPES = [
  "Récupérez le fichier d'origine de votre QR code — pas une photo, pas une capture d'écran.",
  "Déposez-le ci-dessus. Rien n'est envoyé sur Internet : l'analyse se fait sur votre appareil.",
  "Lisez le rapport et corrigez ce qui est signalé en rouge avant de lancer le tirage.",
  "Retestez le fichier corrigé, puis imprimez un exemplaire et scannez-le pour de vrai.",
]

const FAQ = [
  { q: "Mon image est-elle envoyée quelque part ?", a: "Non. L'analyse se fait entièrement dans votre navigateur. Aucune image, aucun résultat n'est transmis à QRowg ni à personne d'autre." },
  { q: "L'outil dit que mon code est bon, puis-je imprimer les 5 000 flyers ?", a: "Imprimez d'abord un exemplaire et scannez-le avec deux ou trois téléphones différents. Cet outil vérifie le fichier ; il ne peut rien savoir de votre encre, de votre papier ni de la lumière de votre vitrine." },
  { q: "Pourquoi un code qui se lit ici est quand même signalé ?", a: "Parce qu'il se lit sur cette image, dans ces conditions. Un contraste juste ou une marge trop courte passent sur un bon téléphone en pleine lumière et échouent ailleurs. L'outil signale ce qui rend un code fragile, pas seulement ce qui le casse." },
  { q: "Le code ne se lit pas du tout, que faire ?", a: "Repartez du fichier d'origine plutôt que d'une photo ou d'une capture d'écran, et vérifiez que le code entier est visible avec sa marge blanche. Si le fichier d'origine ne se lit pas non plus, c'est le code qu'il faut refaire." },
  { q: "Quelle taille faut-il imprimer un QR code ?", a: "La règle de terrain : le côté du code fait environ un dixième de la distance de lecture. Un code lu à 30 cm demande environ 3 cm de côté ; sur une affiche lue à 3 m, comptez 30 cm." },
  { q: "Puis-je modifier la destination après impression ?", a: "Seulement si votre QR code est dynamique : il pointe alors vers une adresse de redirection que vous gardez la main pour changer. Un QR code statique encode sa destination et ne peut plus changer." },
]

export default function TesteurPage() {
  const appLd = {
    "@context": "https://schema.org", "@type": "WebApplication", "@id": `${URL}/#tool`,
    name: "Testeur de QR code QRowg", url: URL,
    applicationCategory: "UtilitiesApplication", operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    description: "Vérifie qu'un QR code passera l'impression : lecture réelle, contraste, marge blanche, définition et destination. L'analyse se fait dans le navigateur.",
  }
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
  const howLd = {
    "@context": "https://schema.org", "@type": "HowTo",
    name: "Vérifier un QR code avant de l'imprimer",
    step: ETAPES.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
  }
  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: APP },
      { "@type": "ListItem", position: 2, name: "Outils", item: `${APP}/outils` },
      { "@type": "ListItem", position: 3, name: "Testeur de QR code", item: URL },
    ],
  }

  const h2: React.CSSProperties = { color: INK, fontSize: "clamp(22px,3.2vw,30px)", fontWeight: 800, letterSpacing: "-0.01em", margin: 0, textAlign: "center" }
  const cardCss: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: `1px solid ${BOR}`, borderRadius: 18, padding: 20 }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: BG, color: INK, fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(appLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(howLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(crumbLd) }} />
      <Particles behind />

      <header style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "18px clamp(13px,4vw,22px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link href="/" aria-label="QRowg — accueil" style={{ textDecoration: "none" }}><QrowgLogo size={22} /></Link>
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(9px,2.6vw,14px)" }}>
          <Link href="/outils" style={{ color: MUT, textDecoration: "none", fontSize: "clamp(11.5px,3.2vw,13px)", fontWeight: 600, whiteSpace: "nowrap" }}>Outils</Link>
          <Link href={creerUrl()} style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${BOR}`, color: G, textDecoration: "none", fontSize: "clamp(12px,3.4vw,13.5px)", fontWeight: 700, padding: "9px clamp(10px,3vw,16px)", borderRadius: 10, whiteSpace: "nowrap" }}>Composer ma page</Link>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto", padding: "18px 22px 80px" }}>
        <nav aria-label="Fil d'Ariane" style={{ color: MUT, fontSize: 12.5, marginBottom: 18 }}>
          <Link href="/" style={{ color: MUT, textDecoration: "none" }}>Accueil</Link>{" · "}<span style={{ color: INK }}>Testeur de QR code</span>
        </nav>

        <section style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 30px" }}>
          <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>Outil gratuit</p>
          <h1 style={{ color: INK, fontSize: "clamp(30px,6vw,50px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "12px 0 16px", textWrap: "balance" }}>Testeur de QR code</h1>
          {/* Réponse directe, tout en haut : c'est cette phrase qu'un moteur ou un
              assistant extraira pour répondre à « comment vérifier un QR code ». */}
          <p style={{ color: MUT, fontSize: "clamp(15px,2.4vw,18px)", lineHeight: 1.6, margin: "0 auto", maxWidth: 640 }}>
            Déposez l&apos;image de votre QR code : un décodeur essaie vraiment de le lire, puis mesure son contraste, sa marge blanche, sa définition et vérifie sa destination. Vous saurez s&apos;il survivra à l&apos;impression avant de lancer le tirage.
          </p>
        </section>

        <section aria-label="Testeur de QR code" style={{ marginBottom: 52 }}>
          <TesteurClient />
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ ...h2, marginBottom: 22 }}>Ce que l&apos;outil vérifie</h2>
          <div style={{ display: "grid", gap: 12, maxWidth: 720, marginInline: "auto" }}>
            {POINTS.map(p => (
              <div key={p.t} style={{ ...cardCss, padding: "16px 20px" }}>
                <p style={{ color: INK, fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>{p.t}</p>
                <p style={{ color: MUT, fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ ...h2, marginBottom: 22 }}>Comment vérifier un QR code avant de l&apos;imprimer</h2>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12, maxWidth: 640, marginInline: "auto" }}>
            {ETAPES.map((s, i) => (
              <li key={i} style={{ display: "flex", gap: 14, alignItems: "center", ...cardCss, padding: "14px 18px" }}>
                <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: "rgba(201,168,76,0.12)", border: `1px solid ${BOR}`, color: G, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                <span style={{ color: INK, fontSize: 14.5 }}>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section style={{ ...cardCss, marginBottom: 48, padding: "28px 22px", background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.1), transparent 60%), rgba(255,255,255,0.02)" }}>
          <h2 style={{ ...h2, marginBottom: 14 }}>Un code qu&apos;on peut corriger après impression</h2>
          <p style={{ color: MUT, fontSize: 14.5, lineHeight: 1.7, margin: "14px auto 0", maxWidth: 620, textAlign: "center" }}>
            La plupart des tirages ratés ne sont pas des codes illisibles : ce sont des codes qui mènent au mauvais endroit. Un QR code dynamique garde la même image imprimée et vous laisse changer sa destination quand vous voulez — un menu qui change, une offre qui se termine, un numéro qui bouge.
          </p>
          <div style={{ textAlign: "center", marginTop: 22 }}>
            <Link href={creerUrl(undefined, "testeur")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(90deg,${G},#b8953f)`, color: "#080808", textDecoration: "none", fontSize: 15, fontWeight: 800, padding: "13px 28px", borderRadius: 12, boxShadow: "0 6px 26px rgba(201,168,76,0.3)" }}>Composer ma page — sans compte →</Link>
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
            <Link href="/guides/qr-code-scannable" style={{ color: G }}>rendre un QR code scannable</Link>{" · "}
            <Link href="/guides/taille-qr-code-impression" style={{ color: G }}>quelle taille pour l&apos;impression</Link>{" · "}
            <Link href="/guides/qr-code-ne-fonctionne-pas" style={{ color: G }}>mon QR code ne fonctionne pas</Link>{" · "}
            <Link href="/outils/taille-qr-code" style={{ color: G }}>quelle taille imprimer</Link>{" · "}
            <Link href="/generateur-qr-code" style={{ color: G }}>générateur de QR code gratuit</Link>
          </p>
        </section>
      </main>
    </div>
  )
}
