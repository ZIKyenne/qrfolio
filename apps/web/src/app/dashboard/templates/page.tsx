"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { PLAN_RANK } from "@/lib/plans"
import { slugifyBase } from "@/lib/slug"
import { Sparkles, ArrowRight, Check, X, Lock, Search, Heart, Eye, Clock, Layers, SlidersHorizontal } from "lucide-react"
import TemplatePreviewModal from "./TemplatePreviewModal"
import Particles from "@/components/Particles"
import { useIsMobile } from "@/lib/useIsMobile"
import { PAGE_TEMPLATES } from "../builder/page-templates"
import { useToast } from "@/components/Toast"

// Source unique partagée avec le builder : les modèles de page complets (métier + sous-variantes)
// alimentent AUSSI la galerie d'onboarding (en plus des 14 modèles curés historiques).
const SHARED_META = PAGE_TEMPLATES.map(t => ({
  id: t.key, name: t.label, category: t.group, plan: "free",
  description: t.desc, emoji: t.emoji,
  color: t.theme.primary, accent: t.theme.accent, bg: t.theme.bg, surface: t.theme.surface,
  tags: [] as string[],
}))
const SHARED_BLOCKS = Object.fromEntries(PAGE_TEMPLATES.map(t => [t.key, t.blocks]))
const SHARED_THEMES = Object.fromEntries(PAGE_TEMPLATES.map(t => [t.key, t.theme]))

// ── Temps estimé ─────────────────────────────────────────────────────────────
const SETUP_TIME: Record<string, string> = {
  freelance: "5 min", restaurant: "7 min", artiste: "5 min", coach: "6 min",
  createur: "4 min", event: "6 min", ecommerce: "8 min", coiffeur: "6 min",
  agence: "7 min", medecin: "6 min", vente_produits: "8 min",
  immobilier: "7 min", startup: "7 min", influenceur: "5 min",
}

// ── Popularité éditoriale (déterministe par id : stable, ~1/3 "populaire", ~1/4 "tendance") ──
function popTier(id: string): { label: string; emoji: string; color: string } | null {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  if (h % 3 === 0) return { label: "Populaire", emoji: "🔥", color: "var(--danger)" }
  if (h % 4 === 0) return { label: "Tendance", emoji: "✦", color: "#7B61FF" }
  return null
}

