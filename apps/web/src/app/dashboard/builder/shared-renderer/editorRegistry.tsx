"use client"
// Registre ÉDITEUR : mappe type → adapter éditeur. Importé UNIQUEMENT par builderPreview.
// N'entre jamais dans le bundle public.
import type { ComponentType } from "react"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import type { EditorAdapterProps } from "./renderTypes"
import { EditorHeading } from "./blocks/heading/EditorHeading"
import { EditorValues } from "./blocks/values/EditorValues"
import { EditorPricing } from "./blocks/pricing/EditorPricing"
import { EditorDivider } from "./blocks/divider/EditorDivider"
import { EditorSpacer } from "./blocks/spacer/EditorSpacer"
import { EditorBio } from "./blocks/bio/EditorBio"
import { EditorSkills } from "./blocks/skills/EditorSkills"
import { EditorLanguages } from "./blocks/languages/EditorLanguages"
import { EditorAdvantages } from "./blocks/advantages/EditorAdvantages"
import { EditorWhatsappButton } from "./blocks/whatsapp_button/EditorWhatsappButton"
import { EditorEmailButton } from "./blocks/email_button/EditorEmailButton"
import { EditorDownloadFile } from "./blocks/download_file/EditorDownloadFile"
import { EditorOrderOnline } from "./blocks/order_online/EditorOrderOnline"
import { EditorDonation } from "./blocks/donation/EditorDonation"
import { EditorGoogleReview } from "./blocks/google_review/EditorGoogleReview"
import { EditorProcessSteps } from "./blocks/process_steps/EditorProcessSteps"
import { EditorOnSiteServices } from "./blocks/on_site_services/EditorOnSiteServices"
import { EditorEngagements } from "./blocks/engagements/EditorEngagements"
import { EditorTrustBadge } from "./blocks/trust_badge/EditorTrustBadge"
import { EditorStatsBlock } from "./blocks/stats_block/EditorStatsBlock"
import { EditorEventProgram } from "./blocks/event_program/EditorEventProgram"
import { EditorTestimonials } from "./blocks/testimonials/EditorTestimonials"
import { EditorBusinessStats } from "./blocks/business_stats/EditorBusinessStats"
import { EditorBrands } from "./blocks/brands/EditorBrands"
import { EditorLineup } from "./blocks/lineup/EditorLineup"
import { EditorReassurance } from "./blocks/reassurance/EditorReassurance"
import { EditorTimeline } from "./blocks/timeline/EditorTimeline"
import { EditorMenuSection } from "./blocks/menu_section/EditorMenuSection"
import { EditorMenuTabs } from "./blocks/menu_tabs/EditorMenuTabs"
import { EditorServicesList } from "./blocks/services_list/EditorServicesList"
import { EditorPromoBanner } from "./blocks/promo_banner/EditorPromoBanner"
import { EditorGiftCard } from "./blocks/gift_card/EditorGiftCard"
import { EditorEventInfo } from "./blocks/event_info/EditorEventInfo"
import { EditorEventTicketing } from "./blocks/event_ticketing/EditorEventTicketing"
import { EditorImage } from "./blocks/image/EditorImage"
import { EditorPortfolioWork } from "./blocks/portfolio_work/EditorPortfolioWork"
import { EditorFavoriteLinks } from "./blocks/favorite_links/EditorFavoriteLinks"
import { EditorConcerts } from "./blocks/concerts/EditorConcerts"
import { EditorMerch } from "./blocks/merch/EditorMerch"
import { EditorAppDownload } from "./blocks/app_download/EditorAppDownload"
import { EditorVideoLocal } from "./blocks/video_local/EditorVideoLocal"
import { EditorAudioPlayer } from "./blocks/audio_player/EditorAudioPlayer"
import { EditorPdfViewer } from "./blocks/pdf_viewer/EditorPdfViewer"
import { EditorSpotifyEmbed } from "./blocks/spotify_embed/EditorSpotifyEmbed"
import { EditorSpotifyPlayer } from "./blocks/spotify_player/EditorSpotifyPlayer"
import { EditorBeforeAfter } from "./blocks/before_after/EditorBeforeAfter"
import { EditorVideo } from "./blocks/video/EditorVideo"
import { EditorGoogleMapsEmbed } from "./blocks/google_maps_embed/EditorGoogleMapsEmbed"
import { EditorAlbumBlock } from "./blocks/album_block/EditorAlbumBlock"
import { EditorDiscography } from "./blocks/discography/EditorDiscography"
import { EditorPodcastLinks } from "./blocks/podcast_links/EditorPodcastLinks"
import { EditorProductCatalog } from "./blocks/product_catalog/EditorProductCatalog"

const EDITOR_ADAPTERS: Record<string, ComponentType<EditorAdapterProps>> = {
  heading: EditorHeading,
  values: EditorValues,
  pricing: EditorPricing,
  divider: EditorDivider,
  spacer: EditorSpacer,
  bio: EditorBio,
  skills: EditorSkills,
  languages: EditorLanguages,
  advantages: EditorAdvantages,
  whatsapp_button: EditorWhatsappButton,
  email_button: EditorEmailButton,
  download_file: EditorDownloadFile,
  order_online: EditorOrderOnline,
  donation: EditorDonation,
  google_review: EditorGoogleReview,
  process_steps: EditorProcessSteps,
  on_site_services: EditorOnSiteServices,
  engagements: EditorEngagements,
  trust_badge: EditorTrustBadge,
  stats_block: EditorStatsBlock,
  event_program: EditorEventProgram,
  testimonials: EditorTestimonials,
  business_stats: EditorBusinessStats,
  brands: EditorBrands,
  lineup: EditorLineup,
  reassurance: EditorReassurance,
  timeline: EditorTimeline,
  menu_section: EditorMenuSection,
  menu_tabs: EditorMenuTabs,
  services_list: EditorServicesList,
  promo_banner: EditorPromoBanner,
  gift_card: EditorGiftCard,
  event_info: EditorEventInfo,
  event_ticketing: EditorEventTicketing,
  image: EditorImage,
  portfolio_work: EditorPortfolioWork,
  favorite_links: EditorFavoriteLinks,
  concerts: EditorConcerts,
  merch: EditorMerch,
  app_download: EditorAppDownload,
  video_local: EditorVideoLocal,
  audio_player: EditorAudioPlayer,
  pdf_viewer: EditorPdfViewer,
  spotify_embed: EditorSpotifyEmbed,
  spotify_player: EditorSpotifyPlayer,
  before_after: EditorBeforeAfter,
  video: EditorVideo,
  google_maps_embed: EditorGoogleMapsEmbed,
  album_block: EditorAlbumBlock,
  discography: EditorDiscography,
  podcast_links: EditorPodcastLinks,
  product_catalog: EditorProductCatalog,
}

// Renvoie l'adapter éditeur partagé si le bloc est ACTIVÉ (flag) et enregistré ; sinon null
// → l'appelant retombe sur le `case` legacy. `active` injectable pour les tests.
export function resolveEditorBlock(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): ComponentType<EditorAdapterProps> | null {
  if (!active.has(type)) return null
  return EDITOR_ADAPTERS[type] ?? null
}
