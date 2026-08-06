// templateStructures.extra.ts — Nouvelles VERTICALES métier en DONNÉES (moteur de templates, T5).
// Chaque entrée = une TemplateStructure (blocs + contenu) SANS thème : le style est appliqué par le
// moteur (composeTemplate). N'utilise QUE des types de blocs réels + les mêmes clés de contenu que le
// rendu (mêmes patterns que page-templates.ts). Anti-fake : les avis sont marqués « (exemple) » et
// destinés à être personnalisés. Aucune donnée/Supabase. Ajouter une verticale = ajouter un objet ici.

import type { TemplateStructure } from "./templateEngine"
import { placeholderGallery } from "./templatePlaceholders"

// Avis d'exemple explicitement marqués (à personnaliser par l'utilisateur).
const exampleReviews = (n1: string, t1: string, n2: string, t2: string) => ({
  name1: n1, text1: `(exemple) ${t1}`, stars1: "5",
  name2: n2, text2: `(exemple) ${t2}`, stars2: "5",
})

export const EXTRA_STRUCTURES: TemplateStructure[] = [
  // ── Artisan & BTP ─────────────────────────────────────────────────────────
  {
    key: "artisan_plombier", group: "Artisan & BTP", label: "Plombier chauffagiste", emoji: "🔧",
    desc: "Dépannage, installation, devis gratuit + zone d'intervention.",
    blocks: [
      { type: "profile", content: { name: "AquaPro Plomberie", tagline: "Plombier chauffagiste · Intervention 7j/7", badge: "Devis gratuit" } },
      { type: "cta_button", content: { label: "Demander un devis gratuit", url: "#", style: "gold", icon: "🧾", full_width: "yes" } },
      { type: "services_list", content: { title: "Nos interventions", s1_icon: "🚰", s1_name: "Dépannage plomberie", s1_desc: "Fuite, débouchage, sanitaire", s2_icon: "🔥", s2_name: "Chauffage & chaudière", s2_desc: "Entretien, installation, dépannage", s3_icon: "🛠️", s3_name: "Rénovation salle de bain", s3_desc: "Devis et pose sur mesure" } },
      { type: "opening_hours", content: { title: "Disponibilités", mon_fri: "8h - 19h", saturday: "9h - 17h", sunday: "Urgences uniquement", note: "Intervention rapide dans un rayon de 30 km" } },
      { type: "testimonials", content: exampleReviews("Julien P.", "Intervention rapide pour une fuite, travail soigné et tarif honnête.", "Nadia B.", "Chaudière remplacée en une journée, je recommande.") },
      { type: "google_maps", content: { label: "Zone d'intervention", address: "Agence — 10 rue des Artisans, 69000 Lyon", transport: "Interventions Lyon et alentours" } },
      { type: "contact_form", content: { title: "Contactez-nous", button_label: "Envoyer ma demande", show_phone: "yes" } },
      { type: "social_links", content: { facebook: "https://facebook.com", website: "https://monsite.com" } },
    ],
  },
  {
    key: "artisan_electricien", group: "Artisan & BTP", label: "Électricien", emoji: "⚡",
    desc: "Mise aux normes, dépannage, tableau électrique, devis.",
    blocks: [
      { type: "profile", content: { name: "VoltPlus Électricité", tagline: "Électricien certifié · Mise aux normes", badge: "Certifié Qualifelec" } },
      { type: "cta_button", content: { label: "Obtenir un devis", url: "#", style: "gold", icon: "💡", full_width: "yes" } },
      { type: "services_list", content: { title: "Prestations", s1_icon: "🔌", s1_name: "Installation & rénovation", s1_desc: "Tableau, prises, éclairage", s2_icon: "⚠️", s2_name: "Mise aux normes", s2_desc: "Diagnostic et remise en conformité", s3_icon: "🏠", s3_name: "Domotique", s3_desc: "Maison connectée, sécurité" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "8h - 18h30", saturday: "Sur rendez-vous", sunday: "Fermé", note: "Devis sous 48h" } },
      { type: "testimonials", content: exampleReviews("Marc D.", "Tableau électrique refait proprement, explications claires.", "Sophie L.", "Ponctuel et professionnel, prix conforme au devis.") },
      { type: "contact_form", content: { title: "Votre projet", button_label: "Demander un devis", show_phone: "yes" } },
      { type: "social_links", content: { facebook: "https://facebook.com", website: "https://monsite.com" } },
    ],
  },
  {
    key: "artisan_serrurier", group: "Artisan & BTP", label: "Serrurier urgence", emoji: "🔑",
    desc: "Ouverture de porte, blindage, dépannage 24/7.",
    blocks: [
      { type: "profile", content: { name: "Clé Express", tagline: "Serrurier · Dépannage 24h/24 7j/7", badge: "Urgence 24/7" } },
      { type: "cta_button", content: { label: "Appeler maintenant", url: "tel:+33100000000", style: "gold", icon: "📞", full_width: "yes" } },
      { type: "services_list", content: { title: "Interventions", s1_icon: "🚪", s1_name: "Ouverture de porte", s1_desc: "Claquée ou verrouillée, sans dégât", s2_icon: "🛡️", s2_name: "Blindage & sécurité", s2_desc: "Porte blindée, serrure multipoints", s3_icon: "🔐", s3_name: "Changement de serrure", s3_desc: "Toutes marques, sur place" } },
      { type: "opening_hours", content: { title: "Disponibilité", mon_fri: "24h/24", saturday: "24h/24", sunday: "24h/24", note: "Intervention en 30 min en moyenne" } },
      { type: "testimonials", content: exampleReviews("Camille R.", "Porte ouverte en 20 minutes sans casse, un grand merci.", "Yanis M.", "Serrurier honnête, tarif annoncé respecté.") },
      { type: "social_links", content: { website: "https://monsite.com" } },
    ],
  },

  // ── Beauté & bien-être ────────────────────────────────────────────────────
  {
    key: "beaute_barbier", group: "Beauté & bien-être", label: "Barbier", emoji: "💈",
    desc: "Coupe, barbe, rasage traditionnel + réservation en ligne.",
    blocks: [
      { type: "profile", content: { name: "The Barber House", tagline: "Barbier · Coupe & barbe · Paris 11e", badge: "Sur rendez-vous" } },
      { type: "services_list", content: { title: "Nos prestations", s1_icon: "✂️", s1_name: "Coupe homme", s1_desc: "Coupe + coiffage · 28 €", s2_icon: "🧔", s2_name: "Taille de barbe", s2_desc: "Contour, entretien · 18 €", s3_icon: "🪒", s3_name: "Rasage traditionnel", s3_desc: "Serviette chaude · 25 €" } },
      { type: "calendly", content: { label: "Réserver un créneau", url: "https://calendly.com", description: "Réservation en ligne · 7j/7" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "10h - 20h", saturday: "10h - 19h", sunday: "Fermé", note: "" } },
      { type: "testimonials", content: exampleReviews("Théo G.", "Meilleur dégradé de Paris, ambiance au top.", "Karim S.", "Barbe impeccable, je ne vais plus ailleurs.") },
      { type: "google_maps", content: { label: "The Barber House", address: "22 rue Oberkampf, 75011 Paris", transport: "Métro Parmentier · Ligne 3" } },
      { type: "social_links", content: { instagram: "https://instagram.com", tiktok: "https://tiktok.com" } },
    ],
  },
  {
    key: "beaute_institut", group: "Beauté & bien-être", label: "Institut de beauté", emoji: "💅",
    desc: "Soins visage, ongles, épilation + réservation.",
    blocks: [
      { type: "profile", content: { name: "Éclat Institut", tagline: "Soins visage · Ongles · Épilation", badge: "Nouveaux soins" } },
      { type: "promo_banner", content: { emoji: "🌸", text: "-20% sur votre premier soin", subtext: "Offre découverte, sur réservation", cta_label: "En profiter", cta_url: "#" } },
      { type: "services_list", content: { title: "Nos soins", s1_icon: "✨", s1_name: "Soin du visage", s1_desc: "Nettoyage, éclat, anti-âge", s2_icon: "💅", s2_name: "Manucure & vernis", s2_desc: "Pose semi-permanent", s3_icon: "🌿", s3_name: "Épilation", s3_desc: "Cire tiède, zones au choix" } },
      { type: "calendly", content: { label: "Prendre rendez-vous", url: "https://calendly.com", description: "Réservation 24h/24" } },
      { type: "testimonials", content: exampleReviews("Léa V.", "Soin du visage divin, ma peau n'a jamais été aussi belle.", "Inès B.", "Accueil chaleureux et travail minutieux.") },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "9h30 - 19h", saturday: "9h - 18h", sunday: "Fermé", note: "" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  // ── Santé ─────────────────────────────────────────────────────────────────
  {
    key: "sante_dentiste", group: "Santé", label: "Cabinet dentaire", emoji: "🦷",
    desc: "Soins, implants, esthétique + prise de rendez-vous.",
    blocks: [
      { type: "profile", content: { name: "Dr. Camille Fabre", tagline: "Chirurgien-dentiste · Paris 15e", badge: "Nouveaux patients" } },
      { type: "bio", content: { text: "Cabinet dentaire moderne : soins conservateurs, implantologie et esthétique du sourire. Une équipe à l'écoute, dans un cadre serein.", align: "center" } },
      { type: "services_list", content: { title: "Nos soins", s1_icon: "🦷", s1_name: "Soins & prévention", s1_desc: "Détartrage, caries, contrôle", s2_icon: "🔩", s2_name: "Implantologie", s2_desc: "Remplacement de dents", s3_icon: "😁", s3_name: "Esthétique", s3_desc: "Blanchiment, facettes" } },
      { type: "opening_hours", content: { title: "Horaires du cabinet", mon_fri: "9h - 19h", saturday: "9h - 13h", sunday: "Fermé", note: "Urgences : nous contacter" } },
      { type: "faq", content: { title: "Questions fréquentes", q1: "Prenez-vous de nouveaux patients ?", a1: "Oui, prise de rendez-vous en ligne ou par téléphone.", q2: "Le tiers payant est-il pratiqué ?", a2: "Oui, sur présentation de votre carte vitale et mutuelle.", q3: "Proposez-vous des soins d'urgence ?", a3: "Oui, contactez le cabinet pour un créneau rapide." } },
      { type: "calendly", content: { label: "Prendre rendez-vous", url: "https://doctolib.fr", description: "Réservation en ligne 24h/24" } },
      { type: "google_maps", content: { label: "Cabinet dentaire", address: "8 avenue Félix Faure, 75015 Paris", transport: "Métro Boucicaut · Ligne 8" } },
    ],
  },
  {
    key: "sante_osteo", group: "Santé", label: "Ostéopathe / Kiné", emoji: "🧘",
    desc: "Consultations, motifs, prise de rendez-vous en ligne.",
    blocks: [
      { type: "profile", content: { name: "Thomas Renard", tagline: "Ostéopathe D.O. · Paris 9e", badge: "Sur rendez-vous" } },
      { type: "bio", content: { text: "Ostéopathe diplômé, j'accompagne adultes, sportifs et femmes enceintes. Une approche douce et personnalisée pour soulager durablement.", align: "center" } },
      { type: "services_list", content: { title: "Motifs de consultation", s1_icon: "🦴", s1_name: "Douleurs dos & nuque", s1_desc: "Lombalgies, cervicalgies", s2_icon: "🏃", s2_name: "Suivi sportif", s2_desc: "Prévention et récupération", s3_icon: "🤰", s3_name: "Femme enceinte & bébé", s3_desc: "Accompagnement en douceur" } },
      { type: "calendly", content: { label: "Prendre rendez-vous", url: "https://doctolib.fr", description: "45 min · en cabinet" } },
      { type: "testimonials", content: exampleReviews("Aurélie C.", "Une séance et mes douleurs lombaires ont disparu.", "Hugo M.", "Praticien à l'écoute, gestes précis, je recommande.") },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "9h - 20h", saturday: "9h - 13h", sunday: "Fermé", note: "" } },
      { type: "google_maps", content: { label: "Cabinet d'ostéopathie", address: "14 rue de Maubeuge, 75009 Paris", transport: "Métro Cadet · Ligne 7" } },
    ],
  },

  // ── Commerce ──────────────────────────────────────────────────────────────
  {
    key: "commerce_fleuriste", group: "Commerce", label: "Fleuriste", emoji: "💐",
    desc: "Bouquets, événements, click & collect.",
    blocks: [
      { type: "profile", content: { name: "Pétale & Sens", tagline: "Fleuriste artisan · Bouquets & événements", badge: "Click & collect" } },
      { type: "promo_banner", content: { emoji: "🌷", text: "Bouquet du moment à -15%", subtext: "Fleurs de saison, cueillies chaque matin", cta_label: "Commander", cta_url: "#" } },
      { type: "product", content: { name: "Bouquet signature", price: "35 €", old_price: "42 €", description: "Composition de saison montée à la main, papier kraft et ruban.", cta_label: "Commander", cta_url: "#" } },
      { type: "product", content: { name: "Abonnement fleurs", price: "29 €/mois", description: "Un bouquet frais livré ou à retirer chaque semaine.", cta_label: "S'abonner", cta_url: "#" } },
      { type: "gallery", content: { title: "Nos créations", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre création") } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "9h - 19h30", saturday: "9h - 20h", sunday: "9h - 13h", note: "Livraison locale disponible" } },
      { type: "google_maps", content: { label: "Pétale & Sens", address: "5 place du Marché, 33000 Bordeaux", transport: "Tram ligne B · arrêt Marché" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  // ── Restauration (variantes) ────────────────────────────────────────────────
  {
    key: "resto_pizzeria", group: "Restauration", label: "Pizzeria", emoji: "🍕",
    desc: "Menu, commande en ligne, horaires et localisation.",
    blocks: [
      { type: "profile", content: { name: "Bella Napoli", tagline: "Pizzeria napolitaine · Feu de bois", badge: "Commande en ligne" } },
      { type: "cta_button", content: { label: "Commander en ligne", url: "#", style: "gold", icon: "🍕", full_width: "yes" } },
      { type: "menu_section", content: { category: "Nos pizzas", item1_name: "Margherita", item1_price: "11 €", item1_desc: "Tomate, mozzarella, basilic", item2_name: "Regina", item2_price: "13 €", item2_desc: "Jambon, champignons, mozza", item3_name: "Diavola", item3_price: "14 €", item3_desc: "Piquante, spianata, piment" } },
      { type: "promo_banner", content: { emoji: "🔥", text: "Le midi : pizza + boisson 12 €", subtext: "Du lundi au vendredi", cta_label: "En profiter", cta_url: "#" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "11h30 - 14h / 18h30 - 22h30", saturday: "18h30 - 23h", sunday: "18h30 - 22h", note: "Sur place · à emporter · livraison" } },
      { type: "google_maps", content: { label: "Bella Napoli", address: "3 rue Sainte-Catherine, 33000 Bordeaux", transport: "Tram ligne A" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },
  {
    key: "resto_coffee", group: "Restauration", label: "Coffee shop", emoji: "☕",
    desc: "Carte, ambiance, horaires — coffee shop de quartier.",
    blocks: [
      { type: "profile", content: { name: "Grain & Cie", tagline: "Coffee shop · Torréfaction artisanale", badge: "Wifi & cosy" } },
      { type: "bio", content: { text: "Un café de spécialité torréfié maison, des pâtisseries fraîches et un coin cosy pour travailler ou se retrouver.", align: "center" } },
      { type: "menu_section", content: { category: "La carte", item1_name: "Flat white", item1_price: "4,20 €", item1_desc: "Espresso doux, lait micro-moussé", item2_name: "Cappuccino", item2_price: "3,80 €", item2_desc: "Grains de saison", item3_name: "Cookie maison", item3_price: "3 €", item3_desc: "Chocolat noir 70%" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "8h - 18h", saturday: "9h - 19h", sunday: "10h - 17h", note: "" } },
      { type: "testimonials", content: exampleReviews("Manon T.", "Le meilleur flat white du quartier, ambiance parfaite.", "Louis P.", "Cosy, calme, staff adorable. Mon QG pour bosser.") },
      { type: "google_maps", content: { label: "Grain & Cie", address: "18 rue des Tanneurs, 44000 Nantes", transport: "Tram ligne 1" } },
      { type: "social_links", content: { instagram: "https://instagram.com" } },
    ],
  },
  {
    key: "resto_boulangerie", group: "Restauration", label: "Boulangerie-pâtisserie", emoji: "🥐",
    desc: "Spécialités, click & collect, horaires.",
    blocks: [
      { type: "profile", content: { name: "Le Fournil Doré", tagline: "Boulangerie-pâtisserie artisanale", badge: "Click & collect" } },
      { type: "bio", content: { text: "Pains au levain, viennoiseries pur beurre et pâtisseries maison, préparés chaque jour dans le respect de la tradition.", align: "center" } },
      { type: "product", content: { name: "Baguette tradition", price: "1,30 €", description: "Levain naturel, croûte croustillante, cuite plusieurs fois par jour.", cta_label: "Réserver", cta_url: "#" } },
      { type: "product", content: { name: "Assortiment viennoiseries (x6)", price: "9 €", old_price: "11 €", description: "Croissants et pains au chocolat pur beurre.", cta_label: "Commander", cta_url: "#" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "7h - 20h", saturday: "7h - 20h", sunday: "7h - 13h", note: "Fermé le lundi" } },
      { type: "google_maps", content: { label: "Le Fournil Doré", address: "42 rue de la République, 69002 Lyon", transport: "Métro Bellecour" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  // ── Immobilier ──────────────────────────────────────────────────────────────
  {
    key: "immo_chasseur", group: "Immobilier", label: "Chasseur immobilier", emoji: "🔎",
    desc: "Recherche sur-mesure, honoraires au succès, contact.",
    blocks: [
      { type: "profile", content: { name: "Julie Ferrand", tagline: "Chasseuse immobilière · Paris & IDF", badge: "Honoraires au succès" } },
      { type: "bio", content: { text: "Je trouve le bien qui vous ressemble : recherche ciblée, visites, négociation. Vous gagnez du temps, je défends vos intérêts.", align: "left" } },
      { type: "services_list", content: { title: "Mon accompagnement", s1_icon: "🎯", s1_name: "Recherche sur-mesure", s1_desc: "Cahier des charges précis", s2_icon: "🚪", s2_name: "Visites & sélection", s2_desc: "Je filtre, vous visitez l'essentiel", s3_icon: "🤝", s3_name: "Négociation", s3_desc: "Meilleur prix, sécurisation" } },
      { type: "testimonials", content: exampleReviews("Famille Léger", "Bien trouvé en 4 semaines, négociation au top.", "Karim & Sofia", "Un gain de temps énorme, accompagnement humain.") },
      { type: "cta_button", content: { label: "Lancer ma recherche", url: "#", style: "gold", icon: "🏡", full_width: "yes" } },
      { type: "contact_form", content: { title: "Parlons de votre projet", button_label: "Envoyer", show_phone: "yes" } },
      { type: "social_links", content: { linkedin: "https://linkedin.com", website: "https://monsite.com" } },
    ],
  },
  {
    key: "immo_gite", group: "Immobilier", label: "Gîte / location saisonnière", emoji: "🏡",
    desc: "Présentation, équipements, tarifs, réservation.",
    blocks: [
      { type: "profile", content: { name: "La Grange de Loucette", tagline: "Gîte de charme · 8 personnes · Piscine", badge: "Réservation directe" } },
      { type: "bio", content: { text: "Un gîte authentique au cœur du Lubéron : pierres apparentes, piscine chauffée et grand jardin. Idéal familles et groupes d'amis.", align: "center" } },
      { type: "services_list", content: { title: "Équipements", s1_icon: "🏊", s1_name: "Piscine chauffée", s1_desc: "Ouverte d'avril à octobre", s2_icon: "🛏️", s2_name: "4 chambres", s2_desc: "Jusqu'à 8 couchages", s3_icon: "🌿", s3_name: "Grand jardin", s3_desc: "Terrasse, barbecue, parking" } },
      { type: "pricing", content: { title: "Tarifs", title1: "Nuitée", price1: "180 €", desc1: "Hors saison", title2: "Semaine", price2: "1 100 €", desc2: "Basse saison", title3: "Semaine (été)", price3: "1 750 €", desc3: "Juillet-août", cta_label: "Vérifier les disponibilités", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Émilie R.", "Séjour parfait, gîte encore plus beau qu'en photo.", "Groupe d'amis", "Piscine géniale, propriétaires aux petits soins.") },
      { type: "google_maps", content: { label: "La Grange de Loucette", address: "Chemin des Oliviers, 84220 Gordes", transport: "À 5 min du village" } },
      { type: "cta_button", content: { label: "Réserver mon séjour", url: "#", style: "gold", icon: "🗓️", full_width: "yes" } },
    ],
  },

  // ── Créatif & Média ───────────────────────────────────────────────────────
  {
    key: "crea_photographe", group: "Créatif & Média", label: "Photographe", emoji: "📷",
    desc: "Prestations, forfaits, réservation (portfolio à compléter).",
    blocks: [
      { type: "profile", content: { name: "Studio Lumen", tagline: "Photographe mariage & portrait", badge: "Sur réservation" } },
      { type: "bio", content: { text: "Je capture vos moments avec sensibilité et lumière naturelle. Mariages, couples, portraits et séances entreprise.", align: "center" } },
      { type: "gallery", content: { title: "Portfolio", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre photo") } },
      { type: "services_list", content: { title: "Prestations", s1_icon: "💍", s1_name: "Mariage", s1_desc: "Reportage complet, album", s2_icon: "👤", s2_name: "Portrait & couple", s2_desc: "Séance en extérieur ou studio", s3_icon: "🏢", s3_name: "Entreprise", s3_desc: "Portraits pro, événements" } },
      { type: "pricing", content: { title: "Forfaits", title1: "Séance portrait", price1: "180 €", desc1: "1h · 20 photos retouchées", title2: "Couple / famille", price2: "250 €", desc2: "1h30 · 40 photos", title3: "Mariage", price3: "dès 1 400 €", desc3: "Journée complète", cta_label: "Demander un devis", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Chloé & Antoine", "Des photos de mariage à couper le souffle, merci !", "Marine D.", "Séance portrait naturelle, résultat sublime.") },
      { type: "calendly", content: { label: "Réserver une séance", url: "https://calendly.com", description: "Échange découverte gratuit" } },
      { type: "social_links", content: { instagram: "https://instagram.com", website: "https://monsite.com" } },
    ],
  },
  {
    key: "crea_dj", group: "Créatif & Média", label: "DJ", emoji: "🎧",
    desc: "Sets, prestations événements, écoute et contact.",
    blocks: [
      { type: "profile", content: { name: "DJ AZUR", tagline: "DJ · Mariages, clubs, événements privés", badge: "Dates ouvertes 2025" } },
      { type: "bio", content: { text: "House, disco et hits qui font danser toutes les générations. Matériel son & lumière fourni, playlist co-construite avec vous.", align: "center" } },
      { type: "music_links", content: { artist_name: "DJ AZUR", spotify: "https://open.spotify.com", soundcloud: "https://soundcloud.com", youtube_music: "https://music.youtube.com" } },
      { type: "services_list", content: { title: "Prestations", s1_icon: "💍", s1_name: "Mariage", s1_desc: "Cérémonie, cocktail, soirée", s2_icon: "🎉", s2_name: "Soirée privée", s2_desc: "Anniversaire, entreprise", s3_icon: "🔊", s3_name: "Son & lumière", s3_desc: "Matériel pro fourni" } },
      { type: "testimonials", content: exampleReviews("Sarah & Kevin", "Piste pleine toute la nuit, lecture parfaite de l'ambiance.", "Comité d'entreprise", "Pro, ponctuel, matériel impeccable.") },
      { type: "cta_button", content: { label: "Vérifier ma date", url: "#", style: "neon", icon: "🎶", full_width: "yes" } },
      { type: "social_links", content: { instagram: "https://instagram.com", soundcloud: "https://soundcloud.com" } },
    ],
  },

  // ── Événementiel ────────────────────────────────────────────────────────────
  {
    key: "event_wedding_planner", group: "Événementiel", label: "Wedding planner", emoji: "💍",
    desc: "Accompagnement mariage, formules, témoignages, contact.",
    blocks: [
      { type: "profile", content: { name: "Oui Studio", tagline: "Wedding planner & décoratrice", badge: "2025-2026 : dates ouvertes" } },
      { type: "bio", content: { text: "J'orchestre votre mariage de A à Z : lieu, prestataires, décoration et coordination du jour J. Vous profitez, je gère.", align: "center" } },
      { type: "services_list", content: { title: "Mes formules", s1_icon: "✨", s1_name: "Organisation complète", s1_desc: "De l'idée au jour J", s2_icon: "🎀", s2_name: "Coordination jour J", s2_desc: "Le déroulé sans stress", s3_icon: "🌸", s3_name: "Décoration", s3_desc: "Scénographie sur-mesure" } },
      { type: "pricing", content: { title: "Formules", title1: "Coordination", price1: "1 200 €", desc1: "Jour J", title2: "Partielle", price2: "2 500 €", desc2: "Prestataires + déco", title3: "Complète", price3: "dès 4 500 €", desc3: "Clé en main", cta_label: "Prendre rendez-vous", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Léa & Maxime", "Mariage de rêve, aucun stress grâce à Oui Studio.", "Inès & Paul", "Décoration sublime, coordination millimétrée.") },
      { type: "contact_form", content: { title: "Parlez-moi de votre mariage", button_label: "Envoyer", show_phone: "yes" } },
      { type: "social_links", content: { instagram: "https://instagram.com", pinterest: "https://pinterest.com" } },
    ],
  },

  // ── Artisan / Coaching (compléments) ─────────────────────────────────────────
  {
    key: "artisan_paysagiste", group: "Artisan & BTP", label: "Paysagiste", emoji: "🌳",
    desc: "Création & entretien de jardins, devis, zone d'intervention.",
    blocks: [
      { type: "profile", content: { name: "Jardins & Co", tagline: "Paysagiste · Création & entretien", badge: "Devis gratuit" } },
      { type: "cta_button", content: { label: "Demander un devis", url: "#", style: "gold", icon: "🌿", full_width: "yes" } },
      { type: "services_list", content: { title: "Nos prestations", s1_icon: "🌱", s1_name: "Création de jardin", s1_desc: "Conception, plantation, terrasse", s2_icon: "✂️", s2_name: "Entretien", s2_desc: "Tonte, taille, désherbage", s3_icon: "💧", s3_name: "Arrosage & clôtures", s3_desc: "Automatique, brise-vue" } },
      { type: "testimonials", content: exampleReviews("M. et Mme Roy", "Jardin métamorphosé, équipe soignée et ponctuelle.", "Copropriété Les Tilleuls", "Entretien impeccable toute l'année.") },
      { type: "opening_hours", content: { title: "Disponibilités", mon_fri: "8h - 18h", saturday: "Sur devis", sunday: "Fermé", note: "Interventions dans un rayon de 40 km" } },
      { type: "contact_form", content: { title: "Votre projet de jardin", button_label: "Envoyer", show_phone: "yes" } },
      { type: "social_links", content: { facebook: "https://facebook.com", website: "https://monsite.com" } },
    ],
  },
  {
    key: "coach_sportif", group: "Coaching & Formation", label: "Coach sportif", emoji: "💪",
    desc: "Coaching perso, forfaits, réservation d'une séance découverte.",
    blocks: [
      { type: "profile", content: { name: "Coach Yanis", tagline: "Coach sportif · Perte de poids & remise en forme", badge: "1re séance offerte" } },
      { type: "bio", content: { text: "Programmes personnalisés en salle, à domicile ou en visio. Objectifs clairs, suivi nutritionnel et motivation au quotidien.", align: "center" } },
      { type: "services_list", content: { title: "Mes offres", s1_icon: "🏋️", s1_name: "Coaching individuel", s1_desc: "Séances 1h sur-mesure", s2_icon: "🥗", s2_name: "Suivi nutrition", s2_desc: "Plan alimentaire adapté", s3_icon: "💻", s3_name: "Coaching en visio", s3_desc: "Où que vous soyez" } },
      { type: "pricing", content: { title: "Forfaits", title1: "Séance", price1: "50 €", desc1: "À l'unité", title2: "Pack 10", price2: "420 €", desc2: "Économisez 80 €", title3: "Mensuel", price3: "260 €/mois", desc3: "8 séances + suivi", cta_label: "Réserver ma séance offerte", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Sophie M.", "-8 kg en 3 mois, méthode saine et motivante.", "Thomas B.", "Coach à l'écoute, progrès visibles rapidement.") },
      { type: "calendly", content: { label: "Réserver une séance découverte", url: "https://calendly.com", description: "45 min · gratuit · sans engagement" } },
      { type: "social_links", content: { instagram: "https://instagram.com", youtube: "https://youtube.com" } },
    ],
  },

  // ── Santé (compléments) ─────────────────────────────────────────────────────
  {
    key: "sante_psychologue", group: "Santé", label: "Psychologue", emoji: "🧠",
    desc: "Approche, motifs, prise de rendez-vous (cabinet & visio).",
    blocks: [
      { type: "profile", content: { name: "Claire Moreau", tagline: "Psychologue clinicienne · Cabinet & visio", badge: "Sur rendez-vous" } },
      { type: "bio", content: { text: "J'accompagne adultes et adolescents avec bienveillance et sans jugement : anxiété, confiance en soi, périodes de transition. Un espace confidentiel pour avancer à votre rythme.", align: "center" } },
      { type: "services_list", content: { title: "Motifs de consultation", s1_icon: "💭", s1_name: "Anxiété & stress", s1_desc: "Gestion des émotions", s2_icon: "🌱", s2_name: "Confiance en soi", s2_desc: "Estime et affirmation", s3_icon: "🔄", s3_name: "Transitions de vie", s3_desc: "Deuil, rupture, réorientation" } },
      { type: "faq", content: { title: "Questions fréquentes", q1: "Consultez-vous en visio ?", a1: "Oui, en cabinet ou en visioconférence sécurisée.", q2: "Combien de temps dure une séance ?", a2: "Environ 50 minutes.", q3: "Les séances sont-elles remboursées ?", a3: "Selon votre mutuelle et certains dispositifs, renseignez-vous." } },
      { type: "calendly", content: { label: "Prendre rendez-vous", url: "https://doctolib.fr", description: "Cabinet ou visio · 50 min" } },
      { type: "google_maps", content: { label: "Cabinet de psychologie", address: "23 rue Nationale, 59000 Lille", transport: "Métro Rihour" } },
    ],
  },
  {
    key: "sante_nutritionniste", group: "Santé", label: "Diététicien-nutritionniste", emoji: "🥗",
    desc: "Accompagnement, forfaits, prise de rendez-vous.",
    blocks: [
      { type: "profile", content: { name: "Léa Dubois", tagline: "Diététicienne-nutritionniste · Paris & visio", badge: "Bilan offert" } },
      { type: "bio", content: { text: "Rééquilibrage alimentaire durable, sans frustration ni régime restrictif. Un suivi personnalisé adapté à votre mode de vie et vos objectifs.", align: "center" } },
      { type: "services_list", content: { title: "Accompagnements", s1_icon: "⚖️", s1_name: "Perte de poids", s1_desc: "Approche progressive et durable", s2_icon: "🏃", s2_name: "Nutrition sportive", s2_desc: "Performance et récupération", s3_icon: "🌿", s3_name: "Troubles digestifs", s3_desc: "Confort et équilibre" } },
      { type: "pricing", content: { title: "Forfaits", title1: "Bilan", price1: "60 €", desc1: "1h · plan personnalisé", title2: "Suivi mensuel", price2: "150 €", desc2: "3 séances / mois", title3: "Programme 3 mois", price3: "390 €", desc3: "Suivi complet", cta_label: "Réserver mon bilan", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Julie P.", "-6 kg sans frustration, j'ai enfin compris comment m'alimenter.", "Marc T.", "Suivi au top, conseils concrets et bienveillants.") },
      { type: "calendly", content: { label: "Prendre rendez-vous", url: "https://calendly.com", description: "Cabinet ou visio" } },
      { type: "social_links", content: { instagram: "https://instagram.com" } },
    ],
  },
  {
    key: "sante_veterinaire", group: "Santé", label: "Vétérinaire", emoji: "🐾",
    desc: "Soins, horaires, urgences, localisation.",
    blocks: [
      { type: "profile", content: { name: "Clinique VetCare", tagline: "Vétérinaires · Chiens, chats & NAC", badge: "Urgences 7j/7" } },
      { type: "services_list", content: { title: "Nos soins", s1_icon: "💉", s1_name: "Consultation & vaccins", s1_desc: "Prévention et suivi", s2_icon: "🦴", s2_name: "Chirurgie", s2_desc: "Stérilisation, interventions", s3_icon: "🚨", s3_name: "Urgences", s3_desc: "Prise en charge rapide" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "8h30 - 19h", saturday: "9h - 18h", sunday: "Urgences uniquement", note: "Ligne d'urgence 24h/24" } },
      { type: "testimonials", content: exampleReviews("Sandra R.", "Équipe rassurante, mon chien a été très bien pris en charge.", "Julien M.", "Réactifs en urgence un dimanche, un grand merci.") },
      { type: "cta_button", content: { label: "Prendre rendez-vous", url: "#", style: "gold", icon: "🐕", full_width: "yes" } },
      { type: "google_maps", content: { label: "Clinique VetCare", address: "9 avenue des Fleurs, 31000 Toulouse", transport: "Métro Jean Jaurès" } },
      { type: "social_links", content: { facebook: "https://facebook.com", website: "https://monsite.com" } },
    ],
  },

  // ── Beauté (compléments) ─────────────────────────────────────────────────────
  {
    key: "beaute_ongles", group: "Beauté & bien-être", label: "Prothésiste ongulaire", emoji: "💅",
    desc: "Prestations, réalisations, réservation.",
    blocks: [
      { type: "profile", content: { name: "Nail Bar Studio", tagline: "Prothésiste ongulaire · Nail art", badge: "Sur rendez-vous" } },
      { type: "services_list", content: { title: "Prestations", s1_icon: "💅", s1_name: "Pose gel / semi", s1_desc: "Couleur, French, babyboomer", s2_icon: "🎨", s2_name: "Nail art", s2_desc: "Décors sur-mesure", s3_icon: "✨", s3_name: "Remplissage & dépose", s3_desc: "Entretien soigné" } },
      { type: "gallery", content: { title: "Réalisations", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre réalisation") } },
      { type: "calendly", content: { label: "Réserver un créneau", url: "https://calendly.com", description: "Réservation en ligne" } },
      { type: "testimonials", content: exampleReviews("Emma L.", "Pose impeccable qui tient 3 semaines, nail art superbe.", "Sarah K.", "Salon propre, accueil adorable, résultat top.") },
      { type: "social_links", content: { instagram: "https://instagram.com", tiktok: "https://tiktok.com" } },
    ],
  },
  {
    key: "beaute_tatoueur", group: "Beauté & bien-être", label: "Tatoueur", emoji: "🖋️",
    desc: "Style, flashs, prise de rendez-vous.",
    blocks: [
      { type: "profile", content: { name: "Encre & Style", tagline: "Studio de tatouage · Sur rendez-vous", badge: "Devis gratuit" } },
      { type: "bio", content: { text: "Tatouages fine line, blackwork et projets sur-mesure dans un studio hygiénique et bienveillant. Chaque pièce est unique.", align: "center" } },
      { type: "gallery", content: { title: "Portfolio", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre projet") } },
      { type: "services_list", content: { title: "Styles", s1_icon: "✒️", s1_name: "Fine line", s1_desc: "Traits fins et délicats", s2_icon: "⬛", s2_name: "Blackwork", s2_desc: "Aplats et contrastes", s3_icon: "🎨", s3_name: "Sur-mesure", s3_desc: "Projet personnalisé" } },
      { type: "testimonials", content: exampleReviews("Théo M.", "Travail d'une précision folle, studio ultra clean.", "Camille B.", "À l'écoute de mon projet, résultat au-delà de mes attentes.") },
      { type: "cta_button", content: { label: "Demander un devis", url: "#", style: "gold", icon: "🖋️", full_width: "yes" } },
      { type: "social_links", content: { instagram: "https://instagram.com" } },
    ],
  },
  {
    key: "beaute_spa_massage", group: "Beauté & bien-être", label: "Spa & massage", emoji: "🧖",
    desc: "Soins, forfaits, réservation, ambiance zen.",
    blocks: [
      { type: "profile", content: { name: "Sérénité Spa", tagline: "Spa · Massages & soins du corps", badge: "Offre découverte" } },
      { type: "promo_banner", content: { emoji: "🌸", text: "Rituel découverte -20%", subtext: "Valable sur votre première visite", cta_label: "En profiter", cta_url: "#" } },
      { type: "services_list", content: { title: "Nos soins", s1_icon: "💆", s1_name: "Massage relaxant", s1_desc: "60 min · détente profonde", s2_icon: "🔥", s2_name: "Soin aux pierres chaudes", s2_desc: "Chaleur et lâcher-prise", s3_icon: "🛁", s3_name: "Rituel corps", s3_desc: "Gommage + enveloppement" } },
      { type: "pricing", content: { title: "Forfaits", title1: "Massage 30 min", price1: "45 €", desc1: "Express détente", title2: "Rituel 1h", price2: "85 €", desc2: "Le plus demandé", title3: "Parenthèse 2h", price3: "150 €", desc3: "Soin complet", cta_label: "Réserver", cta_url: "#" } },
      { type: "calendly", content: { label: "Réserver un soin", url: "https://calendly.com", description: "7j/7 sur réservation" } },
      { type: "testimonials", content: exampleReviews("Nadia B.", "Parenthèse hors du temps, personnel aux petits soins.", "Hélène R.", "Massage divin, ambiance apaisante, je reviendrai.") },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  // ── Commerce (compléments) ───────────────────────────────────────────────────
  {
    key: "commerce_bijouterie", group: "Commerce", label: "Bijouterie", emoji: "💍",
    desc: "Collections, créations, click & collect.",
    blocks: [
      { type: "profile", content: { name: "Atelier Or & Éclat", tagline: "Bijouterie créateur · Or & pierres fines", badge: "Sur-mesure" } },
      { type: "bio", content: { text: "Bijoux créés à la main dans notre atelier : alliances, créations sur-mesure et réparations. L'élégance d'une pièce unique.", align: "center" } },
      { type: "gallery", content: { title: "Collections", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre bijou") } },
      { type: "product", content: { name: "Bague solitaire or 18k", price: "890 €", description: "Diamant 0,3 ct, or blanc. Certificat inclus.", cta_label: "Découvrir", cta_url: "#" } },
      { type: "cta_button", content: { label: "Prendre rendez-vous en boutique", url: "#", style: "gold", icon: "💎", full_width: "yes" } },
      { type: "google_maps", content: { label: "Atelier Or & Éclat", address: "7 rue de la Monnaie, 59000 Lille", transport: "Grand Place" } },
      { type: "social_links", content: { instagram: "https://instagram.com", pinterest: "https://pinterest.com" } },
    ],
  },
  {
    key: "commerce_cave", group: "Commerce", label: "Cave à vin", emoji: "🍷",
    desc: "Sélection, dégustations, conseils, horaires.",
    blocks: [
      { type: "profile", content: { name: "La Cave du Coin", tagline: "Caviste indépendant · Vins & spiritueux", badge: "Dégustations" } },
      { type: "bio", content: { text: "Une sélection de vignerons passionnés, des conseils sans chichis et des dégustations chaque samedi. Trouvez la bouteille parfaite.", align: "center" } },
      { type: "services_list", content: { title: "À la cave", s1_icon: "🍇", s1_name: "Sélection vignerons", s1_desc: "Nature, bio, coups de cœur", s2_icon: "🥂", s2_name: "Dégustations", s2_desc: "Chaque samedi 17h-20h", s3_icon: "🎁", s3_name: "Coffrets cadeaux", s3_desc: "Sur-mesure, tous budgets" } },
      { type: "promo_banner", content: { emoji: "🍾", text: "Foire aux vins : -15% dès 6 bouteilles", subtext: "Jusqu'à la fin du mois", cta_label: "Voir la sélection", cta_url: "#" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "10h - 13h / 15h - 20h", saturday: "10h - 20h", sunday: "10h - 13h", note: "Fermé le lundi matin" } },
      { type: "google_maps", content: { label: "La Cave du Coin", address: "14 rue du Marché, 21000 Dijon", transport: "Centre-ville" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },
  {
    key: "commerce_animalerie", group: "Commerce", label: "Toiletteur / Animalerie", emoji: "🐩",
    desc: "Prestations, produits, réservation toilettage.",
    blocks: [
      { type: "profile", content: { name: "Pattes & Compagnie", tagline: "Toilettage & animalerie · Chiens et chats", badge: "Sur rendez-vous" } },
      { type: "services_list", content: { title: "Toilettage", s1_icon: "🛁", s1_name: "Bain & séchage", s1_desc: "Shampoing adapté au pelage", s2_icon: "✂️", s2_name: "Coupe & tonte", s2_desc: "Selon la race", s3_icon: "🐾", s3_name: "Soins", s3_desc: "Griffes, oreilles, dents" } },
      { type: "gallery", content: { title: "Avant / après", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre animal") } },
      { type: "calendly", content: { label: "Réserver un toilettage", url: "https://calendly.com", description: "Réservation en ligne" } },
      { type: "testimonials", content: exampleReviews("Marie C.", "Mon caniche est magnifique, équipe douce et patiente.", "Paul D.", "Accueil top, prix justes, mon chat était zen.") },
      { type: "google_maps", content: { label: "Pattes & Compagnie", address: "3 rue des Lilas, 44000 Nantes", transport: "" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  // ── Business / Services ──────────────────────────────────────────────────────
  {
    key: "business_avocat", group: "Freelance & Entreprise", label: "Avocat / Cabinet juridique", emoji: "⚖️",
    desc: "Domaines d'expertise, honoraires, prise de contact.",
    blocks: [
      { type: "profile", content: { name: "Maître Hélène Girard", tagline: "Avocate · Droit du travail & des affaires", badge: "1er rendez-vous d'écoute" } },
      { type: "bio", content: { text: "J'accompagne particuliers et entreprises avec rigueur et clarté. Conseil, négociation et défense de vos intérêts, dans la confidentialité.", align: "left" } },
      { type: "services_list", content: { title: "Domaines d'intervention", s1_icon: "💼", s1_name: "Droit du travail", s1_desc: "Licenciement, rupture, litiges", s2_icon: "🏢", s2_name: "Droit des affaires", s2_desc: "Contrats, sociétés", s3_icon: "🤝", s3_name: "Médiation", s3_desc: "Résolution amiable" } },
      { type: "faq", content: { title: "Questions fréquentes", q1: "Comment se déroule un premier rendez-vous ?", a1: "Un échange d'écoute pour évaluer votre situation et les options.", q2: "Quels sont vos honoraires ?", a2: "Au temps passé ou au forfait, communiqués en toute transparence.", q3: "Intervenez-vous en urgence ?", a3: "Oui, selon les disponibilités, contactez le cabinet." } },
      { type: "contact_form", content: { title: "Demande de rendez-vous", button_label: "Envoyer", show_phone: "yes" } },
      { type: "google_maps", content: { label: "Cabinet", address: "12 boulevard Haussmann, 75009 Paris", transport: "Métro Chaussée d'Antin" } },
    ],
  },
  {
    key: "business_autoecole", group: "Freelance & Entreprise", label: "Auto-école", emoji: "🚗",
    desc: "Formules, taux de réussite (à compléter), inscription.",
    blocks: [
      { type: "profile", content: { name: "Auto-École Horizon", tagline: "Permis B, conduite accompagnée & code", badge: "Inscriptions ouvertes" } },
      { type: "services_list", content: { title: "Nos formules", s1_icon: "📘", s1_name: "Code de la route", s1_desc: "En salle et en ligne", s2_icon: "🚙", s2_name: "Permis B", s2_desc: "Forfait 20h ou à la carte", s3_icon: "👥", s3_name: "Conduite accompagnée", s3_desc: "Dès 15 ans (AAC)" } },
      { type: "pricing", content: { title: "Forfaits", title1: "Code seul", price1: "290 €", desc1: "Illimité 6 mois", title2: "Permis B 20h", price2: "1 190 €", desc2: "Code + 20h conduite", title3: "Heure suppl.", price3: "45 €", desc3: "À l'unité", cta_label: "S'inscrire", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Lina G.", "Permis du premier coup, moniteurs pédagogues et patients.", "Enzo R.", "Bonne ambiance, planning flexible, je recommande.") },
      { type: "opening_hours", content: { title: "Horaires du secrétariat", mon_fri: "9h - 12h / 14h - 19h", saturday: "9h - 12h", sunday: "Fermé", note: "" } },
      { type: "google_maps", content: { label: "Auto-École Horizon", address: "5 place de la Gare, 35000 Rennes", transport: "Gare SNCF" } },
      { type: "cta_button", content: { label: "Je m'inscris", url: "#", style: "gold", icon: "🚗", full_width: "yes" } },
    ],
  },
]
