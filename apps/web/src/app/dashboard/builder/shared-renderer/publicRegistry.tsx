"use client"
// Registre PUBLIC : mappe type → adapter public. Importé UNIQUEMENT par PublicPageClient.
// N'importe AUCUN adapter éditeur (isolation de bundle vérifiée par bundleBoundary.test).
import type { ComponentType } from "react"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import dynamic from "next/dynamic"

// Chargement À LA DEMANDE de chaque bloc public.
//
// Ces 87 composants étaient importés en dur : ils partaient donc TOUS sur chaque
// scan — mesuré à 162 Ko de JavaScript décompressé — alors qu'une carte de
// restaurant en utilise trois. `dynamic` conserve le rendu serveur (le HTML arrive
// complet, rien ne clignote, le référencement est intact) et ne télécharge côté
// client que les blocs réellement présents sur la page.

import type { PublicAdapterProps } from "./renderTypes"
// Vague LAYOUT — blocs « Création libre » (une vue partagée, deux adapters d'une ligne).

const PublicHeading = dynamic(() => import("./blocks/heading/PublicHeading").then(m => m.PublicHeading))
const PublicValues = dynamic(() => import("./blocks/values/PublicValues").then(m => m.PublicValues))
const PublicPricing = dynamic(() => import("./blocks/pricing/PublicPricing").then(m => m.PublicPricing))
const PublicDivider = dynamic(() => import("./blocks/divider/PublicDivider").then(m => m.PublicDivider))
const PublicSpacer = dynamic(() => import("./blocks/spacer/PublicSpacer").then(m => m.PublicSpacer))
const PublicBio = dynamic(() => import("./blocks/bio/PublicBio").then(m => m.PublicBio))
const PublicSkills = dynamic(() => import("./blocks/skills/PublicSkills").then(m => m.PublicSkills))
const PublicLanguages = dynamic(() => import("./blocks/languages/PublicLanguages").then(m => m.PublicLanguages))
const PublicAdvantages = dynamic(() => import("./blocks/advantages/PublicAdvantages").then(m => m.PublicAdvantages))
const PublicWhatsappButton = dynamic(() => import("./blocks/whatsapp_button/PublicWhatsappButton").then(m => m.PublicWhatsappButton))
const PublicEmailButton = dynamic(() => import("./blocks/email_button/PublicEmailButton").then(m => m.PublicEmailButton))
const PublicDownloadFile = dynamic(() => import("./blocks/download_file/PublicDownloadFile").then(m => m.PublicDownloadFile))
const PublicOrderOnline = dynamic(() => import("./blocks/order_online/PublicOrderOnline").then(m => m.PublicOrderOnline))
const PublicDonation = dynamic(() => import("./blocks/donation/PublicDonation").then(m => m.PublicDonation))
const PublicGoogleReview = dynamic(() => import("./blocks/google_review/PublicGoogleReview").then(m => m.PublicGoogleReview))
const PublicProcessSteps = dynamic(() => import("./blocks/process_steps/PublicProcessSteps").then(m => m.PublicProcessSteps))
const PublicOnSiteServices = dynamic(() => import("./blocks/on_site_services/PublicOnSiteServices").then(m => m.PublicOnSiteServices))
const PublicEngagements = dynamic(() => import("./blocks/engagements/PublicEngagements").then(m => m.PublicEngagements))
const PublicTrustBadge = dynamic(() => import("./blocks/trust_badge/PublicTrustBadge").then(m => m.PublicTrustBadge))
const PublicStatsBlock = dynamic(() => import("./blocks/stats_block/PublicStatsBlock").then(m => m.PublicStatsBlock))
const PublicEventProgram = dynamic(() => import("./blocks/event_program/PublicEventProgram").then(m => m.PublicEventProgram))
const PublicTestimonials = dynamic(() => import("./blocks/testimonials/PublicTestimonials").then(m => m.PublicTestimonials))
const PublicBusinessStats = dynamic(() => import("./blocks/business_stats/PublicBusinessStats").then(m => m.PublicBusinessStats))
const PublicBrands = dynamic(() => import("./blocks/brands/PublicBrands").then(m => m.PublicBrands))
const PublicLineup = dynamic(() => import("./blocks/lineup/PublicLineup").then(m => m.PublicLineup))
const PublicReassurance = dynamic(() => import("./blocks/reassurance/PublicReassurance").then(m => m.PublicReassurance))
const PublicTimeline = dynamic(() => import("./blocks/timeline/PublicTimeline").then(m => m.PublicTimeline))
const PublicMenuSection = dynamic(() => import("./blocks/menu_section/PublicMenuSection").then(m => m.PublicMenuSection))
const PublicMenuTabs = dynamic(() => import("./blocks/menu_tabs/PublicMenuTabs").then(m => m.PublicMenuTabs))
const PublicServicesList = dynamic(() => import("./blocks/services_list/PublicServicesList").then(m => m.PublicServicesList))
const PublicPromoBanner = dynamic(() => import("./blocks/promo_banner/PublicPromoBanner").then(m => m.PublicPromoBanner))
const PublicGiftCard = dynamic(() => import("./blocks/gift_card/PublicGiftCard").then(m => m.PublicGiftCard))
const PublicEventInfo = dynamic(() => import("./blocks/event_info/PublicEventInfo").then(m => m.PublicEventInfo))
const PublicEventTicketing = dynamic(() => import("./blocks/event_ticketing/PublicEventTicketing").then(m => m.PublicEventTicketing))
const PublicImage = dynamic(() => import("./blocks/image/PublicImage").then(m => m.PublicImage))
const PublicPortfolioWork = dynamic(() => import("./blocks/portfolio_work/PublicPortfolioWork").then(m => m.PublicPortfolioWork))
const PublicFavoriteLinks = dynamic(() => import("./blocks/favorite_links/PublicFavoriteLinks").then(m => m.PublicFavoriteLinks))
const PublicConcerts = dynamic(() => import("./blocks/concerts/PublicConcerts").then(m => m.PublicConcerts))
const PublicMerch = dynamic(() => import("./blocks/merch/PublicMerch").then(m => m.PublicMerch))
const PublicAppDownload = dynamic(() => import("./blocks/app_download/PublicAppDownload").then(m => m.PublicAppDownload))
const PublicVideoLocal = dynamic(() => import("./blocks/video_local/PublicVideoLocal").then(m => m.PublicVideoLocal))
const PublicAudioPlayer = dynamic(() => import("./blocks/audio_player/PublicAudioPlayer").then(m => m.PublicAudioPlayer))
const PublicPdfViewer = dynamic(() => import("./blocks/pdf_viewer/PublicPdfViewer").then(m => m.PublicPdfViewer))
const PublicSpotifyEmbed = dynamic(() => import("./blocks/spotify_embed/PublicSpotifyEmbed").then(m => m.PublicSpotifyEmbed))
const PublicSpotifyPlayer = dynamic(() => import("./blocks/spotify_player/PublicSpotifyPlayer").then(m => m.PublicSpotifyPlayer))
const PublicBeforeAfter = dynamic(() => import("./blocks/before_after/PublicBeforeAfter").then(m => m.PublicBeforeAfter))
const PublicVideo = dynamic(() => import("./blocks/video/PublicVideo").then(m => m.PublicVideo))
const PublicGoogleMapsEmbed = dynamic(() => import("./blocks/google_maps_embed/PublicGoogleMapsEmbed").then(m => m.PublicGoogleMapsEmbed))
const PublicAlbumBlock = dynamic(() => import("./blocks/album_block/PublicAlbumBlock").then(m => m.PublicAlbumBlock))
const PublicDiscography = dynamic(() => import("./blocks/discography/PublicDiscography").then(m => m.PublicDiscography))
const PublicPodcastLinks = dynamic(() => import("./blocks/podcast_links/PublicPodcastLinks").then(m => m.PublicPodcastLinks))
const PublicProductCatalog = dynamic(() => import("./blocks/product_catalog/PublicProductCatalog").then(m => m.PublicProductCatalog))
const PublicFreeSection = dynamic(() => import("./blocks/free_section").then(m => m.PublicFreeSection))
const PublicImageText = dynamic(() => import("./blocks/image_text").then(m => m.PublicImageText))
const PublicSplitPanel = dynamic(() => import("./blocks/split_panel").then(m => m.PublicSplitPanel))
const PublicOverlayCard = dynamic(() => import("./blocks/overlay_card").then(m => m.PublicOverlayCard))
const PublicFrameBox = dynamic(() => import("./blocks/frame_box").then(m => m.PublicFrameBox))
const PublicBannerStrip = dynamic(() => import("./blocks/banner_strip").then(m => m.PublicBannerStrip))
const PublicFullBleedImage = dynamic(() => import("./blocks/full_bleed_image").then(m => m.PublicFullBleedImage))
const PublicStackCards = dynamic(() => import("./blocks/stack_cards").then(m => m.PublicStackCards))
const PublicFreeGrid = dynamic(() => import("./blocks/free_grid").then(m => m.PublicFreeGrid))
const PublicColumnsText = dynamic(() => import("./blocks/columns_text").then(m => m.PublicColumnsText))
const PublicImageMosaic = dynamic(() => import("./blocks/image_mosaic").then(m => m.PublicImageMosaic))
const PublicLogoMarquee = dynamic(() => import("./blocks/logo_marquee").then(m => m.PublicLogoMarquee))
const PublicAvatarRow = dynamic(() => import("./blocks/avatar_row").then(m => m.PublicAvatarRow))
const PublicShapeDivider = dynamic(() => import("./blocks/shape_divider").then(m => m.PublicShapeDivider))
const PublicDecorLine = dynamic(() => import("./blocks/decor_line").then(m => m.PublicDecorLine))
const PublicMarqueeText = dynamic(() => import("./blocks/marquee_text").then(m => m.PublicMarqueeText))
const PublicRibbonBanner = dynamic(() => import("./blocks/ribbon_banner").then(m => m.PublicRibbonBanner))
const PublicColorBand = dynamic(() => import("./blocks/color_band").then(m => m.PublicColorBand))
const PublicBigStatement = dynamic(() => import("./blocks/big_statement").then(m => m.PublicBigStatement))
const PublicTextColumns = dynamic(() => import("./blocks/text_columns").then(m => m.PublicTextColumns))
const PublicNumberedList = dynamic(() => import("./blocks/numbered_list").then(m => m.PublicNumberedList))
const PublicChecklist = dynamic(() => import("./blocks/checklist").then(m => m.PublicChecklist))
const PublicDefinitionList = dynamic(() => import("./blocks/definition_list").then(m => m.PublicDefinitionList))
const PublicCardLink = dynamic(() => import("./blocks/card_link").then(m => m.PublicCardLink))
const PublicAnchorNav = dynamic(() => import("./blocks/anchor_nav").then(m => m.PublicAnchorNav))
const PublicAnchorTarget = dynamic(() => import("./blocks/anchor_target").then(m => m.PublicAnchorTarget))
const PublicToggleContent = dynamic(() => import("./blocks/toggle_content").then(m => m.PublicToggleContent))
const PublicBackToTop = dynamic(() => import("./blocks/back_to_top").then(m => m.PublicBackToTop))
const PublicStepsHorizontal = dynamic(() => import("./blocks/steps_horizontal").then(m => m.PublicStepsHorizontal))
const PublicStatHero = dynamic(() => import("./blocks/stat_hero").then(m => m.PublicStatHero))
const PublicBadgeRow = dynamic(() => import("./blocks/badge_row").then(m => m.PublicBadgeRow))
const PublicIconRow = dynamic(() => import("./blocks/icon_row").then(m => m.PublicIconRow))
const PublicCompareTwo = dynamic(() => import("./blocks/compare_two").then(m => m.PublicCompareTwo))
const PublicProgressBars = dynamic(() => import("./blocks/progress_bars").then(m => m.PublicProgressBars))
const PublicHighlightBox = dynamic(() => import("./blocks/highlight_box").then(m => m.PublicHighlightBox))

