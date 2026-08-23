// templatesStudio.ts — Modèles de page « nouvelle génération ».
//
// Ce qui les distingue des modèles historiques : ils sont bâtis sur les blocs de
// CRÉATION LIBRE (section libre, carte sur image, séparateur de forme, comparatif,
// menu d'ancres…), ce qui leur donne une vraie mise en scène plutôt qu'une pile de
// cartes toutes identiques. Chacun arrive avec :
//   • un thème sur mesure — dont plusieurs CLAIRS, impossibles avant que les blocs
//     n'adaptent leurs surfaces à la luminosité de la page ;
//   • des visuels sectoriels générés (templateArt) accordés à sa palette, pour que
//     l'aperçu ait de l'allure avant même que l'utilisateur ajoute ses photos ;
//   • un contenu réaliste, immédiatement personnalisable.
//
// Les données restent des DONNÉES : aucun type de bloc inventé, mêmes clés que le
// rendu, aucun accès réseau. Ajouter un modèle = ajouter un objet ici.

import type { PageTheme } from "./types"
import { isLightTheme } from "./shared-renderer/models/layoutStyle"
import type { PageTemplate } from "./page-templates"
import { sectorArt, sectorArtImages, mixHex, type SectorArt } from "./templateArt"

// ── Thèmes sur mesure ───────────────────────────────────────────────────────
// Ils rejoignent les ambiances du moteur : n'importe quel modèle peut donc être
// re-stylé avec l'un d'eux depuis la galerie.
export const STUDIO_THEMES: Record<string, PageTheme> = {
  // Sombres
  ember: {
    name: "Braise", bg: "#12080A", surface: "#1F1012", primary: "#E2603F", accent: "#F2C14E",
    text: "#FDF1EC", muted: "#B08F86", fontDisplay: "Playfair Display", fontBody: "DM Sans",
    bgMode: "gradient", bgGradient: "linear-gradient(165deg,#12080A,#20100F)",
    effect_glow: true, glow_color: "#E2603F", glow_intensity: 20, glow_size: 380, effect_vignette: true, vignette_intensity: 40,
  },
  absinthe: {
    name: "Absinthe", bg: "#08120E", surface: "#0F211A", primary: "#6EE7B7", accent: "#A78BFA",
    text: "#ECFDF5", muted: "#7FA396", fontDisplay: "Syne", fontBody: "DM Sans",
    bgMode: "mesh", mesh_c1: "#6EE7B7", mesh_c2: "#A78BFA", mesh_c3: "#0F211A", mesh_blur: 120,
  },
  noir_or: {
    name: "Noir & Or", bg: "#0A0908", surface: "#16130E", primary: "#C9A227", accent: "#E8D9A0",
    text: "#F7F2E4", muted: "#9C9280", fontDisplay: "EB Garamond", fontBody: "DM Sans",
    bgMode: "solid", effect_vignette: true, vignette_intensity: 55, effect_noise: true, noise_opacity: 5,
  },
  graphite: {
    name: "Graphite", bg: "#0F1113", surface: "#191D21", primary: "#C0844A", accent: "#E5E7EB",
    text: "#F3F4F6", muted: "#8B959E", fontDisplay: "Oswald", fontBody: "Work Sans",
    bgMode: "gradient", bgGradient: "linear-gradient(170deg,#0F1113,#191D21)",
  },
  indigo: {
    name: "Indigo Sport", bg: "#070A16", surface: "#111938", primary: "#6366F1", accent: "#22D3EE",
    text: "#EEF2FF", muted: "#8891C0", fontDisplay: "Bebas Neue", fontBody: "Plus Jakarta Sans",
    bgMode: "mesh", mesh_c1: "#6366F1", mesh_c2: "#22D3EE", mesh_c3: "#111938", mesh_blur: 130,
  },
  rose_nuit: {
    name: "Rose Nuit", bg: "#150B12", surface: "#241220", primary: "#EC6BA0", accent: "#F5C3D8",
    text: "#FFF0F6", muted: "#B98CA2", fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient", bgGradient: "linear-gradient(160deg,#150B12,#241220)",
    effect_glow: true, glow_color: "#EC6BA0", glow_intensity: 22, glow_size: 340,
  },
  // Clairs
  creme: {
    name: "Crème", bg: "#FDF8F0", surface: "#FFFFFF", primary: "#B07D3A", accent: "#7A5230",
    text: "#2A2118", muted: "#7A6B58", fontDisplay: "Fraunces", fontBody: "DM Sans",
    bgMode: "gradient", bgGradient: "linear-gradient(170deg,#FFFCF6,#F6EADA)",
  },
  poudre: {
    name: "Rose Poudre", bg: "#FDF4F7", surface: "#FFFFFF", primary: "#C2557E", accent: "#8A5C6E",
    text: "#2E1D25", muted: "#8A7078", fontDisplay: "Playfair Display", fontBody: "DM Sans",
    bgMode: "gradient", bgGradient: "linear-gradient(170deg,#FFF8FB,#F7E6EE)",
  },
  sauge: {
    name: "Sauge", bg: "#F4F8F2", surface: "#FFFFFF", primary: "#4F7B4A", accent: "#8A6D3B",
    text: "#1F2A1D", muted: "#6A7A66", fontDisplay: "Lora", fontBody: "DM Sans",
    bgMode: "gradient", bgGradient: "linear-gradient(170deg,#F9FCF7,#EAF2E5)",
  },
  lin: {
    name: "Lin", bg: "#FAF7F2", surface: "#FFFFFF", primary: "#8A7355", accent: "#B08D5F",
    text: "#2B2620", muted: "#7C7263", fontDisplay: "EB Garamond", fontBody: "Work Sans",
    bgMode: "gradient", bgGradient: "linear-gradient(170deg,#FDFBF7,#F1EADF)",
  },
  ardoise_claire: {
    name: "Ardoise Claire", bg: "#F4F6F8", surface: "#FFFFFF", primary: "#1F4E79", accent: "#D98324",
    text: "#1B2229", muted: "#66707C", fontDisplay: "Manrope", fontBody: "Work Sans",
    bgMode: "gradient", bgGradient: "linear-gradient(170deg,#FAFBFC,#E9EEF3)",
  },
  menthe: {
    name: "Menthe", bg: "#F2FAF8", surface: "#FFFFFF", primary: "#12756A", accent: "#2E8B7A",
    text: "#12221F", muted: "#5F7A75", fontDisplay: "Outfit", fontBody: "DM Sans",
    bgMode: "gradient", bgGradient: "linear-gradient(170deg,#F8FDFC,#E6F4F0)",
  },
  mocha: {
    name: "Mocha", bg: "#FFFAF4", surface: "#FFFFFF", primary: "#7B4B2A", accent: "#B5793F",
    text: "#2A1C12", muted: "#7E6A58", fontDisplay: "Space Grotesk", fontBody: "DM Sans",
    bgMode: "gradient", bgGradient: "linear-gradient(170deg,#FFFDFA,#F6EADC)",
  },
}

// ── Fabriques de contenu récurrentes ────────────────────────────────────────
// Visuel d'OUVERTURE : le fond de la page est souvent très sombre et, une fois le voile
// appliqué par-dessus, un visuel discret disparaît complètement. On éclaircit donc la base
// vers la couleur d'accent et on double la force des halos : l'image reste perceptible sous
// le voile, sans jamais concurrencer le texte posé dessus.
const heroArt = (t: PageTheme, kind: SectorArt, variant = 0, w = 1000, h = 640): string => {
  const light = isLightTheme(t as any)
  return sectorArt(kind, {
    // Sur un thème clair, la base est presque blanche : voilée de noir, elle vire au gris
    // terne. On teinte donc franchement vers la couleur de marque — la bannière devient
    // colorée et le texte blanc y reste lisible.
    c1: mixHex(t.surface, t.primary, light ? 0.62 : 0.34),
    c2: mixHex(t.bg, t.primary, light ? 0.82 : 0.12),
    // Sur clair, un halo éclairci à forte opacité délave toute l'image : on garde la
    // couleur de marque telle quelle et on adoucit l'intensité.
    accent: light ? t.primary : (t.accent || t.primary),
    w, h, variant, glow: light ? 1.15 : 1.9,
  })
}

// Visuel de CONTENU (vignette, mosaïque, carte) : pas de voile par-dessus, donc il doit
// se démarquer du fond de la page. Sur un thème clair, un dégradé blanc sur blanc ne se
// voit pas : on teinte vers l'accent dans les deux sens, plus fort en clair qu'en sombre.
const contentArtImages = (t: PageTheme, kind: SectorArt, n: number, variant = 0, w = 600, h = 600): Record<string, string> => {
  const out: Record<string, string> = {}
  for (let i = 0; i < n; i++) out[`img${i + 1}`] = contentArt(t, kind, variant + i, w, h)
  return out
}

const contentArt = (t: PageTheme, kind: SectorArt, variant = 0, w = 600, h = 600): string => {
  const light = isLightTheme(t as any)
  return sectorArt(kind, {
    c1: mixHex(t.surface, t.primary, light ? 0.2 : 0.12),
    c2: mixHex(t.bg, t.primary, light ? 0.13 : 0.04),
    accent: t.primary,
    w, h, variant, glow: light ? 1.35 : 1.15,
  })
}

// Bandeau défilant : les trois informations qu'un passant doit voir tout de suite.
const marquee = (items: string, bg: string, sep = "✦") => ({
  type: "marquee_text", content: { items, bg_color: bg, separator: sep, speed: "26", size: "13" },
})

// Séparateur de forme : raccord propre entre deux sections de couleurs différentes.
const shape = (color: string, s = "Vague", height = "48") => ({
  type: "shape_divider", content: { shape: s, color, height },
})

const anchor = (name: string) => ({ type: "anchor_target", content: { name, offset: "18" } })

// ── Modèles ─────────────────────────────────────────────────────────────────
export const STUDIO_TEMPLATES: PageTemplate[] = [
  // ══ Restauration ══════════════════════════════════════════════════════════
  {
    key: "studio_gastro", group: "Restauration", label: "Table gastronomique", emoji: "🍷",
    desc: "Ouverture pleine page, carte, chiffres, réservation — noir et or",
    theme: STUDIO_THEMES.noir_or,
    blocks: [
      { type: "overlay_card", content: {
        image: heroArt(STUDIO_THEMES.noir_or, "food", 3, 1000, 700),
        eyebrow: "MAISON FONDÉE EN 1972", title: "La Table d'Auguste", subtitle: "Cuisine de saison · Reims",
        cta_label: "Réserver une table", cta_url: "#", height: "320", position: "Bas", align: "Gauche",
        overlay: "46", radius: "Aucun", edge: "Bord à bord",
      } },
      marquee("Menu du marché chaque midi, Terrasse chauffée, Voiturier le soir", "#C9A227"),
      { type: "anchor_nav", content: {
        i1_label: "La carte", i1_emoji: "🍽️", i1_target: "carte",
        i2_label: "La maison", i2_emoji: "✨", i2_target: "maison",
        i3_label: "Nous trouver", i3_emoji: "📍", i3_target: "acces",
        style: "Contour", align: "Centre", pad: "Compact",
      } },
      { type: "big_statement", content: {
        text: "Le produit d'abord.\nLe reste suit.", subtext: "Trente producteurs, tous à moins de 100 km.",
        size: "Très grande", align: "Centre", fill: "Dégradé", weight: "Très gras", pad: "Aéré", bg_type: "Aucun",
      } },
      shape("#16130E", "Vague douce", "52"),
      anchor("maison"),
      { type: "image_text", content: {
        image: contentArt(STUDIO_THEMES.noir_or, "food", 7, 700, 700),
        side: "Gauche", image_width: "Moyenne", image_shape: "Carrée",
        title: "Auguste, en cuisine depuis 1972", text: "Trois générations à la même adresse. La carte change avec les saisons, jamais avec les modes.",
        align: "Gauche", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "stat_hero", content: {
        eyebrow: "DEPUIS 1972", value: "52", unit: "ans", label: "à la même adresse",
        text: "Et la même recette de sauce au poivre.", size: "62", fill: "Dégradé", align: "Centre",
        pad: "Aéré", bg_type: "Carte", radius: "Arrondi",
      } },
      anchor("carte"),
      { type: "menu_tabs", content: {
        title: "La carte", text_size: "Normal", row_density: "Aéré", item_columns: "1 colonne",
        sec1_title: "Entrées",
        sec1_items: "Velouté de potimarron;14 €;Châtaignes, huile de noisette\nŒuf parfait;16 €;Champignons de Paris, comté 24 mois\nTartare de daurade;17 €;Agrumes, aneth",
        sec2_title: "Plats",
        sec2_items: "Ris de veau doré;34 €;Jus corsé, purée à la truffe\nBar de ligne;31 €;Fenouil confit, beurre blanc\nRisotto d'automne;26 €;Courge, sauge, parmesan",
        sec3_title: "Desserts",
        sec3_items: "Paris-Brest;12 €;Praliné maison\nSoufflé Grand Marnier;13 €;Compter 15 minutes\nAssiette de fromages;14 €;Affinés par nos soins",
      } },
      { type: "checklist", content: {
        title: "Le menu dégustation à 68 €", i1: "Cinq services", i2: "Accord mets et vins (+32 €)", i2_state: "Exclu",
        i3: "Pain et beurre de baratte", i4: "Mignardises", line_style: "Encadré", align: "Gauche",
        pad: "Compact", bg_type: "Aucun",
      } },
      { type: "definition_list", content: {
        title: "En pratique", layout: "En ligne", dots: "Oui",
        r1_label: "Service du midi", r1_value: "12h – 14h",
        r2_label: "Service du soir", r2_value: "19h30 – 22h",
        r3_label: "Menu dégustation", r3_value: "68 €", r3_strong: "Oui",
        r4_label: "Groupes", r4_value: "Jusqu'à 20 couverts",
        bg_type: "Carte", pad: "Compact", radius: "Arrondi",
      } },
      { type: "image_mosaic", content: {
        title: "La salle", layout: "Grande à gauche", caption: "Remplacez par vos photos",
        ...contentArtImages(STUDIO_THEMES.noir_or, "food", 5, 11, 700, 700),
        pad: "Compact", bg_type: "Aucun",
      } },
      anchor("acces"),
      { type: "google_maps_embed", content: { label: "La Table d'Auguste", address: "8 place Drouet d'Erlon, 51100 Reims", zoom: "16" } },
      { type: "free_section", content: {
        bg_type: "Image", bg_image: heroArt(STUDIO_THEMES.noir_or, "food", 5, 1000, 500),
        overlay: "58", eyebrow: "RÉSERVATION", title: "Une table vous attend",
        text: "Réservation conseillée du jeudi au samedi.", cta_label: "Réserver maintenant", cta_url: "#",
        align: "Centre", pad: "Aéré", radius: "Arrondi", edge: "Marges",
      } },
      { type: "back_to_top", content: { label: "Haut de page", align: "Centre" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  {
    key: "studio_pizzeria", group: "Restauration", label: "Pizzeria & trattoria", emoji: "🍕",
    desc: "Ardoise du jour, commande en ligne, livraison — chaud et direct",
    theme: STUDIO_THEMES.ember,
    blocks: [
      { type: "overlay_card", content: {
        image: heroArt(STUDIO_THEMES.ember, "food", 2, 1000, 620),
        eyebrow: "FOUR À BOIS", title: "Da Marco", subtitle: "Pizzas napolitaines · Pâte 48 h",
        cta_label: "Commander", cta_url: "#", height: "270", position: "Bas", align: "Gauche",
        overlay: "45", radius: "Aucun", edge: "Bord à bord",
      } },
      marquee("Livraison en 30 min, Sur place ou à emporter, Ouvert 7j/7", "#E2603F", "•"),
      { type: "split_panel", content: {
        layout: "Côte à côte",
        l_emoji: "🍽️", l_title: "Sur place", l_text: "Service continu 11h30 – 23h", l_color: "#E2603F", l_cta_label: "Réserver", l_cta_url: "#",
        r_emoji: "🛵", r_title: "Livraison", r_text: "Sous 30 min dans un rayon de 5 km", r_color: "#2A1512", r_cta_label: "Commander", r_cta_url: "#",
        pad: "Compact", bg_type: "Aucun",
      } },
      { type: "highlight_box", content: {
        emoji: "🔥", title: "L'ardoise du jour", text: "Pizza du chef : burrata, courge rôtie, huile de romarin — 15 €.\nJusqu'à épuisement.",
        color: "#F2C14E", bar_side: "Gauche", background: "Teinté", align: "Gauche",
      } },
      { type: "free_grid", content: {
        title: "Les incontournables", columns: "2", cell_style: "Carte",
        c1_emoji: "🍕", c1_title: "Margherita", c1_text: "San Marzano, fior di latte, basilic — 11 €",
        c2_emoji: "🌶️", c2_title: "Diavola", c2_text: "Nduja, piment, mozzarella — 14 €",
        c3_emoji: "🧀", c3_title: "Quattro formaggi", c3_text: "Gorgonzola, parmesan, pecorino — 15 €",
        c4_emoji: "🥬", c4_title: "Ortolana", c4_text: "Légumes grillés du marché — 13 €",
        align: "Centre", pad: "Compact", bg_type: "Aucun",
      } },
      shape("#1F1012", "Zigzag", "36"),
      { type: "steps_horizontal", content: {
        title: "Commander en 3 étapes",
        s1_emoji: "📱", s1_title: "Scannez", s1_text: "Depuis la table ou la vitrine",
        s2_emoji: "🍕", s2_title: "Choisissez", s2_text: "La carte est toujours à jour",
        s3_emoji: "🛵", s3_title: "C'est parti", s3_text: "Sur place ou livré",
        markers: "Numéros", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "badge_row", content: {
        title: "La maison", items: "Pâte 48 h, Farine italienne, Four à bois, Sans conservateur",
        style: "Doux", align: "Centre", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "11h30 – 14h · 18h30 – 23h", saturday: "11h30 – 23h30", sunday: "18h – 23h" } },
      { type: "google_maps_embed", content: { label: "Da Marco", address: "24 rue de Vesle, 51100 Reims", zoom: "16" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  {
    key: "studio_bar_nuit", group: "Restauration", label: "Bar de nuit", emoji: "🍸",
    desc: "Carte des cocktails, programmation, privatisation — ambiance nocturne",
    theme: STUDIO_THEMES.absinthe,
    blocks: [
      { type: "overlay_card", content: {
        image: heroArt(STUDIO_THEMES.absinthe, "drink", 1, 1000, 700),
        eyebrow: "COCKTAILS D'AUTEUR", title: "Le Comptoir Vert", subtitle: "Ouvert jusqu'à 2h",
        cta_label: "Réserver une table", cta_url: "#", height: "300", position: "Centre", align: "Centre",
        overlay: "48", radius: "Aucun", edge: "Bord à bord",
      } },
      marquee("Happy hour 18h – 20h, DJ le vendredi, Privatisation possible", "#6EE7B7"),
      { type: "big_statement", content: {
        text: "Douze cocktails.\nAucun compromis.", size: "Grande", align: "Centre", fill: "Dégradé",
        weight: "Très gras", spacing: "Serré", pad: "Aéré", bg_type: "Aucun",
      } },
      { type: "menu_section", content: {
        category: "Les signatures", menu_display: "Grande carte dépliable",
        item1_name: "Absinthe Sour", item1_price: "13 €", item1_desc: "Absinthe, citron, blanc d'œuf",
        item2_name: "Jardin d'hiver", item2_price: "12 €", item2_desc: "Gin, concombre, sureau",
        item3_name: "Fumée Noire", item3_price: "14 €", item3_desc: "Mezcal, cacao, piment",
        item4_name: "Sans alcool — Verveine", item4_price: "8 €", item4_desc: "Verveine fraîche, citron vert",
      } },
      { type: "timeline", content: {
        title: "La soirée", layout: "Horizontale",
        e1_icon: "🍸", e1_date: "18h", e1_title: "Happy hour",
        e2_icon: "🎧", e2_date: "21h", e2_title: "DJ set",
        e3_icon: "✨", e3_date: "23h", e3_title: "Ambiance club",
      } },
      shape("#0F211A", "Vague", "44"),
      { type: "compare_two", content: {
        title: "Pourquoi ici", left_title: "Chez nous", right_title: "Ailleurs",
        r1_left: "Sirops maison", r1_right: "Sirops industriels",
        r2_left: "Glace taillée à la main", r2_right: "Glaçons de machine",
        r3_left: "Carte sans alcool travaillée", r3_right: "Un jus d'orange",
        marks: "Oui", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "icon_row", content: {
        title: "Sur place", i1_emoji: "🎵", i1_label: "DJ résident", i2_emoji: "🌿", i2_label: "Terrasse",
        i3_emoji: "🎉", i3_label: "Privatisation", i4_emoji: "💳", i4_label: "Sans contact",
        icon_style: "Cercle", per_row: "4", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "free_section", content: {
        bg_type: "Dégradé", bg_color: "#0F211A", bg_color2: "#08120E",
        eyebrow: "PRIVATISATION", title: "Votre soirée, notre lieu",
        text: "De 20 à 80 personnes. Formule cocktails et planches sur mesure.",
        cta_label: "Demander un devis", cta_url: "#", align: "Centre", pad: "Aéré", radius: "Arrondi",
      } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "18h – 02h", saturday: "18h – 03h", sunday: "Fermé" } },
      { type: "google_maps_embed", content: { label: "Le Comptoir Vert", address: "11 rue de Mars, 51100 Reims", zoom: "16" } },
      { type: "social_links", content: { instagram: "https://instagram.com" } },
    ],
  },

  // ══ Boulangerie & café ════════════════════════════════════════════════════
  {
    key: "studio_boulangerie", group: "Restauration", label: "Boulangerie & pâtisserie", emoji: "🥐",
    desc: "Page claire, fournées du jour, commande de pain — crème et pain doré",
    theme: STUDIO_THEMES.creme,
    blocks: [
      { type: "full_bleed_image", content: {
        image: heroArt(STUDIO_THEMES.creme, "bakery", 0, 1000, 480),
        caption: "", height: "Moyenne", radius: "Aucun", edge: "Bord à bord",
      } },
      { type: "profile", content: { name: "Maison Perrin", tagline: "Boulangerie artisanale depuis 1954", badge: "Levain naturel" } },
      marquee("Fournée à 7h, 12h et 17h, Pain au levain, Farine de meule", "#B07D3A"),
      { type: "highlight_box", content: {
        emoji: "🥖", title: "Aujourd'hui", text: "Pain aux figues et noix — sortie de four à 16h30.\nQuantité limitée.",
        color: "#B07D3A", bar_side: "Gauche", background: "Teinté",
      } },
      { type: "steps_horizontal", content: {
        title: "Les fournées", s1_emoji: "🌅", s1_title: "7h00", s1_text: "Baguettes et viennoiseries",
        s2_emoji: "☀️", s2_title: "12h00", s2_text: "Pains spéciaux", s3_emoji: "🌇", s3_title: "17h00", s3_text: "Dernière fournée",
        markers: "Emojis", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      shape("#FFFFFF", "Vague douce", "44"),
      { type: "free_grid", content: {
        title: "Nos pains", columns: "2", cell_style: "Carte",
        c1_emoji: "🥖", c1_title: "Tradition", c1_text: "Levain, 24 h de pousse — 1,30 €",
        c2_emoji: "🌾", c2_title: "Meule T80", c2_text: "Farine de meule bio — 3,80 €",
        c3_emoji: "🫒", c3_title: "Olives & romarin", c3_text: "Le samedi uniquement — 4,20 €",
        c4_emoji: "🥐", c4_title: "Viennoiseries", c4_text: "Pur beurre AOP — dès 1,20 €",
        align: "Centre", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "checklist", content: {
        title: "Nos engagements", i1: "Pétri et cuit sur place, chaque jour",
        i2: "Levain naturel, jamais de levure chimique", i3: "Farines françaises, moulin à 30 km",
        i4: "Additifs et améliorants", i4_state: "Exclu",
        check_color: "#4F7B4A", line_style: "Simple", align: "Gauche", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "card_link", content: {
        image: contentArt(STUDIO_THEMES.creme, "bakery", 4, 500, 500),
        layout: "Vignette", eyebrow: "SUR COMMANDE", title: "Réserver votre pain",
        text: "48 h à l'avance pour les grandes quantités", url: "#", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "definition_list", content: {
        title: "Infos pratiques", layout: "En ligne", dots: "Oui",
        r1_label: "Ouvert", r1_value: "Mar – Dim", r2_label: "Fermeture", r2_value: "Lundi",
        r3_label: "Paiement", r3_value: "CB, espèces, titres-restaurant",
        r4_label: "Livraison", r4_value: "Sur commande", 
        bg_type: "Carte", pad: "Compact", radius: "Arrondi",
      } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "6h30 – 19h30", saturday: "6h30 – 19h30", sunday: "7h – 13h", note: "Fermé le lundi" } },
      { type: "google_maps_embed", content: { label: "Maison Perrin", address: "3 rue Chanzy, 51100 Reims", zoom: "16" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  {
    key: "studio_coffee", group: "Restauration", label: "Coffee shop", emoji: "☕",
    desc: "Torréfaction, carte du jour, wifi et travail sur place — clair et chaleureux",
    theme: STUDIO_THEMES.mocha,
    blocks: [
      { type: "overlay_card", content: {
        image: heroArt(STUDIO_THEMES.mocha, "coffee", 6, 1000, 560),
        eyebrow: "TORRÉFACTION MAISON", title: "Grain & Cie", subtitle: "Café de spécialité · Reims centre",
        cta_label: "Voir la carte", cta_url: "#", height: "250", position: "Bas", align: "Gauche",
        overlay: "45", radius: "Aucun", edge: "Bord à bord",
      } },
      { type: "icon_row", content: {
        i1_emoji: "📶", i1_label: "Wi-Fi", i2_emoji: "🔌", i2_label: "Prises", i3_emoji: "🌿", i3_label: "Terrasse",
        i4_emoji: "🐕", i4_label: "Chiens acceptés", icon_style: "Cercle", per_row: "4", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "big_statement", content: {
        text: "On torréfie ici.\nChaque mardi.", subtext: "Origines uniques, rotation toutes les six semaines.",
        size: "Grande", align: "Gauche", fill: "Uni", weight: "Très gras", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "menu_section", content: {
        category: "La carte", item1_name: "Espresso", item1_price: "2,20 €", item1_desc: "Origine du moment",
        item2_name: "Filtre V60", item2_price: "4,50 €", item2_desc: "Extraction lente, servi en carafe",
        item3_name: "Latte", item3_price: "4,20 €", item3_desc: "Lait entier, avoine ou amande",
        item4_name: "Chai maison", item4_price: "4,50 €", item4_desc: "Épices infusées 12 h",
      } },
      shape("#FFFFFF", "Arrondi", "40"),
      { type: "image_text", content: {
        image: contentArt(STUDIO_THEMES.mocha, "coffee", 9, 600, 600),
        side: "Droite", image_width: "Moyenne", image_shape: "Carrée",
        title: "Le grain du mois", text: "Éthiopie, Yirgacheffe — notes de bergamote et de fleur d'oranger. En sac de 250 g à emporter.",
        cta_label: "Découvrir", cta_url: "#", align: "Gauche", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "progress_bars", content: {
        title: "Le profil du mois", b1_label: "Acidité", b1_value: "80", b2_label: "Corps", b2_value: "45",
        b3_label: "Sucrosité", b3_value: "70", thickness: "8", show_value: "Oui", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "toggle_content", content: {
        title: "Travailler ici", text: "Le wifi est libre et sans mot de passe. Les prises sont le long du mur gauche et sous le comptoir.\n\nDe 12h à 14h, nous demandons de libérer les grandes tables pour le service du midi. Le reste de la journée, restez autant que vous voulez.",
        preview_lines: "2", open_label: "Voir les règles", close_label: "Replier", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "8h – 18h", saturday: "9h – 19h", sunday: "10h – 17h" } },
      { type: "google_maps_embed", content: { label: "Grain & Cie", address: "17 rue de l'Étape, 51100 Reims", zoom: "16" } },
      { type: "social_links", content: { instagram: "https://instagram.com" } },
    ],
  },

  // ══ Beauté ════════════════════════════════════════════════════════════════
  {
    key: "studio_coiffure", group: "Beauté & bien-être", label: "Salon de coiffure", emoji: "💇",
    desc: "Prestations chiffrées, avant/après, prise de rendez-vous — rose nuit",
    theme: STUDIO_THEMES.rose_nuit,
    blocks: [
      { type: "overlay_card", content: {
        image: heroArt(STUDIO_THEMES.rose_nuit, "hair", 2, 1000, 620),
        eyebrow: "SALON DE COIFFURE", title: "Atelier Lumière", subtitle: "Coloriste · Reims",
        cta_label: "Prendre rendez-vous", cta_url: "#", height: "280", position: "Bas", align: "Gauche",
        overlay: "44", radius: "Aucun", edge: "Bord à bord",
      } },
      marquee("Coloriste certifiée, Produits véganes, Devis avant chaque couleur", "#EC6BA0"),
      { type: "anchor_nav", content: {
        i1_label: "Tarifs", i1_emoji: "💰", i1_target: "tarifs",
        i2_label: "L'équipe", i2_emoji: "✂️", i2_target: "equipe",
        i3_label: "Rendez-vous", i3_emoji: "📅", i3_target: "rdv",
        style: "Pastilles", align: "Centre", pad: "Compact",
      } },
      anchor("tarifs"),
      { type: "definition_list", content: {
        title: "Nos tarifs", layout: "En ligne", dots: "Oui",
        r1_label: "Coupe femme + brushing", r1_value: "55 €",
        r2_label: "Coupe homme", r2_value: "32 €",
        r3_label: "Balayage", r3_value: "à partir de 95 €", r3_strong: "Oui",
        r4_label: "Couleur racines", r4_value: "62 €",
        r5_label: "Soin profond", r5_value: "28 €",
        bg_type: "Carte", pad: "Compact", radius: "Arrondi",
      } },
      { type: "checklist", content: {
        title: "Compris dans chaque prestation", i1: "Diagnostic capillaire", i2: "Shampooing et soin",
        i3: "Conseils d'entretien", i4: "Produits à la revente", i4_state: "Exclu",
        check_color: "#F5C3D8", line_style: "Simple", pad: "Compact", bg_type: "Aucun",
      } },
      shape("#241220", "Vague douce", "44"),
      { type: "before_after", content: { title: "Avant / après", before_label: "Avant", after_label: "Après" } },
      anchor("equipe"),
      { type: "team", content: {
        title: "L'équipe", m1_name: "Camille", m1_role: "Coloriste", m2_name: "Yanis", m2_role: "Coupe & barbe",
        m3_name: "Léa", m3_role: "Soins & coiffage",
      } },
      { type: "stat_hero", content: {
        eyebrow: "AVIS GOOGLE", value: "4,9", unit: "/5", label: "sur 312 avis",
        text: "Merci à vous.", size: "56", fill: "Dégradé", align: "Centre", pad: "Aéré", bg_type: "Carte", radius: "Arrondi",
      } },
      anchor("rdv"),
      { type: "free_section", content: {
        bg_type: "Dégradé", bg_color: "#EC6BA0", bg_color2: "#241220",
        title: "Réservez en ligne", text: "Disponibilités en temps réel, annulation gratuite jusqu'à 24 h avant.",
        cta_label: "Choisir mon créneau", cta_url: "#", align: "Centre", pad: "Aéré", radius: "Arrondi",
      } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "9h – 19h", saturday: "9h – 18h", sunday: "Fermé" } },
      { type: "google_maps_embed", content: { label: "Atelier Lumière", address: "6 rue Cérès, 51100 Reims", zoom: "16" } },
      { type: "back_to_top", content: { label: "Haut de page", align: "Centre" } },
      { type: "social_links", content: { instagram: "https://instagram.com" } },
    ],
  },

  {
    key: "studio_barbier", group: "Beauté & bien-être", label: "Barbier", emoji: "🪒",
    desc: "Prestations, file d'attente, abonnement — graphite et cuivre",
    theme: STUDIO_THEMES.graphite,
    blocks: [
      { type: "overlay_card", content: {
        image: heroArt(STUDIO_THEMES.graphite, "hair", 8, 1000, 600),
        eyebrow: "BARBERSHOP", title: "Le Rasoir", subtitle: "Coupe · Barbe · Rasage traditionnel",
        cta_label: "Réserver", cta_url: "#", height: "260", position: "Bas", align: "Gauche",
        overlay: "46", radius: "Aucun", edge: "Bord à bord",
      } },
      { type: "banner_strip", content: { emoji: "⏱️", text: "Sans rendez-vous · attente estimée 20 min", style: "Plein", color: "#C0844A", radius: "Doux" } },
      { type: "definition_list", content: {
        title: "La carte", layout: "En ligne", dots: "Oui",
        r1_label: "Coupe", r1_value: "26 €", r2_label: "Barbe", r2_value: "18 €",
        r3_label: "Coupe + barbe", r3_value: "38 €", r3_strong: "Oui",
        r4_label: "Rasage à l'ancienne", r4_value: "30 €", r5_label: "Enfant (- 12 ans)", r5_value: "18 €",
        bg_type: "Carte", pad: "Compact", radius: "Arrondi",
      } },
      { type: "compare_two", content: {
        title: "L'abonnement", left_title: "Abonné", right_title: "À l'unité",
        r1_left: "2 coupes par mois incluses", r1_right: "52 € par mois",
        r2_left: "Priorité sur les créneaux", r2_right: "File d'attente",
        r3_left: "− 15 % sur les produits", r3_right: "Prix plein",
        marks: "Oui", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "stat_hero", content: {
        value: "39", unit: "€/mois", label: "l'abonnement deux coupes", text: "Sans engagement, résiliable en un clic.",
        size: "50", fill: "Uni", align: "Centre", pad: "Aéré", bg_type: "Dégradé", bg_color: "#C0844A", bg_color2: "#191D21", radius: "Arrondi",
      } },
      shape("#191D21", "Pente", "40"),
      { type: "icon_row", content: {
        title: "Sur place", i1_emoji: "🍺", i1_label: "Bière offerte", i2_emoji: "📺", i2_label: "Sport en direct",
        i3_emoji: "💳", i3_label: "Sans contact", i4_emoji: "🅿️", i4_label: "Parking",
        icon_style: "Cercle", per_row: "4", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "10h – 19h", saturday: "9h – 18h", sunday: "Fermé" } },
      { type: "google_maps_embed", content: { label: "Le Rasoir", address: "44 rue Gambetta, 51100 Reims", zoom: "16" } },
      { type: "social_links", content: { instagram: "https://instagram.com" } },
    ],
  },

  {
    key: "studio_institut", group: "Beauté & bien-être", label: "Institut de beauté", emoji: "💆",
    desc: "Soins, cures, carte cadeau — page claire et douce",
    theme: STUDIO_THEMES.poudre,
    blocks: [
      { type: "full_bleed_image", content: {
        image: heroArt(STUDIO_THEMES.poudre, "beauty", 1, 1000, 460),
        height: "Moyenne", radius: "Aucun", edge: "Bord à bord",
      } },
      { type: "profile", content: { name: "Institut Néroli", tagline: "Soins du visage et du corps · Reims", badge: "Produits bio" } },
      { type: "badge_row", content: {
        items: "Bio, Sans parfum de synthèse, Végane, Made in France",
        style: "Doux", align: "Centre", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "stack_cards", content: {
        title: "Nos soins", media: "Vignette",
        c1_image: contentArt(STUDIO_THEMES.poudre, "beauty", 3, 400, 400),
        c1_badge: "Le plus demandé", c1_title: "Soin visage éclat", c1_text: "60 min — 68 €", c1_label: "Réserver", c1_url: "#",
        c2_image: contentArt(STUDIO_THEMES.poudre, "beauty", 4, 400, 400),
        c2_title: "Massage relaxant", c2_text: "45 min — 55 €", c2_label: "Réserver", c2_url: "#",
        c3_image: contentArt(STUDIO_THEMES.poudre, "beauty", 5, 400, 400),
        c3_title: "Épilation complète", c3_text: "30 min — 42 €", c3_label: "Réserver", c3_url: "#",
        align: "Gauche", pad: "Compact", bg_type: "Aucun",
      } },
      shape("#FFFFFF", "Vague douce", "44"),
      { type: "numbered_list", content: {
        title: "La cure éclat", subtitle: "Quatre séances sur deux mois",
        i1_title: "Diagnostic de peau", i1_text: "Analyse et choix des actifs",
        i2_title: "Nettoyage profond", i2_text: "Extraction douce et vapeur",
        i3_title: "Hydratation intense", i3_text: "Masque et sérum sur mesure",
        i4_title: "Entretien", i4_text: "Routine à la maison, expliquée",
        number_style: "Plein", number_shape: "Rond", align: "Gauche", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "gift_card", content: {
        title: "Offrir un soin", description: "Carte cadeau valable un an sur toutes les prestations.",
        amount1: "50 €", amount2: "80 €", amount3: "120 €", cta_label: "Offrir", cta_url: "#",
      } },
      { type: "highlight_box", content: {
        emoji: "🕊️", title: "Annulation", text: "Prévenez-nous au moins 24 h à l'avance : le créneau profitera à quelqu'un d'autre.",
        color: "#C2557E", bar_side: "Gauche", background: "Teinté",
      } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "9h30 – 19h", saturday: "9h – 17h", sunday: "Fermé" } },
      { type: "google_maps_embed", content: { label: "Institut Néroli", address: "9 rue Talleyrand, 51100 Reims", zoom: "16" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  // ══ Sport & bien-être ═════════════════════════════════════════════════════
  {
    key: "studio_salle_sport", group: "Sport & Coaching", label: "Salle de sport", emoji: "🏋️",
    desc: "Planning, formules, essai gratuit — indigo et cyan",
    theme: STUDIO_THEMES.indigo,
    blocks: [
      { type: "overlay_card", content: {
        image: heroArt(STUDIO_THEMES.indigo, "sport", 4, 1000, 640),
        eyebrow: "OUVERT 6h – 23h", title: "Fabrique Athlétique", subtitle: "Musculation · Cross · Cours collectifs",
        cta_label: "Séance d'essai gratuite", cta_url: "#", height: "300", position: "Bas", align: "Gauche",
        overlay: "46", radius: "Aucun", edge: "Bord à bord",
      } },
      marquee("Séance d'essai offerte, Sans engagement, Coach sur le plateau", "#6366F1"),
      { type: "big_statement", content: {
        text: "Venez essayer.\nOn en reparle après.", size: "Très grande", align: "Centre", fill: "Dégradé",
        weight: "Très gras", uppercase: "Oui", spacing: "Serré", pad: "Aéré", bg_type: "Aucun",
      } },
      { type: "free_grid", content: {
        title: "Le planning", columns: "2", cell_style: "Carte",
        c1_emoji: "🏃", c1_title: "Cross training", c1_text: "Lun · Mer · Ven — 18h30",
        c2_emoji: "🧘", c2_title: "Yoga", c2_text: "Mar · Jeu — 12h15",
        c3_emoji: "🥊", c3_title: "Boxe", c3_text: "Mar · Sam — 19h",
        c4_emoji: "🚴", c4_title: "Cycling", c4_text: "Tous les jours — 7h",
        align: "Centre", pad: "Compact", bg_type: "Aucun",
      } },
      shape("#111938", "Pente inversée", "40"),
      { type: "pricing", content: {
        title: "Les formules", title1: "Mensuel", price1: "39 €", desc1: "Sans engagement",
        title2: "Annuel", price2: "29 €/mois", desc2: "Le plus choisi",
        title3: "Étudiant", price3: "24 €/mois", desc3: "Sur justificatif",
        cta_label: "Je m'inscris", cta_url: "#",
      } },
      { type: "checklist", content: {
        title: "Compris dans l'abonnement", i1: "Accès illimité 6h – 23h", i2: "Tous les cours collectifs",
        i3: "Bilan et programme personnalisé", i4: "Suivi nutritionnel", i4_state: "Exclu", i4_note: "En option — 15 €/mois",
        check_color: "#22D3EE", line_style: "Encadré", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "progress_bars", content: {
        title: "Fréquentation", subtitle: "Pour choisir votre créneau",
        b1_label: "Matin (6h – 10h)", b1_value: "40", b1_note: "Tranquille",
        b2_label: "Midi (12h – 14h)", b2_value: "75", b2_note: "Chargé",
        b3_label: "Soir (18h – 21h)", b3_value: "95", b3_note: "Affluence",
        thickness: "10", show_value: "Oui", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "steps_horizontal", content: {
        title: "Commencer", s1_emoji: "📅", s1_title: "Essai", s1_text: "Gratuit, sans carte",
        s2_emoji: "📋", s2_title: "Bilan", s2_text: "30 min avec un coach",
        s3_emoji: "💪", s3_title: "Programme", s3_text: "Adapté à votre objectif",
        markers: "Numéros", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "6h – 23h", saturday: "8h – 20h", sunday: "9h – 18h" } },
      { type: "google_maps_embed", content: { label: "Fabrique Athlétique", address: "2 avenue de Laon, 51100 Reims", zoom: "16" } },
      { type: "social_links", content: { instagram: "https://instagram.com", tiktok: "https://tiktok.com" } },
    ],
  },

  // ══ Artisan ═══════════════════════════════════════════════════════════════
  {
    key: "studio_artisan", group: "Artisan & Services", label: "Artisan & dépannage", emoji: "🔧",
    desc: "Urgence, zone d'intervention, devis, garanties — clair et rassurant",
    theme: STUDIO_THEMES.ardoise_claire,
    blocks: [
      { type: "banner_strip", content: {
        emoji: "🚨", text: "Urgence ? Intervention sous 2 h", cta_label: "Appeler", cta_url: "tel:+33300000000",
        style: "Plein", color: "#D98324", radius: "Doux", edge: "Bord à bord",
      } },
      { type: "profile", content: { name: "Renard & Fils", tagline: "Plomberie · Chauffage · Reims et 30 km", badge: "Devis gratuit" } },
      { type: "icon_row", content: {
        i1_emoji: "🕐", i1_label: "7j/7", i2_emoji: "🧾", i2_label: "Devis gratuit",
        i3_emoji: "🛡️", i3_label: "Décennale", i4_emoji: "⭐", i4_label: "4,8/5",
        icon_style: "Cercle", per_row: "4", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "free_grid", content: {
        title: "Nos interventions", columns: "2", cell_style: "Carte",
        c1_emoji: "🚰", c1_title: "Fuite & débouchage", c1_text: "Intervention rapide",
        c2_emoji: "🔥", c2_title: "Chaudière", c2_text: "Entretien et dépannage",
        c3_emoji: "🚿", c3_title: "Salle de bain", c3_text: "Rénovation complète",
        c4_emoji: "💧", c4_title: "Adoucisseur", c4_text: "Pose et entretien",
        align: "Centre", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "definition_list", content: {
        title: "Nos tarifs de référence", layout: "En ligne", dots: "Oui",
        r1_label: "Déplacement", r1_value: "45 €", r2_label: "Main-d'œuvre", r2_value: "58 €/h",
        r3_label: "Devis", r3_value: "Gratuit", r3_strong: "Oui",
        r4_label: "Majoration nuit / dimanche", r4_value: "+ 50 %",
        bg_type: "Carte", pad: "Compact", radius: "Arrondi",
      } },
      shape("#FFFFFF", "Marche", "36"),
      { type: "steps_horizontal", content: {
        title: "Comment ça se passe",
        s1_emoji: "📞", s1_title: "Vous appelez", s1_text: "On évalue au téléphone",
        s2_emoji: "🧾", s2_title: "Devis", s2_text: "Écrit, avant tout travaux",
        s3_emoji: "🔧", s3_title: "Intervention", s3_text: "Au jour convenu",
        s4_emoji: "🛡️", s4_title: "Garantie", s4_text: "2 ans sur la pose",
        markers: "Numéros", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "compare_two", content: {
        title: "Ce qui nous distingue", left_title: "Chez nous", right_title: "Trop souvent",
        r1_left: "Devis écrit avant travaux", r1_right: "Prix annoncé à la fin",
        r2_left: "Créneau de 2 h annoncé", r2_right: "« Dans la journée »",
        r3_left: "Chantier nettoyé", r3_right: "À vous de ranger",
        marks: "Oui", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "service_area", content: { title: "Zone d'intervention", city: "Reims", radius: "30 km", zones: "Reims, Tinqueux, Bétheny, Cormontreuil, Épernay" } },
      { type: "contact_form", content: { title: "Demander un devis", button_label: "Envoyer ma demande", show_phone: "yes" } },
      { type: "back_to_top", content: { label: "Haut de page", align: "Centre" } },
    ],
  },

  // ══ Immobilier & hébergement ══════════════════════════════════════════════
  {
    key: "studio_gite", group: "Immobilier", label: "Gîte & chambre d'hôtes", emoji: "🏡",
    desc: "Le lieu, les équipements, les tarifs par saison — lin et bois",
    theme: STUDIO_THEMES.lin,
    blocks: [
      { type: "overlay_card", content: {
        image: heroArt(STUDIO_THEMES.lin, "home", 2, 1000, 640),
        eyebrow: "CHAMPAGNE", title: "La Maison des Vignes", subtitle: "Gîte 6 personnes · Piscine · Vue vignoble",
        cta_label: "Vérifier les disponibilités", cta_url: "#", height: "300", position: "Bas", align: "Gauche",
        overlay: "42", radius: "Aucun", edge: "Bord à bord",
      } },
      { type: "icon_row", content: {
        i1_emoji: "🛏️", i1_label: "3 chambres", i2_emoji: "🏊", i2_label: "Piscine", i3_emoji: "📶", i3_label: "Wi-Fi fibre",
        i4_emoji: "🚗", i4_label: "Parking", i5_emoji: "🐕", i5_label: "Animaux OK", i6_emoji: "🔥", i6_label: "Cheminée",
        icon_style: "Cercle", per_row: "3", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "image_mosaic", content: {
        title: "La maison", layout: "Grande à gauche",
        ...contentArtImages(STUDIO_THEMES.lin, "home", 5, 6, 700, 700),
        caption: "Remplacez par vos photos", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "definition_list", content: {
        title: "Tarifs par nuit", layout: "En ligne", dots: "Oui",
        r1_label: "Basse saison", r1_value: "140 €", r2_label: "Moyenne saison", r2_value: "180 €",
        r3_label: "Haute saison", r3_value: "230 €", r3_strong: "Oui",
        r4_label: "Ménage de fin de séjour", r4_value: "70 €", r5_label: "Taxe de séjour", r5_value: "1,10 €/pers.",
        bg_type: "Carte", pad: "Compact", radius: "Arrondi",
      } },
      shape("#FFFFFF", "Vague", "44"),
      { type: "checklist", content: {
        title: "Le séjour", i1: "Draps et linge de toilette fournis", i2: "Petit-déjeuner sur demande (12 €)",
        i3: "Arrivée à partir de 16h, départ avant 11h", i4: "Fêtes et soirées", i4_state: "Exclu",
        check_color: "#8A7355", line_style: "Simple", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "stack_cards", content: {
        title: "Aux alentours", media: "Vignette",
        c1_image: contentArt(STUDIO_THEMES.lin, "nature", 1, 400, 400),
        c1_title: "Route du champagne", c1_text: "À 5 minutes — caves et dégustations",
        c2_image: contentArt(STUDIO_THEMES.lin, "nature", 2, 400, 400),
        c2_title: "Reims", c2_text: "25 minutes — cathédrale et centre-ville",
        c3_image: contentArt(STUDIO_THEMES.lin, "nature", 3, 400, 400),
        c3_title: "Sentiers", c3_text: "Départ de randonnée devant la maison",
        align: "Gauche", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "free_section", content: {
        bg_type: "Couleur", bg_color: "#8A7355", title: "Réserver votre séjour",
        text: "Réponse sous 24 h. Acompte de 30 % à la réservation.",
        cta_label: "Demander les disponibilités", cta_url: "#", align: "Centre", pad: "Aéré", radius: "Arrondi",
      } },
      { type: "google_maps_embed", content: { label: "La Maison des Vignes", address: "Route de Villers, 51500 Rilly-la-Montagne", zoom: "14" } },
      { type: "social_links", content: { instagram: "https://instagram.com", website: "https://monsite.com" } },
    ],
  },

  // ══ Commerce ══════════════════════════════════════════════════════════════
  {
    key: "studio_boutique", group: "Commerce", label: "Boutique & concept store", emoji: "🛍️",
    desc: "Vitrine, arrivages, click & collect — corail et nuit",
    theme: STUDIO_THEMES.rose_nuit,
    blocks: [
      { type: "overlay_card", content: {
        image: heroArt(STUDIO_THEMES.rose_nuit, "retail", 5, 1000, 600),
        eyebrow: "CONCEPT STORE", title: "Trente-Deux", subtitle: "Mode, déco et objets choisis",
        cta_label: "Voir les arrivages", cta_url: "#", height: "280", position: "Centre", align: "Centre",
        overlay: "42", radius: "Aucun", edge: "Bord à bord",
      } },
      { type: "banner_strip", content: { emoji: "📦", text: "Click & collect en 2 h", style: "Contour", color: "#F5C3D8", radius: "Arrondi" } },
      { type: "free_grid", content: {
        title: "Les rayons", columns: "3", cell_style: "Nu",
        c1_emoji: "👗", c1_title: "Mode", c2_emoji: "🕯️", c2_title: "Déco", c3_emoji: "🎁", c3_title: "Cadeaux",
        c4_emoji: "📚", c4_title: "Papeterie", c5_emoji: "🧴", c5_title: "Soins", c6_emoji: "🍫", c6_title: "Épicerie fine",
        align: "Centre", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "stack_cards", content: {
        title: "Arrivages de la semaine", media: "Bandeau",
        c1_image: contentArt(STUDIO_THEMES.rose_nuit, "retail", 8, 800, 500),
        c1_badge: "Nouveau", c1_title: "Collection hiver", c1_text: "Laines et cachemires — série limitée", c1_label: "Découvrir", c1_url: "#",
        c2_image: contentArt(STUDIO_THEMES.rose_nuit, "retail", 9, 800, 500),
        c2_title: "Céramiques d'atelier", c2_text: "Pièces uniques, faites à Reims", c2_label: "Voir", c2_url: "#",
        align: "Gauche", pad: "Compact", bg_type: "Aucun",
      } },
      shape("#241220", "Arrondi", "40"),
      { type: "logo_marquee", content: {
        title: "Les marques", name1: "Atelier Nord", name2: "Céramique 51", name3: "Maison Bleue",
        name4: "Studio Craie", name5: "Les Verriers", style: "Nuances de gris", speed: "24", logo_height: "34",
        pad: "Compact", bg_type: "Aucun",
      } },
      { type: "avatar_row", content: {
        count: "+1 200", label: "clientes et clients fidèles", sublabel: "Merci à vous",
        name1: "A", name2: "M", name3: "L", align: "Centre", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "toggle_content", content: {
        title: "Retours et échanges", text: "Les articles peuvent être échangés dans les 30 jours, avec le ticket de caisse et dans leur état d'origine.\n\nLes articles soldés sont échangeables mais non remboursables. Les bijoux et cosmétiques ne sont ni repris ni échangés, pour des raisons d'hygiène.",
        preview_lines: "2", open_label: "Lire les conditions", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "10h – 19h", saturday: "10h – 19h30", sunday: "Fermé" } },
      { type: "google_maps_embed", content: { label: "Trente-Deux", address: "32 rue de Talleyrand, 51100 Reims", zoom: "16" } },
      { type: "social_links", content: { instagram: "https://instagram.com", pinterest: "https://pinterest.com" } },
    ],
  },

  {
    key: "studio_fleuriste", group: "Commerce", label: "Fleuriste", emoji: "💐",
    desc: "Compositions, abonnement, livraison — page claire et végétale",
    theme: STUDIO_THEMES.sauge,
    blocks: [
      { type: "full_bleed_image", content: {
        image: heroArt(STUDIO_THEMES.sauge, "flower", 0, 1000, 480),
        height: "Moyenne", radius: "Aucun", edge: "Bord à bord",
      } },
      { type: "profile", content: { name: "Brin de Sauge", tagline: "Fleuriste · Fleurs de saison", badge: "Producteurs locaux" } },
      marquee("Fleurs françaises, Livraison le jour même, Abonnement bureau", "#4F7B4A"),
      { type: "stack_cards", content: {
        title: "Nos compositions", media: "Vignette",
        c1_image: contentArt(STUDIO_THEMES.sauge, "flower", 2, 400, 400),
        c1_badge: "Best-seller", c1_title: "Bouquet du moment", c1_text: "Composé avec ce qui est beau aujourd'hui — dès 28 €",
        c2_image: contentArt(STUDIO_THEMES.sauge, "flower", 3, 400, 400),
        c2_title: "Grand bouquet", c2_text: "Pour marquer le coup — dès 55 €",
        c3_image: contentArt(STUDIO_THEMES.sauge, "flower", 4, 400, 400),
        c3_title: "Plante d'intérieur", c3_text: "Rempotée, avec sa notice — dès 22 €",
        align: "Gauche", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "highlight_box", content: {
        emoji: "🌱", title: "Notre parti pris", text: "Pas de fleurs importées par avion. La saison décide de la couleur du bouquet.",
        color: "#4F7B4A", bar_side: "Gauche", background: "Teinté",
      } },
      shape("#FFFFFF", "Vague douce", "44"),
      { type: "stat_hero", content: {
        eyebrow: "ABONNEMENT", value: "24", unit: "€/mois", label: "un bouquet toutes les deux semaines",
        text: "Livré au bureau ou à la maison. Sans engagement.",
        size: "52", fill: "Uni", align: "Centre", pad: "Aéré", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "steps_horizontal", content: {
        title: "Livraison", s1_emoji: "📱", s1_title: "Commande", s1_text: "Avant 14h",
        s2_emoji: "💐", s2_title: "Composition", s2_text: "Le jour même",
        s3_emoji: "🚲", s3_title: "Livraison", s3_text: "À vélo dans Reims",
        markers: "Emojis", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "definition_list", content: {
        title: "Bon à savoir", layout: "Empilée",
        r1_label: "Livraison Reims", r1_value: "6 € — offerte dès 50 €",
        r2_label: "Commande de mariage", r2_value: "Sur rendez-vous, 3 mois avant",
        r3_label: "Deuil", r3_value: "Composition en 2 h, appelez-nous",
        bg_type: "Carte", pad: "Compact", radius: "Arrondi",
      } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "9h – 19h", saturday: "9h – 19h", sunday: "9h – 13h" } },
      { type: "google_maps_embed", content: { label: "Brin de Sauge", address: "14 rue Buirette, 51100 Reims", zoom: "16" } },
      { type: "social_links", content: { instagram: "https://instagram.com" } },
    ],
  },

  // ══ Santé ═════════════════════════════════════════════════════════════════
  {
    key: "studio_sante", group: "Santé & bien-être", label: "Cabinet & praticien", emoji: "🩺",
    desc: "Motifs de consultation, prise de rendez-vous, accès — clair et apaisant",
    theme: STUDIO_THEMES.menthe,
    blocks: [
      { type: "profile", content: { name: "Cabinet Saint-Rémi", tagline: "Ostéopathie · Reims", badge: "Nouveaux patients acceptés" } },
      { type: "banner_strip", content: {
        emoji: "📅", text: "Prochain créneau : jeudi 14h", cta_label: "Réserver", cta_url: "#",
        style: "Doux", color: "#12756A", radius: "Doux",
      } },
      { type: "free_grid", content: {
        title: "Motifs de consultation", columns: "2", cell_style: "Carte",
        c1_emoji: "🦴", c1_title: "Dos et nuque", c1_text: "Lombalgie, cervicalgie",
        c2_emoji: "🤰", c2_title: "Femme enceinte", c2_text: "Suivi de grossesse",
        c3_emoji: "👶", c3_title: "Nourrisson", c3_text: "Coliques, plagiocéphalie",
        c4_emoji: "🏃", c4_title: "Sportif", c4_text: "Prévention et récupération",
        align: "Centre", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "definition_list", content: {
        title: "En pratique", layout: "En ligne", dots: "Oui",
        r1_label: "Durée", r1_value: "45 minutes", r2_label: "Tarif", r2_value: "60 €", r2_strong: "Oui",
        r3_label: "Remboursement", r3_value: "Selon mutuelle", r4_label: "Paiement", r4_value: "CB, chèque, espèces",
        bg_type: "Carte", pad: "Compact", radius: "Arrondi",
      } },
      shape("#FFFFFF", "Vague douce", "40"),
      { type: "numbered_list", content: {
        title: "Le déroulé d'une séance",
        i1_title: "Échange", i1_text: "Antécédents, mode de vie, motif",
        i2_title: "Examen", i2_text: "Tests de mobilité",
        i3_title: "Traitement", i3_text: "Techniques adaptées, jamais brusques",
        i4_title: "Conseils", i4_text: "Exercices simples à refaire chez vous",
        number_style: "Contour", align: "Gauche", pad: "Compact", bg_type: "Aucun",
      } },
      { type: "icon_row", content: {
        title: "Accès", i1_emoji: "🚊", i1_label: "Tram Opéra", i2_emoji: "🅿️", i2_label: "Parking",
        i3_emoji: "♿", i3_label: "Accès PMR", i4_emoji: "🛗", i4_label: "Ascenseur",
        icon_style: "Cercle", per_row: "4", pad: "Compact", bg_type: "Carte", radius: "Arrondi",
      } },
      { type: "highlight_box", content: {
        emoji: "⚠️", title: "En cas d'urgence", text: "L'ostéopathie ne remplace pas un avis médical. En cas de douleur intense ou soudaine, contactez le 15.",
        color: "#12756A", bar_side: "Gauche", background: "Teinté",
      } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "8h30 – 19h", saturday: "9h – 13h", sunday: "Fermé" } },
      { type: "google_maps_embed", content: { label: "Cabinet Saint-Rémi", address: "21 rue Gambetta, 51100 Reims", zoom: "16" } },
      { type: "back_to_top", content: { label: "Haut de page", align: "Centre" } },
    ],
  },
]
