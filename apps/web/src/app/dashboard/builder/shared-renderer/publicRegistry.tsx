"use client"
// Registre PUBLIC : mappe type → adapter public. Importé UNIQUEMENT par PublicPageClient.
// N'importe AUCUN adapter éditeur (isolation de bundle vérifiée par bundleBoundary.test).
import type { ComponentType } from "react"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import type { PublicAdapterProps } from "./renderTypes"
import { PublicHeading } from "./blocks/heading/PublicHeading"
import { PublicValues } from "./blocks/values/PublicValues"
import { PublicPricing } from "./blocks/pricing/PublicPricing"
import { PublicDivider } from "./blocks/divider/PublicDivider"
import { PublicSpacer } from "./blocks/spacer/PublicSpacer"
import { PublicBio } from "./blocks/bio/PublicBio"
import { PublicSkills } from "./blocks/skills/PublicSkills"
import { PublicLanguages } from "./blocks/languages/PublicLanguages"
import { PublicAdvantages } from "./blocks/advantages/PublicAdvantages"
import { PublicWhatsappButton } from "./blocks/whatsapp_button/PublicWhatsappButton"
import { PublicEmailButton } from "./blocks/email_button/PublicEmailButton"
import { PublicDownloadFile } from "./blocks/download_file/PublicDownloadFile"
import { PublicOrderOnline } from "./blocks/order_online/PublicOrderOnline"
import { PublicDonation } from "./blocks/donation/PublicDonation"
import { PublicGoogleReview } from "./blocks/google_review/PublicGoogleReview"
import { PublicProcessSteps } from "./blocks/process_steps/PublicProcessSteps"
import { PublicOnSiteServices } from "./blocks/on_site_services/PublicOnSiteServices"
import { PublicEngagements } from "./blocks/engagements/PublicEngagements"
import { PublicTrustBadge } from "./blocks/trust_badge/PublicTrustBadge"
import { PublicStatsBlock } from "./blocks/stats_block/PublicStatsBlock"
import { PublicEventProgram } from "./blocks/event_program/PublicEventProgram"
import { PublicTestimonials } from "./blocks/testimonials/PublicTestimonials"
import { PublicBusinessStats } from "./blocks/business_stats/PublicBusinessStats"
import { PublicBrands } from "./blocks/brands/PublicBrands"
import { PublicLineup } from "./blocks/lineup/PublicLineup"
import { PublicReassurance } from "./blocks/reassurance/PublicReassurance"
import { PublicTimeline } from "./blocks/timeline/PublicTimeline"
import { PublicMenuSection } from "./blocks/menu_section/PublicMenuSection"
import { PublicServicesList } from "./blocks/services_list/PublicServicesList"
import { PublicPromoBanner } from "./blocks/promo_banner/PublicPromoBanner"
import { PublicGiftCard } from "./blocks/gift_card/PublicGiftCard"
import { PublicEventInfo } from "./blocks/event_info/PublicEventInfo"
import { PublicEventTicketing } from "./blocks/event_ticketing/PublicEventTicketing"
import { PublicImage } from "./blocks/image/PublicImage"
import { PublicPortfolioWork } from "./blocks/portfolio_work/PublicPortfolioWork"
import { PublicFavoriteLinks } from "./blocks/favorite_links/PublicFavoriteLinks"
import { PublicConcerts } from "./blocks/concerts/PublicConcerts"
import { PublicMerch } from "./blocks/merch/PublicMerch"
import { PublicAppDownload } from "./blocks/app_download/PublicAppDownload"

const PUBLIC_ADAPTERS: Record<string, ComponentType<PublicAdapterProps>> = {
  heading: PublicHeading,
  values: PublicValues,
  pricing: PublicPricing,
  divider: PublicDivider,
  spacer: PublicSpacer,
  bio: PublicBio,
  skills: PublicSkills,
  languages: PublicLanguages,
  advantages: PublicAdvantages,
  whatsapp_button: PublicWhatsappButton,
  email_button: PublicEmailButton,
  download_file: PublicDownloadFile,
  order_online: PublicOrderOnline,
  donation: PublicDonation,
  google_review: PublicGoogleReview,
  process_steps: PublicProcessSteps,
  on_site_services: PublicOnSiteServices,
  engagements: PublicEngagements,
  trust_badge: PublicTrustBadge,
  stats_block: PublicStatsBlock,
  event_program: PublicEventProgram,
  testimonials: PublicTestimonials,
  business_stats: PublicBusinessStats,
  brands: PublicBrands,
  lineup: PublicLineup,
  reassurance: PublicReassurance,
  timeline: PublicTimeline,
  menu_section: PublicMenuSection,
  services_list: PublicServicesList,
  promo_banner: PublicPromoBanner,
  gift_card: PublicGiftCard,
  event_info: PublicEventInfo,
  event_ticketing: PublicEventTicketing,
  image: PublicImage,
  portfolio_work: PublicPortfolioWork,
  favorite_links: PublicFavoriteLinks,
  concerts: PublicConcerts,
  merch: PublicMerch,
  app_download: PublicAppDownload,
}

// Renvoie l'adapter public partagé si le bloc est ACTIVÉ (flag) et enregistré ; sinon null
// → l'appelant retombe sur le `case` legacy. `active` injectable pour les tests.
export function resolvePublicBlock(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): ComponentType<PublicAdapterProps> | null {
  if (!active.has(type)) return null
  return PUBLIC_ADAPTERS[type] ?? null
}
