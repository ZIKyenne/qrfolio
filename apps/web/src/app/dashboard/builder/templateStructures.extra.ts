// templateStructures.extra.ts — Nouvelles VERTICALES métier en DONNÉES (moteur de templates, T5).
// Chaque entrée = une TemplateStructure (blocs + contenu) SANS thème : le style est appliqué par le
// moteur (composeTemplate). N'utilise QUE des types de blocs réels + les mêmes clés de contenu que le
// rendu (mêmes patterns que page-templates.ts). Anti-fake : les avis sont marqués « (exemple) » et
// destinés à être personnalisés. Aucune donnée/Supabase. Ajouter une verticale = ajouter un objet ici.

import type { TemplateStructure } from "./templateEngine"

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
      { type: "opening_hours", content: { title: "Horaires", mon_fri: "9h - 19h30", saturday: "9h - 20h", sunday: "9h - 13h", note: "Livraison locale disponible" } },
      { type: "google_maps", content: { label: "Pétale & Sens", address: "5 place du Marché, 33000 Bordeaux", transport: "Tram ligne B · arrêt Marché" } },
      { type: "social_links", content: { instagram: "https://instagram.com", facebook: "https://facebook.com" } },
    ],
  },
]
