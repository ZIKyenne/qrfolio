// Politique de rétention des tables d'events BRUTES. Ces tables grossissent sans
// limite (une ligne par scan / vue / clic / événement d'engagement). On purge les
// lignes plus anciennes que RETENTION_DAYS pour maîtriser taille et coût.
//
// IMPORTANT : les COMPTEURS cumulés (qr_codes.total_scans + last_scan_at,
// pages.total_views, profiles.total_scans) sont stockés à part et incrémentés par
// trigger à l'insertion — ils NE sont PAS affectés par la purge. Seules les lignes
// brutes (séries temporelles) au-delà de la fenêtre sont supprimées.
//
// 400 jours (~13 mois) : couvre le comparatif année-sur-année dans l'analytics
// (qui interroge surtout des fenêtres 7 / 30 / 90 jours).
export const RETENTION_DAYS = 400

export const EVENT_TABLES = [
  { table: "scans",        column: "scanned_at" },
  { table: "page_views",   column: "viewed_at" },
  { table: "block_clicks", column: "clicked_at" },
  { table: "page_events",  column: "created_at" },
] as const

// Date limite ISO : toute ligne strictement antérieure est purgeable.
export function retentionCutoffISO(now: Date, days: number = RETENTION_DAYS): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString()
}
