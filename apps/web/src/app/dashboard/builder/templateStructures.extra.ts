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
      { type: "profile", content: { name: "Clé Express", tagline: "Serrurier · Dépannage 24 h/24 7j/7", badge: "Urgence 24/7" } },
      { type: "cta_button", content: { label: "Appeler maintenant", url: "tel:+33100000000", style: "gold", icon: "📞", full_width: "yes" } },
      { type: "services_list", content: { title: "Interventions", s1_icon: "🚪", s1_name: "Ouverture de porte", s1_desc: "Claquée ou verrouillée, sans dégât", s2_icon: "🛡️", s2_name: "Blindage & sécurité", s2_desc: "Porte blindée, serrure multipoints", s3_icon: "🔐", s3_name: "Changement de serrure", s3_desc: "Toutes marques, sur place" } },
      { type: "opening_hours", content: { title: "Disponibilité", mon_fri: "24 h/24", saturday: "24 h/24", sunday: "24 h/24", note: "Intervention en 30 min en moyenne" } },
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
      { type: "calendly", content: { label: "Prendre rendez-vous", url: "https://calendly.com", description: "Réservation 24 h/24" } },
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
      { type: "calendly", content: { label: "Prendre rendez-vous", url: "https://doctolib.fr", description: "Réservation en ligne 24 h/24" } },
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
      { type: "profile", content: { name: "Grain & Cie", tagline: "Coffee shop · Torréfaction artisanale", badge: "Wi-Fi & cosy" } },
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
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "8h30 - 19h", saturday: "9h - 18h", sunday: "Urgences uniquement", note: "Ligne d'urgence 24 h/24" } },
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

  // ── Restauration (compléments) ──────────────────────────────────────────────
  {
    key: "resto_cocktail", group: "Restauration", label: "Bar à cocktails", emoji: "🍸",
    desc: "Carte, ambiance, réservation, happy hour.",
    blocks: [
      { type: "profile", content: { name: "Le Comptoir Noir", tagline: "Bar à cocktails · Mixologie & ambiance", badge: "Happy hour 18h-20h" } },
      { type: "menu_section", content: { category: "Nos signatures", item1_name: "Smoky Old Fashioned", item1_price: "13 €", item1_desc: "Bourbon, sirop d'érable, fumé", item2_name: "Jardin Secret", item2_price: "12 €", item2_desc: "Gin, concombre, basilic", item3_name: "Sunset Spritz", item3_price: "11 €", item3_desc: "Aperol maison, agrumes" } },
      { type: "promo_banner", content: { emoji: "🍹", text: "Happy hour tous les soirs 18h-20h", subtext: "Cocktails signatures à -30%", cta_label: "Réserver", cta_url: "#" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "18h - 2h", saturday: "18h - 2h", sunday: "Fermé", note: "Réservation conseillée le week-end" } },
      { type: "google_maps", content: { label: "Le Comptoir Noir", address: "8 rue de la Soif, 44000 Nantes", transport: "Centre-ville" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },
  {
    key: "resto_sushi", group: "Restauration", label: "Restaurant japonais", emoji: "🍣",
    desc: "Carte, commande, livraison, horaires.",
    blocks: [
      { type: "profile", content: { name: "Sakura", tagline: "Restaurant japonais · Sushi & ramen", badge: "Livraison & à emporter" } },
      { type: "cta_button", content: { label: "Commander en ligne", url: "#", style: "gold", icon: "🥢", full_width: "yes" } },
      { type: "menu_section", content: { category: "Nos incontournables", item1_name: "Assortiment 18 pièces", item1_price: "22 €", item1_desc: "Sushi, maki, california", item2_name: "Ramen tonkotsu", item2_price: "15 €", item2_desc: "Bouillon 12h, porc, œuf mollet", item3_name: "Chirashi saumon", item3_price: "17 €", item3_desc: "Riz vinaigré, saumon frais" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "11h30 - 14h / 18h30 - 22h30", saturday: "18h30 - 23h", sunday: "18h30 - 22h", note: "" } },
      { type: "google_maps", content: { label: "Sakura", address: "21 rue des Érables, 67000 Strasbourg", transport: "Tram Homme de Fer" } },
      { type: "social_links", content: { instagram: "https://instagram.com" } },
    ],
  },
  {
    key: "resto_traiteur", group: "Restauration", label: "Traiteur événementiel", emoji: "🍽️",
    desc: "Prestations, formules, devis événement.",
    blocks: [
      { type: "profile", content: { name: "Saveurs & Réceptions", tagline: "Traiteur · Mariages, entreprises, privé", badge: "Devis gratuit" } },
      { type: "bio", content: { text: "Une cuisine généreuse et raffinée pour vos événements : cocktails dînatoires, buffets et repas assis, avec service sur mesure.", align: "center" } },
      { type: "services_list", content: { title: "Nos prestations", s1_icon: "🥂", s1_name: "Cocktail dînatoire", s1_desc: "Pièces salées & sucrées", s2_icon: "🍴", s2_name: "Repas assis", s2_desc: "Menus 3 à 5 services", s3_icon: "🎪", s3_name: "Service & matériel", s3_desc: "Personnel, vaisselle, mobilier" } },
      { type: "pricing", content: { title: "Formules (par personne)", title1: "Cocktail", price1: "dès 22 €", desc1: "10 pièces", title2: "Buffet", price2: "dès 32 €", desc2: "Entrée, plat, dessert", title3: "Repas assis", price3: "dès 48 €", desc3: "Service inclus", cta_label: "Demander un devis", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Comité d'entreprise", "Cocktail parfait pour nos 120 invités, tout était délicieux.", "Élise & Marc", "Repas de mariage sublime, service impeccable.") },
      { type: "contact_form", content: { title: "Votre événement", button_label: "Demander un devis", show_phone: "yes" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  // ── Artisan & BTP (compléments) ─────────────────────────────────────────────
  {
    key: "artisan_menuisier", group: "Artisan & BTP", label: "Menuisier", emoji: "🪵",
    desc: "Sur-mesure, réalisations, devis.",
    blocks: [
      { type: "profile", content: { name: "Atelier du Bois", tagline: "Menuisier ébéniste · Sur-mesure", badge: "Devis gratuit" } },
      { type: "cta_button", content: { label: "Demander un devis", url: "#", style: "gold", icon: "🪚", full_width: "yes" } },
      { type: "services_list", content: { title: "Nos réalisations", s1_icon: "🚪", s1_name: "Portes & fenêtres", s1_desc: "Bois massif, isolation", s2_icon: "🪑", s2_name: "Meubles sur-mesure", s2_desc: "Dressing, bibliothèque, cuisine", s3_icon: "🪜", s3_name: "Escaliers & parquets", s3_desc: "Pose et rénovation" } },
      { type: "gallery", content: { title: "Nos ouvrages", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre projet") } },
      { type: "testimonials", content: exampleReviews("M. Bernard", "Dressing sur-mesure magnifique, finitions parfaites.", "Famille Petit", "Escalier bois superbe, artisan à l'écoute.") },
      { type: "contact_form", content: { title: "Votre projet bois", button_label: "Envoyer", show_phone: "yes" } },
    ],
  },
  {
    key: "artisan_peintre", group: "Artisan & BTP", label: "Peintre en bâtiment", emoji: "🎨",
    desc: "Intérieur/extérieur, devis, zone d'intervention.",
    blocks: [
      { type: "profile", content: { name: "Couleurs & Finitions", tagline: "Peintre en bâtiment · Intérieur & extérieur", badge: "Devis gratuit" } },
      { type: "cta_button", content: { label: "Obtenir un devis", url: "#", style: "gold", icon: "🖌️", full_width: "yes" } },
      { type: "services_list", content: { title: "Nos prestations", s1_icon: "🏠", s1_name: "Peinture intérieure", s1_desc: "Murs, plafonds, boiseries", s2_icon: "🌦️", s2_name: "Façades", s2_desc: "Ravalement, protection", s3_icon: "🧱", s3_name: "Revêtements", s3_desc: "Enduits, papiers peints" } },
      { type: "gallery", content: { title: "Chantiers réalisés", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre chantier") } },
      { type: "opening_hours", content: { title: "Disponibilités", mon_fri: "8h - 18h", saturday: "Sur devis", sunday: "Fermé", note: "Devis sous 48h" } },
      { type: "social_links", content: { facebook: "https://facebook.com", website: "https://monsite.com" } },
    ],
  },
  {
    key: "artisan_pisciniste", group: "Artisan & BTP", label: "Pisciniste", emoji: "🏊",
    desc: "Construction, entretien, rénovation, devis.",
    blocks: [
      { type: "profile", content: { name: "Bleu Lagon Piscines", tagline: "Pisciniste · Construction & entretien", badge: "Devis gratuit" } },
      { type: "services_list", content: { title: "Nos services", s1_icon: "🏗️", s1_name: "Construction", s1_desc: "Béton, coque, sur-mesure", s2_icon: "🧴", s2_name: "Entretien", s2_desc: "Contrat annuel, hivernage", s3_icon: "🔧", s3_name: "Rénovation", s3_desc: "Liner, margelles, local technique" } },
      { type: "gallery", content: { title: "Nos réalisations", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre piscine") } },
      { type: "testimonials", content: exampleReviews("M. et Mme Faure", "Piscine de rêve livrée dans les délais, équipe pro.", "Copropriété Le Parc", "Entretien impeccable toute la saison.") },
      { type: "cta_button", content: { label: "Demander un devis", url: "#", style: "gold", icon: "💧", full_width: "yes" } },
      { type: "contact_form", content: { title: "Votre projet piscine", button_label: "Envoyer", show_phone: "yes" } },
    ],
  },
  {
    key: "business_nettoyage", group: "Freelance & Entreprise", label: "Société de nettoyage", emoji: "🧽",
    desc: "Prestations pro & particuliers, devis.",
    blocks: [
      { type: "profile", content: { name: "NetPro Services", tagline: "Nettoyage professionnel · Bureaux & particuliers", badge: "Devis sous 24 heures" } },
      { type: "cta_button", content: { label: "Demander un devis", url: "#", style: "gold", icon: "✨", full_width: "yes" } },
      { type: "services_list", content: { title: "Nos prestations", s1_icon: "🏢", s1_name: "Bureaux & commerces", s1_desc: "Entretien régulier ou ponctuel", s2_icon: "🏠", s2_name: "Fin de chantier", s2_desc: "Remise en état complète", s3_icon: "🪟", s3_name: "Vitrerie", s3_desc: "Vitres, façades, hauteurs" } },
      { type: "testimonials", content: exampleReviews("Cabinet Lemaire", "Bureaux impeccables chaque matin, équipe sérieuse.", "Résidence Les Cèdres", "Parties communes nickel, très réactifs.") },
      { type: "contact_form", content: { title: "Votre besoin", button_label: "Demander un devis", show_phone: "yes" } },
      { type: "social_links", content: { website: "https://monsite.com" } },
    ],
  },
  {
    key: "business_demenagement", group: "Freelance & Entreprise", label: "Déménageur", emoji: "📦",
    desc: "Formules, devis gratuit, zone d'intervention.",
    blocks: [
      { type: "profile", content: { name: "Cap Déménagement", tagline: "Déménageurs · Particuliers & entreprises", badge: "Devis gratuit" } },
      { type: "cta_button", content: { label: "Estimer mon déménagement", url: "#", style: "gold", icon: "🚚", full_width: "yes" } },
      { type: "services_list", content: { title: "Nos formules", s1_icon: "📦", s1_name: "Économique", s1_desc: "Vous emballez, on transporte", s2_icon: "🧰", s2_name: "Standard", s2_desc: "Emballage fragile inclus", s3_icon: "⭐", s3_name: "Clé en main", s3_desc: "Tout géré de A à Z" } },
      { type: "pricing", content: { title: "À partir de", title1: "Studio", price1: "290 €", desc1: "Jusqu'à 20 m²", title2: "T3", price2: "590 €", desc2: "Jusqu'à 70 m²", title3: "Maison", price3: "Sur devis", desc3: "Grand volume", cta_label: "Obtenir un devis", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Sophie & Karim", "Déménagement rapide et soigné, rien de cassé.", "Julien P.", "Équipe efficace et sympa, prix conforme au devis.") },
      { type: "contact_form", content: { title: "Votre déménagement", button_label: "Demander un devis", show_phone: "yes" } },
    ],
  },

  // ── Immobilier & Créatif (compléments) ──────────────────────────────────────
  {
    key: "immo_architecte", group: "Immobilier", label: "Architecte", emoji: "📐",
    desc: "Projets, approche, portfolio, contact.",
    blocks: [
      { type: "profile", content: { name: "Atelier Ligne & Forme", tagline: "Architecte DPLG · Neuf & rénovation", badge: "Sur rendez-vous" } },
      { type: "bio", content: { text: "Nous concevons des lieux qui vous ressemblent : maisons, extensions et rénovations, de l'esquisse au suivi de chantier.", align: "center" } },
      { type: "gallery", content: { title: "Réalisations", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre projet") } },
      { type: "services_list", content: { title: "Nos missions", s1_icon: "✏️", s1_name: "Conception", s1_desc: "Esquisse, plans, permis", s2_icon: "🏗️", s2_name: "Suivi de chantier", s2_desc: "Coordination des travaux", s3_icon: "🌿", s3_name: "Rénovation durable", s3_desc: "Énergie et matériaux" } },
      { type: "testimonials", content: exampleReviews("Famille Renaud", "Extension parfaitement intégrée, écoute remarquable.", "M. Aubry", "Rénovation réussie, budget maîtrisé.") },
      { type: "contact_form", content: { title: "Parlons de votre projet", button_label: "Envoyer", show_phone: "yes" } },
    ],
  },
  {
    key: "immo_decorateur", group: "Immobilier", label: "Décorateur d'intérieur", emoji: "🛋️",
    desc: "Prestations, forfaits, portfolio, contact.",
    blocks: [
      { type: "profile", content: { name: "Studio Intérieurs", tagline: "Décoratrice d'intérieur · Home staging", badge: "1er échange offert" } },
      { type: "bio", content: { text: "Je révèle le potentiel de vos espaces : agencement, couleurs et mobilier pour un intérieur qui vous ressemble et met en valeur votre bien.", align: "center" } },
      { type: "gallery", content: { title: "Avant / après", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre intérieur") } },
      { type: "pricing", content: { title: "Forfaits", title1: "Consultation", price1: "150 €", desc1: "2h à domicile", title2: "Planche déco", price2: "490 €", desc2: "Une pièce", title3: "Projet complet", price3: "Sur devis", desc3: "Agencement + suivi", cta_label: "Prendre rendez-vous", cta_url: "#" } },
      { type: "calendly", content: { label: "Réserver un échange", url: "https://calendly.com", description: "30 min · offert" } },
      { type: "social_links", content: { instagram: "https://instagram.com", pinterest: "https://pinterest.com" } },
    ],
  },
  {
    key: "crea_developpeur", group: "Créatif & Média", label: "Développeur freelance", emoji: "💻",
    desc: "Stack, services, tarifs, prise de contact.",
    blocks: [
      { type: "profile", content: { name: "Alex Martin", tagline: "Développeur web freelance · React & Node", badge: "Disponible pour missions" } },
      { type: "bio", content: { text: "Je conçois des applications web performantes et sur-mesure. De l'idée au déploiement, un interlocuteur unique et un code propre.", align: "left" } },
      { type: "skills", content: { title: "Stack", tags: "React, Next.js, Node.js, TypeScript, PostgreSQL, Docker, AWS" } },
      { type: "services_list", content: { title: "Mes services", s1_icon: "🖥️", s1_name: "Développement web", s1_desc: "Sites, apps, SaaS", s2_icon: "🔌", s2_name: "API & intégrations", s2_desc: "Stripe, Supabase, tierces", s3_icon: "⚙️", s3_name: "Conseil technique", s3_desc: "Audit, architecture" } },
      { type: "pricing", content: { title: "Tarifs", title1: "TJM", price1: "500 €", desc1: "Journée", title2: "Site vitrine", price2: "dès 2 500 €", desc2: "Forfait", title3: "Retainer", price3: "1 800 €/mois", desc3: "20h/mois", cta_label: "Demander un devis", cta_url: "#" } },
      { type: "calendly", content: { label: "Réserver un appel", url: "https://calendly.com", description: "30 min · découverte projet" } },
      { type: "social_links", content: { github: "https://github.com", linkedin: "https://linkedin.com", website: "https://monsite.com" } },
    ],
  },

  // ── T5 lot 5 : nouvelles verticales ─────────────────────────────────────────
  // Restauration
  {
    key: "resto_creperie", group: "Restauration", label: "Crêperie", emoji: "🥞",
    desc: "Galettes, crêpes, cidre + carte et horaires.",
    blocks: [
      { type: "profile", content: { name: "La Belle Bigoudène", tagline: "Crêperie artisanale · Galettes de blé noir", badge: "Fait maison" } },
      { type: "menu_section", content: { category: "Galettes", item1_name: "La Complète", item1_price: "9,50 €", item1_desc: "Jambon, œuf, emmental", item2_name: "La Forestière", item2_price: "11 €", item2_desc: "Champignons, crème, persillade", item3_name: "La Chèvre-miel", item3_price: "10,50 €", item3_desc: "Chèvre, miel, noix" } },
      { type: "menu_section", content: { category: "Crêpes sucrées", item1_name: "Beurre-sucre", item1_price: "4,50 €", item1_desc: "Le grand classique", item2_name: "Caramel beurre salé", item2_price: "6,50 €", item2_desc: "Maison, chantilly", item3_name: "Pommes flambées", item3_price: "7,50 €", item3_desc: "Calvados, glace vanille" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "12h-14h30 / 19h-22h", saturday: "12h-22h30", sunday: "12h-15h", note: "Réservation conseillée le week-end" } },
      { type: "testimonials", content: exampleReviews("Gwenaëlle L.", "Galettes croustillantes et cidre parfait, un vrai coin de Bretagne.", "Hugo T.", "La caramel beurre salé est incroyable, accueil chaleureux.") },
      { type: "google_maps", content: { label: "La Belle Bigoudène", address: "5 rue de la Marine, 29000 Quimper", transport: "Centre-ville, parking à proximité" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },
  {
    key: "resto_glacier", group: "Restauration", label: "Glacier artisanal", emoji: "🍦",
    desc: "Glaces & sorbets maison, parfums de saison, galerie.",
    blocks: [
      { type: "profile", content: { name: "Gelato Vero", tagline: "Glacier artisanal · Parfums de saison", badge: "Fabrication maison" } },
      { type: "gallery", content: { title: "Nos parfums", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre parfum") } },
      { type: "menu_section", content: { category: "À la carte", item1_name: "Boule (1)", item1_price: "2,80 €", item1_desc: "Cornet ou pot", item2_name: "Duo (2 boules)", item2_price: "4,80 €", item2_desc: "Deux parfums au choix", item3_name: "Coupe gourmande", item3_price: "8,50 €", item3_desc: "3 boules, chantilly, topping" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "12h - 22h", saturday: "11h - 23h", sunday: "11h - 22h", note: "Ouvert tous les jours en été" } },
      { type: "testimonials", content: exampleReviews("Léa M.", "Sorbets ultra fruités, on sent le vrai fruit. Un régal.", "Antoine V.", "Pistache et stracciatella au top, adresse à retenir.") },
      { type: "google_maps", content: { label: "Gelato Vero", address: "18 promenade des Anglais, 06000 Nice", transport: "Bord de mer" } },
      { type: "social_links", content: { instagram: "https://instagram.com" } },
    ],
  },

  // Santé
  {
    key: "sante_sagefemme", group: "Santé", label: "Sage-femme", emoji: "🤱",
    desc: "Suivi grossesse, préparation, rééducation + prise de RDV.",
    blocks: [
      { type: "profile", content: { name: "Claire Fontaine", tagline: "Sage-femme libérale · Suivi & accompagnement", badge: "Conventionnée" } },
      { type: "bio", content: { text: "J'accompagne les femmes à chaque étape : suivi de grossesse, préparation à la naissance, rééducation périnéale et suivi gynécologique de prévention.", align: "left" } },
      { type: "services_list", content: { title: "Mes consultations", s1_icon: "🤰", s1_name: "Suivi de grossesse", s1_desc: "Consultations et monitoring", s2_icon: "🧘", s2_name: "Préparation à la naissance", s2_desc: "Séances individuelles ou en groupe", s3_icon: "💗", s3_name: "Rééducation périnéale", s3_desc: "Après l'accouchement" } },
      { type: "faq", content: { title: "Questions fréquentes", q1: "Les consultations sont-elles remboursées ?", a1: "Oui, prises en charge par l'Assurance Maladie selon les cas.", q2: "Intervenez-vous à domicile ?", a2: "Oui, pour le suivi post-natal dans un rayon défini.", q3: "Comment prendre rendez-vous ?", a3: "En ligne ou par téléphone au cabinet." } },
      { type: "calendly", content: { label: "Prendre rendez-vous", url: "https://doctolib.fr", description: "Cabinet ou visite à domicile" } },
      { type: "google_maps", content: { label: "Cabinet", address: "12 rue des Lilas, 44000 Nantes", transport: "Tram ligne 1 · arrêt Commerce" } },
      { type: "social_links", content: { website: "https://monsite.com", phone: "tel:+33200000000" } },
    ],
  },
  {
    key: "sante_kine", group: "Santé", label: "Kinésithérapeute", emoji: "💪",
    desc: "Rééducation, sport, thérapie manuelle + horaires et RDV.",
    blocks: [
      { type: "profile", content: { name: "Cabinet KinéForm", tagline: "Masseur-kinésithérapeute · Rééducation & sport", badge: "Nouveaux patients acceptés" } },
      { type: "services_list", content: { title: "Prises en charge", s1_icon: "🦴", s1_name: "Rééducation", s1_desc: "Post-opératoire, traumatologie", s2_icon: "🏃", s2_name: "Kiné du sport", s2_desc: "Récupération, prévention des blessures", s3_icon: "🖐️", s3_name: "Thérapie manuelle", s3_desc: "Douleurs dorsales et cervicales" } },
      { type: "opening_hours", content: { title: "Horaires du cabinet", mon_fri: "8h - 19h", saturday: "9h - 13h", sunday: "Fermé", note: "Sur rendez-vous uniquement" } },
      { type: "testimonials", content: exampleReviews("Sébastien R.", "Rééducation du genou parfaitement suivie, retour au sport réussi.", "Amélie D.", "Praticien à l'écoute, exercices clairs et efficaces.") },
      { type: "calendly", content: { label: "Prendre rendez-vous", url: "https://doctolib.fr", description: "Réservation en ligne 24 h/24" } },
      { type: "google_maps", content: { label: "Cabinet KinéForm", address: "8 avenue du Sport, 33000 Bordeaux", transport: "Tram B · arrêt Victoire" } },
      { type: "social_links", content: { website: "https://monsite.com" } },
    ],
  },

  // Beauté
  {
    key: "beaute_maquilleuse", group: "Beauté & bien-être", label: "Maquilleuse pro", emoji: "💄",
    desc: "Mariage, shooting, événement + portfolio et réservation.",
    blocks: [
      { type: "profile", content: { name: "Studio Éclat", tagline: "Maquilleuse professionnelle · Mariage & shooting", badge: "Déplacements possibles" } },
      { type: "gallery", content: { title: "Portfolio", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre maquillage") } },
      { type: "services_list", content: { title: "Prestations", s1_icon: "👰", s1_name: "Maquillage mariée", s1_desc: "Essai + jour J", s2_icon: "📸", s2_name: "Shooting & mode", s2_desc: "Éditorial, book, défilé", s3_icon: "🎉", s3_name: "Événement & soirée", s3_desc: "Maquillage à domicile" } },
      { type: "pricing", content: { title: "Tarifs", title1: "Essai", price1: "60 €", desc1: "1h en studio", title2: "Jour J mariée", price2: "180 €", desc2: "Essai inclus", title3: "Shooting", price3: "sur devis", desc3: "Selon durée", cta_label: "Demander un devis", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Marion B.", "Maquillage tenue toute la journée de mon mariage, sublime et naturel.", "Inès K.", "À l'écoute et talentueuse, résultat parfait pour mon book.") },
      { type: "calendly", content: { label: "Réserver un essai", url: "https://calendly.com", description: "Studio ou à domicile" } },
      { type: "social_links", content: { instagram: "https://instagram.com", tiktok: "https://tiktok.com" } },
    ],
  },

  // Business & services
  {
    key: "business_comptable", group: "Freelance & Entreprise", label: "Expert-comptable", emoji: "📊",
    desc: "Compta, fiscalité, création d'entreprise + prise de contact.",
    blocks: [
      { type: "profile", content: { name: "Cabinet Rigueur & Conseil", tagline: "Expert-comptable · TPE, PME, indépendants", badge: "Premier rendez-vous offert" } },
      { type: "bio", content: { text: "Nous accompagnons les entrepreneurs dans la gestion comptable, fiscale et sociale de leur activité, avec un conseil clair et proactif.", align: "left" } },
      { type: "services_list", content: { title: "Nos missions", s1_icon: "🧮", s1_name: "Comptabilité", s1_desc: "Tenue, bilan, liasse fiscale", s2_icon: "📄", s2_name: "Fiscalité & social", s2_desc: "Déclarations, paie, optimisation", s3_icon: "🚀", s3_name: "Création d'entreprise", s3_desc: "Statuts, business plan, prévisionnel" } },
      { type: "pricing", content: { title: "Formules", title1: "Micro", price1: "dès 49 €/mois", desc1: "Auto-entrepreneur", title2: "TPE", price2: "dès 129 €/mois", desc2: "Compta complète", title3: "PME", price3: "sur devis", desc3: "Accompagnement dédié", cta_label: "Demander un devis", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Nicolas F.", "Accompagnement précieux à la création de ma société, réactif et pédagogue.", "Sandra P.", "Cabinet sérieux, conseils fiscaux qui m'ont fait économiser.") },
      { type: "contact_form", content: { title: "Parlons de votre activité", button_label: "Être recontacté", show_phone: "yes" } },
      { type: "social_links", content: { linkedin: "https://linkedin.com", website: "https://monsite.com" } },
    ],
  },
  {
    key: "business_couvreur", group: "Artisan & BTP", label: "Couvreur", emoji: "🏠",
    desc: "Toiture, zinguerie, démoussage + réalisations et devis.",
    blocks: [
      { type: "profile", content: { name: "Toit Serein", tagline: "Couvreur-zingueur · Neuf & rénovation", badge: "Devis gratuit" } },
      { type: "cta_button", content: { label: "Demander un devis toiture", url: "#", style: "gold", icon: "🏠", full_width: "yes" } },
      { type: "services_list", content: { title: "Nos prestations", s1_icon: "🧱", s1_name: "Réfection de toiture", s1_desc: "Tuiles, ardoises, bac acier", s2_icon: "🌧️", s2_name: "Zinguerie & gouttières", s2_desc: "Étanchéité, évacuation des eaux", s3_icon: "🧽", s3_name: "Démoussage & entretien", s3_desc: "Nettoyage, traitement hydrofuge" } },
      { type: "gallery", content: { title: "Nos réalisations", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre toiture") } },
      { type: "testimonials", content: exampleReviews("Philippe M.", "Toiture refaite proprement, chantier tenu dans les délais.", "Christine A.", "Devis clair, travail soigné, je recommande.") },
      { type: "contact_form", content: { title: "Votre projet de toiture", button_label: "Demander un devis", show_phone: "yes" } },
      { type: "social_links", content: { facebook: "https://facebook.com", website: "https://monsite.com" } },
    ],
  },
  {
    key: "business_macon", group: "Artisan & BTP", label: "Maçon", emoji: "🧱",
    desc: "Gros œuvre, extension, terrasse + chantiers et devis.",
    blocks: [
      { type: "profile", content: { name: "BâtiSolide", tagline: "Maçonnerie générale · Gros œuvre & rénovation", badge: "Artisan qualifié" } },
      { type: "cta_button", content: { label: "Obtenir un devis", url: "#", style: "gold", icon: "🧱", full_width: "yes" } },
      { type: "services_list", content: { title: "Nos travaux", s1_icon: "🏗️", s1_name: "Gros œuvre", s1_desc: "Fondations, murs, dalles", s2_icon: "➕", s2_name: "Extension & surélévation", s2_desc: "Agrandir votre habitation", s3_icon: "🌿", s3_name: "Terrasse & aménagement", s3_desc: "Béton, dallage, clôtures" } },
      { type: "gallery", content: { title: "Chantiers réalisés", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre chantier") } },
      { type: "testimonials", content: exampleReviews("Laurent B.", "Extension réalisée dans les règles, finitions impeccables.", "Fatima Z.", "Équipe sérieuse et ponctuelle, budget respecté.") },
      { type: "contact_form", content: { title: "Décrivez votre projet", button_label: "Demander un devis", show_phone: "yes" } },
      { type: "social_links", content: { facebook: "https://facebook.com", website: "https://monsite.com" } },
    ],
  },

  // Créatif
  {
    key: "crea_motion", group: "Créatif & Média", label: "Motion designer", emoji: "🎬",
    desc: "Animation, habillage, vidéo + showreel et tarifs.",
    blocks: [
      { type: "profile", content: { name: "Léo Motion", tagline: "Motion designer · Animation & habillage vidéo", badge: "Disponible en freelance" } },
      { type: "bio", content: { text: "Je donne vie à vos idées : génériques, motion design, habillage de chaîne, publicité animée. Un rendu soigné, du concept à l'export.", align: "center" } },
      { type: "gallery", content: { title: "Showreel & projets", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre projet") } },
      { type: "skills", content: { title: "Outils", tags: "After Effects, Première Pro, Cinema 4D, Illustrator, Blender" } },
      { type: "pricing", content: { title: "Tarifs", title1: "Logo animé", price1: "dès 250 €", desc1: "Sting court", title2: "Vidéo motion", price2: "dès 900 €", desc2: "30-60 s", title3: "Habillage complet", price3: "sur devis", desc3: "Chaîne / marque", cta_label: "Demander un devis", cta_url: "#" } },
      { type: "calendly", content: { label: "Réserver un appel", url: "https://calendly.com", description: "20 min · brief projet" } },
      { type: "social_links", content: { instagram: "https://instagram.com", youtube: "https://youtube.com", website: "https://monsite.com" } },
    ],
  },
  {
    key: "crea_podcast", group: "Créatif & Média", label: "Podcasteur", emoji: "🎙️",
    desc: "Épisodes, plateformes d'écoute, communauté + soutien.",
    blocks: [
      { type: "profile", content: { name: "Les Voix du Jeudi", tagline: "Podcast · Conversations & idées", badge: "Nouvel épisode chaque jeudi" } },
      { type: "bio", content: { text: "Chaque semaine, une rencontre et une conversation sincère. Disponible sur toutes les plateformes d'écoute.", align: "center" } },
      { type: "spotify_player", content: { title: "Écouter le dernier épisode", url: "https://open.spotify.com" } },
      { type: "music_links", content: { artist_name: "Les Voix du Jeudi", spotify: "https://open.spotify.com", apple_music: "https://music.apple.com", deezer: "https://deezer.com", youtube_music: "https://music.youtube.com" } },
      { type: "cta_button", content: { label: "Soutenir le podcast", url: "#", style: "gold", icon: "💛", full_width: "yes" } },
      { type: "social_links", content: { instagram: "https://instagram.com", youtube: "https://youtube.com", twitter: "https://twitter.com" } },
    ],
  },

  // Événementiel
  {
    key: "event_dj_mariage", group: "Événementiel", label: "DJ mariage", emoji: "🎧",
    desc: "Animation, sono, playlist sur mesure + réservation de date.",
    blocks: [
      { type: "profile", content: { name: "DJ Horizon", tagline: "DJ mariage & événements · Sono et lumière", badge: "Dates ouvertes cette saison" } },
      { type: "bio", content: { text: "Je crée l'ambiance de votre soirée, du vin d'honneur au bout de la nuit. Playlist personnalisée, matériel professionnel et animation sur mesure.", align: "center" } },
      { type: "services_list", content: { title: "Formules", s1_icon: "🎶", s1_name: "Mariage", s1_desc: "Cérémonie, cocktail, soirée", s2_icon: "🔊", s2_name: "Sono & lumière", s2_desc: "Matériel pro fourni et installé", s3_icon: "🎤", s3_name: "Animation", s3_desc: "Micro, jeux, coordination" } },
      { type: "event_info", content: { name: "Réservez votre date", date: "Saison en cours", time: "Soirée", location: "Votre lieu de réception", price: "Formules dès 690 €", cta_label: "Vérifier ma date", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Julie & Marc", "Piste de danse pleine toute la nuit, playlist parfaite. Merci !", "Emma & Sofiane", "Professionnel et à l'écoute, il a lu la salle à la perfection.") },
      { type: "calendly", content: { label: "Vérifier ma date", url: "https://calendly.com", description: "Réponse rapide · devis gratuit" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com", youtube: "https://youtube.com" } },
    ],
  },

  // ── T5 lot 6 : nouvelles verticales ─────────────────────────────────────────
  // Restauration
  {
    key: "resto_foodtruck", group: "Restauration", label: "Food truck", emoji: "🚚",
    desc: "Emplacements du jour, carte, où nous trouver.",
    blocks: [
      { type: "profile", content: { name: "Le Camion Doré", tagline: "Food truck · Burgers maison & frites fraîches", badge: "Où on est aujourd'hui ?" } },
      { type: "cta_button", content: { label: "Voir l'emplacement du jour", url: "#", style: "gold", icon: "📍", full_width: "yes" } },
      { type: "menu_section", content: { category: "Nos burgers", item1_name: "Le Classique", item1_price: "9 €", item1_desc: "Bœuf, cheddar, oignons confits", item2_name: "Le Fondant", item2_price: "11 €", item2_desc: "Bœuf, raclette, champignons", item3_name: "Le Végé", item3_price: "9,50 €", item3_desc: "Galette maison, avocat, tomate" } },
      { type: "opening_hours", content: { title: "Nos tournées", mon_fri: "11h30-14h · Zone bureaux", saturday: "18h-22h · Marché nocturne", sunday: "Repos", note: "Emplacement du jour sur Instagram" } },
      { type: "testimonials", content: exampleReviews("Rémi C.", "Meilleur burger du quartier, viande cuite parfaitement.", "Alicia N.", "Frites fraîches et accueil top, on revient chaque semaine.") },
      { type: "google_maps", content: { label: "Emplacement du midi", address: "Place de la Gare, 35000 Rennes", transport: "Change selon les jours — voir Instagram" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },
  {
    key: "resto_salondethe", group: "Restauration", label: "Salon de thé", emoji: "🫖",
    desc: "Thés, pâtisseries maison, brunch + ambiance et horaires.",
    blocks: [
      { type: "profile", content: { name: "Maison Camélia", tagline: "Salon de thé · Pâtisseries maison", badge: "Brunch le week-end" } },
      { type: "gallery", content: { title: "Nos douceurs", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre pâtisserie") } },
      { type: "menu_section", content: { category: "La carte", item1_name: "Théière (2 tasses)", item1_price: "6,50 €", item1_desc: "Sélection de grands crus", item2_name: "Pâtisserie du jour", item2_price: "5,50 €", item2_desc: "Faite maison chaque matin", item3_name: "Brunch complet", item3_price: "24 €", item3_desc: "Salé, sucré, boisson chaude" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "10h - 19h", saturday: "9h30 - 19h30", sunday: "10h - 18h", note: "Brunch samedi & dimanche jusqu'à 14h" } },
      { type: "testimonials", content: exampleReviews("Hélène V.", "Cadre cosy, pâtisseries délicieuses et grand choix de thés.", "Paul M.", "Le brunch du dimanche est un vrai régal, service adorable.") },
      { type: "google_maps", content: { label: "Maison Camélia", address: "14 rue des Fleurs, 67000 Strasbourg", transport: "Centre-ville" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  // Santé
  {
    key: "sante_chiro", group: "Santé", label: "Chiropracteur", emoji: "🦴",
    desc: "Dos, articulations, posture + prise de RDV et FAQ.",
    blocks: [
      { type: "profile", content: { name: "Cabinet Axis", tagline: "Chiropracteur · Dos, articulations, posture", badge: "Nouveaux patients acceptés" } },
      { type: "bio", content: { text: "J'accompagne mes patients dans le soulagement des douleurs de dos, de nuque et des articulations, par des ajustements adaptés et un suivi personnalisé.", align: "left" } },
      { type: "services_list", content: { title: "Motifs de consultation", s1_icon: "🩻", s1_name: "Douleurs de dos", s1_desc: "Lombalgies, sciatiques", s2_icon: "💆", s2_name: "Cervicales & maux de tête", s2_desc: "Tensions, migraines", s3_icon: "🧍", s3_name: "Posture & prévention", s3_desc: "Bilan et conseils" } },
      { type: "faq", content: { title: "Questions fréquentes", q1: "Faut-il une ordonnance ?", a1: "Non, la consultation est en accès direct.", q2: "Combien de séances sont nécessaires ?", a2: "Cela dépend de votre situation, évaluée dès la première visite.", q3: "Est-ce remboursé ?", a3: "Selon votre mutuelle, un forfait est souvent prévu." } },
      { type: "calendly", content: { label: "Prendre rendez-vous", url: "https://doctolib.fr", description: "Réservation en ligne 24 h/24" } },
      { type: "google_maps", content: { label: "Cabinet Axis", address: "9 rue de la Santé, 59000 Lille", transport: "Métro République" } },
      { type: "social_links", content: { website: "https://monsite.com" } },
    ],
  },
  {
    key: "sante_orthophoniste", group: "Santé", label: "Orthophoniste", emoji: "🗣️",
    desc: "Langage, articulation, apprentissages + RDV et infos.",
    blocks: [
      { type: "profile", content: { name: "Cabinet Parole & Sens", tagline: "Orthophoniste · Enfants & adultes", badge: "Sur prescription médicale" } },
      { type: "services_list", content: { title: "Prises en charge", s1_icon: "🔤", s1_name: "Langage & articulation", s1_desc: "Retards, troubles de la parole", s2_icon: "📚", s2_name: "Troubles des apprentissages", s2_desc: "Dyslexie, dysorthographie", s3_icon: "🧠", s3_name: "Rééducation adulte", s3_desc: "Post-AVC, déglutition" } },
      { type: "faq", content: { title: "Questions fréquentes", q1: "Faut-il une prescription ?", a1: "Oui, une ordonnance médicale est nécessaire.", q2: "À partir de quel âge ?", a2: "Dès les premiers signes, un bilan peut être proposé.", q3: "Les séances sont-elles remboursées ?", a3: "Oui, prises en charge par l'Assurance Maladie sur prescription." } },
      { type: "calendly", content: { label: "Demander un bilan", url: "https://doctolib.fr", description: "Cabinet · sur rendez-vous" } },
      { type: "google_maps", content: { label: "Cabinet Parole & Sens", address: "3 place de l'École, 31000 Toulouse", transport: "Métro Capitole" } },
      { type: "social_links", content: { website: "https://monsite.com" } },
    ],
  },

  // Beauté
  {
    key: "beaute_esthetique", group: "Beauté & bien-être", label: "Esthéticienne", emoji: "💆‍♀️",
    desc: "Soins visage & corps, épilation + réservation en ligne.",
    blocks: [
      { type: "profile", content: { name: "Institut Roséa", tagline: "Esthéticienne · Soins visage & corps", badge: "Sur rendez-vous" } },
      { type: "services_list", content: { title: "Nos soins", s1_icon: "✨", s1_name: "Soin du visage", s1_desc: "Éclat, hydratation, anti-âge", s2_icon: "🕯️", s2_name: "Massage & modelage", s2_desc: "Détente et bien-être", s3_icon: "🌿", s3_name: "Épilation", s3_desc: "Cire tiède, zones au choix" } },
      { type: "gallery", content: { title: "L'institut", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre soin") } },
      { type: "pricing", content: { title: "Tarifs", title1: "Soin visage", price1: "dès 55 €", desc1: "1h", title2: "Massage", price2: "dès 60 €", desc2: "1h", title3: "Forfait découverte", price3: "95 €", desc3: "Visage + corps", cta_label: "Réserver", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Sabrina T.", "Soin visage divin, peau repulpée et lumineuse, je recommande.", "Lucie F.", "Institut apaisant, esthéticienne aux mains d'or.") },
      { type: "calendly", content: { label: "Réserver un soin", url: "https://calendly.com", description: "Réservation en ligne 7j/7" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  // Commerce
  {
    key: "commerce_opticien", group: "Commerce", label: "Opticien", emoji: "👓",
    desc: "Lunettes, examen de vue, marques + horaires et magasin.",
    blocks: [
      { type: "profile", content: { name: "Optique Clairvue", tagline: "Opticien · Lunettes, solaires, lentilles", badge: "Examen de vue sur place" } },
      { type: "services_list", content: { title: "En magasin", s1_icon: "👁️", s1_name: "Examen de vue", s1_desc: "Bilan visuel gratuit", s2_icon: "🕶️", s2_name: "Lunettes & solaires", s2_desc: "Grandes marques et créateurs", s3_icon: "💧", s3_name: "Lentilles de contact", s3_desc: "Essai et adaptation" } },
      { type: "gallery", content: { title: "Nos montures", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre monture") } },
      { type: "promo_banner", content: { emoji: "👓", text: "2ème paire offerte", subtext: "Sur une sélection de montures", cta_label: "En profiter", cta_url: "#" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "9h30 - 19h", saturday: "9h30 - 18h", sunday: "Fermé", note: "Tiers payant mutuelles accepté" } },
      { type: "google_maps", content: { label: "Optique Clairvue", address: "27 rue du Commerce, 44000 Nantes", transport: "Tram · arrêt Commerce" } },
      { type: "social_links", content: { facebook: "https://facebook.com", website: "https://monsite.com" } },
    ],
  },
  {
    key: "commerce_primeur", group: "Commerce", label: "Primeur / épicerie", emoji: "🥕",
    desc: "Fruits & légumes de saison, produits locaux + horaires.",
    blocks: [
      { type: "profile", content: { name: "Au Panier Frais", tagline: "Primeur · Fruits, légumes & produits locaux", badge: "Arrivage quotidien" } },
      { type: "gallery", content: { title: "L'étal du jour", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre produit") } },
      { type: "services_list", content: { title: "Nos rayons", s1_icon: "🍎", s1_name: "Fruits & légumes", s1_desc: "De saison, circuit court", s2_icon: "🧀", s2_name: "Épicerie fine", s2_desc: "Producteurs locaux", s3_icon: "🧺", s3_name: "Paniers & commandes", s3_desc: "À composer, retrait en boutique" } },
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "8h - 13h / 15h - 19h30", saturday: "8h - 19h30", sunday: "8h - 13h", note: "Marché le mercredi matin" } },
      { type: "testimonials", content: exampleReviews("Monique D.", "Des produits d'une fraîcheur incomparable, accueil chaleureux.", "Karim B.", "Enfin de vrais fruits qui ont du goût, et le sourire en plus.") },
      { type: "google_maps", content: { label: "Au Panier Frais", address: "6 rue du Marché, 34000 Montpellier", transport: "Centre historique" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },

  // Créatif & Média
  {
    key: "crea_illustrateur", group: "Créatif & Média", label: "Illustrateur", emoji: "🎨",
    desc: "Illustration, character design, commandes + portfolio.",
    blocks: [
      { type: "profile", content: { name: "Studio Encre", tagline: "Illustrateur freelance · Édition, presse, marques", badge: "Commandes ouvertes" } },
      { type: "bio", content: { text: "J'illustre vos univers : couvertures, character design, affiches et identités. Un style qui raconte votre histoire.", align: "center" } },
      { type: "gallery", content: { title: "Portfolio", columns: "3", columns_mobile: "2", ...placeholderGallery(6, "Votre illustration") } },
      { type: "skills", content: { title: "Techniques", tags: "Procreate, Photoshop, Illustrator, aquarelle, encre, character design" } },
      { type: "pricing", content: { title: "Tarifs indicatifs", title1: "Illustration simple", price1: "dès 150 €", desc1: "Usage web", title2: "Character design", price2: "dès 350 €", desc2: "Fiche complète", title3: "Licence & édition", price3: "sur devis", desc3: "Selon usage", cta_label: "Demander un devis", cta_url: "#" } },
      { type: "social_links", content: { instagram: "https://instagram.com", behance: "https://behance.net", website: "https://monsite.com" } },
    ],
  },
  {
    key: "crea_streamer", group: "Créatif & Média", label: "Streamer / Gaming", emoji: "🎮",
    desc: "Chaînes, planning de live, communauté + soutien.",
    blocks: [
      { type: "profile", content: { name: "NovaPlays", tagline: "Streamer · Gaming & variété", badge: "En live ce soir" } },
      { type: "bio", content: { text: "Lives gaming, chill et interactions avec la communauté. Rejoins-nous en direct et sur les réseaux !", align: "center" } },
      { type: "social_links", content: { twitch: "https://twitch.tv", youtube: "https://youtube.com", tiktok: "https://tiktok.com", twitter: "https://twitter.com", discord: "https://discord.gg" } },
      { type: "visit_counter", content: { label: "membres de la commu" } },
      { type: "cta_button", content: { label: "Rejoindre le Discord", url: "https://discord.gg", style: "neon", icon: "💬", full_width: "yes" } },
      { type: "cta_button", content: { label: "Soutenir la chaîne", url: "#", style: "gold", icon: "⭐", full_width: "yes" } },
    ],
  },

  // Coaching & Formation
  {
    key: "coach_yoga", group: "Coaching & Formation", label: "Prof de yoga", emoji: "🧘‍♀️",
    desc: "Cours collectifs & privés, planning + réservation.",
    blocks: [
      { type: "profile", content: { name: "Studio Prana", tagline: "Professeure de yoga · Vinyasa, Hatha, Yin", badge: "Cours d'essai offert" } },
      { type: "bio", content: { text: "Je vous accompagne vers plus de souplesse, de force et de sérénité, à travers une pratique adaptée à votre niveau.", align: "center" } },
      { type: "services_list", content: { title: "Les cours", s1_icon: "🌅", s1_name: "Cours collectifs", s1_desc: "Studio ou plein air", s2_icon: "🧎", s2_name: "Cours privés", s2_desc: "À domicile ou en visio", s3_icon: "🌸", s3_name: "Ateliers & retraites", s3_desc: "Week-ends thématiques" } },
      { type: "pricing", content: { title: "Tarifs", title1: "Cours à l'unité", price1: "18 €", desc1: "Collectif", title2: "Carte 10 cours", price2: "150 €", desc2: "Économisez 30 €", title3: "Cours privé", price3: "55 €", desc3: "1h personnalisée", cta_label: "Réserver", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Émilie R.", "Cours d'une grande douceur, je repars apaisée à chaque fois.", "Thomas L.", "Pédagogie claire, progrès réels sur ma souplesse et mon stress.") },
      { type: "calendly", content: { label: "Réserver un cours d'essai", url: "https://calendly.com", description: "Gratuit · sans engagement" } },
      { type: "social_links", content: { instagram: "https://instagram.com", youtube: "https://youtube.com" } },
    ],
  },
  {
    key: "coach_musique", group: "Coaching & Formation", label: "Prof de musique", emoji: "🎸",
    desc: "Cours d'instrument, tous niveaux, en présentiel ou visio.",
    blocks: [
      { type: "profile", content: { name: "Atelier Mélodie", tagline: "Professeur de musique · Guitare, piano, chant", badge: "Premier cours offert" } },
      { type: "bio", content: { text: "Cours de musique personnalisés pour tous les âges et tous les niveaux, en présentiel ou en visioconférence. Apprendre en s'amusant.", align: "center" } },
      { type: "services_list", content: { title: "Les cours", s1_icon: "🎸", s1_name: "Guitare", s1_desc: "Acoustique, électrique", s2_icon: "🎹", s2_name: "Piano", s2_desc: "Classique, moderne", s3_icon: "🎤", s3_name: "Chant & solfège", s3_desc: "Technique vocale, théorie" } },
      { type: "pricing", content: { title: "Tarifs", title1: "Cours individuel", price1: "30 €", desc1: "1h", title2: "Forfait 10 cours", price2: "270 €", desc2: "Économisez 30 €", title3: "Cours en visio", price3: "25 €", desc3: "1h à distance", cta_label: "S'inscrire", cta_url: "#" } },
      { type: "testimonials", content: exampleReviews("Nolan P.", "Mon fils progresse vite et adore ses cours de guitare.", "Sophie M.", "Prof patient et passionné, méthode qui donne envie de jouer.") },
      { type: "calendly", content: { label: "Réserver un cours d'essai", url: "https://calendly.com", description: "Présentiel ou visio" } },
      { type: "social_links", content: { youtube: "https://youtube.com", instagram: "https://instagram.com" } },
    ],
  },
]
