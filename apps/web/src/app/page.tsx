// Accueil. Coquille serveur : elle n'existe que pour porter les metadata —
// l'accueil est un îlot client (animations, QR de démo, comparateur de plans)
// et un composant client ne peut pas exporter `metadata`.
//
// La canonique est déclarée ICI et pas dans le layout racine : en App Router,
// `alternates.canonical` posé sur un parent est hérité par tous ses enfants,
// ce qui canoniserait le site entier vers l'accueil.
import type { Metadata } from "next"
import HomeClient from "./HomeClient"

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"

export const metadata: Metadata = {
  alternates: { canonical: APP },
  // Pas d'openGraph ici : un objet enfant REMPLACE celui du parent en App Router,
  // ce qui effacerait le titre, la description et l'image du layout racine —
  // lequel décrit déjà l'accueil et pose og:url = APP.
}

export default function HomePage() {
  return <HomeClient />
}