// ── Blocs pré-configurés ─────────────────────────────────────────────────────
const TEMPLATE_BLOCKS: Record<string, any[]> = { ...SHARED_BLOCKS, "createur":[{"type":"profile","content":{"name":"Alex Crea","tagline":"Createur de contenu - Lifestyle & Tech","badge":"500K abonnes"}},{"type":"bio","content":{"text":"Je cree du contenu autour du lifestyle, de la tech et de la productivite. Rejoins ma communaute sur tous mes reseaux !","align":"center"}},{"type":"social_links","content":{"instagram":"https://instagram.com","tiktok":"https://tiktok.com","youtube":"https://youtube.com","twitter":"https://twitter.com"}},{"type":"visit_counter","content":{"label":"vues ce mois"}},{"type":"promo_banner","content":{"emoji":"🎁","text":"Mon code promo -15%","subtext":"Code ALEX15 chez mes partenaires","cta_label":"En profiter","cta_url":"#"}},{"type":"cta_button","content":{"label":"Telecharger mon media kit","url":"#","style":"neon","icon":"📋","full_width":"yes"}},{"type":"cta_button","content":{"label":"Proposer une collaboration","url":"mailto:contact@alex.com","style":"gold","icon":"💌","full_width":"yes"}}],"freelance":[{"type":"profile","content":{"name":"Jean Dupont","tagline":"Developpeur Full-Stack & Consultant Digital","badge":"Disponible pour missions"}},{"type":"bio","content":{"text":"10 ans d experience en developpement web. Je transforme vos idees en produits digitaux performants. Specialise React, Node.js et architecture cloud.","align":"left"}},{"type":"skills","content":{"title":"Mes expertises","tags":"React, Next.js, Node.js, TypeScript, AWS, Docker, UX Design"}},{"type":"services_list","content":{"title":"Mes services","s1_icon":"💻","s1_name":"Developpement sur mesure","s1_desc":"Applications web et mobiles performantes","s2_icon":"🎨","s2_name":"Design & Prototypage","s2_desc":"Figma, design system, UI/UX","s3_icon":"🚀","s3_name":"Conseil & Architecture","s3_desc":"Audit technique, roadmap, choix stack"}},{"type":"pricing","content":{"title":"Mes tarifs","title1":"Journee","price1":"650 EUR","desc1":"TJM standard","title2":"Forfait web","price2":"3500 EUR","desc2":"Site vitrine complet","title3":"Retainer","price3":"2000 EUR","desc3":"20h/mois","cta_label":"Demander un devis","cta_url":"#"}},{"type":"testimonials","content":{"name1":"Sarah M.","text1":"Jean a livre notre MVP en 6 semaines. Code propre, communication parfaite.","stars1":"5","name2":"Thomas R.","text2":"Excellent consultant, vision claire et pragmatique.","stars2":"5"}},{"type":"calendly","content":{"label":"Reserver un appel decouverte","url":"https://calendly.com","description":"30 min - Gratuit - Visio ou telephone"}},{"type":"social_links","content":{"linkedin":"https://linkedin.com","github":"https://github.com","website":"https://monsite.com"}}],"restaurant":[{"type":"profile","content":{"name":"Le Bistrot Parisien","tagline":"Cuisine francaise depuis 1985","badge":"Ouvert aujourd hui"}},{"type":"cta_button","content":{"label":"Reserver une table","url":"#","style":"gold","icon":"🍷","full_width":"yes"}},{"type":"menu_section","content":{"category":"Entrees","item1_name":"Foie gras poele","item1_price":"18 EUR","item1_desc":"Chutney de figues","item2_name":"Soupe a l oignon","item2_price":"12 EUR","item2_desc":"Gratinee au comte","item3_name":"Tartare de saumon","item3_price":"16 EUR","item3_desc":"Avocat, citron vert"}},{"type":"menu_section","content":{"category":"Plats","item1_name":"Entrecote 300g","item1_price":"32 EUR","item1_desc":"Sauce bearnaise, frites maison","item2_name":"Filet de sole","item2_price":"28 EUR","item2_desc":"Beurre blanc, legumes","item3_name":"Risotto aux truffes","item3_price":"24 EUR","item3_desc":"Parmesan, truffe noire"}},{"type":"opening_hours","content":{"title":"Nos horaires","mon_fri":"12h-14h30 / 19h-23h","saturday":"19h-23h30","sunday":"12h-15h","note":"Reservation recommandee"}},{"type":"google_maps","content":{"label":"Le Bistrot Parisien","address":"12 rue de la Paix, 75001 Paris","transport":"Metro Opera - Ligne 3, 7, 8"}},{"type":"testimonials","content":{"name1":"Marie L.","text1":"Cuisine excellente, service impeccable. La meilleure entrecote de Paris !","stars1":"5","name2":"Pierre M.","text2":"Cadre magnifique, plats savoureux.","stars2":"5"}},{"type":"social_links","content":{"instagram":"https://instagram.com","facebook":"https://facebook.com"}}],"artiste":[{"type":"profile","content":{"name":"NOVA","tagline":"Artiste electro-pop - Paris","badge":"Nouvel EP disponible"}},{"type":"bio","content":{"text":"Productrice et chanteuse, NOVA melange electronique et pop emotionnelle pour creer un univers sonore unique. Plus de 2M de streams.","align":"center"}},{"type":"spotify_player","content":{"title":"Ecouter mon dernier EP","url":"https://open.spotify.com"}},{"type":"music_links","content":{"artist_name":"NOVA","spotify":"https://open.spotify.com","apple_music":"https://music.apple.com","deezer":"https://deezer.com","youtube_music":"https://music.youtube.com"}},{"type":"event_info","content":{"name":"Concert Release Party","date":"Samedi 28 juin 2025","time":"21h00","location":"La Cigale, Paris 18e","price":"25 EUR - Places limitees","cta_label":"Reserver ma place","cta_url":"#"}},{"type":"cta_button","content":{"label":"Me suivre sur Instagram","url":"https://instagram.com","style":"neon","icon":"📸","full_width":"yes"}},{"type":"social_links","content":{"instagram":"https://instagram.com","tiktok":"https://tiktok.com","youtube":"https://youtube.com","spotify":"https://open.spotify.com"}}],"coach":[{"type":"profile","content":{"name":"Marie Laurent","tagline":"Coach de vie certifiee - PNL et Mindfulness","badge":"+200 clients accompagnes"}},{"type":"bio","content":{"text":"Je vous accompagne vers une vie plus alignee avec vos valeurs. Ma methode combine la PNL, la pleine conscience et le coaching systemique.","align":"center"}},{"type":"services_list","content":{"title":"Mon accompagnement","s1_icon":"🎯","s1_name":"Coaching individuel","s1_desc":"Seances 1h, en visio ou presentiel","s2_icon":"👥","s2_name":"Ateliers de groupe","s2_desc":"Petits groupes de 6 personnes max","s3_icon":"📚","s3_name":"Programme 3 mois","s3_desc":"Transformation en profondeur"}},{"type":"pricing","content":{"title":"Tarifs","title1":"Seance unique","price1":"90 EUR","desc1":"1h en visio","title2":"Pack 5 seances","price2":"380 EUR","desc2":"Economisez 70 EUR","title3":"Programme 3 mois","price3":"850 EUR","desc3":"12 seances + suivi"}},{"type":"testimonials","content":{"name1":"Lucie D.","text1":"Marie m a aide a reprendre confiance en moi. Sa bienveillance est remarquable.","stars1":"5","name2":"Pierre M.","text2":"Un accompagnement qui m a permis de changer de cap professionnel.","stars2":"5"}},{"type":"calendly","content":{"label":"Seance decouverte offerte","url":"https://calendly.com","description":"45 min - Gratuit - Sans engagement"}},{"type":"social_links","content":{"instagram":"https://instagram.com","linkedin":"https://linkedin.com"}}],"ecommerce":[{"type":"profile","content":{"name":"Maison Lumiere","tagline":"Decoration artisanale et objets de createurs","badge":"Livraison gratuite des 60 EUR"}},{"type":"promo_banner","content":{"emoji":"🎉","text":"Soldes ete jusqu a -40%","subtext":"Offre valable jusqu au 31 juillet","cta_label":"Voir les offres","cta_url":"#"}},{"type":"product","content":{"name":"Vase ceramique artisanal","price":"45 EUR","old_price":"75 EUR","description":"Fait main en France, collection printemps. Livre avec certificat d authenticite.","cta_label":"Commander","cta_url":"#"}},{"type":"product","content":{"name":"Bougie parfumee 200g","price":"28 EUR","description":"Cire vegetale, parfum vanille et santal. Duree de combustion 45h.","cta_label":"Commander","cta_url":"#"}},{"type":"cta_button","content":{"label":"Voir toute la boutique","url":"#","style":"gold","icon":"🛍️","full_width":"yes"}},{"type":"testimonials","content":{"name1":"Claire B.","text1":"Des produits magnifiques, emballage soigne. Je recommande a 100% !","stars1":"5","name2":"Antoine L.","text2":"Livraison rapide, qualite au rendez-vous.","stars2":"5"}},{"type":"social_links","content":{"instagram":"https://instagram.com","pinterest":"https://pinterest.com","website":"https://monsite.com"}}],"event":[{"type":"profile","content":{"name":"GALA NIGHT 2025","tagline":"La soiree de l annee - 500 invites","badge":"Dernieres places disponibles"}},{"type":"countdown","content":{"title":"La soiree commence dans","date":"2025-12-31","subtitle":"Soyez prets pour une nuit inoubliable !"}},{"type":"event_info","content":{"name":"GALA NIGHT 2025","date":"Mercredi 31 decembre 2025","time":"21h00 - 6h00","location":"Palais Brongniart, Paris 2e","price":"A partir de 80 EUR","cta_label":"Reserver mes billets","cta_url":"#"}},{"type":"promo_banner","content":{"emoji":"🥂","text":"Early Bird - 20% de reduction","subtext":"Offre valable jusqu au 30 novembre","cta_label":"Profiter de l offre","cta_url":"#"}},{"type":"social_links","content":{"instagram":"https://instagram.com","facebook":"https://facebook.com"}}],"coiffeur":[{"type":"profile","content":{"name":"Salon Eclat","tagline":"Coiffure et Beaute - Paris 11e","badge":"4.9/5 - 300 avis"}},{"type":"bio","content":{"text":"Votre salon de coiffure et beaute a Paris. Specialises en colorations naturelles, soins keratine et balayage californien.","align":"center"}},{"type":"services_list","content":{"title":"Nos prestations","s1_icon":"✂️","s1_name":"Coupe et Brushing","s1_desc":"Femme 55 EUR - Homme 35 EUR","s2_icon":"🎨","s2_name":"Coloration et Balayage","s2_desc":"A partir de 80 EUR","s3_icon":"💆","s3_name":"Soins et Traitements","s3_desc":"Keratine, lissage, soin profond"}},{"type":"calendly","content":{"label":"Prendre rendez-vous","url":"https://calendly.com","description":"Reservation en ligne 24h/24"}},{"type":"testimonials","content":{"name1":"Emma R.","text1":"Super salon ! Le balayage est parfait, l equipe est adorable.","stars1":"5","name2":"Julie M.","text2":"Meilleure coloration de ma vie. Merci Sophie !","stars2":"5"}},{"type":"opening_hours","content":{"title":"Horaires","mon_fri":"9h - 19h","saturday":"9h - 18h","sunday":"Ferme"}},{"type":"social_links","content":{"instagram":"https://instagram.com"}}],"agence":[{"type":"profile","content":{"name":"Studio PIXEL","tagline":"Agence creative - Web - Brand - Motion","badge":"50+ projets livres"}},{"type":"bio","content":{"text":"Nous creons des experiences digitales memorables. De la strategie de marque au developpement web, nous accompagnons startups et entreprises.","align":"left"}},{"type":"services_list","content":{"title":"Nos expertises","s1_icon":"🎨","s1_name":"Branding et Identite","s1_desc":"Logo, charte graphique, guidelines","s2_icon":"💻","s2_name":"Developpement web","s2_desc":"Sites, apps, e-commerce","s3_icon":"📱","s3_name":"Social Media et Contenu","s3_desc":"Strategie, creation, gestion"}},{"type":"pricing","content":{"title":"Nos offres","title1":"Starter","price1":"2500 EUR","desc1":"Site vitrine 5 pages","title2":"Business","price2":"6500 EUR","desc2":"Site + branding complet","title3":"Premium","price3":"Sur devis","desc3":"Solution sur mesure"}},{"type":"contact_form","content":{"title":"Parlons de votre projet","button_label":"Envoyer"}},{"type":"social_links","content":{"linkedin":"https://linkedin.com","instagram":"https://instagram.com","website":"https://monsite.com"}}],"medecin":[{"type":"profile","content":{"name":"Dr. Sophie Martin","tagline":"Medecin generaliste - Paris 15e","badge":"Nouveaux patients acceptes"}},{"type":"bio","content":{"text":"Medecin generaliste avec 15 ans d experience. Consultations en cabinet ou en teleconsultation. Specialisee en medecine preventive.","align":"left"}},{"type":"services_list","content":{"title":"Consultations","s1_icon":"🏥","s1_name":"Consultation generale","s1_desc":"En cabinet ou teleconsultation","s2_icon":"💊","s2_name":"Suivi maladies chroniques","s2_desc":"Diabete, hypertension, asthme","s3_icon":"🔬","s3_name":"Bilan de sante","s3_desc":"Bilan complet annuel"}},{"type":"opening_hours","content":{"title":"Horaires de consultation","mon_fri":"8h30-12h30 / 14h-18h","saturday":"8h30-12h30","sunday":"Urgences uniquement"}},{"type":"calendly","content":{"label":"Prendre rendez-vous","url":"https://doctolib.fr","description":"Consultation en cabinet ou teleconsultation"}},{"type":"google_maps","content":{"label":"Cabinet medical","address":"45 rue de la Convention, 75015 Paris","transport":"Metro Convention - Ligne 12"}},{"type":"social_links","content":{"website":"https://doctolib.fr","phone":"tel:+33123456789"}}],"vente_produits":[{"type":"profile","content":{"name":"Digital Studio","tagline":"Formations et Ressources pour entrepreneurs","badge":"+1200 eleves formes"}},{"type":"bio","content":{"text":"Je cree des formations et ressources pratiques pour aider les entrepreneurs a developper leur business en ligne. Acces immediat apres paiement.","align":"center"}},{"type":"promo_banner","content":{"emoji":"⚡","text":"Formation bestseller a -50%","subtext":"Offre limitee - 47 EUR au lieu de 97 EUR","cta_label":"Profiter de l offre","cta_url":"#"}},{"type":"product","content":{"name":"Formation Marketing Digital 2025","price":"47 EUR","old_price":"97 EUR","description":"8h de contenu video, 50 ressources, acces a vie.","cta_label":"Acceder a la formation","cta_url":"#"}},{"type":"product","content":{"name":"Pack Templates Canva Pro","price":"27 EUR","description":"200+ templates premium pour vos reseaux sociaux.","cta_label":"Telecharger le pack","cta_url":"#"}},{"type":"testimonials","content":{"name1":"Marine C.","text1":"Formation ultra complete et actionnable. J ai triple mon CA en 3 mois !","stars1":"5","name2":"Romain D.","text2":"Les templates sont incroyables.","stars2":"5"}},{"type":"social_links","content":{"instagram":"https://instagram.com","youtube":"https://youtube.com"}}],"immobilier":[{"type":"profile","content":{"name":"Marc Dubois Immobilier","tagline":"Agent immobilier - Paris et IDF","badge":"+150 biens vendus"}},{"type":"bio","content":{"text":"Specialiste de l immobilier parisien depuis 12 ans. J accompagne acheteurs et vendeurs dans tous leurs projets immobiliers avec expertise et transparence.","align":"left"}},{"type":"services_list","content":{"title":"Mes services","s1_icon":"🏠","s1_name":"Vente et Achat","s1_desc":"Estimation, negociation, closing","s2_icon":"🔑","s2_name":"Location et Gestion","s2_desc":"Mise en location, suivi locataires","s3_icon":"📊","s3_name":"Estimation gratuite","s3_desc":"Valorisation de votre bien"}},{"type":"testimonials","content":{"name1":"Famille Moreau","text1":"Marc a trouve notre appartement ideal en 3 semaines. Professionnel et efficace.","stars1":"5","name2":"Sophie L.","text2":"Vente rapide au meilleur prix. Je recommande vivement !","stars2":"5"}},{"type":"cta_button","content":{"label":"Estimation gratuite de mon bien","url":"#","style":"gold","icon":"🏡","full_width":"yes"}},{"type":"contact_form","content":{"title":"Contactez-moi","button_label":"Envoyer ma demande"}},{"type":"social_links","content":{"linkedin":"https://linkedin.com","website":"https://monsite.com","phone":"tel:+33123456789"}}],"startup":[{"type":"profile","content":{"name":"TechVision AI","tagline":"La plateforme IA qui transforme vos donnees en decisions","badge":"Beta - Acces gratuit"}},{"type":"bio","content":{"text":"TechVision AI utilise le machine learning pour analyser vos donnees metier et generer des insights actionnables en temps reel. Plus de 500 entreprises nous font confiance.","align":"center"}},{"type":"services_list","content":{"title":"Fonctionnalites cles","s1_icon":"🤖","s1_name":"Analyse predictive","s1_desc":"Anticipez les tendances de votre marche","s2_icon":"📊","s2_name":"Tableaux de bord IA","s2_desc":"Visualisations intelligentes en temps reel","s3_icon":"🔗","s3_name":"Integrations natives","s3_desc":"Salesforce, HubSpot, Notion et +50 outils"}},{"type":"pricing","content":{"title":"Tarifs simples","title1":"Starter","price1":"0 EUR","desc1":"Pour tester","title2":"Growth","price2":"49 EUR/mois","desc2":"Pour les equipes","title3":"Enterprise","price3":"Sur devis","desc3":"Pour les grands comptes","cta_label":"Commencer gratuitement","cta_url":"#"}},{"type":"cta_button","content":{"label":"Rejoindre la beta gratuite","url":"#","style":"gold","icon":"🚀","full_width":"yes"}},{"type":"social_links","content":{"linkedin":"https://linkedin.com","twitter":"https://twitter.com","website":"https://monsite.com"}}],"influenceur":[{"type":"profile","content":{"name":"Sarah Style","tagline":"Influenceuse Mode et Lifestyle - 1.2M followers","badge":"Collaborations ouvertes"}},{"type":"bio","content":{"text":"Passionnee de mode, beaute et lifestyle. Je partage mon quotidien avec authenticite et cree du contenu inspire pour une communaute engagee et bienveillante.","align":"center"}},{"type":"social_links","content":{"instagram":"https://instagram.com","tiktok":"https://tiktok.com","youtube":"https://youtube.com","pinterest":"https://pinterest.com"}},{"type":"promo_banner","content":{"emoji":"✨","text":"Mon code promo -20%","subtext":"Code SARAH20 sur toute la boutique partenaire","cta_label":"Profiter du code","cta_url":"#"}},{"type":"cta_button","content":{"label":"Telecharger mon media kit","url":"#","style":"outline","icon":"📋","full_width":"yes"}},{"type":"cta_button","content":{"label":"Proposer une collaboration","url":"mailto:contact@sarah.com","style":"gold","icon":"💌","full_width":"yes"}},{"type":"visit_counter","content":{"label":"visiteurs ce mois"}}]}

