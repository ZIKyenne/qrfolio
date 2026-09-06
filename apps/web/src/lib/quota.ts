// Modèle de quota QRowg.
//
// Deux limites DISTINCTES :
//  1) Plafond anti-abus : un utilisateur peut CRÉER jusqu'à MAX_PAGES pages,
//     quel que soit son plan. La création n'est jamais bloquée par le plan.
//  2) Quota du plan (pageLimit) : ne compte QUE les QR DE PAGE ACTIFS (= visitables
//     au scan). Une page = un QR de page, d'où le partage du quota `pages`. Un QR en
//     pause (orange) ou en brouillon (rouge, non publié) ne consomme aucun slot.
//     Activer un QR au-delà du quota est refusé ; il faut d'abord en mettre un autre
//     en pause. À ne pas confondre avec `limits.qr`, qui borne les QR AUTONOMES
//     (instant_qrs) — un lien, un Wi-Fi, un contact, sans page derrière.
//
// L'axe de visibilité est `qr_codes.status` (lu par /q/[code]) : active = vert
// = visitable, paused = orange, draft = rouge = non publié.

import { pageLimit } from "./plans"

// Plafond dur de pages créées par utilisateur (indépendant du plan).
export const MAX_PAGES = 300

// Un QR compte comme actif s'il est explicitement 'active' OU si son statut est
// NULL (lignes historiques d'avant la machine à états : elles étaient visitables).
export const ACTIVE_QR_FILTER = "status.eq.active,status.is.null"

// Nombre de QR actifs (= slots du plan consommés) pour un utilisateur.
export async function countActiveQrs(supabase: any, userId: string): Promise<number> {
  const { count } = await supabase
    .from("qr_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .or(ACTIVE_QR_FILTER)
  return count ?? 0
}

// Nombre total de pages (pour le plafond MAX_PAGES).
export async function countPages(supabase: any, userId: string): Promise<number> {
  const { count } = await supabase
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
  return count ?? 0
}

// Nombre de QR AUTONOMES enregistrés — statiques ET modifiables. Consomme le quota
// `limits.qr` du plan. Distinct des QR de page (`qr_codes`, bornés par le quota de
// pages) : ce sont deux choses différentes, et les avoir toutes deux appelées « QR »
// dans l'interface est ce qui rendait l'écran incompréhensible.
export async function countInstantQrs(supabase: any, userId: string): Promise<number> {
  const { count } = await supabase
    .from("instant_qrs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
  return count ?? 0
}

// Nombre de QR MODIFIABLES après impression actuellement actifs — consomme le
// sous-quota `limits.dyn`. Il n'y a plus d'essai de 30 jours : un QR collé sur une
// table ne doit pas mourir. Le plan donne un nombre de QR modifiables, point.
export async function countDynamicQrs(supabase: any, userId: string): Promise<number> {
  const { count } = await supabase
    .from("instant_qrs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("dynamic", true)
    .eq("status", "active")
  return count ?? 0
}

// Statut initial d'un nouveau QR : actif si le quota du plan le permet, sinon
// brouillon (créé quand même, mais non visitable tant qu'un slot n'est pas libéré).
export async function initialQrStatus(
  supabase: any,
  userId: string,
  plan?: string | null,
): Promise<"active" | "draft"> {
  const limit = pageLimit(plan)
  if (limit === null) return "active" // plan sans limite d'actifs
  const active = await countActiveQrs(supabase, userId)
  return active >= limit ? "draft" : "active"
}
