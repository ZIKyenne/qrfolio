# Migration Matrix — renderer partagé (142 blocs)

> Généré à partir de `BLOCK_DEFS` (types.ts) + heuristiques de classification (mission B09.1).
> **Statut initial = `legacy` pour TOUS les blocs.** Rien n'est migré tant que B09.2+ n'a pas
> livré l'infra, le view model, les adapters, les tests de parité et la validation visuelle
> (voir `docs/RENDERER-DOD.md`). Colonnes : Famille (regroupement de rendu), Risque, Niveau de
> partage cible (0=legacy, 1=view model, 2=structure, 3=complet — voir architecture),
> Divergence connue (ne pas migrer avant correction), Vague de migration.

| Bloc | Catégorie | Famille | Risque | Niveau cible | Divergence connue | Vague | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| profile | identity | identité-carte | ÉLEVÉ | 2 | - | 2 | legacy |
| bio | identity | texte | FAIBLE | 3 | - | 1 | shared (vague 1) |
| skills | identity | répéteur | STANDARD | 2 | - | 3 | shared (vague 1) |
| cta_button | actions | cta | STANDARD | 3 | - | 2 | legacy |
| calendly | actions | embed/média | ÉLEVÉ | 1 | - | 6 | legacy |
| social_links | social | répéteur | STANDARD | 2 | - | 3 | legacy |
| social_feature | social | répéteur | STANDARD | 2 | - | 3 | legacy |
| instagram_feed | social | embed/média | ÉLEVÉ | 1 | preview différent | 6 | legacy |
| product | commerce | commerce-carte | STANDARD | 2 | - | 4 | legacy |
| pricing | commerce | commerce-carte | STANDARD | 2 | - | 4 | shared (activé) |
| promo_banner | commerce | commerce-carte | STANDARD | 2 | - | 4 | shared (vague 5) |
| menu_section | commerce | répéteur | STANDARD | 2 | - | 3 | shared (vague 5) |
| services_list | commerce | répéteur | STANDARD | 2 | - | 3 | shared (vague 5) |
| image | media | carte | STANDARD | 2 | - | 4 | shared (vague 6) |
| gallery | media | média-liste | ÉLEVÉ | 2 | - | 6 | legacy |
| video | media | embed/média | ÉLEVÉ | 1 | - | 6 | shared (vague 8) |
| heading | info | texte | FAIBLE | 3 | - | 1 | shared (activé) |
| rich_text | info | texte | FAIBLE | 3 | - | 1 | legacy |
| faq | info | répéteur | STANDARD | 2 | - | 3 | legacy |
| testimonials | info | répéteur | STANDARD | 2 | - | 3 | shared (vague 4) |
| visit_counter | info | carte | STANDARD | 2 | - | 4 | legacy |
| documents | info | carte | STANDARD | 2 | - | 4 | legacy |
| google_maps | business | embed/média | ÉLEVÉ | 1 | - | 6 | legacy |
| opening_hours | business | carte | STANDARD | 2 | - | 4 | legacy |
| contact_form | business | form | ÉLEVÉ | 1 | - | 7 | legacy |
| reservation_form | business | form | ÉLEVÉ | 1 | phone orphelin | 7 | legacy |
| spotify_player | music | embed/média | ÉLEVÉ | 1 | - | 6 | shared (vague 7) |
| music_links | music | répéteur | STANDARD | 2 | - | 3 | legacy |
| countdown | event | event-carte | STANDARD | 2 | sans date | 5 | legacy |
| event_info | event | event-carte | STANDARD | 2 | - | 5 | shared (vague 5) |
| divider | layout | layout-atome | FAIBLE | 3 | - | 1 | shared (vague 1) |
| spacer | layout | layout-atome | FAIBLE | 3 | - | 1 | shared (vague 1) |
| product_catalog | commerce | répéteur | STANDARD | 2 | - | 3 | shared (vague 8) |
| featured_product | commerce | commerce-carte | STANDARD | 2 | - | 4 | legacy |
| offer_comparison | commerce | répéteur | STANDARD | 2 | - | 3 | legacy |
| packs | commerce | répéteur | STANDARD | 2 | - | 3 | legacy |
| before_after | commerce | média-liste | ÉLEVÉ | 2 | - | 6 | shared (vague 7) |
| portfolio_work | commerce | média-liste | ÉLEVÉ | 2 | - | 6 | shared (vague 6) |
| google_reviews_block | commerce | commerce-carte | STANDARD | 2 | - | 4 | legacy |
| business_stats | commerce | commerce-carte | STANDARD | 2 | - | 4 | shared (vague 4) |
| partners | commerce | répéteur | STANDARD | 2 | - | 3 | legacy |
| brands | commerce | répéteur | STANDARD | 2 | - | 3 | shared (vague 4) |
| gift_card | commerce | commerce-carte | STANDARD | 2 | - | 4 | shared (vague 5) |
| services_pricing | commerce | répéteur | STANDARD | 2 | - | 3 | legacy |
| external_shop | commerce | commerce-carte | STANDARD | 2 | - | 4 | legacy |
| advantages | commerce | répéteur | STANDARD | 2 | - | 3 | shared (vague 1) |
| reassurance | commerce | répéteur | STANDARD | 2 | - | 3 | shared (vague 4) |
| sales_counter | commerce | commerce-carte | STANDARD | 2 | - | 4 | legacy |
| popular_products | commerce | répéteur | STANDARD | 2 | - | 3 | legacy |
| qr_code_block | layout | QR | ÉLEVÉ | 0 | public=null (allowlist) | 8 | legacy |
| hero_banner | layout | identité-carte | ÉLEVÉ | 2 | - | 2 | legacy |
| section_banner | layout | texte | FAIBLE | 3 | - | 1 | legacy |
| two_columns | layout | répéteur | STANDARD | 2 | - | 3 | legacy |
| grid_section | layout | répéteur | STANDARD | 2 | - | 3 | legacy |
| section_block | layout | texte | FAIBLE | 3 | - | 1 | legacy |
| embed_block | layout | embed/média | ÉLEVÉ | 1 | - | 6 | legacy |
| tabs_block | layout | répéteur | STANDARD | 2 | non interactif en édition | 3 | legacy |
| accordion_block | layout | répéteur | STANDARD | 2 | non interactif en édition | 3 | legacy |
| info_box | layout | texte | FAIBLE | 3 | - | 1 | legacy |
| event_program | event | répéteur | STANDARD | 2 | - | 3 | shared (vague 3) |
| event_ticketing | event | event-carte | STANDARD | 2 | - | 5 | shared (vague 5) |
| event_guests | event | répéteur | STANDARD | 2 | - | 3 | legacy |
| lineup | event | répéteur | STANDARD | 2 | - | 3 | shared (vague 4) |
| event_access | event | event-carte | STANDARD | 2 | - | 5 | legacy |
| event_register | event | form | ÉLEVÉ | 1 | - | 7 | legacy |
| rsvp | event | form | ÉLEVÉ | 1 | - | 7 | legacy |
| add_to_calendar | event | event-carte | STANDARD | 2 | options éditeur/public | 5 | legacy |
| participants_count | event | event-carte | STANDARD | 2 | - | 5 | legacy |
| tickets_left | event | event-carte | STANDARD | 2 | - | 5 | legacy |
| spotify_embed | music | embed/média | ÉLEVÉ | 1 | - | 6 | shared (vague 7) |
| latest_release | music | musique | ÉLEVÉ | 1 | - | 6 | legacy |
| discography | music | répéteur | STANDARD | 2 | - | 3 | shared (vague 8) |
| album_block | music | embed/média | ÉLEVÉ | 1 | - | 6 | shared (vague 8) |
| playlist_block | music | embed/média | ÉLEVÉ | 1 | - | 6 | legacy |
| concerts | music | répéteur | STANDARD | 2 | - | 3 | shared (vague 6) |
| ticketing | music | musique | ÉLEVÉ | 1 | - | 6 | legacy |
| presave | music | musique | ÉLEVÉ | 1 | - | 6 | legacy |
| booking_request | music | form | ÉLEVÉ | 1 | - | 7 | legacy |
| merch | music | répéteur | STANDARD | 2 | - | 3 | shared (vague 6) |
| google_maps_embed | business | embed/média | ÉLEVÉ | 1 | - | 6 | shared (vague 8) |
| quote_form | business | form | ÉLEVÉ | 1 | - | 7 | legacy |
| quick_contact | business | carte | STANDARD | 2 | - | 4 | legacy |
| multi_contact | business | répéteur | STANDARD | 2 | - | 3 | legacy |
| service_area | business | carte | STANDARD | 2 | - | 4 | legacy |
| legal_info | business | texte | FAIBLE | 3 | - | 1 | legacy |
| business_certifications | business | répéteur | STANDARD | 2 | - | 3 | legacy |
| on_site_services | business | répéteur | STANDARD | 2 | - | 3 | shared (vague 3) |
| stats_block | info | répéteur | STANDARD | 2 | - | 3 | shared (vague 3) |
| scan_counter | info | carte | STANDARD | 2 | - | 4 | legacy |
| timeline | info | répéteur | STANDARD | 2 | - | 3 | shared (vague 4) |
| process_steps | info | répéteur | STANDARD | 2 | - | 3 | shared (vague 3) |
| values | info | répéteur | STANDARD | 2 | - | 3 | shared (activé) |
| team | info | répéteur | STANDARD | 2 | - | 3 | legacy |
| engagements | info | répéteur | STANDARD | 2 | - | 3 | shared (vague 3) |
| trust_badge | info | répéteur | STANDARD | 2 | - | 3 | shared (vague 3) |
| quote_block | info | texte | FAIBLE | 3 | - | 1 | legacy |
| announcement | info | texte | FAIBLE | 3 | - | 1 | legacy |
| info_table | info | répéteur | STANDARD | 2 | - | 3 | legacy |
| founder_message | info | texte | FAIBLE | 3 | - | 1 | legacy |
| image_carousel | media | média-liste | ÉLEVÉ | 2 | - | 6 | legacy |
| media_before_after | media | média-liste | ÉLEVÉ | 2 | - | 6 | legacy |
| video_local | media | embed/média | ÉLEVÉ | 1 | - | 6 | shared (vague 7) |
| audio_player | media | embed/média | ÉLEVÉ | 1 | - | 6 | shared (vague 7) |
| pdf_viewer | media | embed/média | ÉLEVÉ | 1 | - | 6 | shared (vague 7) |
| youtube_gallery | media | embed/média | ÉLEVÉ | 1 | - | 6 | legacy |
| tiktok_gallery | media | embed/média | ÉLEVÉ | 1 | - | 6 | legacy |
| video_testimonials | media | média-liste | ÉLEVÉ | 2 | - | 6 | legacy |
| logo_wall | media | média-liste | ÉLEVÉ | 2 | - | 6 | legacy |
| tiktok_feed | social | embed/média | ÉLEVÉ | 1 | preview différent | 6 | legacy |
| youtube_channel | social | embed/média | ÉLEVÉ | 1 | - | 6 | legacy |
| twitch_live | social | embed/média | ÉLEVÉ | 1 | - | 6 | legacy |
| discord_server | social | social | STANDARD | 2 | - | 3 | legacy |
| telegram_channel | social | social | STANDARD | 2 | - | 3 | legacy |
| podcast_links | social | répéteur | STANDARD | 2 | - | 3 | shared (vague 8) |
| favorite_links | social | répéteur | STANDARD | 2 | - | 3 | shared (vague 6) |
| call_button | actions | cta | STANDARD | 3 | - | 2 | legacy |
| directions_button | actions | cta | STANDARD | 3 | - | 2 | legacy |
| sticky_bar | actions | cta | STANDARD | 3 | - | 2 | legacy |
| whatsapp_button | actions | cta | STANDARD | 3 | - | 2 | shared (vague 2) |
| email_button | actions | cta | STANDARD | 3 | - | 2 | shared (vague 2) |
| download_file | actions | cta | STANDARD | 3 | - | 2 | shared (vague 2) |
| vcard | actions | cta | STANDARD | 3 | - | 2 | legacy |
| google_review | actions | cta | STANDARD | 3 | - | 2 | shared (vague 2) |
| table_booking | actions | cta | STANDARD | 3 | - | 2 | legacy |
| order_online | actions | cta | STANDARD | 3 | - | 2 | shared (vague 2) |
| free_gift | actions | cta | STANDARD | 3 | - | 2 | legacy |
| donation | actions | form | ÉLEVÉ | 1 | - | 7 | shared (vague 2) |
| multi_cta | actions | cta | STANDARD | 3 | - | 2 | legacy |
| app_download | actions | cta | STANDARD | 3 | - | 2 | shared (vague 6) |
| promo_code | actions | cta | STANDARD | 3 | - | 2 | legacy |
| limited_offer | actions | cta | STANDARD | 3 | - | 2 | legacy |
| booking_button | actions | cta | STANDARD | 3 | - | 2 | legacy |
| payment_button | actions | cta | STANDARD | 3 | lien à vérifier | 2 | legacy |
| quote_request | actions | form | ÉLEVÉ | 1 | - | 7 | legacy |
| cover_banner | identity | identité-carte | ÉLEVÉ | 2 | champs hors panneau | 2 | legacy |
| about | identity | texte | FAIBLE | 3 | collapsible | 1 | legacy |
| availability | identity | texte | FAIBLE | 3 | - | 1 | legacy |
| journey | identity | répéteur | STANDARD | 2 | - | 3 | legacy |
| expertise | identity | répéteur | STANDARD | 2 | - | 3 | legacy |
| languages | identity | répéteur | STANDARD | 2 | - | 3 | shared (vague 1) |
| certifications | identity | répéteur | STANDARD | 2 | - | 3 | legacy |
| company | identity | texte | FAIBLE | 3 | - | 1 | legacy |