// ── Catégories métier ─────────────────────────────────────────────────────────
interface Category { id: string; label: string; emoji: string; color: string }

const BUSINESS_CATEGORIES: Category[] = [
  { id: "Tous",        label: "Tous",        emoji: "✦",  color: "var(--accent)" },
  { id: "Restaurant",  label: "Restaurant",  emoji: "🍽️", color: "#EF4444" },
  { id: "Bar",         label: "Bar",         emoji: "🍸", color: "#F97316" },
  { id: "Cafe",        label: "Café",        emoji: "☕", color: "#92400E" },
  { id: "Freelance",   label: "Freelance",   emoji: "💼", color: "var(--accent)" },
  { id: "Consultant",  label: "Consultant",  emoji: "🎯", color: "var(--action)" },
  { id: "Coach",       label: "Coach",       emoji: "🧘", color: "#4ADE80" },
  { id: "Agence",      label: "Agence",      emoji: "🏢", color: "#A78BFA" },
  { id: "Influenceur", label: "Influenceur", emoji: "📱", color: "var(--danger)" },
  { id: "Musicien",    label: "Musicien",    emoji: "🎵", color: "#C084FC" },
  { id: "Photographe", label: "Photographe", emoji: "📷", color: "#67E8F9" },
  { id: "Immobilier",  label: "Immobilier",  emoji: "🏠", color: "#34D399" },
  { id: "Beaute",      label: "Beauté",      emoji: "💅", color: "#F472B6" },
  { id: "Sante",       label: "Santé",       emoji: "❤️", color: "#F87171" },
  { id: "Evenement",   label: "Événement",   emoji: "🎉", color: "#EC4899" },
  { id: "SaaS",        label: "SaaS",        emoji: "🚀", color: "#818CF8" },
  { id: "Ecommerce",   label: "E-commerce",  emoji: "🛍️", color: "#FB923C" },
]

// Mapping catégorie → ids templates (extensible)
const CATEGORY_MAP: Record<string, string[]> = {
  Restaurant:  ["restaurant"],
  Bar:         ["restaurant"],
  Cafe:        ["restaurant"],
  Freelance:   ["freelance", "agence"],
  Consultant:  ["freelance", "agence", "coach"],
  Coach:       ["coach"],
  Agence:      ["agence"],
  Influenceur: ["influenceur", "createur"],
  Musicien:    ["artiste"],
  Photographe: ["artiste", "freelance"],
  Immobilier:  ["immobilier"],
  Beaute:      ["coiffeur"],
  Sante:       ["medecin"],
  Evenement:   ["event"],
  SaaS:        ["startup"],
  Ecommerce:   ["ecommerce", "vente_produits"],
}

