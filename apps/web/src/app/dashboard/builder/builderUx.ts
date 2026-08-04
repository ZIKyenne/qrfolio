// builderUx.ts — Couche UX PURE du Builder (mission C01, Vague 1). Source unique, sans React ni
// Supabase, entièrement testable. Décrit le MODÈLE de la refonte (navigation, sections de réglages,
// mode simple/expert, sélection, responsive, statuts save/publication, glossaire anti-jargon,
// actions contextuelles de bloc). La coquille `BuilderV4` l'adopte progressivement, derrière le flag
// `BUILDER_REDESIGN` (voir builderFlags.ts + docs/BUILDER-REDESIGN-ROADMAP.md). Aucune UI ici.

import type { Block } from "./types"

// ── Tons sémantiques (mappés sur les tokens du design system) ────────────────
// neutral → --ink/--muted · success → --success · warning → --warning · danger → --danger
export type UxTone = "neutral" | "success" | "warning" | "danger" | "accent"

// ── Statut de sauvegarde : taxonomie UNIQUE (remplace les textes ad-hoc dispersés) ──
export type SaveKind = "idle" | "creating" | "unsaved" | "saving" | "saved" | "error"

export interface SaveStatusFlags {
  saving: boolean
  saved: boolean
  saveError: boolean
  hasUnsaved: boolean
  /** Page en cours de création côté serveur (id pas encore matérialisé). */
  creating?: boolean
  /** Message d'erreur éventuel (affiché au survol/inline). */
  errorMessage?: string
}

export interface SaveStatus {
  kind: SaveKind
  label: string        // libellé complet (desktop)
  shortLabel: string   // libellé court (mobile)
  tone: UxTone
  /** Vrai si l'utilisateur peut déclencher une action (Enregistrer / Réessayer). */
  actionable: boolean
}

// Priorité alignée sur la coquille actuelle (BuilderV4.tsx:1095-1104) :
// error > saving > saved > creating > unsaved > idle. Une seule vérité, testable.
export function resolveSaveStatus(f: SaveStatusFlags): SaveStatus {
  if (f.saveError) {
    const msg = f.errorMessage && f.errorMessage.trim() ? f.errorMessage.trim() : "Échec de l'enregistrement"
    return { kind: "error", label: `${msg} — Réessayer`, shortLabel: "Réessayer", tone: "danger", actionable: true }
  }
  if (f.saving) {
    return { kind: "saving", label: "Enregistrement…", shortLabel: "Enregistrement…", tone: "neutral", actionable: false }
  }
  if (f.saved) {
    return { kind: "saved", label: "Enregistré", shortLabel: "Enregistré", tone: "success", actionable: false }
  }
  if (f.creating) {
    return { kind: "creating", label: "Création de la page…", shortLabel: "Création…", tone: "neutral", actionable: false }
  }
  if (f.hasUnsaved) {
    return { kind: "unsaved", label: "Modifications non enregistrées · Enregistrer", shortLabel: "Enregistrer", tone: "warning", actionable: true }
  }
  return { kind: "idle", label: "", shortLabel: "", tone: "neutral", actionable: false }
}

// ── Statut de publication : taxonomie UNIQUE (§20 mission) ───────────────────
export type PublishKind = "draft" | "publishing" | "published" | "unpublished" | "upToDate"

export interface PublishStatusFlags {
  /** Statut serveur de la page ("published" | "draft" | autre). */
  pageStatus: string
  publishing?: boolean
  /** Modifications enregistrées mais pas encore publiées. */
  hasUnpublishedChanges?: boolean
}

export interface PublishStatus {
  kind: PublishKind
  label: string
  tone: UxTone
}

export function resolvePublishStatus(f: PublishStatusFlags): PublishStatus {
  if (f.publishing) return { kind: "publishing", label: "Publication…", tone: "neutral" }
  const isPublished = f.pageStatus === "published"
  if (!isPublished) return { kind: "draft", label: "Publier", tone: "accent" }
  if (f.hasUnpublishedChanges) return { kind: "unpublished", label: "Mettre à jour la page", tone: "accent" }
  return { kind: "upToDate", label: "Page à jour", tone: "success" }
}

