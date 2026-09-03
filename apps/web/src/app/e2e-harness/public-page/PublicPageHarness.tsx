"use client"

// Harness de la PAGE PUBLIÉE. Rend le vrai `PublicPageClient` — pas une
// approximation — avec les blocs et le thème d'un des modèles de la galerie.
// `?t=<clé du modèle>` choisit lequel ; sans paramètre, le premier.
//
// L'identifiant de page est volontairement « e2e-harness », qui n'est pas un
// UUID : les appels de mesure d'audience partent bien (le vrai code s'exécute)
// mais l'API les rejette, donc aucune ligne parasite en base.

import PublicPageClient from "@/app/[slug]/PublicPageClient"
import { PAGE_TEMPLATES } from "@/app/dashboard/builder/page-templates"
import { normalizePageTheme } from "@/app/dashboard/builder/types"

export function PublicPageHarness({ modele }: { modele?: string }) {
  const t = PAGE_TEMPLATES.find(x => x.key === modele) ?? PAGE_TEMPLATES[0]

  const page = {
    id: "e2e-harness",
    title: `${t.group} — ${t.label}`,
    slug: "e2e-harness",
    theme: normalizePageTheme(t.theme),
    total_views: 0,
    profiles: { full_name: t.label, plan: "pro" },
  }

  const blocks = t.blocks.map((b, i) => ({
    id: `e2e-${i}`,
    page_id: "e2e-harness",
    type: b.type,
    content: b.content,
    position: i,
    is_visible: true,
  }))

  return (
    <div data-harness-modele={t.key} data-harness-blocs={String(blocks.length)}>
      <PublicPageClient page={page as any} blocks={blocks as any} showBranding introEligible={false} />
    </div>
  )
}
