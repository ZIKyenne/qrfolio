// etatsQr.ts — Les libellés et couleurs d'état d'un QR et de sa page, les badges de
// plan, et l'affichage relatif d'une date (« il y a 3h »).
//
// De la donnée d'affichage, sortie de QRStudio.tsx pour que ce fichier redescende
// sous les 3 000 lignes. `formatDate` a maintenant ses propres tests : elle est lue
// à chaque ligne de la liste des QR.

export const STATUS_CFG: Record<string, { label: string; dot: string; badge: string; text: string }> = {
  published: { label: "Publié",    dot: "var(--success)", badge: "rgba(57,255,143,0.12)",  text: "var(--success)" },
  draft:     { label: "Brouillon", dot: "#A8A190", badge: "rgba(138,132,120,0.12)", text: "#A8A190" },
  archived:  { label: "Archivé",   dot: "#F97316", badge: "rgba(249,115,22,0.12)",  text: "#F97316" },
  paused:    { label: "En pause",  dot: "var(--danger)", badge: "rgba(255,107,107,0.12)", text: "var(--danger)" },
}

// -- Statuts QR Code
export const QR_STATUS_CFG: Record<string, { label: string; dot: string; badge: string; text: string; desc: string }> = {
  active:   { label: "Actif",     dot: "var(--success)", badge: "rgba(57,255,143,0.12)",  text: "var(--success)", desc: "Redirection normale" },
  draft:    { label: "Brouillon", dot: "#A8A190", badge: "rgba(138,132,120,0.12)", text: "#A8A190", desc: "Visible dans le tableau de bord uniquement" },
  paused:   { label: "En pause",  dot: "#F97316", badge: "rgba(249,115,22,0.12)",  text: "#F97316", desc: "Page indisponible affichee" },
  archived: { label: "Archivé",   dot: "#6B7280", badge: "rgba(107,114,128,0.12)", text: "#6B7280", desc: "Masque et bloque" },
  expired:  { label: "Expire",    dot: "var(--danger)", badge: "rgba(255,107,107,0.12)", text: "var(--danger)", desc: "Accès expire" },
}

// Sous l'aperçu : bloc stats + éditeur de destination RETIRÉS du flux principal (audit §2/§9 : les stats
// appartiennent à Analytics, et ce bloc était la 1re cause de scroll). Masqué via flag (code conservé,
// réversible — la destination pourra être relogée dans le menu « ··· » ou Redirections si besoin).
export const LEGACY_INFO = false as boolean
// Section « Choisir un style » (presets) retirée du panneau à la demande : Couleurs suffit. Masquée (réversible).
export const SHOW_PRESETS = false as boolean
// Pavé « diagnostic scannabilité premium » du bas retiré : redondant avec la ligne de lisibilité sous le QR. Masqué (réversible).
export const SHOW_DIAG = false as boolean

export const PLAN_BADGE: Record<string, { color: string; label: string } | null> = {
  free: null, pro: { color: "var(--accent)", label: "PRO" }, business: { color: "var(--success)", label: "BIZ" },
}

export function formatDate(iso: string | null): string {
  if (!iso) return "--"
  const d = new Date(iso), now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diff < 60)   return `il y a ${diff}min`
  if (diff < 1440) return `il y a ${Math.floor(diff / 60)}h`
  if (diff < 10080) return `il y a ${Math.floor(diff / 1440)}j`
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}
