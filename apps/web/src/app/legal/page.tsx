import type { Metadata } from "next"
import { LegalLayout } from "@/components/legal-layout"
import { EDITEUR, identiteRenseignee } from "@/lib/editeur"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
const COMPLETE = identiteRenseignee()

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales de QRowg : éditeur du service, hébergeur, propriété intellectuelle et coordonnées de contact.",
  alternates: { canonical: `${APP}/legal` },
  // Tant que l'identité de l'éditeur n'est pas renseignée (lib/editeur.ts), la
  // page ne doit pas être indexée : Google ne doit pas servir une page de
  // mentions légales qui n'en contient pas.
  ...(COMPLETE ? {} : { robots: { index: false, follow: true } }),
  openGraph: { title: "Mentions légales | QRowg", description: "Mentions légales de QRowg : éditeur du service, hébergeur, propriété intellectuelle et coordonnées de contact.", url: `${APP}/legal`, siteName: "QRowg", type: "website" },
  twitter: { card: "summary_large_image", title: "Mentions légales | QRowg", description: "Mentions légales de QRowg : éditeur du service, hébergeur, propriété intellectuelle et coordonnées de contact." },
}

export default function LegalPage() {
  return (
    <LegalLayout title="Mentions légales" updated="15 juin 2026">
      <div className="ls">
        <h2>Éditeur du site</h2>
        {COMPLETE ? (
          <p>
            <strong>Raison sociale :</strong> {EDITEUR.raisonSociale}<br />
            <strong>Forme juridique :</strong> {EDITEUR.formeJuridique}
            {EDITEUR.capital ? <> au capital de {EDITEUR.capital}</> : null}<br />
            <strong>SIRET :</strong> {EDITEUR.siret}
            {EDITEUR.rcs ? <><br /><strong>RCS :</strong> {EDITEUR.rcs}</> : null}
            {EDITEUR.tva ? <><br /><strong>TVA intracommunautaire :</strong> {EDITEUR.tva}</> : null}<br />
            <strong>Siège social :</strong> {EDITEUR.siege}<br />
            <strong>Directeur de la publication :</strong> {EDITEUR.directeurPublication}
          </p>
        ) : (
          <p>
            Ces informations sont en cours de mise à jour. Pour toute question sur
            l'éditeur du service, écrivez à <a href="mailto:contact@qrowg.com">contact@qrowg.com</a>.
          </p>
        )}
      </div>
      <div className="ls">
        <h2>Contact</h2>
        <p>
          <strong>E-mail :</strong> <a href="mailto:contact@qrowg.com">contact@qrowg.com</a><br />
          <strong>Support :</strong> <a href="mailto:support@qrowg.com">support@qrowg.com</a><br />
          <strong>RGPD :</strong> <a href="mailto:privacy@qrowg.com">privacy@qrowg.com</a>
        </p>
      </div>
      <div className="ls">
        <h2>Hébergement</h2>
        <p><strong>Hébergeur :</strong> Vercel Inc. — 340 Pine Street, San Francisco, CA 94104 — <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a></p>
        <p><strong>Base de données :</strong> Supabase Inc. — <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a></p>
        <p><strong>Paiements :</strong> Stripe, Inc. — 510 Townsend Street, San Francisco, CA 94103 — <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">stripe.com</a></p>
      </div>
      <div className="ls">
        <h2>Propriété intellectuelle</h2>
        <p>L’ensemble du contenu de QRowg est protégé par le droit de la propriété intellectuelle. Toute reproduction sans autorisation écrite est interdite.</p>
      </div>
      <div className="ls">
        <h2>Cookies</h2>
        <p>QRowg utilise des cookies nécessaires au fonctionnement. Voir notre <a href="/privacy">Politique de confidentialité</a>.</p>
      </div>
      <div className="ls">
        <h2>Médiation</h2>
        <p>En cas de litige non résolu : <a href="mailto:contact@qrowg.com">contact@qrowg.com</a></p>
        <p>Plateforme européenne : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a></p>
      </div>
    </LegalLayout>
  )
}
