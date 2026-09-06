// bornes — ce qu'une route accepte d'un corps JSON, et rien de plus.
//
// Relevé du 4 septembre : plusieurs routes persistaient des charges non bornées
// (blocs illimités, objets JSON de taille libre, pause_message sans type,
// page_id d'un autre compte). Ces fonctions PURES bornent avant d'écrire.

export function texte(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null
  const t = v.trim().slice(0, max)
  return t.length ? t : null
}

export function entier(v: unknown, min: number, max: number, defaut: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN
  if (!Number.isFinite(n)) return defaut
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

export function entierOuNull(v: unknown, min: number, max: number): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

export function couleurHex(v: unknown, defaut: string): string {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim().toUpperCase() : defaut
}

export function parmi<T extends string>(v: unknown, valeurs: readonly T[], defaut: T): T {
  return typeof v === "string" && (valeurs as readonly string[]).includes(v) ? (v as T) : defaut
}

// Taille sérialisée d'une valeur JSON, en octets UTF-8.
export function octetsJson(v: unknown): number {
  try { return Buffer.byteLength(JSON.stringify(v) ?? "", "utf8") } catch { return Number.POSITIVE_INFINITY }
}

// Un objet (pas un tableau, pas null) dont la sérialisation tient dans `maxOctets`.
export function objetBorne(v: unknown, maxOctets: number): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null
  if (octetsJson(v) > maxOctets) return null
  return v as Record<string, unknown>
}

// Un tableau d'au plus `maxElements` éléments et `maxOctets` octets.
export function tableauBorne<T = unknown>(v: unknown, maxElements: number, maxOctets: number): T[] | null {
  if (!Array.isArray(v)) return null
  if (v.length > maxElements) return null
  if (octetsJson(v) > maxOctets) return null
  return v as T[]
}

// Ne garde que les clés autorisées (jamais __proto__, constructor…).
export function champs<K extends string>(v: unknown, cles: readonly K[]): Partial<Record<K, unknown>> {
  const out: Partial<Record<K, unknown>> = {}
  if (!v || typeof v !== "object") return out
  for (const k of cles) if (Object.hasOwn(v as object, k)) out[k] = (v as Record<string, unknown>)[k]
  return out
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const uuidOuNull = (v: unknown): string | null => typeof v === "string" && UUID.test(v) ? v : null
