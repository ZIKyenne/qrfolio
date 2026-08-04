// Sécurisation d'une URL de MÉDIA (src d'image). Sémantique distincte d'un lien (extHref) :
// - neutralise les schémas exécutables/dangereux (javascript:, vbscript:, file:, data: non-image) ;
// - autorise http(s), chemins internes, data:image, domaines/relatifs (fidèle au rendu legacy) ;
// - rejette les valeurs non-chaîne, vides et anormalement longues.
export function safeMediaSrc(url: unknown): string | null {
  if (typeof url !== "string") return null
  const u = url.trim()
  if (!u) return null
  if (/^data:image\//i.test(u)) return u
  if (/^(javascript:|vbscript:|file:|data:)/i.test(u)) return null
  if (u.length > 2048) return null
  return u
}
