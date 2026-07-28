// submitLead.ts — enregistre une soumission de formulaire / RSVP en base (table leads)
// via la route serveur /api/leads. Volontairement SANS @supabase/supabase-js : ce
// helper est chargé sur toutes les pages publiques, l'importer ici embarquerait
// ~214 Ko de client Supabase dans le bundle de chaque page scannée.

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
        message: input.message, data: input.data || {},
      }),
    })
    if (!res.ok) return false

    // Notifie le propriétaire par email (fire-and-forget, l'email est résolu côté serveur)
    fetch("/api/emails/new-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId: input.pageId, type: input.type || "form",
        name: input.name, email: input.email, phone: input.phone,
        message: input.message, data: input.data || {},
      }),
    }).catch(() => {})

    // Accusé de réception au visiteur si son email est fourni (fire-and-forget)
    if (input.email) {
      fetch("/api/emails/lead-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: input.pageId, type: input.type || "form", email: input.email, name: input.name }),
      }).catch(() => {})
    }

    return true
  } catch {
    return false
  }
}
