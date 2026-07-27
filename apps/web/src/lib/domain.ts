// Source unique de normalisation / validation de domaine (etait dupliquee dans
// les routes domaines et redirections). Sans dependance serveur.

// Normalise un domaine : trim, minuscule, retire le protocole, le prefixe www,
// et tout chemin/slash final. Ex : "  HTTPS://www.Example.com/path " -> "example.com".
export function normalizeDomain(input: string): string {
  return (input ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
}

// Format de domaine valide (labels alphanumeriques, tirets internes, >= 1 point).
// Rejette aussi les litteraux IPv4 (127.0.0.1, 169.254.169.254, …) : defense en
// profondeur anti-SSRF — un vrai domaine n'a jamais un TLD tout-numerique.
export function isValidDomain(domain: string): boolean {
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)) return false
  const lastLabel = domain.slice(domain.lastIndexOf(".") + 1)
  if (/^\d+$/.test(lastLabel)) return false
  return true
}
