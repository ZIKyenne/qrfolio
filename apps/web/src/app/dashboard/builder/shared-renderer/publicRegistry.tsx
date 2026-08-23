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
import { PublicMenuTabs } from "./blocks/menu_tabs/PublicMenuTabs"
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
import { PublicVideoLocal } from "./blocks/video_local/PublicVideoLocal"
import { PublicAudioPlayer } from "./blocks/audio_player/PublicAudioPlayer"
import { PublicPdfViewer } from "./blocks/pdf_viewer/PublicPdfViewer"
import { PublicSpotifyEmbed } from "./blocks/spotify_embed/PublicSpotifyEmbed"
import { PublicSpotifyPlayer } from "./blocks/spotify_player/PublicSpotifyPlayer"
import { PublicBeforeAfter } from "./blocks/before_after/PublicBeforeAfter"
import { PublicVideo } from "./blocks/video/PublicVideo"
import { PublicGoogleMapsEmbed } from "./blocks/google_maps_embed/PublicGoogleMapsEmbed"
import { PublicAlbumBlock } from "./blocks/album_block/PublicAlbumBlock"
import { PublicDiscography } from "./blocks/discography/PublicDiscography"
import { PublicPodcastLinks } from "./blocks/podcast_links/PublicPodcastLinks"
import { PublicProductCatalog } from "./blocks/product_catalog/PublicProductCatalog"
// Vague LAYOUT — blocs « Création libre » (une vue partagée, deux adapters d'une ligne).
import { PublicFreeSection } from "./blocks/free_section"
import { PublicImageText } from "./blocks/image_text"
import { PublicSplitPanel } from "./blocks/split_panel"
import { PublicOverlayCard } from "./blocks/overlay_card"
import { PublicFrameBox } from "./blocks/frame_box"
import { PublicBannerStrip } from "./blocks/banner_strip"
import { PublicFullBleedImage } from "./blocks/full_bleed_image"
import { PublicStackCards } from "./blocks/stack_cards"
import { PublicFreeGrid } from "./blocks/free_grid"
import { PublicColumnsText } from "./blocks/columns_text"
import { PublicImageMosaic } from "./blocks/image_mosaic"
import { PublicLogoMarquee } from "./blocks/logo_marquee"
import { PublicAvatarRow } from "./blocks/avatar_row"
import { PublicShapeDivider } from "./blocks/shape_divider"
import { PublicDecorLine } from "./blocks/decor_line"
import { PublicMarqueeText } from "./blocks/marquee_text"
import { PublicRibbonBanner } from "./blocks/ribbon_banner"
import { PublicColorBand } from "./blocks/color_band"
import { PublicBigStatement } from "./blocks/big_statement"
import { PublicTextColumns } from "./blocks/text_columns"
import { PublicNumberedList } from "./blocks/numbered_list"
import { PublicChecklist } from "./blocks/checklist"
import { PublicDefinitionList } from "./blocks/definition_list"
import { PublicCardLink } from "./blocks/card_link"
import { PublicAnchorNav } from "./blocks/anchor_nav"
import { PublicAnchorTarget } from "./blocks/anchor_target"
import { PublicToggleContent } from "./blocks/toggle_content"
import { PublicBackToTop } from "./blocks/back_to_top"
import { PublicStepsHorizontal } from "./blocks/steps_horizontal"
import { PublicStatHero } from "./blocks/stat_hero"
import { PublicBadgeRow } from "./blocks/badge_row"
import { PublicIconRow } from "./blocks/icon_row"
import { PublicCompareTwo } from "./blocks/compare_two"
import { PublicProgressBars } from "./blocks/progress_bars"
import { PublicHighlightBox } from "./blocks/highlight_box"

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
  menu_tabs: PublicMenuTabs,
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
  video_local: PublicVideoLocal,
  audio_player: PublicAudioPlayer,
  pdf_viewer: PublicPdfViewer,
  spotify_embed: PublicSpotifyEmbed,
  spotify_player: PublicSpotifyPlayer,
  before_after: PublicBeforeAfter,
  video: PublicVideo,
  google_maps_embed: PublicGoogleMapsEmbed,
  album_block: PublicAlbumBlock,
  discography: PublicDiscography,
  podcast_links: PublicPodcastLinks,
  product_catalog: PublicProductCatalog,
  free_section: PublicFreeSection,
  image_text: PublicImageText,
  split_panel: PublicSplitPanel,
  overlay_card: PublicOverlayCard,
  frame_box: PublicFrameBox,
  banner_strip: PublicBannerStrip,
  full_bleed_image: PublicFullBleedImage,
  stack_cards: PublicStackCards,
  free_grid: PublicFreeGrid,
  columns_text: PublicColumnsText,
  image_mosaic: PublicImageMosaic,
  logo_marquee: PublicLogoMarquee,
  avatar_row: PublicAvatarRow,
  shape_divider: PublicShapeDivider,
  decor_line: PublicDecorLine,
  marquee_text: PublicMarqueeText,
  ribbon_banner: PublicRibbonBanner,
  color_band: PublicColorBand,
  big_statement: PublicBigStatement,
  text_columns: PublicTextColumns,
  numbered_list: PublicNumberedList,
  checklist: PublicChecklist,
  definition_list: PublicDefinitionList,
  card_link: PublicCardLink,
  anchor_nav: PublicAnchorNav,
  anchor_target: PublicAnchorTarget,
  toggle_content: PublicToggleContent,
  back_to_top: PublicBackToTop,
  steps_horizontal: PublicStepsHorizontal,
  stat_hero: PublicStatHero,
  badge_row: PublicBadgeRow,
  icon_row: PublicIconRow,
  compare_two: PublicCompareTwo,
  progress_bars: PublicProgressBars,
  highlight_box: PublicHighlightBox,
}

// Renvoie l'adapter public partagé si le bloc est ACTIVÉ (flag) et enregistré ; sinon null
// → l'appelant retombe sur le `case` legacy. `active` injectable pour les tests.
export function resolvePublicBlock(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): ComponentType<PublicAdapterProps> | null {
  if (!active.has(type)) return null
  return PUBLIC_ADAPTERS[type] ?? null
}
