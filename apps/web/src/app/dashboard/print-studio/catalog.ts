// QRowg · Print Studio — catalogue de données
// Porté depuis « Print Studio Mobile v3 ». Aucune dépendance, aucun DOM.
// Tout est en français côté libellés : ce sont les chaînes affichées à l'utilisateur.
//
// Vocabulaire :
// - OBJET (ITEMS)  : un support réel (« Sticker de table »), pas un format.
// - STYLE          : un thème graphique complet (fond, encre, accent, typos, couleurs du QR).
// - AMBIANCE       : un regroupement de styles proposé à l'utilisateur (8 entrées).
// - MÉTIER         : filtre d'entrée (20 entrées) — ordonne objets et ambiances.
// - OBJECTIF (OBJ) : à quoi sert l'objet (Menu, Avis, Wifi…), pour le filtre croisé.

export type Style = {
  id: string; label: string; bg: string; ink: string; accent: string;
  title: string; body: string; qr: string; qrBg: string;
}
export type Typo = { id: string; label: string; t: string | null; b: string | null }
export type Ambiance = { id: string; label: string; rep: string; styles: string[] }
export type Layout = { id: string; label: string; content: string; deco: string | null }
export type Item = {
  id: string; hMm: number; place: string; scene: string; layout: string;
  name: string; support: string; size: string; bleed: number; margin: number;
  dpi: number; shape: string; ratio: number; plain: string; kicker: string;
  title: string; cta: string; qrMm: number; pal: string;
}
export type Size = { id: string; label: string; factor: number; note: string }

