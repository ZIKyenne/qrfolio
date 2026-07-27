// Helpers Équipe (serveur). Le « workspace » est le compte du propriétaire
// (teams.owner_id) ; les membres accèdent à son contenu via la RLS (Phase 2).
import type { SupabaseClient } from "@supabase/supabase-js"
import { slugifyBase } from "@/lib/slug"

export type TeamRole = "owner" | "admin" | "editor" | "viewer"
export const ROLE_RANK: Record<TeamRole, number> = { owner: 3, admin: 2, editor: 1, viewer: 0 }
export const roleAtLeast = (role: TeamRole | null | undefined, min: TeamRole): boolean =>
  role ? ROLE_RANK[role] >= ROLE_RANK[min] : false

// Rôles assignables à un membre invité (jamais « owner » ni « viewer » dans ce MVP).
export const ASSIGNABLE_ROLES: TeamRole[] = ["editor", "admin"]

// L'équipe possédée par l'utilisateur (créée à la demande). `admin` = client service-role.
export async function getOrCreateOwnTeam(admin: SupabaseClient, userId: string, name: string) {
  const { data: existing } = await admin.from("teams").select("*").eq("owner_id", userId).limit(1).maybeSingle()
  if (existing) return existing as any

  const base = slugifyBase(name) || "equipe"
  let slug = base
  for (let i = 1; ; i++) {
    const { data: taken } = await admin.from("teams").select("id").eq("slug", slug).maybeSingle()
    if (!taken) break
    slug = `${base}-${i}`
  }
  const { data: created, error } = await admin
    .from("teams")
    .insert({ owner_id: userId, name: name || "Mon équipe", slug })
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  return created as any
}

// Équipe « primaire » de l'utilisateur : celle qu'il possède, sinon celle dont il
// est membre, sinon on crée la sienne. Donne un contexte d'équipe unique et
// cohérent (le propriétaire gère la sienne ; un membre voit celle du propriétaire).
export async function getPrimaryTeam(admin: SupabaseClient, userId: string, name: string) {
  const { data: owned } = await admin.from("teams").select("*").eq("owner_id", userId).limit(1).maybeSingle()
  if (owned) return owned as any
  const { data: mem } = await admin.from("team_members").select("teams(*)").eq("user_id", userId).limit(1).maybeSingle()
  if ((mem as any)?.teams) return (mem as any).teams
  return getOrCreateOwnTeam(admin, userId, name)
}

// IDs des propriétaires dont `userId` peut voir le contenu : lui-même + les
// propriétaires des équipes dont il est membre. À utiliser dans les listings
// (.in("user_id", ids)) pour que les membres voient le contenu partagé.
// Marche avec le client authentifié (la RLS autorise la lecture de ses propres
// team_members + des teams où il est membre).
export async function accessibleOwnerIds(client: SupabaseClient, userId: string): Promise<string[]> {
  const ids = new Set<string>([userId])
  const { data } = await client.from("team_members").select("teams(owner_id)").eq("user_id", userId)
  for (const r of data ?? []) {
    const o = (r as any).teams?.owner_id
    if (o) ids.add(o)
  }
  return [...ids]
}

// Rôle de `userId` dans l'équipe `team` : owner (propriétaire) ou rôle de membre.
export async function resolveRole(admin: SupabaseClient, team: { id: string; owner_id: string }, userId: string): Promise<TeamRole | null> {
  if (team.owner_id === userId) return "owner"
  const { data } = await admin.from("team_members").select("role").eq("team_id", team.id).eq("user_id", userId).maybeSingle()
  return (data?.role as TeamRole) ?? null
}
