import type { Metadata } from "next"
import { RETENTION_DAYS } from "@/lib/eventRetention"
import { phraseHebergement } from "@/lib/editeur"
import Link from "next/link"
import { LegalLayout } from "@/components/legal-layout"
import { ogFor } from "@/lib/seoMeta"
import { REVISIONS, enFrancais } from "@/lib/datesContenu"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment QRowg collecte, utilise et protège vos données personnelles : finalités, durées de conservation, sous-traitants et vos droits.",
  alternates: { canonical: `${APP}/privacy` },
  ...ogFor({ url: `${APP}/privacy`, title: "Politique de confidentialité | QRowg", description: "Comment QRowg collecte, utilise et protège vos données personnelles : finalités, durées de conservation, sous-traitants et vos droits." }),
}

export default function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité" updated={enFrancais(REVISIONS.privacy)}>
      <div className="ls">
        <p>QRowg accorde une importance primordiale à la protection de vos données personnelles. Cette politique décrit comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre service.</p>
      </div>
      <div className="ls">
        <h2>1. Données collectées</h2>
        <h3>Données de compte</h3>
        <p>Lors de votre inscription, nous collectons votre adresse e-mail et, si vous choisissez de la renseigner, votre nom ou pseudonyme.</p>
        <h3>Données d’usage</h3>
        <p>Nous collectons des données relatives à votre utilisation du service : pages créées, QR codes générés, configurations appliquées.</p>
        <h3>Données de mesure d’audience (visiteurs de vos pages)</h3>
        <p>Lorsqu’un visiteur scanne votre QR code ou consulte votre page, nous enregistrons, pour vous fournir vos statistiques :</p>
        <ul>
          <li>l’horodatage, le type d’appareil (mobile, tablette, ordinateur), le système et le navigateur ;</li>
          <li>le pays et la ville approximative, déduits de l’adresse IP au moment de la visite ;</li>
          <li>la source de trafic : site référent et paramètres de campagne (utm) présents dans l’adresse ;</li>
          <li>sur la page elle-même : les blocs cliqués, la position approximative des appuis et le temps passé par bloc, rattachés à un <strong>identifiant de session</strong> aléatoire valable le temps de la visite ;</li>
          <li>une <strong>empreinte pseudonymisée</strong> du visiteur (hachage SHA-256 de l’adresse IP, du navigateur et d’un sel secret), qui sert uniquement à compter les visiteurs uniques. L’adresse IP elle-même n’est pas stockée en clair et ne peut pas être reconstituée à partir de l’empreinte.</li>
        </ul>
        <p>Ces données sont pseudonymisées : elles ne comportent ni nom, ni adresse e-mail, ni identifiant de compte du visiteur. Elles constituent néanmoins des données à caractère personnel au sens du RGPD, et sont traitées à ce titre (base légale : intérêt légitime du titulaire de la page à mesurer l’usage de son support).</p>
        <h3>Données techniques</h3>
        <p>Votre adresse IP est en outre utilisée de façon <strong>transitoire</strong> pour la sécurité et la limitation des abus (rate-limit), sans être conservée à cette fin. Des journaux d’accès techniques sont tenus par notre hébergeur pour une durée courte.</p>
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
        <h2>4. Stockage, sécurité et sous-traitants</h2>
        <p>{phraseHebergement()} Les connexions sont chiffrées (TLS) et les mots de passe hachés. QRowg s’appuie sur les sous-traitants suivants, chacun lié par un contrat de traitement des données :</p>
        <ul>
          <li><strong>Supabase</strong> — base de données, fichiers et authentification (infrastructure AWS).</li>
          <li><strong>Vercel</strong> — hébergement et diffusion de l’application, ainsi que la mesure d’audience technique du site qrowg.com (Vercel Analytics, sans cookie).</li>
          <li><strong>Stripe</strong> — paiements, certifié PCI DSS. QRowg ne stocke aucune information bancaire.</li>
          <li><strong>Resend</strong> — envoi des e-mails transactionnels (confirmation, notifications de messages, rapports).</li>
        </ul>
      </div>
      <div className="ls">
        <h2>5. Conservation</h2>
        <p>Vos données de compte sont conservées tant que votre compte est actif. La suppression du compte, depuis vos Paramètres, efface immédiatement vos pages, QR codes, messages et statistiques, et résilie votre abonnement ; seules les pièces de facturation sont conservées par Stripe pendant la durée légale (10 ans).</p>
        <p>Les données de mesure d’audience de vos pages sont conservées <strong>{RETENTION_DAYS} jours</strong> (environ 13 mois, pour permettre la comparaison d’une année sur l’autre), puis supprimées automatiquement.</p>
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
