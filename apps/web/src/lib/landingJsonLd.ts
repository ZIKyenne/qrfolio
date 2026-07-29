// Données structurées (schema.org) de la page d'accueil. Construites depuis le
// VRAI contenu du site (prix réels de lib/plans, FAQ visible passée en argument)
// et des URLs RÉELLES uniquement. Aucune note/avis inventé (règle anti-faux).
import { PLANS, PLAN_ORDER } from "./plans"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export function landingJsonLd(faq: ReadonlyArray<{ q: string; a: string }>) {
  const offers = PLAN_ORDER.filter((id) => id !== "free").map((id) => ({
    "@type": "Offer",
    name: PLANS[id].label,
    price: PLANS[id].priceMonthly.toFixed(2),
    priceCurrency: "EUR",
    url: `${APP_URL}/upgrade`,
    availability: "https://schema.org/InStock",
  }))

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${APP_URL}/#organization`,
        name: "QRowg",
        url: `${APP_URL}/`,
        logo: { "@type": "ImageObject", url: `${APP_URL}/icon.png` },
        description:
          "QRowg réunit une page professionnelle mobile (link in bio, carte de visite numérique) et un QR code dynamique dont la destination reste modifiable après impression, avec suivi des scans.",
        areaServed: "FR",
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "support client",
          url: `${APP_URL}/contact`,
          availableLanguage: ["fr"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${APP_URL}/#website`,
        url: `${APP_URL}/`,
        name: "QRowg",
        inLanguage: "fr",
        publisher: { "@id": `${APP_URL}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${APP_URL}/#webpage`,
        url: `${APP_URL}/`,
        name: "QRowg — Carte de visite numérique & QR code dynamique pro",
        isPartOf: { "@id": `${APP_URL}/#website` },
        about: { "@id": `${APP_URL}/#software` },
        inLanguage: "fr",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${APP_URL}/#software`,
        name: "QRowg",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "fr",
        url: `${APP_URL}/`,
        publisher: { "@id": `${APP_URL}/#organization` },
        description:
          "Une page de profil pro (link in bio) et un QR code dynamique dont la destination se modifie sans réimpression, avec analytics et modèles par métier.",
        featureList: [
          "Éditeur de page no-code (blocs à glisser-déposer)",
          "Modèles par métier",
          "QR code dynamique (destination modifiable après impression)",
          "Personnalisation du QR (couleurs, modules, coins, logo)",
          "QR imprimables (Print Studio)",
          "Export PNG, JPG, PDF, SVG",
          "Analytics : scans, vues, clics, sources, appareils",
          "Objectifs de conversion et redirections",
          "Messagerie et formulaires de contact chiffrés",
          "Animation d'entrée personnalisable de la page",
          "Sous-domaine personnalisé",
          "Domaines personnalisés et marque blanche",
          "Espace équipe multi-utilisateurs avec rôles",
          "API publique",
          "Hébergement en Europe, chiffrement, conformité RGPD",
        ],
        offers,
      },
      {
        "@type": "HowTo",
        name: "Créer une page pro et un QR code dynamique avec QRowg",
        inLanguage: "fr",
        totalTime: "PT5M",
        step: [
          { "@type": "HowToStep", position: 1, name: "Choisir un modèle", text: "Sélectionnez un modèle déjà structuré pour votre métier : restaurant, indépendant, coach, artiste, immobilier, commerce." },
          { "@type": "HowToStep", position: 2, name: "Personnaliser la page", text: "Ajoutez vos informations, liens, photos et couleurs dans l'éditeur no-code. Le QR code se génère automatiquement." },
          { "@type": "HowToStep", position: 3, name: "Partager et suivre", text: "Affichez ou imprimez le QR code, puis modifiez sa destination à tout moment depuis le tableau de bord, sans réimprimer." },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${APP_URL}/` },
          { "@type": "ListItem", position: 2, name: "Tarifs", item: `${APP_URL}/#pricing` },
          { "@type": "ListItem", position: 3, name: "FAQ", item: `${APP_URL}/#faq` },
        ],
      },
    ],
  }
}
