// blockFixtures.ts — fixtures de contenu de blocs pour les tests de caractérisation.
// Petites, lisibles, sans données personnelles. Les clés correspondent EXACTEMENT à
// celles consommées par les renderers (éditeur + public), pour tester filtres, états
// vides, liens et limites sans monter de rendu React.

export type BlockFixtures = { empty: Record<string, any>; minimal: Record<string, any>; complete: Record<string, any>; [k: string]: Record<string, any> }

export const BLOCK_FIXTURES: Record<string, BlockFixtures> = {
  contact_form: {
    empty: {},
    minimal: { title: "Contact" },
    complete: { title: "Écrivez-nous", show_phone: "yes", button_label: "Envoyer" },
  },
  pricing: {
    empty: {},
    minimal: { title1: "Starter", price1: "0€" },
    complete: { title1: "Starter", price1: "0€", title2: "Pro", price2: "9€", cta_label: "Choisir", cta_url: "https://ex.com/pay" },
    invalidUrl: { title1: "Pro", price1: "9€", cta_label: "Choisir", cta_url: "javascript:alert(1)" },
    ctaNoUrl: { title1: "Pro", price1: "9€", cta_label: "Choisir" },
  },
  values: {
    empty: {},
    minimal: { v1_label: "Qualité" },
    complete: { v1_label: "Qualité", v1_desc: "Le meilleur", v2_label: "Écoute", v3_label: "Rapidité" },
    whitespace: { v1_label: "   " },
  },
  event_program: {
    empty: {},
    minimal: { s1_title: "Accueil" },
    complete: { s1_time: "18h", s1_title: "Accueil", s2_time: "19h", s2_title: "Concert" },
  },
  lineup: {
    empty: {},
    minimal: { a1_name: "DJ Réel" },
    complete: { a1_name: "Tête d'affiche", a1_headliner: "yes", a2_name: "Artiste 2" },
    overLimit: { a1_name: "A1", a2_name: "A2", a3_name: "A3", a4_name: "A4", a5_name: "A5-ignoré" },
  },
  gallery: {
    empty: {},
    minimal: { img1: "https://ex.com/1.jpg" },
    complete: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`img${i + 1}`, `https://ex.com/${i + 1}.jpg`])),
    overLimit: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`img${i + 1}`, `https://ex.com/${i + 1}.jpg`])),
  },
  two_columns: {
    empty: {},
    minimal: { col1_title: "Colonne A" },
    complete: { col1_title: "A", col1_text: "texte A", col2_title: "B", col2_text: "texte B" },
    partial: { col2_text: "seulement la 2" },
  },
  merch: {
    empty: {},
    minimal: { name1: "T-shirt", price1: "25€" },
    complete: { name1: "T-shirt", price1: "25€", name2: "Vinyle", price2: "35€" },
  },
  trust_badge: {
    empty: {},
    minimal: { b1_label: "Certifié" },
    complete: { b1_icon: "🏆", b1_label: "Certifié", b2_label: "Vérifié" },
  },
  // ── Vague 1 (B09.4) ─────────────────────────────────────────────────────────
  divider: {
    empty: {},
    minimal: { style: "gold" },
    complete: { style: "stars" },
    invalid: { style: "inconnu" },
  },
  spacer: {
    empty: {},
    minimal: { size: "md" },
    complete: { size: "xl" },
    invalid: { size: "wat" },
  },
  bio: {
    empty: {},
    minimal: { text: "Développeur passionné." },
    complete: { text: "Développeur passionné.", align: "center" },
    longContent: { text: "Lorem ".repeat(60).trim() },
  },
  skills: {
    empty: {},
    minimal: { tags: "React" },
    complete: { title: "Compétences", tags: "React, TypeScript, Node" },
    invalid: { tags: " , ,  " },
  },
  languages: {
    empty: {},
    minimal: { lang_1_name: "Français" },
    complete: { title: "Langues", lang_1_flag: "🇫🇷", lang_1_name: "Français", lang_1_level: "Natif", lang_2_name: "Anglais" },
  },
  advantages: {
    empty: {},
    minimal: { adv1: "Livraison rapide" },
    complete: { title: "Avantages", adv1: "Livraison rapide", adv2: "Sans engagement" },
  },
}

// Fixtures canoniques d'URL — réutilisées par les tests de sécurité des liens.
export const URL_FIXTURES = {
  https: "https://example.com",
  http: "http://example.com",
  internal: "/interne",
  anchor: "#section",
  mailto: "mailto:test@example.com",
  tel: "tel:+33123456789",
  sms: "sms:+33123456789",
  empty: "",
  spaces: "   ",
  javascript: "javascript:alert(1)",
  bareDomain: "example.com/page",
  arbitrary: "pas une url",
  long: "https://example.com/" + "a".repeat(500),
} as const
