// =============================================================================
// lib/dynamicPlans.ts — SOURCE DE VÉRITÉ UNIQUE de l'offre « QR Dynamique »
// -----------------------------------------------------------------------------
// Abonnement DÉDIÉ (2e abonnement Stripe, indépendant des plans QRowg de
// lib/plans.ts). Gère les QR DYNAMIQUES (liens redirigés /q/<code>, modifiables,
// suivi des scans). Quota SÉPARÉ de limits.qr (QR statiques).
//
// Modèle décidé avec le propriétaire (révisé 2026-08-12) :
//  · 3 paliers payants : Basique / Pro / Business. Pas de gratuit permanent.
//  · Essai 30 JOURS PAR LIEN, limité à 2 PAR MOIS calendaire pour un compte
//    CONNECTÉ sans abonnement : un lien créé sans abonnement fonctionne 30 j puis
//    expire → moteur de conversion. Au-delà de 2/mois, création d'essai refusée.
//  · Le quota (3 / 25 / illimité) borne les liens PERMANENTS (sans expiration).
//    À la souscription, les liens d'essai actifs deviennent permanents dans la
//    limite du quota. En cas de dépassement (downgrade), les liens en trop (les
//    plus récents) passent EN PAUSE (réactivés si ré-upgrade), rien n'est supprimé.
//  · Scans illimités partout. Stats basiques pour tous, détaillées dès le Pro.
//
// ⚠️ Les PRIX réels vivent dans Stripe (env NEXT_PUBLIC_STRIPE_DYN_*_PRICE_ID).
// Ici c'est l'affichage : si tu changes un prix, change-le AUSSI dans Stripe.
// Fichier 100% données (aucun JSX / I/O) -> importable serveur, edge et client.
// =============================================================================

import { fmtPrice } from "./plans"

// "none" = aucun abonnement QR Dynamique (l'utilisateur ne peut créer que des
// liens d'ESSAI 30 j, max 2/mois). Les trois autres = paliers payants.
export type DynPlanId = "none" | "basique" | "pro" | "business"

// Fonctionnalités débloquées par palier (gating).
export type DynCaps = {
  detailedAnalytics: boolean // stats par jour / appareil / pays / heure (sinon total + dernier scan)
  brandedDomain: boolean     // lien court à la marque (ex. tamarque.link/abc)
  linkSecurity: boolean      // mot de passe + expiration programmée + activation/pause manuelle
  bulk: boolean              // génération en masse (import CSV) + dossiers
  apiTeam: boolean           // accès API + sièges d'équipe partagés
}

export interface DynPlan {
  id: DynPlanId
  label: string
  color: string
  description: string
  priceMonthly: number // € / mois (facturation mensuelle)
  priceAnnual: number  // € / mois (si facturé annuellement) = priceMonthly × 0,8 (−20 %)
  badge: string | null
  qrLimit: number | null // nb de liens PERMANENTS autorisés (null = illimité)
  caps: DynCaps
  features: string[] // liste courte (carte de palier)
  perks: { text: string; included: boolean; soon?: boolean }[] // liste détaillée (page d'upgrade)
}

// Essai gratuit par lien (jours). Source unique, réutilisée par l'API qr-instant.
export const DYN_TRIAL_DAYS = 30
// Nombre d'essais dynamiques gratuits par MOIS calendaire pour un compte sans
// abonnement « QR Dynamique ». Au-delà, la création d'un essai est refusée (upsell).
export const DYN_FREE_TRIALS_PER_MONTH = 2

const NONE_CAPS: DynCaps = { detailedAnalytics: false, brandedDomain: false, linkSecurity: false, bulk: false, apiTeam: false }

