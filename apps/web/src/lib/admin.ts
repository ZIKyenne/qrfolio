// Qui est administrateur de l'instance ? La liste vit dans ADMIN_EMAILS
// (adresses séparées par des virgules, sur Vercel). Vide = personne : les écrans
// d'administration (journal des tâches planifiées) restent fermés.
export function administrateurs(env: string | undefined = process.env.ADMIN_EMAILS): string[] {
  return (env ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
}

export function estAdministrateur(email: string | null | undefined, env?: string): boolean {
  if (!email) return false
  return administrateurs(env).includes(email.trim().toLowerCase())
}
