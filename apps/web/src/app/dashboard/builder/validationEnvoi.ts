// validationEnvoi — règles PURES appliquées AVANT d'envoyer un fichier au stockage.
// Un import qui échouait ne disait rien (Médias) ; un message d'erreur arrivait
// avec un rendu de retard (Éditeur). Ici : la raison est calculée d'abord, et
// retournée avec le résultat, jamais lue depuis un état périmé.

export const TAILLE_MAX_IMAGE = 20 * 1024 * 1024   // avant compression côté client (photo smartphone : 5-12 Mo)
export const TAILLE_MAX_FICHIER = 20 * 1024 * 1024

const IMAGES = /^image\/(jpeg|png|webp|gif|svg\+xml|avif)$/i
const DOCS: Record<string, true> = {
  "application/pdf": true,
  "application/msword": true,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
  "application/vnd.ms-powerpoint": true,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": true,
  "application/vnd.ms-excel": true,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
  "text/csv": true,
}
const EXT_DOCS = /\.(pdf|docx?|pptx?|xlsx?|csv)$/i

export type RaisonEnvoi = "no_account" | "type" | "taille" | "failed"

export type ResultatEnvoi = { url: string | null; raison: RaisonEnvoi | null }

export const mo = (n: number) => `${Math.round(n / 1024 / 1024)} Mo`

// null = acceptable ; sinon la raison.
export function validerImage(f: { type: string; size: number; name: string }): RaisonEnvoi | null {
  if (!IMAGES.test(f.type)) return "type"
  if (f.size > TAILLE_MAX_IMAGE) return "taille"
  return null
}

export function validerFichier(f: { type: string; size: number; name: string }): RaisonEnvoi | null {
  if (!(Object.hasOwn(DOCS, f.type) || EXT_DOCS.test(f.name))) return "type"
  if (f.size > TAILLE_MAX_FICHIER) return "taille"
  return null
}

// Phrase à afficher. `quoi` = "photo" | "fichier" ; `compte` = phrase pour un invité.
export function messageEnvoi(raison: RaisonEnvoi, quoi: "photo" | "fichier", nom?: string): string {
  const n = nom ? `« ${nom} »` : (quoi === "photo" ? "Cette image" : "Ce fichier")
  switch (raison) {
    case "no_account": return quoi === "photo"
      ? "Créez un compte (gratuit) pour ajouter vos propres photos — votre page est gardée."
      : "Créez un compte (gratuit) pour joindre vos fichiers — votre page est gardée."
    case "type": return quoi === "photo"
      ? `${n} n'est pas une image acceptée (JPG, PNG, WEBP, GIF, SVG).`
      : `${n} n'est pas un format accepté (PDF, Word, PowerPoint, Excel, CSV).`
    case "taille": return `${n} dépasse ${mo(quoi === "photo" ? TAILLE_MAX_IMAGE : TAILLE_MAX_FICHIER)}.`
    case "failed": return quoi === "photo"
      ? "L'envoi de la photo a échoué. Vérifiez votre connexion puis réessayez."
      : "L'import du fichier a échoué. Vérifiez votre connexion puis réessayez."
  }
}
