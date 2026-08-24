// draftStore.ts — le brouillon d'un visiteur SANS COMPTE.
//
// Pourquoi. Jusqu'ici il fallait donner nom, email et mot de passe avant de voir
// la moindre page. Quatre étapes avant la première impression. On inverse : on
// compose d'abord, on crée le compte au moment de publier — et rien n'est resaisi.
//
// Où. La table `pages` impose `user_id NOT NULL` : une page anonyme ne peut pas
// exister en base. Le brouillon vit donc dans le navigateur, sur la même origine,
// et survit à l'inscription (même onglet, même localStorage).
//
// Format. Exactement `PageSnapshot` — la forme que `persistSnapshot` sait déjà
// écrire en base. Le brouillon est donc rejouable tel quel une fois le compte créé,
// sans conversion et sans risque de dérive entre deux formats.
//
// Module PUR : aucune dépendance React ni Supabase, testable seul.

import type { SaveBlock } from "./savePage"

/** Version du format. Un brouillon d'une autre version est ignoré, jamais deviné. */
export const DRAFT_VERSION = 1

/** Clé unique. Un seul brouillon à la fois : un visiteur ne jongle pas entre projets. */
export const DRAFT_KEY = "qrowg_draft_v1"

/**
 * Plafond de sécurité. localStorage tourne autour de 5 Mo par origine et lève
 * QuotaExceededError une fois plein. On refuse au-delà pour ne jamais casser les
 * préférences d'interface déjà stockées à côté.
 */
export const DRAFT_MAX_BYTES = 2_000_000

export type LocalDraft = {
  v: number
  /** Millisecondes epoch. Injecté par l'appelant : le module reste pur. */
  savedAt: number
  pageName: string
  theme: unknown
  blocks: SaveBlock[]
  /** Modèle d'origine, si le brouillon vient de la bibliothèque. */
  templateKey?: string
}

/** Interface minimale de localStorage — permet de tester sans navigateur. */
export type StorageLike = {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

export type SaveResult = { ok: true; bytes: number } | { ok: false; reason: "too_big" | "unavailable" }

/** localStorage quand il existe ET qu'il répond. Null en rendu serveur, ou navigation privée verrouillée. */
export function browserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null
    // Certains navigateurs exposent l'objet mais lèvent à la première écriture.
    const probe = "__qrowg_probe__"
    window.localStorage.setItem(probe, "1")
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Un bloc réduit à ce qui compte, sans champ parasite venu de l'éditeur.
 * `index` sert à fabriquer un identifiant quand le bloc n'en a pas : les blocs
 * d'un modèle n'en portent pas (c'est le serveur qui les numérote à la création).
 * Sans ça, un modèle entier était silencieusement jeté du brouillon.
 */
function cleanBlock(b: any, index = 0): SaveBlock | null {
  if (!b || typeof b !== "object") return null
  const type = typeof b.type === "string" ? b.type : ""
  if (!type) return null
  const id = typeof b.id === "string" && b.id ? b.id : `local-${index}`
  const content: Record<string, any> = {}
  const raw = b.content && typeof b.content === "object" ? b.content : {}
  for (const [k, v] of Object.entries(raw)) {
    // Le contenu de l'éditeur est du texte de bout en bout (cf. BlockContent).
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") content[k] = v
  }
  return {
    id, type, content,
    visible: b.visible !== false,
    draft: b.draft === true,
    locked: b.locked === true,
  }
}

/** Nettoie et borne un brouillon venu de l'éditeur. */
export function makeDraft(input: {
  pageName: string; theme: unknown; blocks: any[]; templateKey?: string; now: number
}): LocalDraft {
  return {
    v: DRAFT_VERSION,
    savedAt: input.now,
    pageName: (input.pageName || "").slice(0, 120) || "Ma page",
    theme: input.theme ?? null,
    blocks: (input.blocks || []).map((b, i) => cleanBlock(b, i)).filter(Boolean).slice(0, 200) as SaveBlock[],
    ...(input.templateKey ? { templateKey: String(input.templateKey).slice(0, 80) } : {}),
  }
}

export function saveDraft(storage: StorageLike | null, draft: LocalDraft): SaveResult {
  if (!storage) return { ok: false, reason: "unavailable" }
  const json = JSON.stringify(draft)
  // Les images collées en data: URI peuvent peser lourd — on refuse plutôt que
  // de faire exploser le quota et de perdre aussi les préférences voisines.
  const bytes = json.length
  if (bytes > DRAFT_MAX_BYTES) return { ok: false, reason: "too_big" }
  try {
    storage.setItem(DRAFT_KEY, json)
    return { ok: true, bytes }
  } catch {
    return { ok: false, reason: "unavailable" }
  }
}

/** Relit le brouillon. Retourne null si absent, illisible, vide ou d'une autre version. */
export function loadDraft(storage: StorageLike | null): LocalDraft | null {
  if (!storage) return null
  let raw: string | null = null
  try { raw = storage.getItem(DRAFT_KEY) } catch { return null }
  if (!raw) return null
  let parsed: any
  try { parsed = JSON.parse(raw) } catch { return null }
  if (!parsed || typeof parsed !== "object") return null
  if (parsed.v !== DRAFT_VERSION) return null
  const blocks = Array.isArray(parsed.blocks) ? parsed.blocks.map((b: any, i: number) => cleanBlock(b, i)).filter(Boolean) : []
  if (!blocks.length) return null   // un brouillon sans bloc n'a rien à restaurer
  return {
    v: DRAFT_VERSION,
    savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
    pageName: typeof parsed.pageName === "string" && parsed.pageName ? parsed.pageName.slice(0, 120) : "Ma page",
    theme: parsed.theme ?? null,
    blocks: blocks as SaveBlock[],
    ...(typeof parsed.templateKey === "string" ? { templateKey: parsed.templateKey } : {}),
  }
}

export function clearDraft(storage: StorageLike | null): void {
  if (!storage) return
  try { storage.removeItem(DRAFT_KEY) } catch { /* rien à faire : le brouillon est déjà perdu */ }
}

export function hasDraft(storage: StorageLike | null): boolean {
  return loadDraft(storage) !== null
}

/**
 * Le brouillon a-t-il du contenu propre à l'utilisateur, ou n'est-ce que le
 * squelette de départ ? Sert à ne pas proposer « reprendre mon brouillon » pour
 * trois blocs vides — et à ne pas armer l'avertissement de fermeture d'onglet.
 */
export function draftIsMeaningful(draft: LocalDraft | null): boolean {
  if (!draft) return false
  if (draft.blocks.length > 3) return true
  if (draft.templateKey) return true
  return draft.blocks.some(b => Object.values(b.content).some(v => typeof v === "string" && v.trim().length > 0))
}

/** Résumé court pour l'interface : « 5 blocs · il y a 3 min ». */
export function draftSummary(draft: LocalDraft, now: number): string {
  const n = draft.blocks.length
  const blocs = `${n} bloc${n > 1 ? "s" : ""}`
  const min = Math.floor(Math.max(0, now - draft.savedAt) / 60_000)
  if (min < 1) return `${blocs} · à l'instant`
  if (min < 60) return `${blocs} · il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${blocs} · il y a ${h} h`
  const j = Math.floor(h / 24)
  return `${blocs} · il y a ${j} j`
}
