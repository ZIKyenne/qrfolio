// Garde anti-SSRF : vrai uniquement si `raw` est une URL http(s) vers un hôte
// PUBLIC. À appeler avant tout fetch server-side d'une URL fournie par
// l'utilisateur (ex. avatar d'un bloc profil rendu dans l'image OG).
//
// Bloque : schémas non http(s), localhost, TLD internes, littéraux IPv4/IPv6
// privés / lien-local / métadonnées cloud (169.254.x, etc.). Heuristique sur
// l'hôte : ne protège PAS contre le DNS rebinding (un domaine public pointant
// vers une IP privée), mais couvre les cibles SSRF directes courantes.
export function isPublicHttpUrl(raw: string): boolean {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false

  // hostname d'une URL IPv6 est encadré de crochets -> on les retire.
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "")

  // Hôtes internes explicites
  if (host === "localhost" || host.endsWith(".localhost")) return false
  if (host.endsWith(".local") || host.endsWith(".internal")) return false
  if (host === "metadata.google.internal") return false

  // Littéraux IPv6 locaux / lien-local / unique-local
  if (host === "::1" || host === "::") return false
  if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return false
  // IPv6 mappé IPv4 (::ffff:...) : bloqué en bloc. Node normalise la partie v4 en
  // hexa (::ffff:a9fe:a9fe), difficile à parser ; aucun avatar public légitime
  // n'utilise cette notation.
  if (host.includes("::ffff:")) return false

  // Littéraux IPv4 privés / réservés
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    const a = Number(m[1]), b = Number(m[2])
    if (a === 0 || a === 10 || a === 127) return false
    if (a === 169 && b === 254) return false            // lien-local + métadonnées AWS/GCP
    if (a === 172 && b >= 16 && b <= 31) return false    // 172.16.0.0/12
    if (a === 192 && b === 168) return false             // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return false   // CGNAT 100.64.0.0/10
    if (a >= 224) return false                            // multicast / réservé
    if (a > 255 || b > 255 || Number(m[3]) > 255 || Number(m[4]) > 255) return false
  }

  return true
}