const TEMPLATES: any[] = [
  { id: "freelance", name: "Freelance Pro", category: "Business", plan: "free", description: "Portfolio, services, tarifs, prise de contact", emoji: "💼", color: "var(--accent)", accent: "var(--success)", bg: "#080808", surface: "#111009", tags: ["Services", "Tarifs", "Contact", "Calendly"] },
  { id: "restaurant", name: "Restaurant & Bar", category: "Food", plan: "free", description: "Menu, horaires, reservation, reseaux", emoji: "🍽️", color: "#EF4444", accent: "#F97316", bg: "#0D0505", surface: "#1A0A0A", tags: ["Menu", "Horaires", "Carte", "Reservation"] },
  { id: "artiste", name: "Artiste & Musicien", category: "Creatif", plan: "free", description: "Bio, musique, concerts, reseaux sociaux", emoji: "🎵", color: "#A78BFA", accent: "#F472B6", bg: "#0A0510", surface: "#130A20", tags: ["Spotify", "Concerts", "Reseaux", "Bio"] },
  { id: "coach", name: "Coach & Therapeute", category: "Bien-etre", plan: "free", description: "Presentation, methode, temoignages, RDV", emoji: "🧘", color: "#4ADE80", accent: "#86EFAC", bg: "#040D06", surface: "#081A0C", tags: ["Services", "Temoignages", "Tarifs", "RDV"] },
  { id: "createur", name: "Createur de contenu", category: "Creatif", plan: "free", description: "Liens reseaux, partenariats, stats", emoji: "📱", color: "var(--danger)", accent: "#FFD93D", bg: "#080810", surface: "#10101E", tags: ["Reseaux", "Stats", "Partenariats", "Feed"] },
  { id: "event", name: "Evenement & Soiree", category: "Event", plan: "free", description: "Countdown, programme, billetterie", emoji: "🎉", color: "#EC4899", accent: "#A855F7", bg: "#05020D", surface: "#0D0620", tags: ["Countdown", "Programme", "Billets", "Lieu"] },
  { id: "ecommerce", name: "Boutique E-commerce", category: "Commerce", plan: "starter", description: "Produits phares, promos, avis, boutique", emoji: "🛍️", color: "#F97316", accent: "#FCD34D", bg: "#0D0700", surface: "#1A1000", tags: ["Produits", "Promo", "Avis", "Boutique"], highlight: "Catalogue produits + promo" },
  { id: "coiffeur", name: "Salon Beaute", category: "Beaute", plan: "starter", description: "Services, galerie, avis, prise de RDV", emoji: "✂️", color: "#F472B6", accent: "#FB7185", bg: "#0D0508", surface: "#1A0812", tags: ["Services", "Galerie", "Avis", "RDV"], highlight: "Galerie + reservations en ligne" },
  { id: "agence", name: "Agence & Studio", category: "Business", plan: "starter", description: "Portfolio, services, tarifs, contact pro", emoji: "🏢", color: "var(--action)", accent: "#818CF8", bg: "#020C18", surface: "#041828", tags: ["Portfolio", "Services", "Tarifs", "Contact"], highlight: "Portfolio + tunnel de conversion" },
  { id: "medecin", name: "Medecin & Praticien", category: "Sante", plan: "starter", description: "Cabinet, specialites, horaires, RDV", emoji: "🏥", color: "#34D399", accent: "#6EE7B7", bg: "#020D08", surface: "#041A10", tags: ["Cabinet", "Specialites", "Horaires", "RDV"], highlight: "Integration Doctolib + infos cabinet" },
  { id: "vente_produits", name: "Vente Produits Digitaux", category: "Commerce", plan: "pro", description: "Formations, ebooks, templates, acces membres", emoji: "📦", color: "#A78BFA", accent: "#F472B6", bg: "#060410", surface: "#0E0820", tags: ["Formations", "Produits", "Temoignages", "Acces"], highlight: "Tunnel de vente complet" },
  { id: "immobilier", name: "Agent Immobilier", category: "Immobilier", plan: "pro", description: "Biens, expertises, contact, avis clients", emoji: "🏠", color: "#FBBF24", accent: "#F59E0B", bg: "#0A0800", surface: "#171200", tags: ["Biens", "Expertise", "Avis", "Contact"], highlight: "Vitrine biens + avis Google" },
  { id: "startup", name: "Startup & SaaS", category: "Tech", plan: "pro", description: "Pitch, features, pricing, waitlist", emoji: "🚀", color: "#22D3EE", accent: "#818CF8", bg: "#030A14", surface: "#06152A", tags: ["Features", "Pricing", "Waitlist", "Stats"], highlight: "Landing page SaaS avec waitlist" },
  { id: "influenceur", name: "Influenceur & Personal Brand", category: "Creatif", plan: "pro", description: "Media kit, statistiques, partenariats premium", emoji: "⭐", color: "#F59E0B", accent: "#EF4444", bg: "#0A0500", surface: "#150B00", tags: ["Media Kit", "Stats", "Partenariats", "Feed"], highlight: "Media kit professionnel" },
  ...SHARED_META,
]

const PLAN_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  free:     { label: "Gratuit",  color: "#A8A190", icon: "✦"  },
  starter:  { label: "Starter",  color: "var(--action)", icon: "⚡" },
  pro:      { label: "Pro",      color: "var(--accent)", icon: "🔥" },
  business: { label: "Business", color: "var(--success)", icon: "👑" },
}
const FAV_KEY = "qrfolio_fav_templates"
const PLAN_FILTERS: [string, string, string][] = [["all", "Tous les plans", "#A8A190"], ["free", "Gratuit ✦", "#A8A190"], ["starter", "Starter ⚡", "var(--action)"], ["pro", "Pro 🔥", "var(--accent)"]]
const STARTER_TEMPLATE_ID = "freelance" // modèle recommandé par défaut (nouvel utilisateur sans page)

