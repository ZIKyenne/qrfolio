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
// Vague LAYOUT — blocs « Création libre » (une vue partagée, deux adapters d'une ligne).
import { EditorLogoWall } from "./blocks/logo_wall"
import { EditorPartners } from "./blocks/partners"
import { EditorCertifications } from "./blocks/certifications"
import { EditorBusinessCertifications } from "./blocks/business_certifications"
import { EditorInfoTable } from "./blocks/info_table"
import { EditorLegalInfo } from "./blocks/legal_info"
import { EditorQuoteBlock } from "./blocks/quote_block"
import { EditorInfoBox } from "./blocks/info_box"
import { EditorFounderMessage } from "./blocks/founder_message"
import { EditorCompany } from "./blocks/company"
import { EditorJourney } from "./blocks/journey"
import { EditorExpertise } from "./blocks/expertise"
import { EditorScanCounter } from "./blocks/scan_counter"
import { EditorSalesCounter } from "./blocks/sales_counter"
import { EditorParticipantsCount } from "./blocks/participants_count"
import { EditorPromoCode } from "./blocks/promo_code"
import { EditorTicketsLeft } from "./blocks/tickets_left"
import { EditorLimitedOffer } from "./blocks/limited_offer"
import { EditorPacks } from "./blocks/packs"
import { EditorServicesPricing } from "./blocks/services_pricing"
import { EditorCallButton } from "./blocks/call_button"
import { EditorDirectionsButton } from "./blocks/directions_button"
import { EditorGoogleMaps } from "./blocks/google_maps"
import { EditorQuickContact } from "./blocks/quick_contact"
import { EditorCtaButton } from "./blocks/cta_button"
import { EditorFreeSection } from "./blocks/free_section"
import { EditorImageText } from "./blocks/image_text"
import { EditorSplitPanel } from "./blocks/split_panel"
import { EditorOverlayCard } from "./blocks/overlay_card"
import { EditorFrameBox } from "./blocks/frame_box"
import { EditorBannerStrip } from "./blocks/banner_strip"
import { EditorFullBleedImage } from "./blocks/full_bleed_image"
import { EditorStackCards } from "./blocks/stack_cards"
import { EditorFreeGrid } from "./blocks/free_grid"
import { EditorColumnsText } from "./blocks/columns_text"
import { EditorImageMosaic } from "./blocks/image_mosaic"
import { EditorLogoMarquee } from "./blocks/logo_marquee"
import { EditorAvatarRow } from "./blocks/avatar_row"
import { EditorShapeDivider } from "./blocks/shape_divider"
import { EditorDecorLine } from "./blocks/decor_line"
import { EditorMarqueeText } from "./blocks/marquee_text"
import { EditorRibbonBanner } from "./blocks/ribbon_banner"
import { EditorColorBand } from "./blocks/color_band"
import { EditorBigStatement } from "./blocks/big_statement"
import { EditorTextColumns } from "./blocks/text_columns"
import { EditorNumberedList } from "./blocks/numbered_list"
import { EditorChecklist } from "./blocks/checklist"
import { EditorDefinitionList } from "./blocks/definition_list"
import { EditorCardLink } from "./blocks/card_link"
import { EditorAnchorNav } from "./blocks/anchor_nav"
import { EditorAnchorTarget } from "./blocks/anchor_target"
import { EditorToggleContent } from "./blocks/toggle_content"
import { EditorBackToTop } from "./blocks/back_to_top"
import { EditorStepsHorizontal } from "./blocks/steps_horizontal"
import { EditorStatHero } from "./blocks/stat_hero"
import { EditorBadgeRow } from "./blocks/badge_row"
import { EditorIconRow } from "./blocks/icon_row"
import { EditorCompareTwo } from "./blocks/compare_two"
import { EditorProgressBars } from "./blocks/progress_bars"
import { EditorHighlightBox } from "./blocks/highlight_box"

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
  free_section: EditorFreeSection,
  image_text: EditorImageText,
  split_panel: EditorSplitPanel,
  overlay_card: EditorOverlayCard,
  frame_box: EditorFrameBox,
  banner_strip: EditorBannerStrip,
  full_bleed_image: EditorFullBleedImage,
  stack_cards: EditorStackCards,
  free_grid: EditorFreeGrid,
  columns_text: EditorColumnsText,
  image_mosaic: EditorImageMosaic,
  logo_marquee: EditorLogoMarquee,
  avatar_row: EditorAvatarRow,
  shape_divider: EditorShapeDivider,
  decor_line: EditorDecorLine,
  marquee_text: EditorMarqueeText,
  ribbon_banner: EditorRibbonBanner,
  color_band: EditorColorBand,
  big_statement: EditorBigStatement,
  text_columns: EditorTextColumns,
  numbered_list: EditorNumberedList,
  checklist: EditorChecklist,
  definition_list: EditorDefinitionList,
  card_link: EditorCardLink,
  anchor_nav: EditorAnchorNav,
  anchor_target: EditorAnchorTarget,
  toggle_content: EditorToggleContent,
  back_to_top: EditorBackToTop,
  steps_horizontal: EditorStepsHorizontal,
  stat_hero: EditorStatHero,
  badge_row: EditorBadgeRow,
  icon_row: EditorIconRow,
  compare_two: EditorCompareTwo,
  progress_bars: EditorProgressBars,
  highlight_box: EditorHighlightBox,
  // Vague 9 — logos, certifications et tableaux.
  logo_wall: EditorLogoWall,
  partners: EditorPartners,
  certifications: EditorCertifications,
  business_certifications: EditorBusinessCertifications,
  info_table: EditorInfoTable,
  legal_info: EditorLegalInfo,
  // Vague 10 — presentation et encadres.
  quote_block: EditorQuoteBlock,
  info_box: EditorInfoBox,
  founder_message: EditorFounderMessage,
  company: EditorCompany,
  journey: EditorJourney,
  expertise: EditorExpertise,
  // Vague 11 — compteurs et offres.
  scan_counter: EditorScanCounter,
  sales_counter: EditorSalesCounter,
  participants_count: EditorParticipantsCount,
  promo_code: EditorPromoCode,
  tickets_left: EditorTicketsLeft,
  limited_offer: EditorLimitedOffer,
  // Vague 12 — formules et tarifs.
  packs: EditorPacks,
  services_pricing: EditorServicesPricing,
  // Vague 13 — contact et action.
  call_button: EditorCallButton,
  directions_button: EditorDirectionsButton,
  google_maps: EditorGoogleMaps,
  quick_contact: EditorQuickContact,
  cta_button: EditorCtaButton,
}

// Renvoie l'adapter éditeur partagé si le bloc est ACTIVÉ (flag) et enregistré ; sinon null
// → l'appelant retombe sur le `case` legacy. `active` injectable pour les tests.
export function resolveEditorBlock(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): ComponentType<EditorAdapterProps> | null {
  if (!active.has(type)) return null
  return EDITOR_ADAPTERS[type] ?? null
}
