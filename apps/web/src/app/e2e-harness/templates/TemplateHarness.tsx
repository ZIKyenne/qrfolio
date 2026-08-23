"use client"
// Banc d'aperçu des MODÈLES (réservé aux tests, route gatée hors production).
// Rend un modèle complet avec le VRAI moteur d'affichage public — même composant que
// la page publiée — pour vérifier de bout en bout ce que verra un visiteur, et pour
// capturer des aperçus. `?t=<clé>` choisit le modèle ; sans clé, la liste s'affiche.
import PublicPageClient from "../../[slug]/PublicPageClient"
import { PAGE_TEMPLATES } from "../../dashboard/builder/page-templates"
import { normalizePageTheme } from "../../dashboard/builder/types"

export function TemplateHarness({ templateKey }: { templateKey?: string }) {
  const tpl = PAGE_TEMPLATES.find(t => t.key === templateKey)

  if (!tpl) {
    return (
      <div data-harness-list="true" style={{ padding: 24, background: "#080808", color: "#F5F0E8", minHeight: "100vh", fontFamily: "system-ui" }}>
        <p style={{ fontSize: 13, opacity: 0.7 }}>{PAGE_TEMPLATES.length} modèles — ajoutez ?t=&lt;clé&gt;</p>
        <ul style={{ fontSize: 12, lineHeight: 1.9 }}>
          {PAGE_TEMPLATES.map(t => (
            <li key={t.key} data-template-key={t.key}>
              <a href={`?t=${t.key}`} style={{ color: "#C9A84C" }}>{t.emoji} {t.group} — {t.label}</a>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const page = {
    id: "e2e-template",
    title: tpl.label,
    slug: "e2e-template",
    theme: normalizePageTheme(tpl.theme),
    total_views: 1284,
    profiles: { plan: "business", email: "demo@qrowg.com" },
  }
  const blocks = tpl.blocks.map((b, i) => ({
    id: `e2e-${i}`, type: b.type, content: b.content as any, visible: true,
  }))

  return (
    <div data-template={tpl.key}>
      <PublicPageClient page={page as any} blocks={blocks as any} showBranding={false} introEligible={false} />
      <p data-harness-end="true" style={{ padding: 8, fontSize: 10, opacity: 0.4, textAlign: "center" }}>— fin —</p>
    </div>
  )
}
