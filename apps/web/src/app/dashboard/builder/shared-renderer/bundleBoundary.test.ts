import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

// Garde-fou de séparation des bundles : le chemin PUBLIC ne doit importer aucun symbole
// éditeur, et les modèles doivent rester purs (sans React ni Supabase).

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")

// Fichiers atteignables depuis PublicPageClient -> publicRegistry (transitif).
const PUBLIC_REACHABLE = [
  "./publicRegistry.tsx",
  "./blocks/heading/PublicHeading.tsx",
  "./blocks/values/PublicValues.tsx",
  "./blocks/pricing/PublicPricing.tsx",
  "./blocks/divider/PublicDivider.tsx",
  "./blocks/spacer/PublicSpacer.tsx",
  "./blocks/bio/PublicBio.tsx",
  "./blocks/skills/PublicSkills.tsx",
  "./blocks/languages/PublicLanguages.tsx",
  "./blocks/advantages/PublicAdvantages.tsx",
  "./blocks/whatsapp_button/PublicWhatsappButton.tsx",
  "./blocks/email_button/PublicEmailButton.tsx",
  "./blocks/download_file/PublicDownloadFile.tsx",
  "./blocks/order_online/PublicOrderOnline.tsx",
  "./blocks/donation/PublicDonation.tsx",
  "./blocks/google_review/PublicGoogleReview.tsx",
  "./primitives/BlockCtaLink.tsx",
  "./views/IconLabelCta.tsx",
  "./blocks/process_steps/PublicProcessSteps.tsx",
  "./blocks/on_site_services/PublicOnSiteServices.tsx",
  "./blocks/engagements/PublicEngagements.tsx",
  "./blocks/trust_badge/PublicTrustBadge.tsx",
  "./blocks/stats_block/PublicStatsBlock.tsx",
  "./blocks/event_program/PublicEventProgram.tsx",
  "./blocks/testimonials/PublicTestimonials.tsx",
  "./blocks/business_stats/PublicBusinessStats.tsx",
  "./blocks/brands/PublicBrands.tsx",
  "./blocks/lineup/PublicLineup.tsx",
  "./blocks/reassurance/PublicReassurance.tsx",
  "./blocks/timeline/PublicTimeline.tsx",
  "./blocks/menu_section/PublicMenuSection.tsx",
  "./blocks/services_list/PublicServicesList.tsx",
  "./blocks/promo_banner/PublicPromoBanner.tsx",
  "./blocks/gift_card/PublicGiftCard.tsx",
  "./blocks/event_info/PublicEventInfo.tsx",
  "./blocks/event_ticketing/PublicEventTicketing.tsx",
  "./models/repeaterExtract.ts",
  "./models/heading.ts",
  "./models/values.ts",
  "./models/pricing.ts",
  "./models/divider.ts",
  "./models/spacer.ts",
  "./models/bio.ts",
  "./models/skills.ts",
  "./models/languages.ts",
  "./models/advantages.ts",
  "./renderTypes.ts",
]

// Symboles/chemins strictement éditeur qui ne doivent JAMAIS entrer dans le bundle public.
const FORBIDDEN_IN_PUBLIC = [
  "InlineEditable", "editorRegistry", "EditorHeading", "EditorValues", "EditorPricing",
  "BuilderV4", "builderHooks", "builderPanels", "OutlinePanel", "CommandPalette",
  "primitives/BlockEmptyState",
]

describe("frontière de bundle — public n'importe rien d'éditeur", () => {
  for (const f of PUBLIC_REACHABLE) {
    it(`${f} : aucun import éditeur interdit`, () => {
      const src = read(f)
      // On ne regarde que les lignes d'import (pas les commentaires de doc).
      const imports = src.split("\n").filter(l => /^\s*import\b/.test(l)).join("\n")
      for (const bad of FORBIDDEN_IN_PUBLIC) {
        expect(imports.includes(bad), `${f} importe ${bad}`).toBe(false)
      }
    })
  }
})

describe("modèles purs — sans React ni Supabase", () => {
  for (const m of ["./models/heading.ts", "./models/values.ts", "./models/pricing.ts", "./models/divider.ts", "./models/spacer.ts", "./models/bio.ts", "./models/skills.ts", "./models/languages.ts", "./models/advantages.ts", "./models/whatsappButton.ts", "./models/emailButton.ts", "./models/downloadFile.ts", "./models/orderOnline.ts", "./models/donation.ts", "./models/googleReview.ts", "./models/processSteps.ts", "./models/onSiteServices.ts", "./models/engagements.ts", "./models/trustBadge.ts", "./models/statsBlock.ts", "./models/eventProgram.ts", "./models/testimonials.ts", "./models/businessStats.ts", "./models/brands.ts", "./models/lineup.ts", "./models/reassurance.ts", "./models/timeline.ts", "./models/menuSection.ts", "./models/servicesList.ts", "./models/promoBanner.ts", "./models/giftCard.ts", "./models/eventInfo.ts", "./models/eventTicketing.ts", "./models/repeaterExtract.ts"]) {
    it(`${m} : aucun import react/supabase`, () => {
      const imports = read(m).split("\n").filter(l => /^\s*import\b/.test(l)).join("\n")
      expect(/from ["']react["']/.test(imports)).toBe(false)
      expect(/supabase/i.test(imports)).toBe(false)
      expect(imports.includes("trackLinkClick")).toBe(false)
    })
  }
})

describe("marqueurs de comportement des adapters", () => {
  it("PublicValues rend null si vide", () => {
    expect(read("./blocks/values/PublicValues.tsx").includes("return null")).toBe(true)
  })
  it("PublicPricing : lien <a> réel + tracking", () => {
    const src = read("./blocks/pricing/PublicPricing.tsx")
    expect(src.includes("<a ")).toBe(true)
    expect(src.includes("trackClick")).toBe(true)
  })
  it("EditorPricing : CTA non navigable (aria-disabled), pas de <a>", () => {
    const src = read("./blocks/pricing/EditorPricing.tsx")
    expect(src.includes('aria-disabled="true"')).toBe(true)
    expect(src.includes("<a ")).toBe(false)
  })
  it("EditorHeading / EditorValues : édition inline préservée", () => {
    expect(read("./blocks/heading/EditorHeading.tsx").includes("InlineEditable")).toBe(true)
    expect(read("./blocks/values/EditorValues.tsx").includes("InlineEditable")).toBe(true)
  })
})