// Vague 9 — logos, certifications et tableaux.
const PublicLogoWall = dynamic(() => import("./blocks/logo_wall").then(m => m.PublicLogoWall))
const PublicPartners = dynamic(() => import("./blocks/partners").then(m => m.PublicPartners))
const PublicCertifications = dynamic(() => import("./blocks/certifications").then(m => m.PublicCertifications))
const PublicBusinessCertifications = dynamic(() => import("./blocks/business_certifications").then(m => m.PublicBusinessCertifications))
const PublicInfoTable = dynamic(() => import("./blocks/info_table").then(m => m.PublicInfoTable))
const PublicLegalInfo = dynamic(() => import("./blocks/legal_info").then(m => m.PublicLegalInfo))

// Vague 10 — presentation et encadres.
const PublicQuoteBlock = dynamic(() => import("./blocks/quote_block").then(m => m.PublicQuoteBlock))
const PublicInfoBox = dynamic(() => import("./blocks/info_box").then(m => m.PublicInfoBox))
const PublicFounderMessage = dynamic(() => import("./blocks/founder_message").then(m => m.PublicFounderMessage))
const PublicCompany = dynamic(() => import("./blocks/company").then(m => m.PublicCompany))
const PublicJourney = dynamic(() => import("./blocks/journey").then(m => m.PublicJourney))
const PublicExpertise = dynamic(() => import("./blocks/expertise").then(m => m.PublicExpertise))

