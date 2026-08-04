// Construction PURE du payload de lead (B09.13, inactif). Reproduit EXACTEMENT le payload de
// LeadFormPublic : name/email/phone par clé canonique, message = message||project||subject,
// data = { label: valeur } des champs remplis. FILTRE les clés inconnues, nettoie et borne les
// longueurs. N'accepte JAMAIS ownerId/recipient/clé interne du client. Aucune mutation.
import type { SharedLeadFormModel } from "./formTypes"

export type LeadPayload = {
  pageId: string
  blockId?: string
  type: string
  name?: string
  email?: string
  phone?: string
  message?: string
  data: Record<string, string>
}

const MAX_SHORT = 500   // nom/email/tel/date/champs courts
const MAX_LONG = 5000   // message / textarea

function clean(v: unknown, max: number): string {
  if (typeof v !== "string") return ""
  return v.trim().slice(0, max)
}

export function buildLeadPayload(
  model: SharedLeadFormModel,
  values: Record<string, any>,
  pageId: string,
  blockId?: string,
): LeadPayload {
  // data : uniquement les champs DÉCLARÉS par le modèle (clés inconnues ignorées).
  const data: Record<string, string> = {}
  for (const f of model.fields) {
    const v = clean(values[f.key], f.area ? MAX_LONG : MAX_SHORT)
    if (v) data[f.label] = v
  }
  const byKey = (key: string, max: number): string | undefined => {
    const f = model.fields.find(x => x.key === key)
    if (!f) return undefined
    const v = clean(values[key], max)
    return v || undefined
  }
  const message = byKey("message", MAX_LONG) || byKey("project", MAX_LONG) || model.subject || undefined
  return {
    pageId, blockId, type: model.leadType,
    name: byKey("name", MAX_SHORT),
    email: byKey("email", MAX_SHORT),
    phone: byKey("phone", MAX_SHORT),
    message,
    data,
  }
}
