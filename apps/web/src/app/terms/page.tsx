import type { Metadata } from "next"
import { LegalLayout } from "@/components/legal-layout"
import { PLANS } from "@/lib/plans"
import { ogFor } from "@/lib/seoMeta"
import { REVISIONS, enFrancais } from "@/lib/datesContenu"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Conditions d’utilisation",
  description: "Conditions générales d’utilisation de QRowg : accès au service, abonnements, obligations de chacun, résiliation et responsabilité.",
  alternates: { canonical: `${APP}/terms` },
  ...ogFor({ url: `${APP}/terms`, title: "Conditions d’utilisation | QRowg", description: "Conditions générales d’utilisation de QRowg : accès au service, abonnements, obligations de chacun, résiliation et responsabilité." }),
}

export default function TermsPage() {
  return (
    <LegalLayout title="Conditions d’utilisation" updated={enFrancais(REVISIONS.terms)}>
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
        {/* Prix LUS depuis lib/plans.ts, jamais recopiés : les conditions
            annonçaient encore « Starter 4,90 € / Pro 12,90 € / Business 29,90 € »
            — quatre montants faux et un palier supprimé, dans le document qui
            fait foi. Ici, changer la grille change les conditions. */}
        <p>
          {PLANS.free.label} (0 €), {PLANS.pro.label} ({PLANS.pro.priceMonthly} €/mois),{" "}
          {PLANS.business.label} ({PLANS.business.priceMonthly} €/mois). Prix en euros TTC.
          Un tarif annuel réduit est proposé (facturation à l’année).
        </p>
        <h3>Paiement</h3>
        <p>Les paiements sont traités par Stripe. En souscrivant, vous autorisez le débit automatique à chaque période de facturation.</p>
        {/* La section « Essai gratuit » promettait 7 jours que le produit
            n’accorde pas : aucun `trial_period_days` n’est posé au paiement.
            Promettre par écrit ce que le service ne fait pas est le pire des
            deux mondes — la promesse est retirée. */}
        <h3>Sans engagement</h3>
        <p>L’abonnement est mensuel ou annuel, sans durée minimale. Vous pouvez résilier à tout moment ; la résiliation prend effet à la fin de la période déjà payée.</p>
      </div>
      <div className="ls">
        <h2>4. Résiliation</h2>
        <p>Vous pouvez résilier à tout moment depuis Paramètres. La résiliation prend effet à la fin de la période en cours. Aucun remboursement prorata.</p>
        {/* L'ancien texte annonçait un plan « Free » et une purge à 30 jours : ni l'un
            ni l'autre n'existe. On décrit ce qui se passe vraiment (webhook Stripe →
            plan gratuit, quotas du gratuit). */}
        <p>À l’échéance, votre compte passe au plan {PLANS.free.label}. Rien n’est supprimé : vos pages, QR codes et statistiques restent dans votre compte. Ce qui dépasse les limites du plan {PLANS.free.label} ({PLANS.free.limits.pages} page active, {PLANS.free.limits.qr} QR autonomes dont {PLANS.free.limits.dyn} modifiable) est mis en pause, et vous choisissez ce que vous gardez actif. Vous pouvez supprimer votre compte à tout moment depuis Paramètres (suppression immédiate et définitive).</p>
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
