// =============================================================================
// lib/plans.ts — SOURCE DE VÉRITÉ UNIQUE des plans QRowg
// -----------------------------------------------------------------------------
// Tout ce qui concerne les plans (prix, limites, features) vit ICI.
// Les pages (dashboard/profil, /upgrade, landing) et l'enforcement (création de
// pages, API) doivent importer depuis ce fichier — ne PAS redéfinir ailleurs.
//
// Fichier 100% données (aucun JSX / icône) -> importable côté serveur, edge et
// client sans risque. Les icônes restent dans les composants d'UI.
//
// ⚠️ Les PRIX réels sont définis dans Stripe. Ici c'est l'affichage : si tu
// changes un prix, change-le AUSSI dans Stripe (env NEXT_PUBLIC_STRIPE_*_PRICE_ID).
// =============================================================================

// Trois paliers, pas quatre. « Starter » à 4,90 € est retiré : trois paliers
// payants pour zéro client, c'est trois fois plus de support, une décision de
// plus à prendre pour l'acheteur — et un prix qui disait « ce n'est pas sérieux »
// à un commerçant qui paie sa caisse 60 € par mois.
export type PlanId = "free" | "pro" | "business"

export type PlanLimits = {
  pages: number | null // null = illimité
  /**
   * Vues mensuelles. TOUJOURS `null` désormais.
   *
   * Un QR est IMPRIMÉ : il est collé sur une table, une vitrine, un flyer. Écrire
   * « 200 vues / mois » sur la grille tarifaire, c'est promettre au commerçant que
   * son sticker cessera de fonctionner s'il marche trop bien — le contraire de ce
   * qu'on lui vend. Le champ reste pour ne pas casser les écrans qui le lisent.
   */
  views: number | null
  qr: number | null    // QR autonomes enregistrés (hors QR de page) : statiques ET modifiables
  dyn: number | null   // ...dont MODIFIABLES après impression (sous-ensemble de `qr`)
  team: number | null
}

export type ExportFormat = "png" | "jpg" | "pdf" | "svg"

// Capacités (fonctionnalités débloquées) par plan — utilisées pour le gating
export type PlanCaps = {
  printStudio: boolean      // accès à QR Print Studio (éditeur imprimables)
  qrStudioAdvanced: boolean // personnalisation QR avancée (couleurs / modules / coins)
  ai: boolean               // génération + rapports IA
  removeBranding: boolean   // retire le "Créé avec QRowg" des pages publiques
  pageIntro: boolean        // animation d'entrée personnalisée sur la page publique
  exportFormats: ExportFormat[]
  // ── QR modifiables après impression ────────────────────────────────────────
  // Ces quatre capacités venaient d'un SECOND abonnement (lib/dynamicPlans.ts),
  // avec ses propres paliers « Pro » et « Business » à d'autres prix. Deux grilles
  // homonymes sur le même écran : personne ne pouvait dire de quel « Pro » on
  // parlait. Fondues ici, il n'y a plus qu'un abonnement et qu'un seul « Pro ».
  dynStatsDetaillees: boolean // stats par jour / appareil / pays (sinon total + dernier scan)
  dynDomaineMarque: boolean   // lien court à la marque du commerçant
  dynSecuriteLien: boolean    // mot de passe, expiration programmée, pause manuelle
  dynEnMasse: boolean         // création en masse par import CSV
}

