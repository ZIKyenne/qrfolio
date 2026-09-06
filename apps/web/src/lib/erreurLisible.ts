// erreurLisible — un seul endroit pour transformer ce que renvoient Supabase,
// fetch ou nos propres routes en une phrase que le commerçant peut lire.
//
// Trois familles :
//   1. MessageUtilisateur : un message que NOUS avons rédigé (d.error d'une route
//      de l'app). Affiché tel quel.
//   2. Erreurs Supabase Auth connues (anglais) : traduites.
//   3. Le reste (« Failed to fetch », codes SQL, JWT…) : classé par
//      builderErrors.classifyError → phrase courte, jamais de détail technique.

import { classifyError, USER_MESSAGES } from "@/app/dashboard/builder/builderErrors"

export class MessageUtilisateur extends Error {
  constructor(message: string) { super(message); this.name = "MessageUtilisateur" }
}

const AUTH: [RegExp, string][] = [
  [/different from the old password/i, "Le nouveau mot de passe doit être différent de l'ancien."],
  [/at least (\d+) characters/i, "Le mot de passe est trop court."],
  [/weak|pwned|easy to guess|compromised/i, "Ce mot de passe est trop courant. Choisissez-en un plus solide."],
  [/rate limit|too many requests/i, "Trop de tentatives. Patientez une minute puis réessayez."],
  [/already registered|already exists/i, "Cette adresse est déjà utilisée."],
  [/invalid login|invalid credentials/i, "Identifiants incorrects."],
  [/email not confirmed/i, "Confirmez d'abord votre adresse e-mail."],
]

export function erreurLisible(e: unknown, repli?: string): string {
  if (e instanceof MessageUtilisateur) return e.message
  const brut = typeof e === "string" ? e : String((e as { message?: unknown } | null)?.message ?? "")
  for (const [re, phrase] of AUTH) if (re.test(brut)) return phrase
  const { code } = classifyError(e)
  if (code === "UNKNOWN" && repli) return repli
  return USER_MESSAGES[code]
}
