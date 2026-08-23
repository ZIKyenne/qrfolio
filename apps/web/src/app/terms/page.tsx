import type { Metadata } from "next"
import { LegalLayout } from "@/components/legal-layout"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Conditions d’utilisation",
  description: "Conditions générales d’utilisation de QRowg : accès au service, abonnements, obligations de chacun, résiliation et responsabilité.",
  alternates: { canonical: `${APP}/terms` },
  openGraph: { title: "Conditions d’utilisation | QRowg", description: "Conditions générales d’utilisation de QRowg : accès au service, abonnements, obligations de chacun, résiliation et responsabilité.", url: `${APP}/terms`, siteName: "QRowg", type: "website" },
  twitter: { card: "summary_large_image", title: "Conditions d’utilisation | QRowg", description: "Conditions générales d’utilisation de QRowg : accès au service, abonnements, obligations de chacun, résiliation et responsabilité." },
}

export default function TermsPage() {
  return (
    <LegalLayout title="Conditions d’utilisation" updated="15 juin 2026">
      <div className="ls">
        <p>Les présentes conditions générales régissent l’accès et l’utilisation du service QRowg. En utilisant QRowg, vous les acceptez intégralement.</p>
      </div>
      <div className="ls">
        <h2>1. Description du service</h2>
        <p>QRowg est un service permettant de créer des pages mobiles professionnelles associées à des QR codes dynamiques, et d’en suivre les performances.</p>
      </div>
      <div className="ls">
        <h2>2. Utilisation acceptable</h2>
        <p>Il est interdit de :</p>
        <ul>
          <li>Publier du contenu illicite, frauduleux ou portant atteinte à des droits de tiers</li>
          <li>Utiliser le service à des fins de spam ou d’activités malveillantes</li>
          <li>Tenter de contourner les mesures de sécurité</li>
          <li>Revendre l’accès sans autorisation écrite</li>
          <li>Automatiser des accès de manière abusive</li>
        </ul>
      </div>
      <div className="ls">
        <h2>3. Abonnements et facturation</h2>
        <h3>Plans disponibles</h3>
        <p>Free (0€), Starter (4,90€/mois), Pro (12,90€/mois), Business (29,90€/mois). Prix en euros TTC. Un tarif annuel réduit est proposé (facturation à l'année).</p>
        <h3>Paiement</h3>
        <p>Les paiements sont traités par Stripe. En souscrivant, vous autorisez le débit automatique à chaque période de facturation.</p>
        <h3>Essai gratuit</h3>
        <p>Les nouveaux abonnements payants bénéficient de 7 jours d’essai gratuit. Aucun paiement n’est prélevé pendant cette période ; l’abonnement se poursuit automatiquement à l’issue de l’essai, sauf annulation.</p>
      </div>
      <div className="ls">
        <h2>4. Résiliation</h2>
        <p>Vous pouvez résilier à tout moment depuis Paramètres. La résiliation prend effet à la fin de la période en cours. Aucun remboursement prorata.</p>
        <p>Votre compte passe en Free. Vos données sont conservées 30 jours avant suppression.</p>
      </div>
      <div className="ls">
        <h2>5. Propriété intellectuelle</h2>
        <p>Le service QRowg et son interface sont la propriété exclusive de QRowg. Vous conservez la propriété des contenus que vous publiez.</p>
      </div>
      <div className="ls">
        <h2>6. Disponibilité</h2>
        <p>QRowg s’efforce de maintenir une disponibilité maximale. Des interruptions pour maintenance peuvent survenir. QRowg ne saurait être tenu responsable des pertes liées à une indisponibilité.</p>
      </div>
      <div className="ls">
        <h2>7. Limitation de responsabilité</h2>
        <p>La responsabilité de QRowg est limitée au montant payé sur les 3 derniers mois. QRowg n’est pas responsable des dommages indirects ou pertes de données.</p>
      </div>
      <div className="ls">
        <h2>8. Droit applicable</h2>
        <p>Ces conditions sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents de Paris.</p>
      </div>
    </LegalLayout>
  )
}
