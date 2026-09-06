// submitLead.ts — enregistre une soumission de formulaire / RSVP en base (table leads)
// via la route serveur /api/leads. Volontairement SANS @supabase/supabase-js : ce
// helper est chargé sur toutes les pages publiques, l'importer ici embarquerait
// ~214 Ko de client Supabase dans le bundle de chaque page scannée.
import { qrSource } from "./qrSource"

export type LeadInput = {
  pageId: string
  blockId?: string
  type?: string          // quote | reservation | booking | register | rsvp | form
  name?: string
  email?: string
  phone?: string
  message?: string
  data?: Record<string, any>
}

export async function submitLead(input: LeadInput): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId: input.pageId, blockId: input.blockId, type: input.type || "form",
        name: input.name, email: input.email, phone: input.phone,
        message: input.message, data: input.data || {}, qrSource: qrSource(),
      }),
    })
    if (!res.ok) return false

    // Le propriétaire est prévenu par /api/leads lui-même, après l'insertion :
    // aucun appel public pour ça (l'ancienne route était un relais ouvert).

    // L'accusé de réception au visiteur part aussi de /api/leads : rien à appeler ici.
    return true
  } catch {
    return false
  }
}