## Synthèse

- **142 blocs** — Risque : 15 FAIBLE · 87 STANDARD · 40 ÉLEVÉ.
- **Niveau de partage cible** : 1 bloc N0 (QR) · 29 N1 · 79 N2 · 33 N3.
- **Vagues** : 1(15) · 2(21) · 3(46) · 4(16) · 5(7) · 6(28) · 7(8) · 8(1).
- **Statut réel actuel** : **45/142 `shared` activés** (3 pilotes + vagues 1-7), 97 `legacy`.
  Vague 4 (B09.7) : testimonials, business_stats, brands, lineup, reassurance, timeline.
  Vague 5 (B09.8) : menu_section, services_list, promo_banner, gift_card, event_info, event_ticketing.
  Vague 6 (B09.9) : image, portfolio_work, favorite_links, concerts, merch, app_download.
  Vague 7 (B09.10) : video_local, audio_player, pdf_viewer, spotify_embed, spotify_player, before_after.

- **Vague 8 (B09.12)** : video, google_maps_embed, album_block, discography, podcast_links,
  product_catalog → **51 shared / 91 legacy**. Embeds allowlistés (SafeEmbedModel) + contrat
  `SharedImageModel` (`<img>` éditeur / `SmartImage` public). Restent legacy : `latest_release`,
  `playlist_block`, `presave` (divergence cta_label éditeur-only, §7, non résolue), `embed_block`
  (iframe arbitraire), `media_before_after` (slider). Voir `SHARED-RENDERER-WAVE-8-UNBLOCKED-BLOCKS.md`.

