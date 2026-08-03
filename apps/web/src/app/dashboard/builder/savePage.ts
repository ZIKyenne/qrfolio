// savePage.ts — persistance PURE d'un snapshot de page vers Supabase.
// Extrait de BuilderV4 pour deux raisons :
//   1) vérifier CHAQUE erreur Supabase (aucun échec silencieux → aucun faux succès) ;
//   2) rendre la persistance testable avec un client mocké (voir savePage.test.ts).
// Ce module ne lit AUCUN état React : il reçoit un snapshot IMMUABLE + un client.
// La stratégie « conserve les IDs » (upsert onConflict id, puis delete des absents)
// est préservée à l'identique — seule la vérification d'erreurs est renforcée.

// Forme minimale d'un bloc côté éditeur (compatible avec le type Block du builder).
export type SaveBlock = {
  id: string
  type: string
  content: Record<string, any>
  visible: boolean
  draft?: boolean
  locked?: boolean
}

// Snapshot immuable d'une page à persister. Construit AVANT le premier appel réseau,
// puis passé tel quel : une sauvegarde ne relit jamais d'état mouvant en cours de route.
export type PageSnapshot = {
  liveId: string
  pageName: string
  theme: unknown
  blocks: SaveBlock[]
}

// Interface minimale du client Supabase réellement utilisée ici. Permet un mock
// lisible en test sans dépendre du type complet @supabase/supabase-js.
export type SupabaseLike = { from(table: string): any }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Relance une erreur Supabase comme Error en PRÉSERVANT `code`/`status` : le coordinateur
// la garde telle quelle (instanceof Error), et l'UI peut la classer finement (réseau,
// RLS, validation…) au lieu d'afficher le message brut. `stage` situe l'étape échouée.
function asError(e: any, stage: string): Error {
  const err = new Error(typeof e?.message === "string" ? e.message : "Erreur de sauvegarde")
  ;(err as any).code = e?.code
  ;(err as any).status = e?.status
  ;(err as any).stage = stage
  return err
}

// Ligne `blocks` pour le chemin moderne (conserve l'UUID). draft/locked/visible n'ont
// PAS de colonne dédiée → persistés dans content sous des clés réservées « __ ».
export function blockToRow(b: SaveBlock, i: number, pageId: string) {
  return {
    id: b.id,
    page_id: pageId,
    type: b.type,
    position: i,
    content: { ...b.content, __draft: b.draft || false, __locked: b.locked || false, __visible: b.visible !== false },
    is_visible: b.visible && !b.draft,
    styles: {},
  }
}

// Persiste le snapshot. Rejette (throw) à la MOINDRE erreur Supabase : l'appelant
// (contrôleur de sauvegarde) considère alors la sauvegarde entière comme échouée et
// garde l'état « non enregistré » — jamais de succès partiel présenté comme complet.
export async function persistSnapshot(supabase: SupabaseLike, snap: PageSnapshot): Promise<void> {
  // 1) Page (titre + thème). L'erreur DOIT être vérifiée (l'ancien code l'ignorait).
  const { error: pageErr } = await supabase.from("pages").update({ title: snap.pageName, theme: snap.theme }).eq("id", snap.liveId)
  if (pageErr) throw asError(pageErr, "page_update")

  const allUuid = snap.blocks.every(b => UUID_RE.test(b.id))
  if (allUuid) {
    // Chemin moderne : upsert D'ABORD (le contenu est toujours écrit), PUIS suppression
    // des blocs absents du snapshot via une liste d'IDs explicite.
    const rows = snap.blocks.map((b, i) => blockToRow(b, i, snap.liveId))
    const keep = new Set(snap.blocks.map(b => b.id))
    if (rows.length) {
      const { error } = await supabase.from("blocks").upsert(rows, { onConflict: "id" })
      if (error) throw asError(error, "block_upsert")
    }
    const { data: existing, error: readErr } = await supabase.from("blocks").select("id").eq("page_id", snap.liveId)
    if (readErr) throw asError(readErr, "block_read")
    const toDelete = (existing || []).map((r: any) => r.id).filter((id: string) => !keep.has(id))
    // Suppression ciblée par liste d'IDs. Le "purge par page_id" n'est autorisé QUE si le
    // snapshot est réellement vide (l'utilisateur a tout supprimé) — jamais par défaut.
    if (toDelete.length) {
      const { error } = await supabase.from("blocks").delete().in("id", toDelete)
      if (error) throw asError(error, "block_delete")
    } else if (!rows.length) {
      const { error } = await supabase.from("blocks").delete().eq("page_id", snap.liveId)
      if (error) throw asError(error, "block_delete_all")
    }
  } else {
    // Repli (IDs legacy non-UUID) : delete-all + insert. Les IDs deviennent UUID au
    // prochain chargement. On vérifie désormais aussi l'erreur du delete.
    const { error: delErr } = await supabase.from("blocks").delete().eq("page_id", snap.liveId)
    if (delErr) throw asError(delErr, "legacy_delete")
    if (snap.blocks.length > 0) {
      const rows = snap.blocks.map((b, i) => ({
        page_id: snap.liveId, type: b.type, position: i,
        content: { ...b.content, __draft: b.draft || false, __locked: b.locked || false, __visible: b.visible !== false },
        is_visible: b.visible && !b.draft, styles: {},
      }))
      const { error } = await supabase.from("blocks").insert(rows)
      if (error) throw asError(error, "legacy_insert")
    }
  }
}