// ── Rail de navigation principal (desktop) + bottom-bar (mobile) ─────────────
export interface NavItem {
  id: string
  label: string
  /** Explication en français simple (aide contextuelle, anti-jargon). */
  hint: string
  /** Emoji léger pour le rendu (facultatif, non technique). */
  emoji: string
}

export const BUILDER_NAV: NavItem[] = [
  { id: "add",       label: "Ajouter",   hint: "Ajouter un bloc à votre page", emoji: "➕" },
  { id: "structure", label: "Structure", hint: "Voir et réorganiser vos blocs", emoji: "🗂️" },
  { id: "design",    label: "Design",    hint: "Couleurs, polices et style", emoji: "🎨" },
  { id: "templates", label: "Modèles",   hint: "Partir d'une page toute prête", emoji: "✨" },
  { id: "settings",  label: "Réglages",  hint: "Adresse, aperçu et options de la page", emoji: "⚙️" },
]

// ── Bottom-bar mobile (aligné sur l'existant BuilderV4.tsx:2417-2421) ────────
export const MOBILE_TABS = [
  { id: "blocks", label: "Blocs",    emoji: "🧱" },
  { id: "canvas", label: "Page",     emoji: "📄" },
  { id: "panel",  label: "Réglages", emoji: "⚙️" },
] as const
export type MobileTabId = (typeof MOBILE_TABS)[number]["id"]

// ── Mode simple / expert (non destructif) ────────────────────────────────────
export type UxMode = "simple" | "expert"
export function resolveMode(expert: boolean): UxMode {
  return expert ? "expert" : "simple"
}

// ── Sections de réglages d'un bloc (taxonomie cible, §13 mission) ────────────
export interface SettingsSection {
  id: string
  label: string
  hint: string
  /** Vrai = visible seulement en mode expert. */
  advancedOnly: boolean
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "content",      label: "Contenu",      hint: "Textes, images, liens", advancedOnly: false },
  { id: "design",       label: "Design",       hint: "Couleurs, fond, bordure", advancedOnly: false },
  { id: "layout",       label: "Disposition",  hint: "Alignement, largeur, espacement", advancedOnly: false },
  { id: "interactions", label: "Interactions", hint: "Bouton d'action, lien, animation", advancedOnly: true },
  { id: "responsive",   label: "Mobile",       hint: "Ce qui s'affiche sur téléphone", advancedOnly: true },
  { id: "advanced",     label: "Avancé",       hint: "Réglages techniques", advancedOnly: true },
]

export function isAdvancedOnly(sectionId: string): boolean {
  return SETTINGS_SECTIONS.find(s => s.id === sectionId)?.advancedOnly ?? false
}

// Sections visibles selon le mode. Simple = essentiels ; expert = tout.
// Non destructif : le mode simple MASQUE (ne supprime pas) les sections avancées.
export function settingsSectionsForMode(mode: UxMode): SettingsSection[] {
  if (mode === "expert") return SETTINGS_SECTIONS
  return SETTINGS_SECTIONS.filter(s => !s.advancedOnly)
}

// ── Responsive : point de rupture aligné sur useIsMobile(1024) ───────────────
export const BUILDER_BREAKPOINT = 1024

export interface BuilderLayout {
  mode: "mobile" | "desktop"
  /** Sur mobile, une seule zone est visible à la fois (onglet actif). */
  singleColumn: boolean
  showLeftRail: boolean
  showRightPanel: boolean
  showBottomBar: boolean
}

export function resolveBuilderLayout(width: number, breakpoint: number = BUILDER_BREAKPOINT): BuilderLayout {
  const isMobile = width > 0 && width < breakpoint
  return {
    mode: isMobile ? "mobile" : "desktop",
    singleColumn: isMobile,
    showLeftRail: !isMobile,
    showRightPanel: !isMobile,
    showBottomBar: isMobile,
  }
}

