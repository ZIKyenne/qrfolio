"use server"

// Action serveur de publication : passe la page en "published" (RLS = propriété/accès
// vérifiés) PUIS revalide le cache ISR de la page publique (revalidate=60) pour que la
// nouvelle version soit visible immédiatement. La logique métier vit dans publish.ts
// (pure, testée) ; ce fichier n'ajoute que l'authentification + la revalidation.

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { persistPublishedStatus } from "./publish"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function publishPage(pageId: string): Promise<{ ok: boolean; publishedAt?: string; alreadyPublished?: boolean; message?: string }> {
  if (!UUID_RE.test(pageId)) return { ok: false, message: "Page invalide." }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Vous devez être connecté pour publier." }

  const res = await persistPublishedStatus(supabase, pageId, new Date().toISOString())
  if (!res.ok) return { ok: false, message: res.message }

  // Invalide le cache ISR de la page publique. Le slug provient de la ligne lue via RLS
  // (jamais du client) → aucun chemin arbitraire, aucune injection de path.
  try { revalidatePath(`/${res.slug}`) } catch {}

  return { ok: true, publishedAt: res.publishedAt, alreadyPublished: res.alreadyPublished }
}
