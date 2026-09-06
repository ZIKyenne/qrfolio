// Modeles PURS de la vague « compteurs et offres » (aucun React).
//
// C'est la famille ou vivaient les faux chiffres. Le « 1 240 » du compteur de scans
// avait deja ete retire de la page publiee le 6 septembre ; le releve de ce jour en
// a trouve deux autres, encore vivants dans l'apercu de l'editeur :
//   • tickets_left affichait « 14 places restantes » quand le champ etait vide ;
//   • visit_counter affichait « 1 234 visiteurs » — un nombre entierement invente,
//     alors que la page publiee lit le compteur reel et se masque a zero.
// Regle appliquee partout ici : un compteur sans chiffre ne s'affiche pas. Ni en
// ligne, ni dans l'apercu — ou une invite explique qu'il restera invisible.

import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

const txt = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "")

// Un schema d'adresse que le produit n'utilise pas est refuse avant meme extHref.
// Sans ce filtre, « javascript:alert(1) » ressortait en « https://javascript:alert(1) » :
// inoffensif — le navigateur n'y voit qu'une adresse https invalide — mais c'est un
// lien mort presente comme un bouton. Mieux vaut un bouton inerte qu'un lien casse.
const SCHEMA_INCONNU = /^[a-z][a-z0-9+.-]*:/i
const SCHEMAS_ADMIS = /^(https?|mailto|tel|sms):/i
export function adresseSure(url: string): string | null {
  if (!url) return null
  if (SCHEMA_INCONNU.test(url) && !SCHEMAS_ADMIS.test(url)) return null
  return extHref(url) || null
}

// Bouton d'appel a l'action optionnel. `cleParDefaut` conserve la cle de suivi
// historique quand aucune adresse n'est saisie (« tickets », « offer »).
export function ctaOptionnel(c: Record<string, any>, cleParDefaut: string): { label: string; link: CtaLink } | null {
  const label = txt(c.cta_label)
  if (!label) return null
  const url = txt(c.cta_url)
  return { label, link: { href: adresseSure(url), external: /^https?:/i.test(url), trackTarget: url || cleParDefaut, visible: true } }
}

// ── Compteur simple (scans) ─────────────────────────────────────────────────
export type Compteur = { emoji: string; count: string; label: string }
export function compteurScans(c: Record<string, any> | null | undefined): Compteur | null {
  const src = c || {}
  const count = txt(src.count)
  if (!count) return null
  return { emoji: txt(src.emoji), count, label: txt(src.label) }
}

// ── Compteur de ventes ──────────────────────────────────────────────────────
export type CompteurVentes = { emoji: string; count: string; label: string; period: string; subtext: string }
export function compteurVentes(c: Record<string, any> | null | undefined): CompteurVentes | null {
  const src = c || {}
  const count = txt(src.count)
  if (!count) return null
  return { emoji: txt(src.emoji) || "🔥", count, label: txt(src.label) || "ventes", period: txt(src.period), subtext: txt(src.subtext) }
}

// ── Participants, avec jauge facultative ────────────────────────────────────
export type Participants = { emoji: string; count: string; label: string; jauge: { total: number; max: number; pct: number } | null }
export function participants(c: Record<string, any> | null | undefined): Participants | null {
  const src = c || {}
  const count = txt(src.count)
  if (!count) return null
  const total = entier(src.count)
  const max = entier(src.max)
  // Sans objectif, aucune jauge : « 0 % · 5/0 » ne veut rien dire. L'apercu la
  // dessinait quand meme, sous un commentaire qui affirmait le contraire.
  const montrer = txt(src.show_progress) !== "no" && max > 0
  return {
    emoji: txt(src.emoji) || "👥", count, label: txt(src.label) || "participants inscrits",
    jauge: montrer ? { total, max, pct: Math.min(100, Math.round((total / max) * 100)) } : null,
  }
}

function entier(v: unknown): number {
  const n = parseInt(String(v ?? "").replace(/[^0-9-]/g, ""), 10)
  return Number.isFinite(n) ? n : 0
}

// ── Code promo ──────────────────────────────────────────────────────────────
export type CodePromo = { code: string; description: string; expires: string }
export function codePromo(c: Record<string, any> | null | undefined): CodePromo | null {
  const src = c || {}
  const code = txt(src.code)
  if (!code) return null
  return { code, description: txt(src.description), expires: txt(src.expires) }
}

// ── Places restantes ────────────────────────────────────────────────────────
export type StyleUrgence = { bg: string; border: string; color: string; texteBouton: string }
export const STYLES_URGENCE: Record<string, StyleUrgence> = {
  high:   { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.4)",   color: "#EF4444",        texteBouton: "#fff" },
  medium: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)",  color: "#FBBF24",        texteBouton: "#080808" },
  low:    { bg: "rgba(57,255,143,0.08)", border: "rgba(57,255,143,0.25)", color: "var(--success)", texteBouton: "#080808" },
}
export type PlacesRestantes = { count: string; label: string; style: StyleUrgence; cta: { label: string; link: CtaLink } | null }
export function placesRestantes(c: Record<string, any> | null | undefined): PlacesRestantes | null {
  const src = c || {}
  const count = txt(src.count)
  if (!count) return null
  return {
    count, label: txt(src.label) || "places restantes",
    style: STYLES_URGENCE[txt(src.urgency)] ?? STYLES_URGENCE.high,
    cta: ctaOptionnel(src, "tickets"),
  }
}

// ── Offre limitee ───────────────────────────────────────────────────────────
export type OffreLimitee = { title: string; description: string; expires: string; cta: { label: string; link: CtaLink } | null }
export function offreLimitee(c: Record<string, any> | null | undefined): OffreLimitee | null {
  const src = c || {}
  const title = txt(src.title), description = txt(src.description)
  if (!title && !description) return null
  return { title: title || "Offre limitée", description, expires: txt(src.expires), cta: ctaOptionnel(src, "offer") }
}
