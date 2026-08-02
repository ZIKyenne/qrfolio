import { NextResponse } from "next/server"

// Réponse d'erreur SERVEUR : on logue le détail côté serveur (pour le debug) mais
// on renvoie un message GÉNÉRIQUE au client — évite de divulguer les internes
// Postgres (noms de tables/contraintes) ou Stripe. Les messages précis restent
// réservés aux erreurs de VALIDATION (400), écrites explicitement dans chaque route.
export function serverError(context: string, e: unknown, status = 500) {
  const detail = e instanceof Error ? e.message : (typeof e === "string" ? e : JSON.stringify(e))
  console.error(`[${context}]`, detail)
  return NextResponse.json({ error: "Une erreur est survenue. Réessayez dans un instant." }, { status })
}