const STYLES: Style[] = [
  { id: 'luxgold', label: 'Luxury Gold', bg: '#0B0805', ink: '#F4E7C4', accent: '#D4AF37', title: 'Fraunces', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#FBF8F0' },
  { id: 'modernblack', label: 'Modern Black', bg: '#0E0E10', ink: '#FFFFFF', accent: '#FFFFFF', title: 'Bebas Neue', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#FFFFFF' },
  { id: 'restofresh', label: 'Restaurant Fresh', bg: '#FFF8EE', ink: '#2A2419', accent: '#C0392B', title: 'Playfair Display', body: 'Poppins', qr: '#3A1212', qrBg: '#FFFFFF' },
  { id: 'corporate', label: 'Corporate Blue', bg: '#F4F8FC', ink: '#0F2540', accent: '#1D4ED8', title: 'Montserrat', body: 'Montserrat', qr: '#1D4ED8', qrBg: '#EAF2FF' },
  { id: 'neon', label: 'Neon Creator', bg: '#0A0A14', ink: '#EAEAFF', accent: '#FF3D9A', title: 'Bebas Neue', body: 'Poppins', qr: '#2A0A2E', qrBg: '#FFFFFF' },
  { id: 'minimal', label: 'Minimal White', bg: '#FFFFFF', ink: '#1A1A1A', accent: '#1A1A1A', title: 'Raleway', body: 'Raleway', qr: '#0A0A0A', qrBg: '#F8F8F8' },
  { id: 'premiumdark', label: 'Premium Dark', bg: '#101010', ink: '#F5F0E8', accent: '#C9A84C', title: 'Fraunces', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#FBF8F0' },
  { id: 'sunset', label: 'Bold Sunset', bg: '#1A0E14', ink: '#FFE8D6', accent: '#FF7A4D', title: 'Bebas Neue', body: 'Poppins', qr: '#5A3A12', qrBg: '#FFFFFF' },
  { id: 'sage', label: 'Sage Natural', bg: '#F2F4EE', ink: '#2B3326', accent: '#6B8E5A', title: 'Lora', body: 'Raleway', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'inkedit', label: 'Ink Editorial', bg: '#FBFAF7', ink: '#1A1A1A', accent: '#1A1A1A', title: 'Playfair Display', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#FFFFFF' },
  { id: 'menuclair', label: 'Menu Clair', bg: '#FBF3E7', ink: '#3A2316', accent: '#B8860B', title: 'Playfair Display', body: 'Poppins', qr: '#5A3A12', qrBg: '#FFFFFF' },
  { id: 'resa', label: 'Réservation', bg: '#06231C', ink: '#EAF7F0', accent: '#34D399', title: 'Montserrat', body: 'Poppins', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'resaclair', label: 'Réservation Clair', bg: '#F2F7F4', ink: '#10271E', accent: '#0E7A5F', title: 'Lora', body: 'Raleway', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'insta', label: 'Instagram', bg: '#1A0A14', ink: '#FFF0F6', accent: '#E1306C', title: 'Bebas Neue', body: 'Poppins', qr: '#2A0A2E', qrBg: '#FFFFFF' },
  { id: 'instaclair', label: 'Instagram Clair', bg: '#FFF5F8', ink: '#2A0A18', accent: '#E1306C', title: 'Raleway', body: 'Poppins', qr: '#2A0A2E', qrBg: '#FFFFFF' },
  { id: 'contact', label: 'Contact', bg: '#0F1729', ink: '#F1F5FF', accent: '#5B8DEF', title: 'Montserrat', body: 'Montserrat', qr: '#13243A', qrBg: '#EAF2FF' },
  { id: 'contactclair', label: 'Contact Clair', bg: '#F7F9FC', ink: '#0F2540', accent: '#1D4ED8', title: 'Montserrat', body: 'Montserrat', qr: '#1D4ED8', qrBg: '#EAF2FF' },
  { id: 'decouvrir', label: 'Découvrir', bg: '#10130F', ink: '#EAF4E6', accent: '#16A34A', title: 'Raleway', body: 'Montserrat', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'aviscadre', label: 'Avis Cadre', bg: '#FBF6EC', ink: '#2A2419', accent: '#B8860B', title: 'Playfair Display', body: 'Montserrat', qr: '#5A3A12', qrBg: '#FBF8F0' },
  { id: 'barnoir', label: 'Bar Cocktails', bg: '#0E0B07', ink: '#F2E6CE', accent: '#C9A84C', title: 'Fraunces', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#FBF8F0' },
  { id: 'offre', label: 'Commerce Offre', bg: '#1A0E0A', ink: '#FFF3EA', accent: '#E8602C', title: 'Bebas Neue', body: 'Poppins', qr: '#3A1212', qrBg: '#FFFFFF' },
  { id: 'ticket', label: 'Événement Ticket', bg: '#160726', ink: '#F3E9FF', accent: '#A855F7', title: 'Bebas Neue', body: 'Poppins', qr: '#2A0A2E', qrBg: '#FFFFFF' },
  { id: 'airbnb', label: 'Airbnb Bienvenue', bg: '#EFE3D2', ink: '#2A2419', accent: '#C56B3E', title: 'Lora', body: 'Raleway', qr: '#5A3A12', qrBg: '#FFFFFF' },
  { id: 'immo', label: 'Immobilier Fiche', bg: '#F2F4F1', ink: '#1E2A24', accent: '#2E6F5E', title: 'Montserrat', body: 'Raleway', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'soldes', label: 'Soldes Méga', bg: '#0E1116', ink: '#FFFFFF', accent: '#FF4D4D', title: 'Bebas Neue', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#FFFFFF' },
  { id: 'creator', label: 'Link in bio', bg: '#120A1F', ink: '#F2E9FF', accent: '#9B5CF6', title: 'Bebas Neue', body: 'Poppins', qr: '#7C3AED', qrBg: '#FFFFFF' },
  { id: 'portfolio', label: 'Portfolio', bg: '#15181C', ink: '#F0F2F4', accent: '#D9A441', title: 'Raleway', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#F8F8F8' },
  { id: 'wifivert', label: 'Wifi Vert', bg: '#0E1A16', ink: '#EAF4F0', accent: '#2E8B7B', title: 'Montserrat', body: 'Poppins', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'guide', label: 'Guide Étapes', bg: '#F3F0E9', ink: '#2A2419', accent: '#3FA796', title: 'Lora', body: 'Raleway', qr: '#0A0A0A', qrBg: '#FFFFFF' },
  // ── Lot 4 : socle sobre ──
  { id: 'papier', label: 'Papier', bg: '#F7F3EA', ink: '#23201B', accent: '#23201B', title: 'Fraunces', body: 'Inter', qr: '#141210', qrBg: '#FFFFFF' },
  { id: 'lin', label: 'Lin', bg: '#EFE8DB', ink: '#453C30', accent: '#8A7357', title: 'Georgia', body: 'Inter', qr: '#2A241C', qrBg: '#FFFFFF' },
  { id: 'craie', label: 'Craie', bg: '#FCFBF8', ink: '#202020', accent: '#6E6E6E', title: 'Inter', body: 'Inter', qr: '#0A0A0A', qrBg: '#F4F4F4' },
  { id: 'ardoise', label: 'Ardoise', bg: '#23262B', ink: '#E9ECEF', accent: '#9FB4C7', title: 'Inter', body: 'Inter', qr: '#0A0A0A', qrBg: '#F2F5F7' },
  { id: 'encre', label: 'Encre', bg: '#14161B', ink: '#EDEFF3', accent: '#C9CDD6', title: 'Georgia', body: 'Inter', qr: '#0A0A0A', qrBg: '#FFFFFF' },
  // ── Lot 4 : série caractère ──
  { id: 'terracotta', label: 'Terracotta', bg: '#F3E2D4', ink: '#4E2D1A', accent: '#C05B2E', title: 'Fraunces', body: 'DM Sans', qr: '#3A2114', qrBg: '#FFFFFF' },
  { id: 'matcha', label: 'Matcha', bg: '#1E2A21', ink: '#E8F0E3', accent: '#8FBF6F', title: 'Georgia', body: 'DM Sans', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'cobalt', label: 'Cobalt', bg: '#101B45', ink: '#EAF0FF', accent: '#4D6BFF', title: 'Inter', body: 'Inter', qr: '#13243A', qrBg: '#EAF2FF' },
  { id: 'framboise', label: 'Framboise', bg: '#FBEFF3', ink: '#3D1224', accent: '#C42B5C', title: 'Fraunces', body: 'DM Sans', qr: '#2A0A1A', qrBg: '#FFFFFF' },
  { id: 'safran', label: 'Safran', bg: '#211A0E', ink: '#FBEED2', accent: '#E7A917', title: 'Fraunces', body: 'DM Sans', qr: '#0A0A0A', qrBg: '#FBF8F0' },
  // ── Lot 5 : signature Riso (duotone encre/papier + trame) ──
  { id: 'risobleu', label: 'Riso Bleu', bg: '#F2EDE0', ink: '#2437C8', accent: '#2437C8', title: 'Impact', body: 'JetBrains Mono', qr: '#1B2A99', qrBg: '#FFFFFF' },
  { id: 'risorouge', label: 'Riso Rouge', bg: '#F6EFE3', ink: '#D8452B', accent: '#D8452B', title: 'Impact', body: 'JetBrains Mono', qr: '#A32812', qrBg: '#FFFFFF' },
  { id: 'risovert', label: 'Riso Vert', bg: '#F1EFE4', ink: '#1E7A46', accent: '#1E7A46', title: 'Impact', body: 'JetBrains Mono', qr: '#0F4A28', qrBg: '#FFFFFF' },
  { id: 'journal', label: 'Journal', bg: '#EFEDE6', ink: '#1C1C1C', accent: '#C22B1F', title: 'Georgia', body: 'JetBrains Mono', qr: '#111111', qrBg: '#FFFFFF' },
]

// Polices RÉELLEMENT rendues : self-hostées (Fraunces / Inter / DM Sans / JetBrains Mono, cf. globals.css)
// + familles système présentes quasi partout. On évite les Google Fonts non chargées (rendu silencieusement cassé).
const TYPOS: Typo[] = [
  { id: 'auto', label: 'Du thème', t: null, b: null },
  { id: 'serifchic', label: 'Serif chic', t: 'Fraunces', b: 'DM Sans' },
  { id: 'editorial', label: 'Éditorial', t: 'Georgia', b: 'Inter' },
  { id: 'affiche', label: 'Affiche', t: 'Impact', b: 'Arial' },
  { id: 'elegant', label: 'Élégant', t: 'Palatino Linotype', b: 'Inter' },
  { id: 'classique', label: 'Classique', t: 'Times New Roman', b: 'Georgia' },
  { id: 'moderne', label: 'Moderne', t: 'Inter', b: 'Inter' },
  { id: 'doux', label: 'Doux', t: 'Georgia', b: 'DM Sans' },
  { id: 'techno', label: 'Techno', t: 'JetBrains Mono', b: 'Inter' },
  { id: 'net', label: 'Net', t: 'Trebuchet MS', b: 'Verdana' },
  { id: 'machine', label: 'Machine', t: 'Courier New', b: 'Inter' },
  { id: 'naturel', label: 'Naturel', t: 'Garamond', b: 'Inter' },
]

const AMBIANCES: Ambiance[] = [
  { id: 'chaleureux', label: 'Chaleureux', rep: 'restofresh', styles: ['restofresh', 'menuclair', 'airbnb', 'aviscadre', 'offre', 'sunset', 'terracotta'] },
  { id: 'epure', label: 'Épuré', rep: 'minimal', styles: ['minimal', 'inkedit', 'immo', 'guide', 'papier', 'lin', 'craie'] },
  { id: 'nuit', label: 'Nuit', rep: 'modernblack', styles: ['modernblack', 'premiumdark', 'portfolio', 'contact', 'decouvrir', 'ardoise', 'encre'] },
  { id: 'dore', label: 'Doré', rep: 'luxgold', styles: ['luxgold', 'barnoir', 'menuclair', 'safran'] },
  { id: 'vif', label: 'Vif', rep: 'neon', styles: ['neon', 'insta', 'ticket', 'creator', 'soldes'] },
  { id: 'naturel', label: 'Naturel', rep: 'sage', styles: ['sage', 'wifivert', 'resa', 'resaclair', 'matcha'] },
  { id: 'marin', label: 'Marin', rep: 'corporate', styles: ['corporate', 'contactclair', 'contact', 'cobalt'] },
  { id: 'pastel', label: 'Pastel', rep: 'instaclair', styles: ['instaclair', 'resaclair', 'airbnb', 'guide', 'framboise'] },
  { id: 'riso', label: 'Riso', rep: 'risobleu', styles: ['risobleu', 'risorouge', 'risovert', 'journal'] },
]

// style id -> ambiance id (première ambiance qui le revendique)
export const AMB_OF: Record<string, string> = {}
AMBIANCES.forEach(a => a.styles.forEach(id => { if (!AMB_OF[id]) AMB_OF[id] = a.id }))

// métier -> 3 ambiances mises en avant, dans l'ordre
const MET_AMB: Record<string, string[]> = {
  'Tout': ['chaleureux', 'epure', 'nuit'],
  'Restaurant': ['chaleureux', 'dore', 'nuit'],
  'Bar': ['nuit', 'dore', 'vif'],
  'Boulangerie': ['chaleureux', 'naturel', 'epure'],
  'Coiffeur': ['epure', 'pastel', 'nuit'],
  'Beauté': ['pastel', 'epure', 'dore'],
  'Boutique': ['vif', 'epure', 'chaleureux'],
  'Hôtel': ['dore', 'chaleureux', 'marin'],
  'Artisan': ['naturel', 'chaleureux', 'riso'],
  'Coach': ['naturel', 'marin', 'epure'],
  'Immobilier': ['marin', 'epure', 'naturel'],
  'Freelance': ['epure', 'nuit', 'marin'],
  'Événement': ['vif', 'nuit', 'riso'],
  'Fleuriste': ['naturel', 'pastel', 'chaleureux'],
  'Caviste': ['dore', 'nuit', 'naturel'],
  'Food truck': ['vif', 'chaleureux', 'riso'],
  'Salle de sport': ['nuit', 'vif', 'marin'],
  'Photographe': ['nuit', 'epure', 'dore'],
  'Tatoueur': ['nuit', 'vif', 'riso'],
  'Pharmacie': ['marin', 'epure', 'naturel'],
  'Café': ['chaleureux', 'dore', 'epure'],
  'Boucherie': ['chaleureux', 'naturel', 'vif'],
  'Traiteur': ['chaleureux', 'naturel', 'dore'],
  'Spa': ['pastel', 'naturel', 'epure'],
  'Bijouterie': ['dore', 'nuit', 'epure'],
  'Garage': ['nuit', 'marin', 'epure'],
}

// mise en page : content = corps du visuel, deco = ornement optionnel
const LAYOUTS: Layout[] = [
  { id: 'centre', label: 'Centré', content: 'stack', deco: null },
  { id: 'bandeau', label: 'Bandeau', content: 'band', deco: null },
  { id: 'cadre', label: 'Cadre', content: 'center', deco: 'frame' },
  { id: 'footer', label: 'Footer', content: 'center', deco: 'footer' },
  { id: 'qrgeant', label: 'QR géant', content: 'qrbig', deco: null },
  { id: 'diagonale', label: 'Diagonale', content: 'center', deco: 'diagonal' },
  { id: 'orne', label: 'Orné', content: 'center', deco: 'ornate' },
  { id: 'colonnes', label: 'Deux colonnes', content: 'split', deco: null },
  { id: 'affiche', label: 'Affiche', content: 'poster', deco: null },
]

// objet -> métiers concernés
const MET: Record<string, string[]> = {
  i1: ['Restaurant', 'Café', 'Bar', 'Boulangerie', 'Traiteur', 'Hôtel'],
  i2: ['Restaurant', 'Café', 'Bar', 'Traiteur', 'Hôtel', 'Événement'],
  i3: ['Boutique', 'Café', 'Coiffeur', 'Beauté', 'Spa', 'Bijouterie', 'Boulangerie', 'Restaurant'],
  i4: ['Hôtel', 'Café', 'Bar', 'Restaurant', 'Coiffeur', 'Spa'],
  i5: ['Boutique', 'Artisan', 'Boulangerie', 'Boucherie', 'Coiffeur', 'Garage'],
  i6: ['Freelance', 'Artisan', 'Immobilier', 'Coach', 'Beauté', 'Café', 'Spa', 'Garage', 'Bijouterie'],
  i7: ['Événement', 'Immobilier', 'Boutique', 'Coach', 'Traiteur'],
  i8: ['Événement', 'Boutique', 'Restaurant', 'Immobilier', 'Traiteur'],
  i9: ['Boutique', 'Coach', 'Freelance', 'Hôtel', 'Garage', 'Bijouterie'],
  i10: ['Bar', 'Caviste', 'Restaurant', 'Café', 'Food truck'],
  i11: ['Restaurant', 'Café', 'Hôtel', 'Bar', 'Traiteur', 'Boucherie', 'Food truck'],
  i12: ['Caviste', 'Artisan', 'Fleuriste', 'Boulangerie', 'Boucherie'],
  i13: ['Boulangerie', 'Café', 'Coiffeur', 'Boutique', 'Beauté', 'Spa', 'Boucherie', 'Food truck'],
  i14: ['Événement', 'Salle de sport', 'Immobilier', 'Photographe', 'Traiteur', 'Bijouterie'],
  i15: ['Salle de sport', 'Photographe', 'Tatoueur', 'Spa', 'Événement'],
  i16: ['Pharmacie', 'Boutique', 'Salle de sport', 'Coiffeur', 'Spa', 'Garage', 'Boucherie'],
}

// objet -> objectifs couverts
const OBJ: Record<string, string[]> = {
  i1: ['Menu', 'Commander', 'Avis', 'Réseaux', 'Site web'],
  i2: ['Menu', 'Commander', 'Réservation', 'Avis', 'Localisation'],
  i3: ['Avis', 'Réseaux', 'Site web', 'Horaires'],
  i4: ['Wifi', 'Menu', 'Horaires', 'Localisation'],
  i5: ['Paiement', 'Fidélité', 'Avis'],
  i6: ['Contact', 'Réseaux', 'Site web', 'Réservation'],
  i7: ['Promo', 'Réservation', 'Contact', 'Site web'],
  i8: ['Promo', 'Réseaux', 'Menu', 'Localisation'],
  i9: ['Fidélité', 'Réseaux', 'Site web', 'Contact'],
  i10: ['Menu', 'Commander', 'Promo', 'Réseaux'],
  i11: ['Menu', 'Commander', 'Horaires', 'Avis'],
  i12: ['Contact', 'Promo', 'Réseaux', 'Site web'],
  i13: ['Fidélité', 'Promo', 'Contact'],
  i14: ['Promo', 'Contact', 'Réservation', 'Localisation'],
  i15: ['Promo', 'Réseaux', 'Réservation', 'Site web'],
  i16: ['Horaires', 'Avis', 'Contact', 'Localisation'],
}

// Les 16 objets. hMm = hauteur réelle en mm (sert à l'échelle du rendu),
// ratio = largeur/hauteur, qrMm = taille du QR imprimé, pal = style par défaut,
// bleed/margin/dpi = contraintes fichier d'impression.
const ITEMS: Item[] = [
  { id: 'i1', hMm: 50, place: 'Table', scene: 'table', layout: 'stack', name: 'Sticker de table', support: 'Sticker rond', size: 'Ø 50 mm', bleed: 2, margin: 4, dpi: 300, shape: 'round', ratio: 1, plain: 'Collé sur chaque table : vos clients scannent et la carte s\'ouvre sur leur téléphone.', kicker: 'Café Lune', title: 'Menu du jour', cta: 'Voir le menu', qrMm: 26, pal: 'premiumdark' },
  { id: 'i2', hMm: 70, place: 'Table', scene: 'comptoir', layout: 'band', name: 'Chevalet de table', support: 'Carte de table', size: '100 × 70 mm', bleed: 3, margin: 4, dpi: 300, shape: 'rect', ratio: 100 / 70, plain: 'Debout entre le sel et le poivre : menu, avis ou réservation, sans rien demander.', kicker: 'Commandez ici', title: 'À table', cta: 'Voir le menu', qrMm: 30, pal: 'restofresh' },
  { id: 'i3', hMm: 50, place: 'Vitrine', scene: 'vitrine', layout: 'stack', name: 'Sticker vitrine', support: 'Sticker carré', size: '50 × 50 mm', bleed: 2, margin: 3, dpi: 300, shape: 'rect', ratio: 1, plain: 'Collé côté rue : les passants laissent un avis Google en dix secondes.', kicker: 'Votre avis compte', title: 'Notez-nous', cta: 'Laisser un avis', qrMm: 26, pal: 'inkedit' },
  { id: 'i4', hMm: 148, place: 'Vitrine', scene: 'vitrine', layout: 'band', name: 'Panneau Wifi', support: 'A6 · carte postale', size: '105 × 148 mm', bleed: 3, margin: 4, dpi: 300, shape: 'rect', ratio: 105 / 148, plain: 'Le code Wifi sans le dicter : on scanne, on est connecté.', kicker: 'Wifi gratuit', title: 'Connectez-vous', cta: 'Scannez-moi', qrMm: 48, pal: 'corporate' },
  { id: 'i5', hMm: 85, place: 'Comptoir', scene: 'comptoir', layout: 'stack', name: 'Carte portrait paiement', support: 'Carte portrait', size: '55 × 85 mm', bleed: 2, margin: 3, dpi: 300, shape: 'rect', ratio: 55 / 85, plain: 'Au comptoir : le client scanne, paie, repart. Aucun terminal à tendre.', kicker: 'Sans contact', title: 'Payer ici', cta: 'Profitez-en', qrMm: 28, pal: 'luxgold' },
  { id: 'i6', hMm: 55, place: 'Main', scene: 'main', layout: 'split', name: 'Carte de visite', support: 'Carte de visite', size: '85 × 55 mm', bleed: 2, margin: 3, dpi: 300, shape: 'rect', ratio: 85 / 55, plain: 'Tout votre profil en un scan — menu, horaires, réseaux, itinéraire.', kicker: 'Café Lune', title: 'Bonjour', cta: 'Scannez-moi', qrMm: 24, pal: 'minimal' },
  { id: 'i7', hMm: 210, place: 'Main', scene: 'main', layout: 'band', name: 'Flyer A5', support: 'Flyer A5', size: '148 × 210 mm', bleed: 3, margin: 4, dpi: 300, shape: 'rect', ratio: 148 / 210, plain: 'À distribuer : l\'offre du moment, mise à jour sans réimprimer.', kicker: 'Cette semaine', title: 'Happy hour', cta: 'Profiter de l\'offre', qrMm: 46, pal: 'sunset' },
  { id: 'i8', hMm: 420, place: 'Mur', scene: 'mur', layout: 'poster', name: 'Affiche A3', support: 'A3', size: '297 × 420 mm', bleed: 3, margin: 6, dpi: 200, shape: 'rect', ratio: 297 / 420, plain: 'Visible de loin : événement, ouverture, soirée — un QR lisible à deux mètres.', kicker: 'Samedi 21 h', title: 'Soirée jazz', cta: 'Réservez', qrMm: 68, pal: 'neon' },
  { id: 'i9', hMm: 160, place: 'Comptoir', scene: 'comptoir', layout: 'stack', name: 'Marque-page', support: 'Marque-page', size: '55 × 160 mm', bleed: 2, margin: 4, dpi: 300, shape: 'rect', ratio: 55 / 160, plain: 'Glissé dans le sac ou le livre : votre page reste à portée de scan.', kicker: 'Suivez-nous', title: 'Restons liés', cta: 'En savoir plus', qrMm: 30, pal: 'sage' },
  { id: 'i10', hMm: 95, place: 'Table', scene: 'table', layout: 'centre', name: 'Sous-bock', support: 'Sous-bock rond', size: 'Ø 95 mm', bleed: 3, margin: 5, dpi: 300, shape: 'round', ratio: 1, plain: 'Sous chaque verre : la carte des boissons arrive avant le serveur.', kicker: 'Au comptoir', title: 'Cocktails', cta: 'Voir la carte', qrMm: 42, pal: 'barnoir' },
  { id: 'i11', hMm: 297, place: 'Table', scene: 'comptoir', layout: 'orne', name: 'Porte-menu A4', support: 'A4 · porte-menu', size: '210 × 297 mm', bleed: 3, margin: 8, dpi: 300, shape: 'rect', ratio: 210 / 297, plain: 'Glissé dans le porte-menu : la carte complète, mise à jour sans réimprimer.', kicker: 'Café Lune', title: 'La carte', cta: 'Tout voir', qrMm: 58, pal: 'menuclair' },
  { id: 'i12', hMm: 90, place: 'Comptoir', scene: 'comptoir', layout: 'footer', name: 'Étiquette bouteille', support: 'Étiquette', size: '60 × 90 mm', bleed: 2, margin: 3, dpi: 600, shape: 'rect', ratio: 60 / 90, plain: 'Collée sur le flacon : l\'origine, le producteur et l\'histoire au dos du scan.', kicker: 'Domaine', title: 'Cuvée 2024', cta: 'Notre histoire', qrMm: 24, pal: 'sage' },
  { id: 'i13', hMm: 55, place: 'Main', scene: 'main', layout: 'colonnes', name: 'Carte de fidélité', support: 'Carte paysage', size: '85 × 55 mm', bleed: 2, margin: 3, dpi: 300, shape: 'rect', ratio: 85 / 55, plain: 'Dans le portefeuille : les points se comptent en scannant, plus de tampons.', kicker: 'Fidélité', title: 'Votre carte', cta: 'Vos points', qrMm: 22, pal: 'airbnb' },
  { id: 'i14', hMm: 2000, place: 'Mur', scene: 'mur', layout: 'affiche', name: 'Roll-up', support: 'Roll-up', size: '850 × 2000 mm', bleed: 20, margin: 40, dpi: 150, shape: 'rect', ratio: 850 / 2000, plain: 'Déployé à l\'entrée : visible de loin, scannable de près.', kicker: 'Portes ouvertes', title: 'Bienvenue', cta: 'Le programme', qrMm: 220, pal: 'corporate' },
  { id: 'i15', hMm: 594, place: 'Mur', scene: 'mur', layout: 'diagonale', name: 'Affiche A2', support: 'A2', size: '420 × 594 mm', bleed: 5, margin: 10, dpi: 200, shape: 'rect', ratio: 420 / 594, plain: 'Sur la vitre ou le mur : une offre qui se lit à cinq mètres.', kicker: 'Nouvelle saison', title: 'Rejoignez-nous', cta: 'Premier cours offert', qrMm: 92, pal: 'neon' },
  { id: 'i16', hMm: 210, place: 'Vitrine', scene: 'vitrine', layout: 'cadre', name: 'Panneau horaires', support: 'A5 · panneau', size: '148 × 210 mm', bleed: 3, margin: 5, dpi: 300, shape: 'rect', ratio: 148 / 210, plain: 'Sur la porte : horaires, garde et coordonnées, toujours à jour.', kicker: 'Infos pratiques', title: 'Nos horaires', cta: 'Tout savoir', qrMm: 44, pal: 'contactclair' },
]

// propositions de message par objet (le 1er est la valeur par défaut)
const MESSAGES: Record<string, string[]> = {
  i10: ['Notre carte', 'Cocktails', 'Happy hour', 'Nos vins'],
  i11: ['La carte', 'Menu du jour', 'Nos plats', 'À la carte'],
  i12: ['Notre histoire', 'Cuvée 2024', 'Fait ici', 'En savoir plus'],
  i13: ['Votre carte', 'Fidélité', '10e offert', 'Vos points'],
  i14: ['Bienvenue', 'Portes ouvertes', 'Nouveau', 'Découvrez'],
  i15: ['Rejoignez-nous', 'Premier cours offert', 'Nouvelle saison', 'Inscrivez-vous'],
  i16: ['Nos horaires', 'Infos pratiques', 'Nous trouver', 'Service de garde'],
  i1: ['Menu du jour', 'Notre carte', 'Nos boissons', 'La suite ici'],
  i2: ['À table', 'Menu du jour', 'Commandez ici', 'Nos suggestions'],
  i3: ['Notez-nous', 'Votre avis', 'Merci !', 'Laissez un mot'],
  i4: ['Connectez-vous', 'Wifi gratuit', 'Réseau invité', 'Bienvenue'],
  i5: ['Payer ici', 'Paiement', 'Sans contact', 'Réglez ici'],
  i6: ['Bonjour', 'Café Lune', 'Restons en contact', 'Notre carte'],
  i7: ['Happy hour', 'Offre du moment', '-20 % ce soir', 'Nouveau menu'],
  i8: ['Soirée jazz', 'Concert live', 'Ouverture', 'Événement'],
  i9: ['Restons liés', 'Nos actus', 'Notre page', 'Suivez-nous'],
}

// taille du QR : facteur appliqué à qrMm
const SIZES: Size[] = [
  { id: 'petit', label: 'Discret', factor: .8, note: 'lisible à 30 cm' },
  { id: 'moyen', label: 'Équilibré', factor: 1, note: 'lisible à 50 cm' },
  { id: 'grand', label: 'Bien visible', factor: 1.26, note: 'lisible à 1 m et plus' },
]

export const BRANDNAMES = ['Café Lune', 'Maison Petit', 'Studio Nord', 'Le Comptoir 12']

export const METIERS = ['Tout', 'Restaurant', 'Café', 'Bar', 'Boulangerie', 'Boucherie', 'Traiteur', 'Food truck', 'Caviste', 'Coiffeur', 'Beauté', 'Spa', 'Tatoueur', 'Boutique', 'Bijouterie', 'Fleuriste', 'Pharmacie', 'Hôtel', 'Artisan', 'Garage', 'Coach', 'Salle de sport', 'Immobilier', 'Freelance', 'Photographe', 'Événement']

export const OBJECTIFS = ['Tout', 'Menu', 'Commander', 'Avis', 'Wifi', 'Réseaux', 'Site web', 'Paiement', 'Réservation', 'Promo', 'Contact', 'Fidélité', 'Localisation', 'Horaires']

export { STYLES, TYPOS, AMBIANCES, MET_AMB, LAYOUTS, MET, OBJ, ITEMS, MESSAGES, SIZES }

// --- dérivés utiles ---
export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map(i => [i.id, i]))
export const STYLE_BY_ID: Record<string, Style> = Object.fromEntries(STYLES.map(s => [s.id, s]))
export const LAYOUT_BY_ID: Record<string, Layout> = Object.fromEntries(LAYOUTS.map(l => [l.id, l]))

// Filtre croisé métier × objectif, dans l'ordre d'affichage de la bibliothèque.
export function filterItems(metier = 'Tout', objectif = 'Tout'): Item[] {
  return ITEMS.filter(i =>
    (metier === 'Tout' || (MET[i.id] || []).includes(metier)) &&
    (objectif === 'Tout' || (OBJ[i.id] || []).includes(objectif)),
  )
}

// Ambiances triées pour un métier : les 3 recommandées d'abord.
export function ambiancesFor(metier = 'Tout'): Ambiance[] {
  const order = MET_AMB[metier] || MET_AMB['Tout']
  return AMBIANCES.slice().sort((a, b) => {
    const ia = order.indexOf(a.id), ib = order.indexOf(b.id)
    return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib)
  })
}
