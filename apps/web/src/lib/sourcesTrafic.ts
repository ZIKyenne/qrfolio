// Le nom lisible d'une source de trafic, et rien d'autre.
//
// Ces libellés existaient déjà — mais dans TrafficSourcesPanel.tsx, un composant
// que plus rien ne montait. L'écran réellement affiché lit `dataKey="name"`,
// c'est-à-dire la valeur brute enregistrée en base : un commerçant lisait donc
// « qr_scan » et « direct » au lieu de « QR Scan » et « Direct ».
//
// Une seule source pour ces noms, partagée par tout ce qui affiche du trafic.

export const SOURCE_LABELS: Record<string, string> = {
  qr_scan:   "QR Scan",
  direct:    "Direct",
  interne:   "Votre site",
  instagram: "Instagram",
  tiktok:    "TikTok",
  facebook:  "Facebook",
  linkedin:  "LinkedIn",
  twitter:   "X / Twitter",
  whatsapp:  "WhatsApp",
  telegram:  "Telegram",
  email:     "Email",
  google:    "Google",
  referral:  "Référent",
}

/** Nom lisible d'une source ; une valeur inconnue est rendue telle quelle plutôt que masquée. */
export function libelleSource(source?: string | null): string {
  const s = (source || "").trim()
  if (!s) return SOURCE_LABELS.direct
  return SOURCE_LABELS[s] ?? s
}
