"use client"
// Banc d'essai de l'assistant de personnalisation (tests, route gatée hors production).
// Monte l'assistant sur un modèle réel, sans authentification ni création de page.
import { useState } from "react"
import TemplateWizardModal from "../../dashboard/templates/TemplateWizardModal"
import { PAGE_TEMPLATES } from "../../dashboard/builder/page-templates"
import { normalizePageTheme } from "../../dashboard/builder/types"

export function WizardHarness({ templateKey }: { templateKey?: string }) {
  const tpl = PAGE_TEMPLATES.find(t => t.key === templateKey) || PAGE_TEMPLATES[0]
  const [payload, setPayload] = useState<string>("")
  return (
    <div style={{ background: "#080808", minHeight: "100vh", color: "#F5F0E8", fontFamily: "system-ui" }}>
      <p data-harness-ready="true" style={{ padding: 10, fontSize: 11, opacity: 0.6 }}>{tpl.label}</p>
      {payload && <pre data-wizard-payload style={{ fontSize: 10, padding: 10, whiteSpace: "pre-wrap" }}>{payload}</pre>}
      <TemplateWizardModal
        templateName={tpl.label}
        templateEmoji={tpl.emoji}
        blocks={tpl.blocks as any}
        theme={normalizePageTheme(tpl.theme)}
        onClose={() => {}}
        onCreate={async p => { setPayload(JSON.stringify({ name: p.name, slug: p.slug, blocs: p.blocks.length }, null, 1)); return { ok: true } }}
      />
    </div>
  )
}