export default function TemplatesPage() {
  const [selected,     setSelected]     = useState<string | null>(null)
  const [activeMetier, setActiveMetier] = useState("Tous")
  const [activePlan,   setActivePlan]   = useState("all")
  const [search,       setSearch]       = useState("")
  const [filtersOpen,  setFiltersOpen]  = useState(false) // mobile : bottom sheet filtres
  const isMobile = useIsMobile(860) // aligné sur le shell (barre de nav mobile <860) pour éviter deux barres fixes empilées
  const [creating,     setCreating]     = useState<string | null>(null)
  const [userPlan,     setUserPlan]     = useState("free")
  const [favs,         setFavs]         = useState<string[]>([])
  const [preview,      setPreview]      = useState<string | null>(null)
  const [hoveredCard,  setHoveredCard]  = useState<string | null>(null)
  const [isCreating,   setIsCreating]   = useState(false)
  const toast = useToast()
  const [namingFor,    setNamingFor]    = useState<string | null>(null)
  const router = useRouter()

  const [usedTemplateIds, setUsedTemplateIds] = useState<string[]>([])

  // Fetch user plan + pages existantes (pour la recommandation)
  useEffect(() => {
    (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        // Profil + pages en parallèle (un seul aller-retour réseau)
        const [{ data: profile }, { data: userPages }] = await Promise.all([
          sb.from("profiles").select("plan").eq("id", user.id).single(),
          sb.from("pages").select("template_id").eq("user_id", user.id),
        ])
        if (profile?.plan) setUserPlan(profile.plan)
        if (userPages) setUsedTemplateIds(userPages.map((p: any) => p.template_id).filter(Boolean))
      } catch {}
    })()
  }, [])

  useEffect(() => {
    try { setFavs(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")) } catch {}
  }, [])

  function toggleFav(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]
    setFavs(next)
    localStorage.setItem(FAV_KEY, JSON.stringify(next))
  }

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => TEMPLATES.filter((t: any) => {
    let matchMetier = activeMetier === "Tous"
    if (!matchMetier) {
      const ids = CATEGORY_MAP[activeMetier] || []
      matchMetier = ids.includes(t.id) || t.category === activeMetier
    }
    const matchPlan = activePlan === "all" || t.plan === activePlan
    const q = search.toLowerCase()
    const matchSearch = !q
      || t.name.toLowerCase().includes(q)
      || t.description.toLowerCase().includes(q)
      || (t.tags || []).some((tag: string) => tag.toLowerCase().includes(q))
    return matchMetier && matchPlan && matchSearch
  }), [activeMetier, activePlan, search])

  // Compteur par catégorie
  const countByMetier = useMemo(() => {
    const counts: Record<string, number> = { Tous: TEMPLATES.length }
    BUSINESS_CATEGORIES.slice(1).forEach(cat => {
      const ids = CATEGORY_MAP[cat.id] || []
      counts[cat.id] = TEMPLATES.filter((t: any) => ids.includes(t.id) || t.category === cat.id).length
    })
    return counts
  }, [])

  function canUse(plan: string) { return PLAN_RANK[userPlan] >= PLAN_RANK[plan] }

  // ── Recommandation (basée sur les pages existantes) ─────────────────────────
  const reco = useMemo(() => {
    const used = new Set(usedTemplateIds)
    const notUsed = TEMPLATES.filter((t: any) => !used.has(t.id))
    // priorité : un modèle populaire pas encore utilisé, sinon le 1er non utilisé
    const popular = notUsed.find((t: any) => popTier(t.id)?.label === "Populaire")
    if (used.size === 0) {
      // Aucun page encore : on guide vers un démarrage simple (modèle gratuit)
      const starter = TEMPLATES.find((t: any) => t.id === STARTER_TEMPLATE_ID) || TEMPLATES[0]
      return { t: starter, reason: "Le plus choisi pour bien démarrer", isStart: true }
    }
    const pick = popular || notUsed[0]
    if (!pick) return null
    return { t: pick, reason: `Vous avez déjà ${used.size} page${used.size > 1 ? "s" : ""} — variez les usages avec ce modèle`, isStart: false }
  }, [usedTemplateIds])

  // Thèmes complets par template (utilise les PRESET_THEMES officiels)
  const TEMPLATE_THEMES: Record<string, any> = {
    ...SHARED_THEMES,
    freelance:      { name:"Midnight Gold",bg:"#080808",surface:"#111009",primary:"var(--accent)",accent:"var(--success)",text:"#F5F0E8",muted:"#A8A190",fontDisplay:"Fraunces",fontBody:"DM Sans",bgMode:"solid",effect_glow:true,glow_color:"var(--accent)",glow_intensity:20,glow_size:350 },
    restaurant:     { name:"Sunset Fire",bg:"#120300",surface:"#200800",primary:"#FF6B00",accent:"#FF4500",text:"#FFF5EE",muted:"#9A5020",fontDisplay:"Playfair Display",fontBody:"DM Sans",bgMode:"gradient",bgGradient:"linear-gradient(160deg,#120300,#1F0600)",effect_vignette:true,vignette_intensity:60 },
    artiste:        { name:"Velvet Noir",bg:"#070508",surface:"#0F0A12",primary:"#C4A6E8",accent:"#F472B6",text:"#F5F0FF",muted:"#7A6A9A",fontDisplay:"Fraunces",fontBody:"DM Sans",bgMode:"gradient",bgGradient:"linear-gradient(160deg,#070508,#100818)",effect_glow:true,glow_color:"#A78BFA",glow_intensity:25,glow_size:350 },
    coach:          { name:"Zen Wellness",bg:"#F5FFF5",surface:"#EAFAEA",primary:"#059669",accent:"#34D399",text:"#064E3B",muted:"#407A60",fontDisplay:"DM Sans",fontBody:"DM Sans",bgMode:"solid" },
    createur:       { name:"Neon Creator",bg:"#030303",surface:"#0A0A0A",primary:"#FF0080",accent:"#00FFFF",text:"#F8F0FF",muted:"#808080",fontDisplay:"Space Grotesk",fontBody:"Space Grotesk",bgMode:"solid",effect_glow:true,glow_color:"#FF0080",glow_intensity:30,glow_size:300 },
    event:          { name:"Festival Night",bg:"#020008",surface:"#060012",primary:"#FF6B35",accent:"#FFD700",text:"#FFF5F0",muted:"#806050",fontDisplay:"Space Grotesk",fontBody:"DM Sans",bgMode:"gradient",bgGradient:"linear-gradient(145deg,#020008,#08001A)",effect_glow:true,glow_color:"#FF6B35",glow_intensity:25,glow_size:350 },
    ecommerce:      { name:"Hype Orange",bg:"#0A0500",surface:"#150A00",primary:"#FF6D00",accent:"#FFD600",text:"#FFF3E0",muted:"#9A6020",fontDisplay:"Space Grotesk",fontBody:"DM Sans",bgMode:"gradient",bgGradient:"linear-gradient(145deg,#0A0500,#180A00)" },
    coiffeur:       { name:"Rose Luxe",bg:"#0A0008",surface:"#150010",primary:"#EC4899",accent:"#F9A8D4",text:"#FFF0F8",muted:"#9060A0",fontDisplay:"DM Sans",fontBody:"DM Sans",bgMode:"gradient",bgGradient:"linear-gradient(145deg,#0A0008,#180018)",effect_glow:true,glow_color:"#EC4899",glow_intensity:25,glow_size:350 },
    agence:         { name:"Deep Space",bg:"#020B16",surface:"#071828",primary:"#00D4FF",accent:"#7B2FBE",text:"#EEF8FF",muted:"#5A7A9A",fontDisplay:"Space Grotesk",fontBody:"Inter",bgMode:"gradient",bgGradient:"linear-gradient(145deg,#020B16,#071828)" },
    medecin:        { name:"Zen Wellness",bg:"#F5FFF5",surface:"#EAFAEA",primary:"#059669",accent:"#34D399",text:"#064E3B",muted:"#407A60",fontDisplay:"DM Sans",fontBody:"DM Sans",bgMode:"solid" },
    vente_produits: { name:"Velvet Noir",bg:"#070508",surface:"#0F0A12",primary:"#C4A6E8",accent:"#F472B6",text:"#F5F0FF",muted:"#7A6A9A",fontDisplay:"Fraunces",fontBody:"DM Sans",bgMode:"gradient",bgGradient:"linear-gradient(160deg,#070508,#100818)" },
    immobilier:     { name:"Prestige Immo",bg:"#0C0C0C",surface:"#161616",primary:"#D4AF37",accent:"var(--accent)",text:"#F5F0E0",muted:"#8A7840",fontDisplay:"Fraunces",fontBody:"DM Sans",bgMode:"solid",effect_glow:true,glow_color:"#D4AF37",glow_intensity:15,glow_size:400 },
    startup:        { name:"Aurora",bg:"#080E1E",surface:"#0E1830",primary:"#00FF9D",accent:"#00CFFF",text:"#E8FFF5",muted:"#409898",fontDisplay:"Space Grotesk",fontBody:"Inter",bgMode:"mesh",mesh_c1:"#00FF9D",mesh_c2:"#00CFFF",mesh_c3:"#7B2FBE",mesh_blur:100 },
    influenceur:    { name:"Golden Luxury",bg:"#060400",surface:"#120D00",primary:"#D4A843",accent:"#FFC940",text:"#FFF3D0",muted:"#8A7030",fontDisplay:"Fraunces",fontBody:"Lora",bgMode:"gradient",bgGradient:"linear-gradient(145deg,#060400,#130E00,#060400)" },
  }

  // (createFromTemplate retiree avec la carte "Recommande" : la creation passe par
  //  le modal de nommage -> /api/templates/use.)
  const G = "var(--accent)"
  const MUTED = "#A8A190"
  const previewTemplate  = TEMPLATES.find((t: any) => t.id === preview)
  const selectedTemplate = TEMPLATES.find((t: any) => t.id === selected)
  const activeCat = BUSINESS_CATEGORIES.find(c => c.id === activeMetier)
  const hasFilters = activeMetier !== "Tous" || activePlan !== "all"

  // Chips réutilisables (inline desktop + bottom sheet mobile), mémoïsés
  const visibleCats = useMemo(() => BUSINESS_CATEGORIES.filter(c => c.id === "Tous" || (countByMetier[c.id] || 0) > 0), [countByMetier])
  const secteurChipEls = useMemo(() => visibleCats.map(cat => {
    const isActive = activeMetier === cat.id
    const count = countByMetier[cat.id] || 0
    return (
      <button key={cat.id} type="button" onClick={() => setActiveMetier(cat.id)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: isActive ? cat.color + "18" : "rgba(255,255,255,0.03)", border: isActive ? "1px solid " + cat.color + "50" : "1px solid rgba(255,255,255,0.07)", borderRadius: 20, color: isActive ? cat.color : MUTED, fontSize: 12, fontWeight: isActive ? 700 : 500, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" as const }}>
        <span style={{ fontSize: 13 }}>{cat.emoji}</span>
        {cat.label}
        <span style={{ background: isActive ? cat.color + "25" : "rgba(255,255,255,0.06)", color: isActive ? cat.color : "#555", borderRadius: 9, padding: "1px 6px", fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: "center" as const }}>{count}</span>
      </button>
    )
  }), [visibleCats, activeMetier, countByMetier])
  const planChipEls = useMemo(() => PLAN_FILTERS.map(([plan, label, color]) => (
    <button key={plan} type="button" onClick={() => setActivePlan(plan)}
      style={{ background: activePlan === plan ? color + "18" : "transparent", border: "1px solid " + (activePlan === plan ? color + "50" : "rgba(255,255,255,0.08)"), borderRadius: 20, padding: "6px 14px", color: activePlan === plan ? color : MUTED, fontSize: 12, fontWeight: activePlan === plan ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
      {label}
    </button>
  )), [activePlan])

  return (
    <div style={{ minHeight: "100vh", background: "transparent", paddingBottom: 120, fontFamily: "DM Sans, sans-serif", position: "relative" }}>
      <Particles behind />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ padding: "26px 24px 0", textAlign: "center", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: 20, padding: "5px 14px", marginBottom: 12 }}>
          <Sparkles size={13} color={G} />
          <span style={{ color: G, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Templates</span>
        </div>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(26px,3.4vw,36px)", color: "#F5F0E8", margin: "0 0 8px", fontWeight: 700 }}>
          Choisissez votre secteur
        </h1>
        <p style={{ color: MUTED, fontSize: 14.5, margin: "0 0 22px" }}>
          {TEMPLATES.length} templates pré-configurés pour votre métier
        </p>

        {/* ── Recherche ───────────────────────────────────────────────────── */}
        <div style={{ position: "relative", maxWidth: 420, margin: "0 auto 24px", width: "100%" }}>
          <Search size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: MUTED, pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un template, un secteur..."
            style={{ width: "100%", background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)", borderRadius: 12, padding: "11px 14px 11px 38px", color: "#F5F0E8", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          {search && (
            <button type="button" onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4 }}>
              <X size={12} />
            </button>
          )}
        </div>

        {!isMobile ? (
          <>
            {/* ── Navigation métier (desktop) ─────────────────────────────── */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 20, scrollbarWidth: "none" as const }}>
              {secteurChipEls}
            </div>
            {/* ── Filtres Plan (desktop) ──────────────────────────────────── */}
            <div style={{ display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
              {planChipEls}
            </div>
          </>
        ) : (
          /* ── Mobile : un seul bouton Filtrer (ouvre le bottom sheet) ────── */
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <button type="button" onClick={() => setFiltersOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "10px 18px", borderRadius: 22, cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: hasFilters ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "rgba(255,255,255,0.04)",
                border: "1px solid " + (hasFilters ? "color-mix(in srgb, var(--accent) 35%, transparent)" : "rgba(255,255,255,0.1)"),
                color: hasFilters ? "var(--accent)" : "#F5F0E8" }}>
              <SlidersHorizontal size={15} />
              {hasFilters
                ? <>{[activeCat && activeCat.id !== "Tous" ? `${activeCat.emoji} ${activeCat.label}` : null, activePlan !== "all" ? PLAN_CONFIG[activePlan]?.label : null].filter(Boolean).join(" · ")}</>
                : "Filtrer"}
              {hasFilters && <span onClick={(e) => { e.stopPropagation(); setActiveMetier("Tous"); setActivePlan("all") }} style={{ display: "inline-flex", marginLeft: 2 }}><X size={14} /></span>}
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom sheet filtres (mobile) ─────────────────────────────────── */}
      {isMobile && filtersOpen && (
        <div onClick={() => setFiltersOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", animation: "tplFade .2s ease" }}>
          <style>{`@keyframes tplFade{from{opacity:0}to{opacity:1}}@keyframes tplUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxHeight: "82vh", overflowY: "auto", background: "#0E0D0A", borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTop: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", padding: "10px 18px calc(20px + env(safe-area-inset-bottom))", animation: "tplUp .28s cubic-bezier(.2,.8,.2,1)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.18)", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 21, color: "#F5F0E8", fontWeight: 700, margin: 0 }}>Filtrer</h3>
              {hasFilters && <button type="button" onClick={() => { setActiveMetier("Tous"); setActivePlan("all") }} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Réinitialiser</button>}
            </div>

            <p style={{ color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>Secteur</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 26 }}>{secteurChipEls}</div>

            <p style={{ color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>Plan</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 26 }}>{planChipEls}</div>

            <button type="button" onClick={() => setFiltersOpen(false)}
              style={{ width: "100%", padding: 14, borderRadius: 13, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "#080808", background: "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))" }}>
              Voir {filtered.length} template{filtered.length > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* ── Grille ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px" }}>

        {/* Carte "Recommandé pour vous" retiree (redondante avec la grille, prenait trop de place) */}

        {/* Ligne de contexte */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {activeCat && activeCat.id !== "Tous" && <span style={{ fontSize: 18 }}>{activeCat.emoji}</span>}
            <span style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 600 }}>
              {activeMetier === "Tous" ? "Tous les templates" : activeCat?.label}
            </span>
            <span style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: 10, padding: "2px 9px", color: G, fontSize: 11, fontWeight: 700 }}>
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
          {(activeMetier !== "Tous" || activePlan !== "all" || search) && (
            <button type="button" onClick={() => { setActiveMetier("Tous"); setActivePlan("all"); setSearch("") }}
              style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <X size={10} /> Effacer les filtres
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: MUTED }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🔍</div>
            <p style={{ fontSize: 15, marginBottom: 8 }}>Aucun template trouvé</p>
            <p style={{ fontSize: 12, marginBottom: 20 }}>Essayez un autre secteur ou modifiez votre recherche</p>
            <button type="button" onClick={() => { setSearch(""); setActiveMetier("Tous"); setActivePlan("all") }}
              style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: 10, padding: "9px 18px", color: G, fontSize: 12, cursor: "pointer" }}>
              Voir tous les templates
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(min(290px,100%), 1fr))", gap: isMobile ? 11 : 18 }}>
            <style>{`@keyframes tplUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
            {filtered.map((template: any, idx: number) => {
              const isSelected = selected === template.id
              const planCfg = PLAN_CONFIG[template.plan]
              const locked = !canUse(template.plan)
              const blockCount = (TEMPLATE_BLOCKS[template.id] || []).length
              const isFav = favs.includes(template.id)
              const isHovered = hoveredCard === template.id
              const isCreating = creating === template.id
              const tier = popTier(template.id)

              return (
                <div key={template.id}
                  className="tpl-card"
                  role="button"
                  tabIndex={locked ? -1 : 0}
                  aria-label="Ouvrir le modèle"
                  onMouseEnter={() => setHoveredCard(template.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => { if (isMobile) { setPreview(template.id); return } if (!locked) setSelected(isSelected ? null : template.id) }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (isMobile) { setPreview(template.id); return } if (!locked) setSelected(isSelected ? null : template.id) } }}
                  style={{
                    background: isSelected ? "color-mix(in srgb, var(--accent) 5%, transparent)" : "#0F0E0B",
                    border: "1.5px solid " + (isSelected ? "color-mix(in srgb, var(--accent) 50%, transparent)" : isHovered ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "rgba(255,255,255,0.06)"),
                    borderRadius: 18, overflow: "hidden", cursor: locked ? "not-allowed" : "pointer",
                    transition: "transform .22s cubic-bezier(.2,.8,.2,1), box-shadow .22s, border-color .2s", transform: isSelected ? "translateY(-4px)" : isHovered ? "translateY(-4px)" : "none",
                    opacity: locked ? 0.6 : 1, position: "relative",
                    animation: "tplUp .45s cubic-bezier(.2,.8,.2,1) backwards", animationDelay: `${(idx % 12) * 45}ms`,
                    boxShadow: isSelected ? "0 14px 38px color-mix(in srgb, var(--accent) 16%, transparent)" : isHovered ? "0 16px 40px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.2)"
                  }}>

                  {/* ── Aperçu visuel ──────────────────────────────────────── */}
                  <div style={{ height: isMobile ? 128 : 190, background: "linear-gradient(145deg, " + template.bg + " 0%, " + template.surface + " 100%)", position: "relative", overflow: "hidden" }}>
                    {/* Ambient glow */}
                    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, " + template.color + "25, transparent 65%)" }} />

                    {/* Mini page mockup */}
                    <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%) scale(" + (isHovered ? 1.06 : 1) + ")", transition: "transform .3s cubic-bezier(.2,.8,.2,1)", width: "90%", maxWidth: 138, background: template.bg, border: "1px solid " + template.color + "20", borderRadius: 10, overflow: "hidden", zIndex: 1, boxShadow: isHovered ? "0 10px 30px rgba(0,0,0,0.45)" : "0 4px 14px rgba(0,0,0,0.3)" }}>
                      {/* Barre de couleur */}
                      <div style={{ height: 4, background: "linear-gradient(90deg," + template.color + "," + template.accent + ")" }} />
                      {/* Contenu simulé */}
                      <div style={{ padding: "10px 10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        {/* Avatar */}
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg," + template.color + "60," + template.accent + "40)", border: "1.5px solid " + template.color + "50", marginBottom: 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{template.emoji}</div>
                        <div style={{ width: "70%", height: 3, background: template.color + "80", borderRadius: 2 }} />
                        <div style={{ width: "50%", height: 2, background: MUTED + "40", borderRadius: 2 }} />
                        <div style={{ width: "80%", height: 8, background: template.color + "30", borderRadius: 4, marginTop: 3, border: "1px solid " + template.color + "40" }} />
                        <div style={{ width: "80%", height: 8, background: template.surface, borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)" }} />
                        {[72, 58, 65].map((w, i) => <div key={i} style={{ width: w + "%", height: 2, background: template.color + "20", borderRadius: 2 }} />)}
                        <div style={{ width: "80%", height: 7, background: template.color + "25", borderRadius: 3, marginTop: 1 }} />
                      </div>
                    </div>

                    {/* Badge plan (haut gauche) */}
                    <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 4, background: planCfg.color + "18", border: "1px solid " + planCfg.color + "35", borderRadius: 12, padding: "3px 8px" }}>
                      <span style={{ fontSize: 8 }}>{planCfg.icon}</span>
                      <span style={{ color: planCfg.color, fontSize: 9, fontWeight: 700 }}>{planCfg.label}</span>
                    </div>

                    {/* Favori (haut droit) */}
                    <button type="button" onClick={(e) => toggleFav(template.id, e)}
                      style={{ position: "absolute", top: 8, right: 8, width: isMobile ? 38 : 28, height: isMobile ? 38 : 28, borderRadius: "50%", background: isFav ? "rgba(239,68,68,0.15)" : "rgba(0,0,0,0.4)", border: "1px solid " + (isFav ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", zIndex: 2 }}>
                      <Heart size={12} fill={isFav ? "#EF4444" : "none"} color={isFav ? "#EF4444" : "#888"} />
                    </button>

                    {/* Check si sélectionné */}
                    {isSelected && (
                      <div style={{ position: "absolute", bottom: 10, right: 10, background: G, borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                        <Check size={12} color="#080808" />
                      </div>
                    )}

                    {/* Overlay si locked */}
                    {locked && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(8,8,8,0.65)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, zIndex: 3 }}>
                        <Lock size={20} color={planCfg.color} />
                        <span style={{ color: planCfg.color, fontSize: 10, fontWeight: 700 }}>Plan {planCfg.label}</span>
                      </div>
                    )}

                    {/* Barre de couleur bas */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg," + template.color + "," + template.accent + ")", opacity: isSelected || isHovered ? 1 : 0.4, transition: "opacity 0.2s" }} />
                  </div>

                  {/* ── Infos ─────────────────────────────────────────────── */}
                  <div style={{ padding: isMobile ? "9px 10px 11px" : "14px 16px" }}>
                    {/* Nom + catégorie */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: isMobile ? 8 : 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ color: "#F5F0E8", fontSize: isMobile ? 12.5 : 15, fontWeight: 700, margin: isMobile ? 0 : "0 0 5px", letterSpacing: "-0.2px", whiteSpace: isMobile ? "nowrap" as const : "normal", overflow: "hidden", textOverflow: "ellipsis" }}>{template.name}</h3>
                        {!isMobile && <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          <span style={{ background: template.color + "12", border: "1px solid " + template.color + "22", borderRadius: 6, padding: "1px 7px", fontSize: 9, color: template.color, fontWeight: 600 }}>{template.category}</span>
                          {tier && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: tier.color + "16", border: "1px solid " + tier.color + "33", borderRadius: 6, padding: "1px 7px", fontSize: 9, color: tier.color, fontWeight: 700 }}>
                              {tier.emoji} {tier.label}
                            </span>
                          )}
                        </div>}
                      </div>
                    </div>

                    {!isMobile && <>
                      {/* Description */}
                      <p style={{ color: MUTED, fontSize: 11, margin: "0 0 8px", lineHeight: 1.5 }}>{template.description}</p>

                      {/* Highlight */}
                      {template.highlight && (
                        <div style={{ background: template.color + "08", border: "1px solid " + template.color + "15", borderRadius: 6, padding: "4px 8px", marginBottom: 10 }}>
                          <span style={{ color: template.color, fontSize: 9, fontWeight: 600 }}>✦ {template.highlight}</span>
                        </div>
                      )}

                      {/* Métadonnées : blocs + temps */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Layers size={11} color={MUTED} />
                          <span style={{ color: MUTED, fontSize: 10 }}>{blockCount} blocs</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} color={MUTED} />
                          <span style={{ color: MUTED, fontSize: 10 }}>≈ {SETUP_TIME[template.id] || "5 min"}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
                        {template.tags.slice(0, 4).map((tag: string, i: number) => (
                          <span key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 4, padding: "2px 6px", fontSize: 9, color: MUTED }}>{tag}</span>
                        ))}
                      </div>
                    </>}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 7 }}>
                      {/* Aperçu (masqué sur mobile : tap sur la carte = aperçu) */}
                      {!isMobile && <button type="button" onClick={(e) => { e.stopPropagation(); setPreview(template.id) }}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, color: MUTED, fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#F5F0E8" }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = MUTED }}>
                        <Eye size={11} /> Aperçu
                      </button>}

                      {/* Utiliser */}
                      <button type="button" onClick={(e) => { e.stopPropagation(); if (locked) { router.push("/upgrade"); return } setNamingFor(template.id) }}
                        disabled={!!creating}
                        style={{ flex: isMobile ? 1 : 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: isMobile ? "11px 10px" : "8px 12px", background: locked ? "rgba(255,255,255,0.04)" : isCreating ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", border: locked ? "1px solid rgba(255,255,255,0.08)" : "none", borderRadius: 9, color: locked ? MUTED : "#080808", fontSize: 11, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer", opacity: creating && !isCreating ? 0.5 : 1, transition: "all 0.15s" }}>
                        {isCreating ? <><div style={{ width: 10, height: 10, border: "1.5px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "mo-spin 0.8s linear infinite" }} /> Création...</> : locked ? <><Lock size={10} /> Débloquer</> : <>Utiliser <ArrowRight size={10} /></>}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Lien page vide */}
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <button type="button" onClick={() => router.push("/dashboard/builder/new")}
            style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 14, padding: "20px 32px", color: MUTED, fontSize: 13, cursor: "pointer" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>+</div>
            Partir d'une page vide
          </button>
        </div>
      </div>

      {/* ── Modal Aperçu ──────────────────────────────────────────────────── */}
      {preview && previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          blocks={TEMPLATE_BLOCKS[previewTemplate.id] || []}
          onClose={() => setPreview(null)}
          onUse={() => {
            setPreview(null)
            if (!canUse(previewTemplate.plan)) { toast.error(`Plan ${previewTemplate.plan} requis`); return }
            setNamingFor(previewTemplate.id)
          }}
          canUse={canUse(previewTemplate.plan)}
          isCreating={isCreating}
        />
      )}

      {/* ── Barre de sélection fixe ───────────────────────────────────────── */}
      {selected && selectedTemplate && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, padding: "12px 20px", background: "rgba(8,8,8,0.95)", borderTop: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>{selectedTemplate.emoji}</span>
          <div style={{ flex: 1, maxWidth: 400 }}>
            <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 600, margin: 0 }}>{selectedTemplate.name}</p>
            <p style={{ color: MUTED, fontSize: 10, margin: 0 }}>{(TEMPLATE_BLOCKS[selected] || []).length} blocs · {SETUP_TIME[selected] || "5 min"}</p>
          </div>
          <button type="button" onClick={() => setSelected(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "9px 14px", color: MUTED, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
            <X size={12} /> Annuler
          </button>
          <button type="button" onClick={() => setNamingFor(selected!)} disabled={!!creating}
            style={{ display: "flex", alignItems: "center", gap: 7, background: creating ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", border: "none", borderRadius: 9, padding: "9px 20px", color: "#080808", fontSize: 13, fontWeight: 700, cursor: creating ? "wait" : "pointer", opacity: creating ? 0.7 : 1 }}>
            {creating === selected ? "Création en cours..." : <><ArrowRight size={12} /> Utiliser ce template</>}
          </button>
        </div>
      )}

      <style>{``}</style>

      {/* ── Modal de nommage ───────────────────────────────────────────── */}
      {namingFor && (() => {
        const tpl = TEMPLATES.find((t: any) => t.id === namingFor)
        if (!tpl) return null
        return (
          <NamingModal
            template={tpl}
            blockCount={(TEMPLATE_BLOCKS[namingFor] || []).length}
            onClose={() => setNamingFor(null)}
            onCreate={async (name, slug, description) => {
              const theme = TEMPLATE_THEMES[namingFor] || TEMPLATE_THEMES["freelance"]
              const blocks = TEMPLATE_BLOCKS[namingFor] || []
              const res = await fetch("/api/templates/use", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ templateId: namingFor, templateName: name, slug, description, theme, blocks }),
              })
              const json = await res.json()
              if (!res.ok || !json.pageId) {
                return { error: json.error || "Erreur creation page." }
              }
              if (json.atActiveLimit) {
                toast.success("Page creee en brouillon : limite de QR actifs atteinte. Mettez un QR en pause puis activez celle-ci.")
              } else {
                toast.success("Page creee avec succes")
              }
              setTimeout(() => router.push("/dashboard/builder/" + json.pageId), 500)
              return { ok: true }
            }}
          />
        )
      })()}

      <style>{`
        @keyframes popIn { from { opacity:0; transform:translateX(-50%) translateY(8px) scale(0.95) } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1) } }
      `}</style>
    </div>
  )
}// ── Composant Modal de nommage ──────────────────────────────────────────────
function NamingModal({ template, blockCount, onClose, onCreate }: {
  template: any
  blockCount: number
  onClose: () => void
  onCreate: (name: string, slug: string, description: string) => Promise<{ ok?: boolean; error?: string }>
}) {
  const G = "var(--accent)"
  const MUTED = "#A8A190"
  const [name, setName] = useState(template.name || "")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState("")
  const [slugStatus, setSlugStatus] = useState<"idle"|"checking"|"available"|"taken"|"invalid"|"reserved">("idle")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Slug d'affichage (sans suffixe, cap 60) via le coeur pur partage @/lib/slug.
  const slugify = (input: string) => slugifyBase(input, 60)

  // Auto-slug depuis le nom tant que l'utilisateur n'a pas touche le slug
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name))
  }, [name, slugTouched])

  // Verification du slug (debounce 400ms)
  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); setSuggestions([]); return }
    setSlugStatus("checking")
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/slug/check?slug=" + encodeURIComponent(slug))
        const json = await res.json()
        setSlugStatus(json.status === "available" ? "available" : json.status === "taken" ? "taken" : json.status === "reserved" ? "reserved" : "invalid")
        setSuggestions(json.suggestions || [])
      } catch {
        setSlugStatus("idle")
      }
    }, 400)
    return () => clearTimeout(t)
  }, [slug])

  const nameValid = name.trim().length >= 2 && name.trim().length <= 80
  const canSubmit = nameValid && slugStatus === "available" && !submitting

  async function handleCreate() {
    if (!canSubmit) return
    setSubmitting(true)
    setError("")
    const result = await onCreate(name.trim(), slug, description.trim())
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#0A0A0A", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
    borderRadius: 8, padding: "10px 12px", color: "#F5F0E8", fontSize: 13,
    outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif",
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0F0F0F", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.8)", maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: template.color + "18", border: "1px solid " + template.color + "35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{template.emoji}</div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>Creer une page depuis ce template</p>
            <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{template.name} · {template.category} · {blockCount} blocs</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 4 }}><X size={18} /></button>
        </div>

        {/* Nom */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 600 }}>Nom du projet</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Le Bistrot Parisien" style={inputStyle} autoFocus />
          {!nameValid && name.length > 0 && <p style={{ color: "#F87171", fontSize: 10, margin: "4px 0 0" }}>Le nom doit faire 2 a 80 caracteres.</p>}
        </div>

        {/* Slug */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 600 }}>Slug public</label>
          <input value={slug} onChange={e => { setSlugTouched(true); setSlug(slugify(e.target.value)) }} placeholder="le-bistrot-parisien" style={{ ...inputStyle, fontFamily: "monospace" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "5px 0 0", minHeight: 16 }}>
            {slugStatus === "checking" && <span style={{ color: MUTED, fontSize: 10 }}>Verification…</span>}
            {slugStatus === "available" && <span style={{ color: "var(--success)", fontSize: 10, fontWeight: 600 }}>✓ Disponible</span>}
            {slugStatus === "taken" && <span style={{ color: "#F87171", fontSize: 10, fontWeight: 600 }}>✗ Deja pris</span>}
            {slugStatus === "reserved" && <span style={{ color: "#F87171", fontSize: 10, fontWeight: 600 }}>✗ Slug reserve</span>}
            {slugStatus === "invalid" && <span style={{ color: "#FBBF24", fontSize: 10, fontWeight: 600 }}>2-60 caracteres, minuscules, chiffres, tirets</span>}
          </div>
          <p style={{ color: MUTED, fontSize: 10, margin: "4px 0 0", fontFamily: "monospace" }}>qrowg.com/{slug || "..."}</p>
          {(slugStatus === "taken") && suggestions.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => { setSlugTouched(true); setSlug(s) }} style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: 6, padding: "3px 8px", color: G, fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>{s}</button>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 600 }}>Description (optionnel)</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Courte description de la page" style={inputStyle} />
        </div>

        {/* Erreur */}
        {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 9, padding: "9px 12px", color: "#F87171", fontSize: 12, marginBottom: 14 }}>⚠ {error}</div>}

        {/* Boutons */}
        <div style={{ display: "flex", gap: 9 }}>
          <button onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px", color: MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
          <button onClick={handleCreate} disabled={!canSubmit}
            style={{ flex: 2, background: canSubmit ? "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))" : "color-mix(in srgb, var(--accent) 20%, transparent)", border: "none", borderRadius: 10, padding: "11px", color: canSubmit ? "#080808" : MUTED, fontSize: 13, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed" }}>
            {submitting ? "Creation…" : "Creer ma page"}
          </button>
        </div>
        <p style={{ color: MUTED, fontSize: 10, margin: "12px 0 0", textAlign: "center" }}>Tu pourras modifier ce nom plus tard.</p>
      </div>
    </div>
  )
}
