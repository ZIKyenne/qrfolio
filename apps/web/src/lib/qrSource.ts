// Source d'attribution « par support ». Le short_code du QR d'origine est propagé par le
// redirect /q/[code] dans l'URL de la page publique sous ?s=<code>. Ce helper le lit (validé)
// et le fournit aux traceurs (vue / clic / lead) pour rattacher chaque événement au support
// physique qui a amené le visiteur (vitrine, table, flyer…). Null si accès direct / hors scan.
export function qrSource(): string | null {
  if (typeof window === "undefined") return null
  try {
    const s = new URLSearchParams(window.location.search).get("s")
    return s && /^[A-Za-z0-9_-]{1,40}$/.test(s) ? s : null
  } catch {
    return null
  }
}
