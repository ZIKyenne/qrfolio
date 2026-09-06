// Coquille serveur du tableau de bord. Elle n'existe que pour répondre à UNE
// question avant le premier rendu : y a-t-il une session ?
//
// Depuis l'essai sans inscription, un visiteur sans compte passe par ici. Si la
// réponse n'arrivait qu'après l'hydratation, il verrait d'abord le menu complet
// — Analytics, Messages, Équipe, Facturation — puis le verrait se réduire. On lit
// donc le cookie de session côté serveur pour que le HTML porte le bon menu dès
// le départ. Ce n'est qu'un point de départ : DashboardShell le confirme ensuite
// avec getUser(), qui reste la seule source de vérité.
import { cookies } from "next/headers"
import DashboardShell from "./DashboardShell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies()
  const signedIn = jar.getAll().some(c => /^sb-.+-auth-token(\.\d+)?$/.test(c.name) && !!c.value)
  // Même logique pour la barre latérale repliée : sans ce cookie, elle se
  // rétractait sous les yeux de l'utilisateur à chaque chargement.
  const collapsed = jar.get("qrfolio_sidebar")?.value === "collapsed"
  return <DashboardShell initialSignedIn={signedIn} initialCollapsed={collapsed}>{children}</DashboardShell>
}
