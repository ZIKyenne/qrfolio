import { permanentRedirect } from "next/navigation"

// « Objectifs » n'est plus une page dédiée : la section vit en bas du Dashboard (#objectifs).
// On garde l'URL fonctionnelle (favoris, liens d'emails de rapport, onboarding) via une
// redirection PERMANENTE (308) vers l'ancre.
export default function GoalsPage() {
  permanentRedirect("/dashboard#objectifs")
}
