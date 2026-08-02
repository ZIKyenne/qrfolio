// builderSearch.ts — Recherche de blocs du Builder : moteur PUR (scoring pondéré +
// synonymes FR), partagé par la bibliothèque de blocs ET la palette de commandes
// (Cmd+K). Extrait de BuilderV4 pour être réutilisable et testable (voir §2.7 du
// docs/BUILDER-REBUILD-PLAN.md). Comportement identique à l'ancien searchScore inline.

export const BLOCK_SYNONYMS: Record<string, string[]> = {
  "téléphone": ["appel", "phone", "tel", "call"],
  "mail": ["email", "courriel", "message", "@"],
  "maps": ["adresse", "localisation", "lieu", "carte", "direction", "itinéraire"],
  "avis": ["témoignage", "review", "note", "étoile", "recommandation", "client"],
  "musique": ["spotify", "deezer", "apple music", "soundcloud", "chanson", "album", "playlist", "artiste"],
  "restaurant": ["menu", "carte", "réservation", "plat", "cuisine", "table"],
  "vente": ["produit", "tarif", "prix", "service", "boutique", "achat", "paiement"],
  "photo": ["image", "galerie", "picture", "visuel", "cover", "bannière"],
  "vidéo": ["youtube", "tiktok", "clip", "stream", "twitch", "live", "vimeo"],
  "réseau": ["instagram", "facebook", "twitter", "linkedin", "snapchat", "social"],
  "événement": ["concert", "festival", "soirée", "date", "billet", "ticket"],
  "contact": ["formulaire", "email", "téléphone", "whatsapp", "message"],
  "lien": ["bouton", "cta", "url", "action", "click"],
  "profil": ["bio", "présentation", "avatar", "identité", "nom"],
  "podcast": ["audio", "son", "écoute", "radio", "épisode"],
  "stats": ["statistique", "chiffre", "nombre", "compteur"],
  "qr": ["qr code", "scan", "flash"],
}

export interface SearchableDef { label: string; description: string; category: string }

// Score de pertinence d'un bloc pour une requête (0 = aucun match). Barème :
// label exact 100 · préfixe 90 · inclus 80 · description 60 · type 50 · catégorie 40 ·
// synonyme→label 35 · synonyme→description 25.
export function scoreBlock(type: string, def: SearchableDef, q: string): number {
  const query = q.toLowerCase().trim()
  if (!query) return 0
  const label = def.label.toLowerCase()
  const desc = def.description.toLowerCase()
  const cat = def.category.toLowerCase()
  if (label === query) return 100
  if (label.startsWith(query)) return 90
  if (label.includes(query)) return 80
  if (desc.includes(query)) return 60
  if (type.toLowerCase().includes(query)) return 50
  if (cat.includes(query)) return 40
  for (const [syn, aliases] of Object.entries(BLOCK_SYNONYMS)) {
    const allTerms = [syn, ...aliases]
    if (allTerms.some(t => query.includes(t) || t.includes(query))) {
      if (allTerms.some(t => label.includes(t))) return 35
      if (allTerms.some(t => desc.includes(t))) return 25
    }
  }
  return 0
}
