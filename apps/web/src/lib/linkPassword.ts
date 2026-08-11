// Hachage des mots de passe de lien dynamique (feature « sécurité du lien », Pro+).
// scrypt (Node crypto) + sel aléatoire par lien. Stocké dans instant_qrs.password_hash
// au format "saltHex:hashHex". Ce N'EST PAS de l'authentification de compte : c'est un
// simple verrou de lien — mais on hache quand même (jamais de mot de passe en clair).

import { scryptSync, randomBytes, timingSafeEqual } from "crypto"

const KEYLEN = 32

// Produit "saltHex:hashHex" à stocker. À appeler côté serveur (POST/PATCH).
export function hashLinkPassword(pw: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(pw, salt, KEYLEN)
  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

// Vérifie un mot de passe saisi contre le hash stocké. Comparaison à temps constant.
export function verifyLinkPassword(pw: string, stored?: string | null): boolean {
  if (!stored || !pw) return false
  const [saltHex, hashHex] = stored.split(":")
  if (!saltHex || !hashHex) return false
  let salt: Buffer, expected: Buffer
  try { salt = Buffer.from(saltHex, "hex"); expected = Buffer.from(hashHex, "hex") } catch { return false }
  if (expected.length === 0) return false
  const actual = scryptSync(pw, salt, expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
