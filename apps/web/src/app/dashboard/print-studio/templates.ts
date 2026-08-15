// QRowg · Print Studio — Moteur de TEMPLATES (data-driven, §7-9 de la spec produit).
// Un template n'est PAS un design figé : c'est une COMPOSITION PARAMÉTRIQUE (look + contenu + taxonomie
// + composition optionnelle) que le studio applique au support courant. Ajouter un modèle = éditer ce fichier,
// zéro écran à coder. Réutilise les vocabulaires du catalogue (styles, layouts, items, objectifs).

import { STYLE_BY_ID, LAYOUT_BY_ID, ITEM_BY_ID, OBJ, type Item } from "./catalog"

// Contenu suggéré (points de départ éditables) — pas figé.
export type TemplateContent = { brand?: string; title?: string; subtitle?: string; cta?: string }

// « Look » = mêmes leviers que les presets (ambiance/mise en page/accent/fond/cadre/typo…).
export type TemplateLook = {
  style: string; layout: string; accent: string; bgFinish: string; frame: string
  titleCase: string; titleWeight: string; qrBadge: string; eCorner: string; eAccent: string
  eAlign: "left" | "center" | "right"; eTypo?: string
}

// Variante = déclinaison de palette SANS dupliquer la structure (§7 « 3-6 variantes »).
export type TemplateVariant = { id: string; label: string; hex: string; style?: string; accent?: string }

export type PrintTemplate = {
  id: string; name: string
  business: string[]; objective: string[]; style: string[]; orientation: "portrait" | "paysage" | "carré"
  supports: string[]        // ids d'items recommandés (pour filtrer/recommander/décliner)
  look: TemplateLook
  content: TemplateContent
  variants?: TemplateVariant[]
  comp?: string             // id d'une composition prête à poser (optionnel) — appliqué côté client
}