export interface Plan {
  id: PlanId
  label: string
  color: string
  description: string
  priceMonthly: number // € / mois (facturation mensuelle)
  priceAnnual: number  // € / mois (si facturé annuellement)
  badge: string | null
  limits: PlanLimits
  caps: PlanCaps
  features: string[] // liste courte (carte plan du dashboard)
  perks: { text: string; included: boolean; soon?: boolean }[] // liste détaillée (page /upgrade) ; soon = feature promise mais pas encore construite
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Gratuit",
    color: "#8A8478",
    description: "Un support, pour de vrai",
    priceMonthly: 0,
    priceAnnual: 0,
    badge: null,
    limits: { pages: 1, views: null, qr: 3, dyn: 1, team: null },
    caps: { printStudio: false, qrStudioAdvanced: false, ai: false, removeBranding: false, pageIntro: false, exportFormats: ["png"],
            dynStatsDetaillees: false, dynDomaineMarque: false, dynSecuriteLien: false, dynEnMasse: false },
    features: ["1 page", "Vues illimitées", "3 QR autonomes, dont 1 modifiable", "Branding QRowg visible", "Analytics de base"],
    perks: [
      { text: "1 page publiée", included: true },
      { text: "Vues illimitées — un QR imprimé ne s'arrête jamais", included: true },
      { text: "3 QR autonomes", included: true },
      { text: "1 QR modifiable après impression", included: true },
      { text: "Hébergement inclus", included: true },
      { text: "Analytics de base", included: true },
      { text: "Branding QRowg visible", included: true },
      { text: "QR Print Studio", included: false },
      { text: "Domaine personnalisé", included: false },
      { text: "Génération IA", included: false },
    ],
  },
  pro: {
    id: "pro",
    label: "Établissement",
    color: "#C9A84C",
    description: "Un commerce, tout ce qu'il lui faut",
    priceMonthly: 19,
    priceAnnual: 12.42,   // 149 € l'année — un commerçant préfère une facture à un prélèvement de plus
    badge: "LE PLUS CHOISI",
    limits: { pages: 10, views: null, qr: 30, dyn: 20, team: null },
    caps: { printStudio: true, qrStudioAdvanced: true, ai: true, removeBranding: true, pageIntro: true, exportFormats: ["png", "jpg", "pdf", "svg"],
            dynStatsDetaillees: true, dynDomaineMarque: true, dynSecuriteLien: true, dynEnMasse: false },
    features: ["10 pages", "Vues illimitées", "30 QR, dont 20 modifiables après impression", "Sans branding", "QR Print Studio complet", "Domaine personnalisé", "Statistiques détaillées"],
    perks: [
      { text: "10 pages — de quoi couvrir un commerce entier", included: true },
      { text: "Vues illimitées", included: true },
      { text: "30 QR autonomes, dont 20 modifiables après impression", included: true },
      { text: "Changer la destination sans réimprimer", included: true },
      { text: "Statistiques détaillées : jour, appareil, pays", included: true },
      { text: "Mot de passe et expiration sur un lien", included: true },
      { text: "Branding QRowg retiré", included: true },
      { text: "Domaine personnalisé", included: true },
      { text: "QR Studio complet", included: true },
      { text: "QR Print Studio complet", included: true },
      { text: "Tous les modèles", included: true },
      { text: "Génération IA + rapports", included: true },
      { text: "Export PNG / JPG / PDF HD / SVG", included: true },
      { text: "Accès API · 1 000 appels / mois", included: true },
      { text: "Support prioritaire", included: true },
    ],
  },
  business: {
    id: "business",
    label: "Multi-sites",
    color: "#39FF8F",
    description: "Plusieurs établissements, une agence, une franchise",
    priceMonthly: 49,
    priceAnnual: 40.83,   // 490 € l'année
    badge: null,
    limits: { pages: null, views: null, qr: null, dyn: null, team: 5 },
    caps: { printStudio: true, qrStudioAdvanced: true, ai: true, removeBranding: true, pageIntro: true, exportFormats: ["png", "jpg", "pdf", "svg"],
            dynStatsDetaillees: true, dynDomaineMarque: true, dynSecuriteLien: true, dynEnMasse: true },
    features: ["Jusqu'à 5 établissements", "Pages et QR illimités", "Import CSV en masse", "Équipe · 5 membres", "Marque blanche", "API"],
    perks: [
      { text: "Pages illimitées", included: true },
      { text: "QR autonomes et modifiables illimités", included: true },
      { text: "Création en masse par import CSV", included: true },
      { text: "5 membres d'équipe", included: true },
      { text: "Marque blanche", included: true },
      { text: "Domaine personnalisé", included: true },
      { text: "Statistiques détaillées + export", included: true },
      { text: "QR Studio et Print Studio complets", included: true },
      { text: "Génération IA illimitée + rapports", included: true },
      { text: "Accès API · 10 000 appels / mois", included: true },
      { text: "Support prioritaire", included: true },
    ],
  },
}

export const PLAN_ORDER: PlanId[] = ["free", "pro", "business"]
export const PLAN_LIST: Plan[] = PLAN_ORDER.map(id => PLANS[id])
// `starter` reste connu du classement : un compte hérité de l'ancienne grille ne
// doit pas se retrouver rétrogradé au gratuit. Il est traité comme un Établissement.
export const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, business: 2, starter: 1 }

// Renvoie le plan (free par défaut si inconnu)
export const getPlan = (id?: string | null): Plan =>
  id === "starter" ? PLANS.pro : (PLANS[(id as PlanId)] ?? PLANS.free)

// Limite de pages d'un plan (null = illimité) — utilisée par l'enforcement
export const pageLimit = (id?: string | null): number | null => getPlan(id).limits.pages

// Limite de QR autonomes enregistrés, statiques ET modifiables (null = illimité).
export const qrLimit = (id?: string | null): number | null => getPlan(id).limits.qr

// Combien de ces QR peuvent être MODIFIABLES après impression (null = illimité).
// Sous-ensemble de `qrLimit` : un QR modifiable consomme aussi un slot de `qr`.
export const dynLimit = (id?: string | null): number | null => getPlan(id).limits.dyn