// ── Sélection (simple + multi), pure ─────────────────────────────────────────
export function isSelected(id: string, selectedId: string | null, multiSelection: string[] = []): boolean {
  return id === selectedId || multiSelection.includes(id)
}

// Bascule un id dans une multi-sélection (Ctrl/Cmd+clic). Retourne un NOUVEAU tableau.
export function toggleMulti(multiSelection: string[], id: string): string[] {
  return multiSelection.includes(id)
    ? multiSelection.filter(x => x !== id)
    : [...multiSelection, id]
}

export function selectionCount(selectedId: string | null, multiSelection: string[] = []): number {
  const set = new Set(multiSelection)
  if (selectedId) set.add(selectedId)
  return set.size
}

// ── Glossaire anti-jargon (§19 mission) ──────────────────────────────────────
// Termes techniques → formulation simple. Utilisé en mode simple ; le mode expert
// peut afficher le terme technique entre parenthèses.
export const BUILDER_GLOSSARY: Record<string, string> = {
  "cta": "bouton d'action",
  "embed": "intégration",
  "slug": "adresse de la page",
  "breakpoint": "affichage mobile",
  "padding": "espace intérieur",
  "gap": "espacement",
  "drag and drop": "glisser pour déplacer",
  "draft": "brouillon",
  "preview": "aperçu",
  "layout": "disposition",
}

export function plainTerm(term: string): string {
  return BUILDER_GLOSSARY[term.toLowerCase().trim()] ?? term
}

// ── Actions contextuelles d'un bloc (§12 mission) ────────────────────────────
// Formalise la bottom-sheet existante (BuilderV4.tsx:2438-2445) en modèle pur, ordonné,
// avec drapeaux `danger`/`confirm`. La coquille rend ce modèle (icône/handler côté UI).
export type BlockActionId =
  | "moveUp" | "moveDown" | "duplicate" | "toggleVisible" | "toggleLock"
  | "toggleDraft" | "reset" | "copyStyle" | "settings" | "delete"

export interface BlockAction {
  id: BlockActionId
  label: string
  /** Action destructrice → l'UI doit confirmer avant exécution. */
  danger: boolean
  confirm: boolean
  /** Désactivée dans le contexte courant (ex. déplacer en position extrême, bloc verrouillé). */
  disabled: boolean
}

export interface BlockActionContext {
  index: number
  total: number
  mobile?: boolean
}

// Retourne les actions disponibles pour un bloc, dans l'ordre d'affichage. Respecte
// l'état verrouillé (les actions modifiantes sont désactivées, comme dans la coquille).
export function blockContextActions(block: Block, ctx: BlockActionContext): BlockAction[] {
  const locked = !!block.locked
  const atTop = ctx.index <= 0
  const atBottom = ctx.index >= ctx.total - 1
  const a = (id: BlockActionId, label: string, opts: Partial<BlockAction> = {}): BlockAction => ({
    id, label, danger: false, confirm: false, disabled: false, ...opts,
  })
  return [
    a("moveUp", "Monter", { disabled: locked || atTop }),
    a("moveDown", "Descendre", { disabled: locked || atBottom }),
    a("duplicate", "Dupliquer"),
    a("toggleVisible", block.visible ? "Masquer" : "Afficher"),
    a("toggleLock", locked ? "Déverrouiller" : "Verrouiller"),
    a("toggleDraft", block.draft ? "Retirer du brouillon" : "Mettre en brouillon", { disabled: locked }),
    a("copyStyle", "Copier le style", { disabled: locked }),
    a("settings", "Réglages"),
    a("reset", "Réinitialiser", { disabled: locked, confirm: true }),
    a("delete", "Supprimer", { danger: true, confirm: true, disabled: locked }),
  ]
}