// Registre : 10 modèles premium réellement différents (V1). Chaque `look` référence des styles/layouts VALIDES ;
// la mise en page est recoercée au support à l'application (fitLayout). Les variantes ne changent que la palette.
export const TEMPLATES: PrintTemplate[] = [
  {
    id: "menu-luxe", name: "Menu · Luxe", business: ["Restaurant", "Bar", "Café", "Hôtel"], objective: ["Menu", "Commander"], style: ["premium", "luxe", "dark"], orientation: "portrait",
    supports: ["i11", "i2", "i1"],
    look: { style: "luxgold", layout: "centre", accent: "or", bgFinish: "degrade", frame: "coins", titleCase: "upper", titleWeight: "normal", qrBadge: "cercle", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "serifchic" },
    content: { title: "La carte", subtitle: "Scannez pour découvrir", cta: "Voir le menu" },
    variants: [{ id: "or", label: "Or", hex: "#C9A84C" }, { id: "ivoire", label: "Ivoire", hex: "#FBF3E7", style: "menuclair", accent: "auto" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }, { id: "bordeaux", label: "Bordeaux", hex: "#7A1F2B", style: "restofresh", accent: "rouge" }],
  },
  {
    id: "avis-google", name: "Avis · Étoiles", business: ["Restaurant", "Café", "Boutique", "Coiffeur", "Beauté"], objective: ["Avis"], style: ["minimal", "clair"], orientation: "portrait",
    supports: ["i3", "i5", "i2"],
    look: { style: "minimal", layout: "centre", accent: "auto", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "moderne" },
    content: { title: "Votre avis compte", subtitle: "En 10 secondes", cta: "Laisser un avis" },
    comp: "avis",
    variants: [{ id: "clair", label: "Clair", hex: "#FFFFFF" }, { id: "cadre", label: "Chaleureux", hex: "#FBF6EC", style: "aviscadre", accent: "or" }, { id: "nuit", label: "Nuit", hex: "#0E0E10", style: "modernblack" }],
  },
  {
    id: "wifi-invite", name: "Wi-Fi · Invité", business: ["Hôtel", "Café", "Restaurant", "Bar"], objective: ["Wifi"], style: ["clair", "nature"], orientation: "portrait",
    supports: ["i4", "i16", "i2"],
    look: { style: "wifivert", layout: "centre", accent: "vert", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "gras", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "moderne" },
    content: { title: "Wi-Fi gratuit", subtitle: "Connectez-vous en un scan", cta: "Se connecter" },
    comp: "wifi",
    variants: [{ id: "vert", label: "Vert", hex: "#2E8B7B" }, { id: "marine", label: "Marine", hex: "#1D4ED8", style: "corporate", accent: "bleu" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }],
  },
  {
    id: "reservation", name: "Réserver", business: ["Restaurant", "Coiffeur", "Spa", "Beauté"], objective: ["Réservation"], style: ["nature", "premium"], orientation: "portrait",
    supports: ["i5", "i6", "i2"],
    look: { style: "resa", layout: "centre", accent: "vert", bgFinish: "degrade", frame: "aucun", titleCase: "normal", titleWeight: "normal", qrBadge: "cercle", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "serifchic" },
    content: { title: "Réservez", subtitle: "Sur place ou en ligne", cta: "Réserver une table" },
    comp: "reserver",
    variants: [{ id: "emeraude", label: "Émeraude", hex: "#34D399" }, { id: "clair", label: "Clair", hex: "#F2F7F4", style: "resaclair", accent: "vert" }, { id: "or", label: "Or", hex: "#C9A84C", style: "luxgold", accent: "or" }],
  },
  {
    id: "insta-follow", name: "Réseaux · Suivez", business: ["Boutique", "Café", "Beauté", "Freelance"], objective: ["Réseaux"], style: ["pop", "vif"], orientation: "portrait",
    supports: ["i3", "i9", "i6"],
    look: { style: "insta", layout: "centre", accent: "rose", bgFinish: "grain", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "center", eTypo: "affiche" },
    content: { brand: "@votrecompte", title: "Suivez-nous", subtitle: "Nos actus en avant-première", cta: "S'abonner" },
    comp: "suivre",
    variants: [{ id: "rose", label: "Rose", hex: "#E1306C" }, { id: "clair", label: "Clair", hex: "#FFF5F8", style: "instaclair", accent: "rose" }, { id: "violet", label: "Violet", hex: "#9B5CF6", style: "creator", accent: "violet" }],
  },
  {
    id: "fidelite", name: "Fidélité", business: ["Café", "Boulangerie", "Boutique", "Coiffeur"], objective: ["Fidélité"], style: ["chaleureux", "clair"], orientation: "paysage",
    supports: ["i13", "i5"],
    look: { style: "airbnb", layout: "colonnes", accent: "corail", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "moderne" },
    content: { title: "Carte de fidélité", subtitle: "Cumulez, profitez", cta: "Vos points" },
    comp: "fidelite",
    variants: [{ id: "sable", label: "Sable", hex: "#C56B3E" }, { id: "nuit", label: "Nuit", hex: "#15181C", style: "portfolio", accent: "or" }, { id: "vert", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }],
  },
  {
    id: "affiche-event", name: "Événement · Affiche", business: ["Événement", "Bar", "Salle de sport"], objective: ["Promo", "Réservation"], style: ["bold", "neon"], orientation: "portrait",
    supports: ["i8", "i7", "i15"],
    look: { style: "neon", layout: "affiche", accent: "violet", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left", eTypo: "affiche" },
    content: { title: "Soirée live", subtitle: "Samedi · 21 h", cta: "Réservez" },
    variants: [{ id: "neon", label: "Néon", hex: "#FF3D9A" }, { id: "ticket", label: "Ticket", hex: "#A855F7", style: "ticket", accent: "violet" }, { id: "sunset", label: "Sunset", hex: "#FF7A4D", style: "sunset", accent: "corail" }],
  },
  {
    id: "promo-commerce", name: "Promo · Commerce", business: ["Boutique", "Food truck", "Boulangerie"], objective: ["Promo"], style: ["bold", "pop"], orientation: "portrait",
    supports: ["i7", "i8", "i3"],
    look: { style: "offre", layout: "bandeau", accent: "corail", bgFinish: "uni", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "center", eTypo: "affiche" },
    content: { title: "-20 %", subtitle: "Cette semaine seulement", cta: "En profiter" },
    variants: [{ id: "orange", label: "Orange", hex: "#E8602C" }, { id: "rouge", label: "Soldes", hex: "#FF4D4D", style: "soldes", accent: "rouge" }, { id: "nuit", label: "Nuit", hex: "#0E1116", style: "modernblack" }],
  },
  {
    id: "menu-epure", name: "Menu · Épuré", business: ["Café", "Restaurant", "Bar"], objective: ["Menu", "Commander"], style: ["minimal", "editorial"], orientation: "carré",
    supports: ["i2", "i1", "i10"],
    look: { style: "minimal", layout: "centre", accent: "auto", bgFinish: "uni", frame: "aucun", titleCase: "normal", titleWeight: "fin", qrBadge: "carre", eCorner: "adouci", eAccent: "trait", eAlign: "center", eTypo: "editorial" },
    content: { title: "Notre carte", subtitle: "", cta: "Découvrir" },
    variants: [{ id: "blanc", label: "Blanc", hex: "#FFFFFF" }, { id: "sauge", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }, { id: "edito", label: "Édito", hex: "#1A1A1A", style: "inkedit" }],
  },
  {
    id: "contact-pro", name: "Contact · Pro", business: ["Freelance", "Artisan", "Immobilier", "Coach"], objective: ["Contact", "Site web"], style: ["corporate", "clair"], orientation: "paysage",
    supports: ["i6", "i9", "i5"],
    look: { style: "contact", layout: "colonnes", accent: "bleu", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "moderne" },
    content: { brand: "Votre nom", title: "Restons en contact", subtitle: "Tout mon profil en un scan", cta: "Voir mon profil" },
    variants: [{ id: "nuit", label: "Bleu nuit", hex: "#0F1729" }, { id: "clair", label: "Clair", hex: "#F7F9FC", style: "contactclair", accent: "bleu" }, { id: "or", label: "Or", hex: "#D9A441", style: "portfolio", accent: "or" }],
  },
]

export const TEMPLATE_BY_ID: Record<string, PrintTemplate> = Object.fromEntries(TEMPLATES.map(t => [t.id, t]))

// Pertinence d'un template pour le support courant : +2 si le support est recommandé,
// +1 par objectif partagé. Renvoie TOUS les templates, les plus pertinents d'abord (stable).
export function filterTemplates(item?: Item | null): PrintTemplate[] {
  if (!item) return TEMPLATES
  const objs = OBJ[item.id] || []
  const score = (t: PrintTemplate) =>
    (t.supports.includes(item.id) ? 2 : 0) + t.objective.filter(o => objs.includes(o)).length
  return TEMPLATES.map((t, i) => ({ t, i, s: score(t) })).sort((a, b) => (b.s - a.s) || (a.i - b.i)).map(x => x.t)
}
