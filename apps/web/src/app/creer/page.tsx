// /creer — la porte d'entrée d'un visiteur qui vient essayer, sans compte.
//
// Pourquoi une adresse à part. Les liens de la vitrine menaient à
// /dashboard/templates : une URL qui annonce un tableau de bord à quelqu'un qui
// n'a pas de compte, et qui est bloquée aux robots — donc invisible dans Google,
// alors que « créer une page avec QR code » est exactement ce qu'on veut y voir.
//
// C'est la MÊME galerie, servie ailleurs : rien n'est dupliqué. Un visiteur
// connecté qui atterrit ici y trouve simplement ses modèles.
import type { Metadata } from "next"
import TemplatesGallery from "../dashboard/templates/page"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

const TITLE = "Créer votre page et son QR code"
const DESC = "Choisissez un modèle par métier, composez votre page et voyez le résultat immédiatement. Aucun compte demandé avant de publier."

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: `${APP}/creer` },
  openGraph: { title: `${TITLE} | QRowg`, description: DESC, url: `${APP}/creer`, siteName: "QRowg", type: "website" },
  twitter: { card: "summary_large_image", title: `${TITLE} | QRowg`, description: DESC },
}

export default function CreerPage() {
  return <TemplatesGallery />
}
