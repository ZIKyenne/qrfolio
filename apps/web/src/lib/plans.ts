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

export type PlanId = "free" | "starter" | "pro" | "business"

export type PlanLimits = {
  pages: number | null // null = illimité
  views: number | null
  qr: number | null
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
    description: "Pour découvrir QRowg",
    priceMonthly: 0,
    priceAnnual: 0,
    badge: null,
    limits: { pages: 3, views: 200, qr: 3, team: null },
    caps: { printStudio: false, qrStudioAdvanced: false, ai: false, removeBranding: false, pageIntro: false, exportFormats: ["png"] },
    features: ["3 pages", "200 vues/mois", "3 QR statiques + 2 dynamiques/mois", "Branding QRowg visible", "Analytics de base", "27 modèles gratuits"],
    perks: [
      { text: "3 pages", included: true },
      { text: "200 vues / mois", included: true },
      { text: "3 QR statiques permanents", included: true },
      { text: "2 QR dynamiques / mois (essai 30 j)", included: true },
      { text: "Hébergement inclus", included: true },
      { text: "Analytics de base", included: true },
      { text: "27 modèles gratuits", included: true },
      { text: "Branding QRowg visible", included: true },
      { text: "QR Studio", included: false },
      { text: "QR Print Studio", included: false },
      { text: "Génération IA", included: false },
    ],
  },
  starter: {
    id: "starter",
    label: "Starter",
    color: "#38BDF8",
    description: "Pour indépendants, artisans et créateurs",
    priceMonthly: 4.90,
    priceAnnual: 3.90,
    badge: "MEILLEUR RAPPORT Q/P",
    limits: { pages: 5, views: 850, qr: 7, team: null },
    caps: { printStudio: true, qrStudioAdvanced: true, ai: false, removeBranding: true, pageIntro: false, exportFormats: ["png"] },
    features: ["5 pages", "850 vues/mois", "7 QR codes personnalisés", "Sans branding", "10 templates premium", "QR Studio (limité)", "QR Print Studio (limité)"],
    perks: [
      { text: "5 pages", included: true },
      { text: "850 vues / mois", included: true },
      { text: "7 QR codes personnalisés", included: true },
      { text: "Branding QRowg retiré", included: true },
      { text: "Domaine personnalisé", included: false },
      { text: "Analytics standards", included: true },
      { text: "10 templates premium", included: true },
      { text: "QR Studio (version limitée)", included: true },
      { text: "QR Print Studio (version limitée)", included: true },
      { text: "Export PNG", included: true },
      { text: "Support standard", included: true },
      { text: "Génération IA", included: false },
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    color: "#C9A84C",
    description: "Le plan principal de QRowg",
    priceMonthly: 12.90,
    priceAnnual: 9.90,
    badge: "POPULAIRE",
    limits: { pages: 25, views: 15000, qr: 35, team: null },
    caps: { printStudio: true, qrStudioAdvanced: true, ai: true, removeBranding: true, pageIntro: true, exportFormats: ["png", "jpg", "pdf", "svg"] },
    features: ["25 pages", "15 000 vues/mois", "35 QR codes avancés", "Tous les templates", "QR Studio complet", "QR Print Studio complet", "Génération IA", "Export PNG / JPG / PDF HD"],
    perks: [
      { text: "25 pages", included: true },
      { text: "15 000 vues / mois", included: true },
      { text: "35 QR codes avancés", included: true },
      { text: "Domaine personnalisé", included: true },
      { text: "Branding retiré", included: true },
      { text: "Analytics avancés + export", included: true },
      { text: "Tous les templates", included: true },
      { text: "QR Studio complet", included: true },
      { text: "QR Print Studio complet", included: true },
      { text: "Génération IA + rapports IA", included: true },
      { text: "Export PNG / JPG / PDF HD", included: true },
      { text: "Bibliothèque premium", included: true },
      { text: "Styles avancés + aperçus premium", included: true },
      { text: "Accès API · 1 000 appels / mois", included: true },
      { text: "Support prioritaire", included: true },
    ],
  },
  business: {
    id: "business",
    label: "Business",
    color: "#39FF8F",
    description: "Agences, franchises et entreprises",
    priceMonthly: 29.90,
    priceAnnual: 24.90,
    badge: null,
    limits: { pages: null, views: null, qr: null, team: 5 },
    caps: { printStudio: true, qrStudioAdvanced: true, ai: true, removeBranding: true, pageIntro: true, exportFormats: ["png", "jpg", "pdf", "svg"] },
    features: ["Pages illimitées", "Vues illimitées", "QR codes illimités", "Génération IA illimitée", "Équipe · 5 membres", "Marque blanche", "Accès API"],
    perks: [
      { text: "Pages illimitées", included: true },
      { text: "Vues illimitées", included: true },
      { text: "QR codes avancés illimités", included: true },
      { text: "Domaine personnalisé", included: true },
      { text: "Branding retiré", included: true },
      { text: "Analytics avancés + export", included: true },
      { text: "Tous les templates", included: true },
      { text: "QR Studio complet", included: true },
      { text: "QR Print Studio complet", included: true },
      { text: "Génération IA illimitée + rapports", included: true },
      { text: "5 membres d'équipe", included: true },
      { text: "Marque blanche", included: true },
      { text: "Accès API · 10 000 appels / mois", included: true },
      { text: "Support 24/7 prioritaire", included: true },
    ],
  },
}

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "business"]
export const PLAN_LIST: Plan[] = PLAN_ORDER.map(id => PLANS[id])
export const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3 }

