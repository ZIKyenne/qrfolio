// builderErrors.ts — taxonomie PURE des erreurs de persistance du Builder.
// But : ne plus afficher de message Supabase brut (table, code SQL, détail RLS, JWT…)
// et distinguer clairement les échecs (réseau / droit / absence / serveur) pour le
// chargement, la sauvegarde et la publication. Testable sans React ni réseau.

export type BuilderErrorCode =
  | "NETWORK"       // la requête n'a pas abouti (offline, DNS, CORS, timeout)
  | "UNAUTHORIZED"  // session/JWT expiré
  | "FORBIDDEN"     // droit refusé (RLS explicite, insufficient_privilege)
  | "NOT_FOUND"     // aucune ligne (page absente OU filtrée par RLS)
  | "VALIDATION"    // contrainte / type / format invalide
  | "SERVER"        // 5xx, erreur PostgREST/Postgres interne
  | "UNKNOWN"

// Classe une erreur Supabase/PostgREST (objet {code,message,status} OU Error lancée).
// N'utilise que des heuristiques robustes ; en cas de doute → UNKNOWN (récupérable).
export function classifyError(error: any): { code: BuilderErrorCode; retryable: boolean } {
  if (!error) return { code: "UNKNOWN", retryable: true }
  const rawCode = String(error.code ?? "")
  const status = Number(error.status ?? error.statusCode ?? 0)
  const msg = String(error.message ?? error.hint ?? error ?? "").toLowerCase()

  if (/failed to fetch|fetch failed|network|networkerror|load failed|timed? ?out|econn|enotfound|dns/.test(msg)) return { code: "NETWORK", retryable: true }
  if (rawCode === "PGRST116" || status === 406) return { code: "NOT_FOUND", retryable: false }
  if (status === 401 || rawCode === "PGRST301" || /jwt|not authenticated|unauthorized|session/.test(msg)) return { code: "UNAUTHORIZED", retryable: false }
  if (status === 403 || rawCode === "42501" || /permission denied|row-level security|policy|forbidden/.test(msg)) return { code: "FORBIDDEN", retryable: false }
  if (/^23\d{3}$/.test(rawCode) || /^22\d{3}$/.test(rawCode) || /invalid input|violates|constraint|malformed/.test(msg)) return { code: "VALIDATION", retryable: false }
  if ((status >= 500 && status < 600) || rawCode.startsWith("PGRST") || /^XX/.test(rawCode)) return { code: "SERVER", retryable: true }
  return { code: "UNKNOWN", retryable: true }
}

// Messages utilisateur COURTS et orientés solution. Jamais de détail technique.
export const USER_MESSAGES: Record<BuilderErrorCode, string> = {
  NETWORK: "Vérifiez votre connexion puis réessayez.",
  UNAUTHORIZED: "Votre session a expiré. Reconnectez-vous puis réessayez.",
  FORBIDDEN: "Vous n'avez plus accès à cette page.",
  NOT_FOUND: "Cette page n'existe plus.",
  VALIDATION: "Certaines données n'ont pas pu être enregistrées (format invalide).",
  SERVER: "Une erreur empêche l'opération. Vos modifications restent dans cet onglet.",
  UNKNOWN: "Une erreur inattendue est survenue. Vos modifications restent dans cet onglet.",
}

// Message utilisateur SÛR : jamais de message Supabase brut, code SQL, table ni RLS.
export function safeErrorMessage(error: any): string {
  return USER_MESSAGES[classifyError(error).code]
}

// ── État de chargement du Builder ───────────────────────────────────────────
export type LoadState = "loading" | "loaded" | "not_found" | "forbidden" | "error"

// Traduit le résultat d'un chargement en état d'écran. hasPage=true court-circuite.
// NOT_FOUND et FORBIDDEN sont terminaux ; le reste (réseau/serveur…) est récupérable.
export function loadStateFromError(error: any, hasPage: boolean): LoadState {
  if (hasPage) return "loaded"
  const { code } = classifyError(error)
  if (code === "NOT_FOUND") return "not_found"
  if (code === "FORBIDDEN" || code === "UNAUTHORIZED") return "forbidden"
  return "error"
}
