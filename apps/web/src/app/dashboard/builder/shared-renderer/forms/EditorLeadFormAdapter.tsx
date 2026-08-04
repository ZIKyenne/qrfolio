"use client"
// Adapter ÉDITEUR de formulaire (B09.13, INACTIF — non câblé à editorRegistry). Rend un APERÇU
// non soumis : champs en lecture seule, mention d'aperçu, aucun honeypot, aucune soumission
// réseau, aucun faux succès, aucune collecte de donnée. Aucune saisie ne peut devenir un lead.
import { SharedLeadFormView } from "./SharedLeadFormView"
import type { SharedLeadFormModel } from "./formTypes"

export const EDITOR_FORM_PREVIEW_NOTICE = "Aperçu du formulaire — aucune donnée ne sera envoyée"

export function EditorLeadFormAdapter({ model, idPrefix, TEXT, MUTED, accent }: {
  model: SharedLeadFormModel; idPrefix: string; TEXT: string; MUTED: string; accent: string
}) {
  return (
    <SharedLeadFormView
      model={model} values={{}} status="idle" idPrefix={idPrefix} readOnly
      previewNotice={EDITOR_FORM_PREVIEW_NOTICE} TEXT={TEXT} MUTED={MUTED} accent={accent}
    />
  )
}