- **B09.11 (correction de divergences, AUCUNE migration)** : 45 shared / 97 legacy inchangés.
  Fondations sécurisées → blocs **prêts à migrer** (B09.12) : `video`, `google_maps_embed`
  (helpers d'embed désormais stricts, aucune iframe arbitraire) ; `album_block` (parité CTA
  rétablie) ; `latest_release`, `discography`, `playlist_block`, `presave`, `podcast_links`,
  `product_catalog` (contrat d'image partagé `SharedImageModel` pour aligner `<img>`/`SmartImage`).
  Toujours **bloqués** : `embed_block` (URL d'iframe arbitraire), `media_before_after` (slider
  accessible non conçu), tout média privé/URL signée. Voir `SHARED-RENDERER-BLOCKING-DIVERGENCES.md`.

## Divergences connues (ne migrent pas avant correction)

Voir `blockContracts.ts` (`KNOWN_DIVERGENCES`, `KNOWN_ORPHAN_FIELDS`, `KNOWN_PUBLIC_NULL_BLOCKS`).
Principales : `qr_code_block` (public null), `reservation_form.phone` (orphelin),
`cover_banner` (champs hors panneau), `about.collapsible`, `add_to_calendar`,
`tabs_block`/`accordion_block` (non interactifs en édition), `instagram_feed`/`tiktok_feed`
(preview différent), `payment_button` (lien), `countdown` (sans date).