export const DYN_PLANS: Record<DynPlanId, DynPlan> = {
  none: {
    id: "none",
    label: "Sans abonnement",
    color: "#8A8478",
    description: "Essayez un lien dynamique 30 jours",
    priceMonthly: 0,
    priceAnnual: 0,
    badge: null,
    qrLimit: 0, // aucun lien permanent : seuls des essais 30 j (max 2/mois) sont possibles
    caps: NONE_CAPS,
    features: ["2 essais / mois", "Essai 30 jours par lien", "Le lien expire ensuite", "Stats basiques"],
    perks: [
      { text: "2 liens dynamiques en essai (30 j) par mois", included: true },
      { text: "Modifier la destination pendant l'essai", included: true },
      { text: "Liens permanents", included: false },
      { text: "Statistiques détaillées", included: false },
    ],
  },
  basique: {
    id: "basique",
    label: "Basique",
    color: "#38BDF8",
    description: "Pour garder quelques liens actifs en permanence",
    priceMonthly: 1.50,
    priceAnnual: 1.20, // 1,50 × 0,8
    badge: null,
    qrLimit: 3,
    caps: { ...NONE_CAPS },
    features: ["3 QR dynamiques permanents", "Scans illimités", "Modifier la destination", "Statistiques basiques"],
    perks: [
      { text: "3 QR dynamiques permanents", included: true },
      { text: "Scans illimités", included: true },
      { text: "Modifier la destination à volonté", included: true },
      { text: "Statistiques basiques (total, dernier scan)", included: true },
      { text: "Statistiques détaillées", included: false },
      { text: "Domaine de marque court", included: false },
      { text: "Sécurité du lien (mot de passe, expiration)", included: false },
      { text: "Génération en masse + API + équipe", included: false },
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    color: "#C9A84C",
    description: "Le palier principal — suivi fin et marque",
    priceMonthly: 5.90,
    priceAnnual: 4.72, // 5,90 × 0,8
    badge: "POPULAIRE",
    qrLimit: 25,
    caps: { detailedAnalytics: true, brandedDomain: true, linkSecurity: true, bulk: false, apiTeam: false },
    features: ["25 QR dynamiques permanents", "Scans illimités", "Statistiques détaillées", "Domaine de marque court", "Sécurité du lien"],
    perks: [
      { text: "25 QR dynamiques permanents", included: true },
      { text: "Scans illimités", included: true },
      { text: "Modifier la destination à volonté", included: true },
      { text: "Statistiques détaillées (jour, appareil, pays)", included: true },
      { text: "Domaine de marque court", included: true },
      { text: "Sécurité du lien (mot de passe, expiration, pause)", included: true },
      { text: "Génération en masse + API + équipe", included: false },
    ],
  },
  business: {
    id: "business",
    label: "Business",
    color: "#39FF8F",
    description: "Volume, automatisation et équipe",
    priceMonthly: 20.00,
    priceAnnual: 16.00, // 20,00 × 0,8
    badge: null,
    qrLimit: null, // illimité
    caps: { detailedAnalytics: true, brandedDomain: true, linkSecurity: true, bulk: true, apiTeam: true },
    features: ["QR dynamiques illimités", "Scans illimités", "Toutes les stats détaillées", "Génération en masse (CSV)", "API + sièges d'équipe"],
    perks: [
      { text: "QR dynamiques permanents illimités", included: true },
      { text: "Scans illimités", included: true },
      { text: "Statistiques détaillées (jour, appareil, pays)", included: true },
      { text: "Domaine de marque court", included: true },
      { text: "Sécurité du lien (mot de passe, expiration, pause)", included: true },
      { text: "Génération en masse (import CSV) + dossiers", included: true },
      { text: "Accès API", included: true },
      { text: "Sièges d'équipe partagés", included: true },
    ],
  },
}

// Ordre d'affichage des paliers PAYANTS (none exclu des grilles de prix).
export const DYN_PLAN_ORDER: DynPlanId[] = ["basique", "pro", "business"]
export const DYN_PAID_PLANS: DynPlan[] = DYN_PLAN_ORDER.map(id => DYN_PLANS[id])
// Rang pour comparer deux paliers (upgrade / downgrade / dépassement de quota).
export const DYN_PLAN_RANK: Record<DynPlanId, number> = { none: 0, basique: 1, pro: 2, business: 3 }

// Renvoie le palier (none par défaut si inconnu / non abonné).
export const getDynPlan = (id?: string | null): DynPlan => DYN_PLANS[(id as DynPlanId)] ?? DYN_PLANS.none

// Quota de liens PERMANENTS d'un palier (null = illimité, 0 = aucun -> essai seul).
export const dynQrLimit = (id?: string | null): number | null => getDynPlan(id).qrLimit

// true = l'utilisateur a un abonnement QR Dynamique payant actif.
export const isDynSubscribed = (id?: string | null): boolean => getDynPlan(id).id !== "none"

// Capacités (gating fonctionnalités) d'un palier.
export const dynCaps = (id?: string | null): DynCaps => getDynPlan(id).caps
export const canDynDetailedAnalytics = (id?: string | null): boolean => getDynPlan(id).caps.detailedAnalytics
export const canDynBrandedDomain = (id?: string | null): boolean => getDynPlan(id).caps.brandedDomain
export const canDynLinkSecurity = (id?: string | null): boolean => getDynPlan(id).caps.linkSecurity
export const canDynBulk = (id?: string | null): boolean => getDynPlan(id).caps.bulk
export const canDynApiTeam = (id?: string | null): boolean => getDynPlan(id).caps.apiTeam

// Palier minimum requis pour une capacité (messages d'upsell).
export const minDynPlanFor = (cap: keyof DynCaps): DynPlanId =>
  DYN_PAID_PLANS.find(p => p.caps[cap])?.id ?? "business"

// Décide si un NOUVEAU lien dynamique doit être PERMANENT (sans expiration) ou en
// ESSAI 30 j. Permanent seulement si l'utilisateur est abonné ET sous son quota de
// liens permanents. Non abonné (none, quota 0) -> toujours en essai.
// `currentPermanent` = nombre de liens permanents déjà actifs pour cet utilisateur.
export function dynCanCreatePermanent(planId: string | null | undefined, currentPermanent: number): boolean {
  const lim = dynQrLimit(planId)
  if (lim === null) return true          // illimité (Business)
  return currentPermanent < lim          // sous le quota (none: 0 -> toujours false)
}

// Prix affiché d'un palier selon la périodicité (€ / mois). Réutilise fmtPrice (FR, TTC).
export const dynMonthlyLabel = (id: DynPlanId, annual: boolean): string =>
  fmtPrice(annual ? getDynPlan(id).priceAnnual : getDynPlan(id).priceMonthly)
// Total facturé à l'année (€) pour un palier = priceAnnual (€/mois) × 12.
export const dynAnnualTotal = (id: DynPlanId): number => +(getDynPlan(id).priceAnnual * 12).toFixed(2)
export const dynAnnualTotalLabel = (id: DynPlanId): string => fmtPrice(dynAnnualTotal(id))
