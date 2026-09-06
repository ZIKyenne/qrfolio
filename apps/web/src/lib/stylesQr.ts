// Une seule table de styles de QR pour tout le produit.
//
// Le générateur public et le tableau de bord fabriquent le MÊME objet — même
// moteur (qrRender), même format enregistré en base — mais chacun recopiait ses
// propres presets, ses pastilles et ses libellés. Les tables avaient divergé :
//
//   · 5 styles côté tableau de bord, 4 côté générateur. Un QR enregistré en
//     « Luxe » puis relu par le générateur retombait silencieusement sur
//     « Carré » : le fichier téléchargé ne ressemblait plus à l'aperçu.
//   · 8 couleurs d'encre d'un côté, 7 de l'autre (le sarcelle #0F766E manquait).
//   · Le niveau de correction « H » s'appelait « Maximum » ici et « Max » là.
//   · Les pastilles n'avaient de nom lisible que sur un des deux écrans : le
//     lecteur d'écran annonçait « Couleur dièse C 9 A 8 4 C » sur l'autre.
//
// Tout est ici désormais, et un test vérifie que les deux écrans n'en gardent
// aucune copie locale.

import type { QRStyleConfig } from "@/app/dashboard/qr-codes/qrRender"

export type FormeQr = NonNullable<QRStyleConfig["dotStyle"]>
export type CoinQr = NonNullable<QRStyleConfig["cornerStyle"]>

export type StylePresetQr = {
  /** Clé enregistrée en base, dans `qr_instant.style.styleKey`. Ne jamais la renommer. */
  k: string
  label: string
  dotStyle: FormeQr
  cornerStyle: CoinQr
}

/** Le style d'un QR enregistré sans style explicite, et le repli en cas de clé inconnue. */
export const STYLE_QR_DEFAUT = "carre"

export const STYLES_QR: readonly StylePresetQr[] = [
  { k: "carre",   label: "Carré",   dotStyle: "square",     cornerStyle: "square" },
  { k: "arrondi", label: "Arrondi", dotStyle: "rounded",    cornerStyle: "rounded" },
  { k: "points",  label: "Points",  dotStyle: "dot",        cornerStyle: "circle" },
  { k: "doux",    label: "Doux",    dotStyle: "softSquare", cornerStyle: "rounded" },
  { k: "luxe",    label: "Luxe",    dotStyle: "luxury",     cornerStyle: "luxury" },
]

/**
 * Le preset d'une clé — TOUJOURS un preset, jamais `undefined`.
 * Une clé inconnue (style retiré, base plus ancienne) retombe sur « Carré », qui
 * se scanne partout : un repli visible vaut mieux qu'un plantage à l'aperçu.
 */
export function presetQr(cle: unknown): StylePresetQr {
  const k = typeof cle === "string" ? cle : ""
  return STYLES_QR.find(p => p.k === k) ?? STYLES_QR[0]
}

/** Ce que le moteur de rendu attend, à partir d'une clé enregistrée. */
export function formeQr(cle: unknown): { dotStyle: FormeQr; cornerStyle: CoinQr } {
  const p = presetQr(cle)
  return { dotStyle: p.dotStyle, cornerStyle: p.cornerStyle }
}


// ── Couleurs ─────────────────────────────────────────────────────────────────

export const ENCRES_QR = ["#080808", "#C9A84C", "#1D4ED8", "#059669", "#DB2777", "#DC2626", "#7C3AED", "#0F766E"] as const
export const FONDS_QR = ["#FFFFFF", "#F5F0E8", "#FEF3C7", "#E0F2FE", "#F0FDF4", "#111111"] as const

export const ENCRE_QR_DEFAUT = "#080808"
export const FOND_QR_DEFAUT = "#FFFFFF"

/** Un lecteur d'écran annonçait « Couleur dièse C 9 A 8 4 C ». Les pastilles ont un nom. */
const NOMS_COULEUR: Record<string, string> = {
  "#080808": "noir", "#C9A84C": "or", "#1D4ED8": "bleu", "#059669": "vert",
  "#DB2777": "rose", "#DC2626": "rouge", "#7C3AED": "violet", "#0F766E": "sarcelle",
  "#FFFFFF": "blanc", "#F5F0E8": "ivoire", "#FEF3C7": "crème", "#E0F2FE": "bleu pâle",
  "#F0FDF4": "vert pâle", "#111111": "noir",
}

/** Le nom lisible d'une couleur, ou son code si elle vient du sélecteur libre. */
export function nommerCouleur(c: unknown): string {
  if (typeof c !== "string") return ""
  return NOMS_COULEUR[c.toUpperCase()] ?? c
}


// ── Correction d'erreur ──────────────────────────────────────────────────────

export type NiveauEcc = "L" | "M" | "Q" | "H"

export const NIVEAUX_ECC: readonly { k: NiveauEcc; label: string }[] = [
  { k: "L", label: "Faible" },
  { k: "M", label: "Moyen" },
  { k: "Q", label: "Élevé" },
  { k: "H", label: "Maximum" },
]

export const ECC_DEFAUT: NiveauEcc = "M"

export function estEcc(v: unknown): v is NiveauEcc {
  return v === "L" || v === "M" || v === "Q" || v === "H"
}

/** Le niveau enregistré, ou le défaut si la valeur est abîmée. */
export function eccOuDefaut(v: unknown): NiveauEcc {
  return estEcc(v) ? v : ECC_DEFAUT
}


// ── Types de QR ──────────────────────────────────────────────────────────────

export type TypeQr = "link" | "text" | "wifi" | "email" | "phone" | "sms" | "contact"

export type DefinitionTypeQr = {
  k: TypeQr
  label: string
  /**
   * Redirigeable (donc modifiable après impression et suivi au scan).
   * Wi-Fi et contact encodent leur contenu en dur : ils doivent fonctionner sans
   * réseau, et un mot de passe Wi-Fi n'a rien à faire dans une redirection.
   */
  dynamique: boolean
}

export const TYPES_QR: readonly DefinitionTypeQr[] = [
  { k: "link",    label: "Lien",    dynamique: true },
  { k: "wifi",    label: "Wi-Fi",   dynamique: false },
  { k: "text",    label: "Texte",   dynamique: true },
  { k: "contact", label: "Contact", dynamique: false },
  { k: "phone",   label: "Appel",   dynamique: true },
  { k: "email",   label: "Email",   dynamique: true },
  { k: "sms",     label: "SMS",     dynamique: false },
]

/** Les types dans l'ordre voulu par un écran, sans recopier leurs libellés. */
export function typesQr(cles: readonly TypeQr[]): DefinitionTypeQr[] {
  return cles.map(k => TYPES_QR.find(t => t.k === k)!).filter(Boolean)
}

export function estTypeDynamique(t: unknown): boolean {
  return TYPES_QR.find(x => x.k === t)?.dynamique === true
}

/**
 * Le libellé français d'un type enregistré.
 *
 * La liste des QR affichait la valeur brute de la colonne `kind` : « link »,
 * « Wi-Fi », « sms » — les clés techniques, en anglais, à des clients français.
 * `call` est un ancien alias de `phone` encore accepté par l'API.
 */
export function libelleTypeQr(kind: unknown): string {
  if (typeof kind !== "string" || !kind) return "QR"
  if (kind === "call") return "Appel"
  return TYPES_QR.find(t => t.k === kind)?.label ?? kind
}