// Vague 11 — compteurs et offres.
const PublicScanCounter = dynamic(() => import("./blocks/scan_counter").then(m => m.PublicScanCounter))
const PublicSalesCounter = dynamic(() => import("./blocks/sales_counter").then(m => m.PublicSalesCounter))
const PublicParticipantsCount = dynamic(() => import("./blocks/participants_count").then(m => m.PublicParticipantsCount))
const PublicPromoCode = dynamic(() => import("./blocks/promo_code").then(m => m.PublicPromoCode))
const PublicTicketsLeft = dynamic(() => import("./blocks/tickets_left").then(m => m.PublicTicketsLeft))
const PublicLimitedOffer = dynamic(() => import("./blocks/limited_offer").then(m => m.PublicLimitedOffer))

// Vague 12 — formules et tarifs.
const PublicPacks = dynamic(() => import("./blocks/packs").then(m => m.PublicPacks))
const PublicServicesPricing = dynamic(() => import("./blocks/services_pricing").then(m => m.PublicServicesPricing))

// Vague 13 — contact et action.
const PublicCallButton = dynamic(() => import("./blocks/call_button").then(m => m.PublicCallButton))
const PublicDirectionsButton = dynamic(() => import("./blocks/directions_button").then(m => m.PublicDirectionsButton))
const PublicGoogleMaps = dynamic(() => import("./blocks/google_maps").then(m => m.PublicGoogleMaps))
const PublicQuickContact = dynamic(() => import("./blocks/quick_contact").then(m => m.PublicQuickContact))
const PublicCtaButton = dynamic(() => import("./blocks/cta_button").then(m => m.PublicCtaButton))

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
  logo_wall: PublicLogoWall,
  partners: PublicPartners,
  certifications: PublicCertifications,
  business_certifications: PublicBusinessCertifications,
  info_table: PublicInfoTable,
  legal_info: PublicLegalInfo,
  quote_block: PublicQuoteBlock,
  info_box: PublicInfoBox,
  founder_message: PublicFounderMessage,
  company: PublicCompany,
  journey: PublicJourney,
  expertise: PublicExpertise,
  scan_counter: PublicScanCounter,
  sales_counter: PublicSalesCounter,
  participants_count: PublicParticipantsCount,
  promo_code: PublicPromoCode,
  tickets_left: PublicTicketsLeft,
  limited_offer: PublicLimitedOffer,
  packs: PublicPacks,
  services_pricing: PublicServicesPricing,
  call_button: PublicCallButton,
  directions_button: PublicDirectionsButton,
  google_maps: PublicGoogleMaps,
  quick_contact: PublicQuickContact,
  cta_button: PublicCtaButton,
}

// Renvoie l'adapter public partagé si le bloc est ACTIVÉ (flag) et enregistré ; sinon null
// → l'appelant retombe sur le `case` legacy. `active` injectable pour les tests.
export function resolvePublicBlock(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): ComponentType<PublicAdapterProps> | null {
  if (!active.has(type)) return null
  return PUBLIC_ADAPTERS[type] ?? null
}
