import type { Metadata } from "next"
import Link from "next/link"
import { LegalLayout } from "@/components/legal-layout"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment QRowg collecte, utilise et protège vos données personnelles : finalités, durées de conservation, sous-traitants et vos droits.",
  alternates: { canonical: `${APP}/privacy` },
  openGraph: { title: "Politique de confidentialité | QRowg", description: "Comment QRowg collecte, utilise et protège vos données personnelles : finalités, durées de conservation, sous-traitants et vos droits.", url: `${APP}/privacy`, siteName: "QRowg", type: "website" },
  twitter: { card: "summary_large_image", title: "Politique de confidentialité | QRowg", description: "Comment QRowg collecte, utilise et protège vos données personnelles : finalités, durées de conservation, sous-traitants et vos droits." },
}

export default function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité" updated="15 juin 2026">
      <div className="ls">
        <p>QRowg accorde une importance primordiale à la protection de vos données personnelles. Cette politique décrit comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre service.</p>
      </div>
      <div className="ls">
        <h2>1. Données collectées</h2>
        <h3>Données de compte</h3>
        <p>Lors de votre inscription, nous collectons votre adresse e-mail et, si vous choisissez de la renseigner, votre nom ou pseudonyme.</p>
        <h3>Données d’usage</h3>
        <p>Nous collectons des données relatives à votre utilisation du service : pages créées, QR codes générés, configurations appliquées.</p>
        <h3>Données analytics</h3>
        <p>Lorsqu’un visiteur scanne votre QR code, nous enregistrons : l’horodatage, le type d’appareil, le pays d’origine et la source de trafic. Aucune donnée personnelle identifiable sur vos visiteurs n’est collectée.</p>
        <h3>Données techniques</h3>
        <p>Votre adresse IP est utilisée de façon <strong>transitoire</strong> pour la sécurité et la limitation des abus (rate-limit) ; elle n’est <strong>pas conservée</strong> dans nos statistiques. Nous enregistrons le type d’appareil et des journaux d’accès techniques.</p>
      </div>
      <div className="ls">
        <h2>2. Cookies</h2>
        <p>QRowg utilise des cookies essentiels au fonctionnement du service (authentification, session). Ces cookies sont strictement nécessaires et ne requièrent pas votre consentement.</p>
        <p>Nous n’utilisons <strong>ni cookies publicitaires ni cookies analytiques tiers</strong>. La mesure d’audience de vos pages repose sur un identifiant de session temporaire (stocké en <code>sessionStorage</code>), effacé à la fermeture de l’onglet — il n’y a donc aucun cookie de suivi à désactiver.</p>
      </div>
      <div className="ls">
        <h2>3. Utilisation des données</h2>
        <p>Vos données sont utilisées pour :</p>
        <ul>
          <li>Fournir et maintenir le service QRowg</li>
          <li>Gérer votre compte et votre abonnement</li>
          <li>Vous envoyer des notifications liées au service</li>
          <li>Détecter et prévenir les usages frauduleux</li>
          <li>Améliorer les fonctionnalités du service</li>
        </ul>
        <p>Nous ne vendons jamais vos données à des tiers.</p>
      </div>
      <div className="ls">
        <h2>4. Stockage et sécurité</h2>
        <p>Vos données sont stockées sur des serveurs sécurisés opérés par Supabase (infrastructure AWS). Les connexions sont chiffrées via TLS. Les mots de passe sont hachés.</p>
        <p>Les données de paiement sont traitées exclusivement par Stripe, certifié PCI DSS. QRowg ne stocke aucune information bancaire.</p>
      </div>
      <div className="ls">
        <h2>5. Conservation</h2>
        <p>Vos données sont conservées tant que votre compte est actif. En cas de suppression, elles sont effacées sous 30 jours, sauf obligations légales (données de facturation conservées 10 ans).</p>
      </div>
      <div className="ls">
        <h2>6. Vos droits (RGPD)</h2>
        <p>Conformément au RGPD, vous disposez des droits d’accès, rectification, effacement, portabilité et d’opposition. Pour les exercer : <a href="mailto:privacy@qrowg.com">privacy@qrowg.com</a></p>
        <p>Vous pouvez également saisir la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>) en cas de litige.</p>
      </div>
      <div className="ls">
        <h2>7. Contact</h2>
        <p>Responsable du traitement : QRowg<br />E-mail : <a href="mailto:privacy@qrowg.com">privacy@qrowg.com</a></p>
      </div>
    </LegalLayout>
  )
}