// Équipe : nombre de membres invitables (null = fonctionnalité indisponible sur ce plan).
export const teamLimit = (id?: string | null): number | null => getPlan(id).limits.team
export const canTeam = (id?: string | null): boolean => (getPlan(id).limits.team ?? 0) > 0

// Capacités d'un plan (gating fonctionnalités)
export const caps = (id?: string | null): PlanCaps => getPlan(id).caps
export const canPrintStudio = (id?: string | null): boolean => getPlan(id).caps.printStudio
export const canQrAdvanced = (id?: string | null): boolean => getPlan(id).caps.qrStudioAdvanced
export const canAI = (id?: string | null): boolean => getPlan(id).caps.ai
// true = le plan retire le branding "Créé avec QRowg" des pages publiques
export const canRemoveBranding = (id?: string | null): boolean => getPlan(id).caps.removeBranding
export const canPageIntro = (id?: string | null): boolean => getPlan(id).caps.pageIntro
// QR modifiables après impression : les quatre capacités de l'ancien second abonnement.
export const canDynStats = (id?: string | null): boolean => getPlan(id).caps.dynStatsDetaillees
export const canDynDomaine = (id?: string | null): boolean => getPlan(id).caps.dynDomaineMarque
export const canDynSecurite = (id?: string | null): boolean => getPlan(id).caps.dynSecuriteLien
export const canDynMasse = (id?: string | null): boolean => getPlan(id).caps.dynEnMasse
// Accès à l'API publique (clés qrk_ + endpoints /v1) : réservé Pro et Business.
export const canApi = (id?: string | null): boolean => PLAN_RANK[getPlan(id).id] >= PLAN_RANK.pro
export const canExport = (id: string | null | undefined, fmt: ExportFormat): boolean => getPlan(id).caps.exportFormats.includes(fmt)
// Plan minimum requis pour une capacité (pour les messages d'upsell)
export const minPlanFor = (cap: "printStudio" | "qrStudioAdvanced" | "ai" | "dynStatsDetaillees" | "dynDomaineMarque" | "dynSecuriteLien" | "dynEnMasse"): PlanId => {
  const found = PLAN_LIST.find(p => p.caps[cap])
  return (found?.id ?? "pro")
}
export const minPlanForFormat = (fmt: ExportFormat): PlanId => {
  const found = PLAN_LIST.find(p => p.caps.exportFormats.includes(fmt))
  return (found?.id ?? "pro")
}

// Formatte un prix TTC pour l'affichage FR : 0 -> "0", 4.9 -> "4,90", 12.9 -> "12,90".
// Les prix affiches sont TTC (cible B2C : indispensable legalement en France).
export const fmtPrice = (n: number): string =>
  n === 0 ? "0" : n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Tableau comparatif (page /upgrade + comparaisons)
export const PLAN_COMPARISON: { feature: string; free: string; pro: string; business: string }[] = [
  { feature: "Pages", free: "1", pro: "10", business: "Illimitées" },
  { feature: "Vues / mois", free: "Illimitées", pro: "Illimitées", business: "Illimitées" },
  { feature: "QR autonomes", free: "3", pro: "30", business: "Illimités" },
  { feature: "…dont modifiables après impression", free: "1", pro: "20", business: "Illimités" },
  { feature: "Changer la destination sans réimprimer", free: "1 QR", pro: "20 QR", business: "Illimité" },
  { feature: "QR Studio", free: "—", pro: "Complet", business: "Complet" },
  { feature: "QR Print Studio", free: "—", pro: "Complet", business: "Complet" },
  { feature: "Statistiques", free: "De base", pro: "Détaillées + export", business: "Détaillées + export" },
  { feature: "Mot de passe · expiration d'un lien", free: "—", pro: "✓", business: "✓" },
  { feature: "Import CSV en masse", free: "—", pro: "—", business: "✓" },
  { feature: "IA", free: "—", pro: "✓", business: "✓ illimité" },
  { feature: "Export HD", free: "PNG", pro: "PNG + JPG + PDF HD + SVG", business: "PNG + JPG + PDF HD + SVG" },
  { feature: "Modèles", free: "27 gratuits", pro: "Tous", business: "Tous" },
  { feature: "Branding QRowg", free: "Oui", pro: "Non", business: "Non" },
  { feature: "Domaine perso", free: "—", pro: "✓", business: "✓" },
  { feature: "Équipe", free: "—", pro: "—", business: "5 membres" },
  { feature: "Marque blanche", free: "—", pro: "—", business: "✓" },
  { feature: "API", free: "—", pro: "1 000 / mois", business: "10 000 / mois" },
  { feature: "Support", free: "Communauté", pro: "Prioritaire", business: "Prioritaire" },
]
