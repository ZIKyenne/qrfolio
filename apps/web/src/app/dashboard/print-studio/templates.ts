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
  // ── Lot 2 (2026-08-15) : +22 modèles curatés (familles §7). Structurellement validés (templates.test.ts). ──
  { id: "cocktails-bar", name: "Cocktails · Bar", business: ["Bar", "Restaurant", "Café"], objective: ["Menu", "Commander"], style: ["dark", "luxe"], orientation: "carré", supports: ["i10", "i2", "i8"], look: { style: "barnoir", layout: "qrgeant", accent: "or", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "normal", qrBadge: "cercle", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Cocktails", subtitle: "La carte des boissons", cta: "Voir la carte" }, comp: "scannez", variants: [{ id: "or", label: "Or", hex: "#C9A84C" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }, { id: "neon", label: "Néon", hex: "#FF3D9A", style: "neon", accent: "rose" }] },
  { id: "menu-jour", name: "Menu du jour", business: ["Café", "Restaurant", "Boulangerie"], objective: ["Menu", "Commander"], style: ["chaleureux", "clair"], orientation: "portrait", supports: ["i11", "i2"], look: { style: "menuclair", layout: "orne", accent: "or", bgFinish: "uni", frame: "coins", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Menu du jour", subtitle: "Fait maison", cta: "Découvrir" }, variants: [{ id: "creme", label: "Crème", hex: "#FBF3E7" }, { id: "sauge", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }] },
  { id: "happy-hour", name: "Happy hour", business: ["Bar", "Restaurant", "Food truck"], objective: ["Promo", "Menu"], style: ["bold", "vif"], orientation: "portrait", supports: ["i7", "i2", "i8"], look: { style: "sunset", layout: "bandeau", accent: "corail", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "center", eTypo: "affiche" }, content: { title: "Happy hour", subtitle: "17 h – 19 h", cta: "En profiter" }, variants: [{ id: "sunset", label: "Sunset", hex: "#FF7A4D" }, { id: "neon", label: "Néon", hex: "#FF3D9A", style: "neon", accent: "rose" }, { id: "orange", label: "Orange", hex: "#E8602C", style: "offre", accent: "corail" }] },
  { id: "commander-table", name: "Commander à table", business: ["Restaurant", "Café", "Bar"], objective: ["Commander", "Menu"], style: ["chaleureux"], orientation: "carré", supports: ["i1", "i2"], look: { style: "restofresh", layout: "centre", accent: "rouge", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "cercle", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "moderne" }, content: { title: "Commandez ici", subtitle: "Scannez, commandez", cta: "Voir le menu" }, comp: "scannez", variants: [{ id: "rouge", label: "Rouge", hex: "#C0392B" }, { id: "creme", label: "Crème", hex: "#FBF3E7", style: "menuclair", accent: "or" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }] },
  { id: "avis-luxe", name: "Avis · Premium", business: ["Restaurant", "Hôtel", "Bijouterie"], objective: ["Avis"], style: ["premium", "luxe"], orientation: "portrait", supports: ["i3", "i5"], look: { style: "luxgold", layout: "cadre", accent: "or", bgFinish: "degrade", frame: "coins", titleCase: "upper", titleWeight: "normal", qrBadge: "cercle", eCorner: "adouci", eAccent: "trait", eAlign: "center", eTypo: "serifchic" }, content: { title: "Votre avis", subtitle: "Merci de votre visite", cta: "Nous noter" }, comp: "avis", variants: [{ id: "or", label: "Or", hex: "#C9A84C" }, { id: "nuit", label: "Nuit", hex: "#0E0E10", style: "modernblack" }, { id: "creme", label: "Crème", hex: "#FBF6EC", style: "aviscadre" }] },
  { id: "avis-merci", name: "Avis · Merci", business: ["Café", "Coiffeur", "Boutique", "Beauté"], objective: ["Avis"], style: ["chaleureux"], orientation: "portrait", supports: ["i3", "i2"], look: { style: "aviscadre", layout: "orne", accent: "or", bgFinish: "uni", frame: "coins", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Merci !", subtitle: "Un avis en 10 secondes", cta: "Laisser un avis" }, comp: "avis", variants: [{ id: "creme", label: "Crème", hex: "#FBF6EC" }, { id: "or", label: "Or", hex: "#C9A84C", style: "luxgold" }, { id: "sauge", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }] },
  { id: "insta-clair", name: "Insta · Clair", business: ["Boutique", "Beauté", "Café"], objective: ["Réseaux"], style: ["pop", "clair"], orientation: "portrait", supports: ["i3", "i9"], look: { style: "instaclair", layout: "centre", accent: "rose", bgFinish: "uni", frame: "aucun", titleCase: "normal", titleWeight: "gras", qrBadge: "carre", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "moderne" }, content: { brand: "@votrecompte", title: "Suivez-nous", subtitle: "Nos nouveautés", cta: "S'abonner" }, comp: "suivre", variants: [{ id: "clair", label: "Clair", hex: "#FFF5F8" }, { id: "rose", label: "Rose", hex: "#E1306C", style: "insta" }, { id: "violet", label: "Violet", hex: "#9B5CF6", style: "creator", accent: "violet" }] },
  { id: "linkinbio", name: "Link in bio", business: ["Freelance", "Photographe", "Artisan"], objective: ["Réseaux", "Site web"], style: ["vif", "dark"], orientation: "carré", supports: ["i6", "i9"], look: { style: "creator", layout: "qrgeant", accent: "violet", bgFinish: "grain", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "center", eTypo: "affiche" }, content: { title: "Tous mes liens", subtitle: "En un scan", cta: "Découvrir" }, variants: [{ id: "violet", label: "Violet", hex: "#9B5CF6" }, { id: "rose", label: "Rose", hex: "#E1306C", style: "insta", accent: "rose" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark", accent: "or" }] },
  { id: "carte-visite-pro", name: "Carte de visite", business: ["Freelance", "Artisan", "Coach"], objective: ["Contact", "Site web"], style: ["moderne", "dark"], orientation: "paysage", supports: ["i6"], look: { style: "modernblack", layout: "colonnes", accent: "auto", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "moderne" }, content: { brand: "Votre nom", title: "Votre métier", subtitle: "Tout mon profil en un scan", cta: "Mon profil" }, variants: [{ id: "nuit", label: "Nuit", hex: "#0E0E10" }, { id: "clair", label: "Clair", hex: "#F7F9FC", style: "contactclair", accent: "bleu" }, { id: "or", label: "Or", hex: "#D9A441", style: "portfolio", accent: "or" }] },
  { id: "portfolio-creatif", name: "Portfolio", business: ["Photographe", "Artisan", "Freelance"], objective: ["Site web", "Contact"], style: ["editorial", "premium"], orientation: "portrait", supports: ["i8", "i15", "i7"], look: { style: "portfolio", layout: "affiche", accent: "or", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "trait", eAlign: "left", eTypo: "affiche" }, content: { title: "Portfolio", subtitle: "Voir mes projets", cta: "Découvrir" }, variants: [{ id: "or", label: "Or", hex: "#D9A441" }, { id: "nuit", label: "Nuit", hex: "#0E0E10", style: "modernblack" }, { id: "edito", label: "Édito", hex: "#1A1A1A", style: "inkedit" }] },
  { id: "contact-clair", name: "Contact · Clair", business: ["Immobilier", "Coach", "Freelance"], objective: ["Contact"], style: ["clair", "corporate"], orientation: "paysage", supports: ["i6", "i5"], look: { style: "contactclair", layout: "colonnes", accent: "bleu", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "moderne" }, content: { brand: "Votre nom", title: "Restons en contact", subtitle: "Écrivez-moi en un scan", cta: "M'écrire" }, variants: [{ id: "clair", label: "Clair", hex: "#F7F9FC" }, { id: "nuit", label: "Nuit", hex: "#0F1729", style: "contact" }, { id: "or", label: "Or", hex: "#D9A441", style: "portfolio", accent: "or" }] },
  { id: "soldes", name: "Soldes", business: ["Boutique", "Commerce", "Food truck"], objective: ["Promo"], style: ["bold", "pop"], orientation: "portrait", supports: ["i8", "i7", "i3"], look: { style: "soldes", layout: "affiche", accent: "rouge", bgFinish: "uni", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left", eTypo: "affiche" }, content: { title: "Soldes", subtitle: "Jusqu'à -50 %", cta: "En profiter" }, variants: [{ id: "rouge", label: "Rouge", hex: "#FF4D4D" }, { id: "orange", label: "Orange", hex: "#E8602C", style: "offre", accent: "corail" }, { id: "nuit", label: "Nuit", hex: "#0E1116", style: "modernblack" }] },
  { id: "coupon", name: "Coupon · Remise", business: ["Boutique", "Commerce", "Coiffeur"], objective: ["Promo", "Fidélité"], style: ["pop", "clair"], orientation: "portrait", supports: ["i5", "i13"], look: { style: "offre", layout: "cadre", accent: "corail", bgFinish: "uni", frame: "double", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "center", eTypo: "affiche" }, content: { title: "-10 %", subtitle: "Sur présentation de ce QR", cta: "Scanner" }, comp: "scannez", variants: [{ id: "orange", label: "Orange", hex: "#E8602C" }, { id: "rouge", label: "Rouge", hex: "#FF4D4D", style: "soldes", accent: "rouge" }, { id: "vert", label: "Vert", hex: "#3E9E6E", style: "sage", accent: "vert" }] },
  { id: "catalogue", name: "Catalogue", business: ["Boutique", "Commerce", "Artisan"], objective: ["Site web", "Menu"], style: ["minimal", "editorial"], orientation: "portrait", supports: ["i2", "i7"], look: { style: "minimal", layout: "centre", accent: "auto", bgFinish: "uni", frame: "aucun", titleCase: "normal", titleWeight: "fin", qrBadge: "carre", eCorner: "adouci", eAccent: "trait", eAlign: "center", eTypo: "editorial" }, content: { title: "Notre catalogue", subtitle: "Toute la collection", cta: "Feuilleter" }, variants: [{ id: "blanc", label: "Blanc", hex: "#FFFFFF" }, { id: "edito", label: "Édito", hex: "#1A1A1A", style: "inkedit" }, { id: "nuit", label: "Nuit", hex: "#0E0E10", style: "modernblack" }] },
  { id: "concert", name: "Concert · Live", business: ["Événement", "Bar"], objective: ["Promo", "Réservation"], style: ["neon", "bold"], orientation: "portrait", supports: ["i8", "i15"], look: { style: "ticket", layout: "affiche", accent: "violet", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left", eTypo: "affiche" }, content: { title: "Concert live", subtitle: "Ce soir · 21 h", cta: "Billetterie" }, variants: [{ id: "violet", label: "Violet", hex: "#A855F7" }, { id: "neon", label: "Néon", hex: "#FF3D9A", style: "neon", accent: "rose" }, { id: "sunset", label: "Sunset", hex: "#FF7A4D", style: "sunset", accent: "corail" }] },
  { id: "mariage", name: "Mariage · Élégant", business: ["Événement"], objective: ["Réservation", "Site web"], style: ["premium", "luxe"], orientation: "portrait", supports: ["i5", "i16", "i7"], look: { style: "luxgold", layout: "orne", accent: "or", bgFinish: "degrade", frame: "coins", titleCase: "normal", titleWeight: "fin", qrBadge: "cercle", eCorner: "rond", eAccent: "trait", eAlign: "center", eTypo: "serifchic" }, content: { title: "Nous nous marions", subtitle: "Save the date", cta: "RSVP" }, variants: [{ id: "or", label: "Or", hex: "#C9A84C" }, { id: "ivoire", label: "Ivoire", hex: "#FBF3E7", style: "menuclair", accent: "auto" }, { id: "sauge", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }] },
  { id: "portes-ouvertes", name: "Portes ouvertes", business: ["Immobilier", "Salle de sport", "Événement"], objective: ["Promo", "Réservation"], style: ["corporate", "clair"], orientation: "portrait", supports: ["i14", "i8"], look: { style: "corporate", layout: "affiche", accent: "bleu", bgFinish: "uni", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "affiche" }, content: { title: "Portes ouvertes", subtitle: "Samedi · 10 h – 18 h", cta: "Le programme" }, variants: [{ id: "bleu", label: "Bleu", hex: "#1D4ED8" }, { id: "nuit", label: "Nuit", hex: "#0F1729", style: "contact" }, { id: "vert", label: "Vert", hex: "#2E8B7B", style: "wifivert", accent: "vert" }] },
  { id: "hotel-welcome", name: "Hôtel · Bienvenue", business: ["Hôtel", "Bar", "Restaurant"], objective: ["Wifi", "Horaires"], style: ["premium", "dark"], orientation: "portrait", supports: ["i4", "i16"], look: { style: "premiumdark", layout: "centre", accent: "or", bgFinish: "degrade", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Bienvenue", subtitle: "Wi-Fi & services", cta: "Se connecter" }, comp: "wifi", variants: [{ id: "nuit", label: "Nuit", hex: "#101010" }, { id: "or", label: "Or", hex: "#C9A84C", style: "luxgold" }, { id: "vert", label: "Vert", hex: "#2E8B7B", style: "wifivert", accent: "vert" }] },
  { id: "airbnb-welcome", name: "Airbnb · Guide", business: ["Hôtel"], objective: ["Wifi", "Localisation", "Contact"], style: ["chaleureux", "clair"], orientation: "portrait", supports: ["i16", "i4", "i9"], look: { style: "airbnb", layout: "centre", accent: "corail", bgFinish: "uni", frame: "coins", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Bienvenue", subtitle: "Le guide du logement", cta: "Ouvrir le guide" }, variants: [{ id: "sable", label: "Sable", hex: "#C56B3E" }, { id: "sauge", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }, { id: "creme", label: "Crème", hex: "#FBF3E7", style: "menuclair", accent: "or" }] },
  { id: "immo-fiche", name: "Immobilier · Bien", business: ["Immobilier"], objective: ["Contact", "Réservation", "Site web"], style: ["nature", "clair"], orientation: "paysage", supports: ["i6", "i7", "i16"], look: { style: "immo", layout: "colonnes", accent: "vert", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "moderne" }, content: { title: "À visiter", subtitle: "Toutes les infos du bien", cta: "Voir le bien" }, variants: [{ id: "vert", label: "Vert", hex: "#2E6F5E" }, { id: "bleu", label: "Bleu", hex: "#1D4ED8", style: "corporate", accent: "bleu" }, { id: "nuit", label: "Nuit", hex: "#15181C", style: "portfolio", accent: "or" }] },
  { id: "beaute-resa", name: "Beauté · Rendez-vous", business: ["Beauté", "Coiffeur", "Spa"], objective: ["Réservation"], style: ["clair", "nature"], orientation: "portrait", supports: ["i5", "i3"], look: { style: "resaclair", layout: "centre", accent: "vert", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "cercle", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Prenez rendez-vous", subtitle: "En ligne, 24/7", cta: "Réserver" }, comp: "reserver", variants: [{ id: "clair", label: "Clair", hex: "#F2F7F4" }, { id: "emeraude", label: "Émeraude", hex: "#34D399", style: "resa" }, { id: "rose", label: "Rose", hex: "#E1306C", style: "instaclair", accent: "rose" }] },
  { id: "spa-detente", name: "Spa · Détente", business: ["Spa", "Beauté", "Hôtel"], objective: ["Réservation", "Site web"], style: ["nature", "premium"], orientation: "portrait", supports: ["i16", "i4"], look: { style: "sage", layout: "cadre", accent: "vert", bgFinish: "uni", frame: "double", titleCase: "normal", titleWeight: "fin", qrBadge: "cercle", eCorner: "rond", eAccent: "trait", eAlign: "center", eTypo: "serifchic" }, content: { title: "Offrez-vous une pause", subtitle: "Nos soins", cta: "Réserver" }, variants: [{ id: "sauge", label: "Sauge", hex: "#6B8E5A" }, { id: "emeraude", label: "Émeraude", hex: "#34D399", style: "resa", accent: "vert" }, { id: "or", label: "Or", hex: "#C9A84C", style: "luxgold", accent: "or" }] },
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