// Renvoie le plan (free par défaut si inconnu)
export const getPlan = (id?: string | null): Plan => PLANS[(id as PlanId)] ?? PLANS.free

// Limite de pages d'un plan (null = illimité) — utilisée par l'enforcement
export const pageLimit = (id?: string | null): number | null => getPlan(id).limits.pages

// Limite de QR instantanés enregistrés (null = illimité) — feature « QR instantané ».
export const qrLimit = (id?: string | null): number | null => getPlan(id).limits.qr

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
// Accès à l'API publique (clés qrk_ + endpoints /v1) : réservé Pro et Business.
export const canApi = (id?: string | null): boolean => PLAN_RANK[getPlan(id).id] >= PLAN_RANK.pro
export const canExport = (id: string | null | undefined, fmt: ExportFormat): boolean => getPlan(id).caps.exportFormats.includes(fmt)
// Plan minimum requis pour une capacité (pour les messages d'upsell)
export const minPlanFor = (cap: "printStudio" | "qrStudioAdvanced" | "ai"): PlanId => {
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
export const PLAN_COMPARISON: { feature: string; free: string; starter: string; pro: string; business: string }[] = [
  { feature: "Pages", free: "3", starter: "5", pro: "25", business: "Illimitées" },
  { feature: "Vues / mois", free: "200", starter: "850", pro: "15 000", business: "Illimitées" },
  { feature: "QR codes", free: "3 statiques + 2 dyn./mois", starter: "7 personnalisés", pro: "35 avancés", business: "Illimités" },
  { feature: "QR Studio", free: "—", starter: "Version limitée", pro: "Complet", business: "Complet" },
  { feature: "QR Print Studio", free: "—", starter: "Version limitée", pro: "Complet", business: "Complet" },
  { feature: "IA", free: "—", starter: "—", pro: "✓", business: "✓ illimité" },
  { feature: "Export HD", free: "—", starter: "PNG", pro: "PNG + JPG + PDF HD", business: "PNG + JPG + PDF HD" },
  { feature: "Templates", free: "6", starter: "10", pro: "Tous", business: "Tous" },
  { feature: "Branding QRowg", free: "Oui", starter: "Non", pro: "Non", business: "Non" },
  { feature: "Domaine perso", free: "—", starter: "—", pro: "✓", business: "✓" },
  { feature: "Analytics", free: "De base", starter: "Standard", pro: "Avancés + export", business: "Avancés + export" },
  { feature: "Équipe", free: "—", starter: "—", pro: "—", business: "5 membres" },
  { feature: "Marque blanche", free: "—", starter: "—", pro: "—", business: "✓" },
  { feature: "API", free: "—", starter: "—", pro: "1 000 / mois", business: "10 000 / mois" },
  { feature: "Support", free: "Communauté", starter: "Standard", pro: "Prioritaire", business: "24/7 VIP" },
]
