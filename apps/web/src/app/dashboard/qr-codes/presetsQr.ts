// presetsQr.ts — Le catalogue des styles de QR prêts à l'emploi, et les règles de
// plan qui décident lesquels sont accessibles.
//
// C'est de la donnée pure, qui occupait 130 lignes en tête d'un composant de plus de
// 4 000 lignes. Aucun React, aucun DOM : testable directement.
import { PLAN_RANK } from "@/lib/plans"
import type { QRStyleConfig } from "./QRStudio"

export type Preset = {
  id:       string
  label:    string
  cat:      string
  fg:       string
  bg:       string
  fg2?:     string
  cornerColor?: string
  eyeColor?:    string
  gradient?: "none"|"linear"|"radial"|"diagonal"
  gradientBg?:  string
  dotStyle?:    string
  cornerStyle?: string
  ecc?:     "L"|"M"|"Q"|"H"
  margin?:  number
  density?: "low"|"medium"|"high"
  transparent?: boolean
  plan:     string
}

export const PRESET_CATS = [
  { id:"classic",    label:"Classique",  emoji:"⚫" },
  { id:"business",   label:"Business",   emoji:"💼" },
  { id:"restaurant", label:"Restaurant", emoji:"🍽️" },
  { id:"luxury",     label:"Luxe",       emoji:"💎" },
  { id:"creator",    label:"Createur",   emoji:"🎬" },
  { id:"tech",       label:"Tech",       emoji:"⚡" },
  { id:"event",      label:"Event",      emoji:"🎉" },
  { id:"retail",     label:"Retail",     emoji:"🛍️" },
]

export const PRESETS: Preset[] = [
  // == CLASSIQUE ==============================================================
  { id:"classic-black",     label:"Classic Black",   cat:"classic", fg:"#0A0A0A", bg:"#FFFFFF", dotStyle:"square",  cornerStyle:"square",  plan:"free" },
  { id:"snow-white",        label:"Snow White",      cat:"classic", fg:"#1A1A1A", bg:"#F8F8F8", dotStyle:"rounded", cornerStyle:"rounded", plan:"free" },
  { id:"minimal-gray",      label:"Minimal Gray",    cat:"classic", fg:"#4B5563", bg:"#F9FAFB", dotStyle:"minimal", cornerStyle:"minimal", plan:"free" },
  { id:"midnight-gold",     label:"Midnight Gold",   cat:"classic", fg:"#C9A84C", bg:"#0A0A0A", dotStyle:"square",  cornerStyle:"square",  plan:"free" },
  { id:"soft-blue",         label:"Soft Blue",       cat:"classic", fg:"#2563EB", bg:"#EFF6FF", dotStyle:"rounded", cornerStyle:"circle",  plan:"free" },
  { id:"corporate-navy",    label:"Corporate Navy",  cat:"classic", fg:"#1E3A5F", bg:"#FFFFFF", dotStyle:"square",  cornerStyle:"square",  plan:"free" },
  { id:"graphite",          label:"Graphite",        cat:"classic", fg:"#2D2D2D", bg:"#E5E5E5", dotStyle:"dot",     cornerStyle:"rounded", plan:"free" },
  { id:"ivory-noir",        label:"Ivory Noir",      cat:"classic", fg:"#1A1A1A", bg:"#FBF8F0", dotStyle:"rounded", cornerStyle:"rounded", plan:"pro" },

  // == BUSINESS ===============================================================
  { id:"corporate-blue",    label:"Corporate Blue",  cat:"business", fg:"#0A4DA6", bg:"#FFFFFF", dotStyle:"square",  cornerStyle:"square",  plan:"free" },
  { id:"executive-gold",    label:"Executive Gold",  cat:"business", fg:"#B8860B", bg:"#0F0F0F", dotStyle:"rounded", cornerStyle:"rounded", ecc:"H", density:"high", margin:12, plan:"pro" },
  { id:"realestate-navy",   label:"Real Estate Navy",cat:"business", fg:"#14274E", bg:"#F4F6FB", dotStyle:"square",  cornerStyle:"circle",  plan:"pro" },
  { id:"emerald-business",  label:"Emerald Business",cat:"business", fg:"#047857", bg:"#ECFDF5", dotStyle:"rounded", cornerStyle:"rounded", plan:"pro" },
  { id:"startup-indigo",    label:"Startup Indigo",  cat:"business", fg:"#4F46E5", bg:"#FFFFFF", dotStyle:"dot",     cornerStyle:"circle",  plan:"pro" },
  { id:"finance-elite",     label:"Finance Elite",   cat:"business", fg:"#0B3D2E", bg:"#F0FFF8", dotStyle:"square",  cornerStyle:"square",  ecc:"H", density:"high", plan:"pro" },
  { id:"consulting-premium",label:"Consulting Premium",cat:"business",fg:"#334155",bg:"#F8FAFC", dotStyle:"rounded", cornerStyle:"rounded", plan:"pro" },
  { id:"platinum-executive",label:"Platinum Executive",cat:"business",fg:"#6B7280",bg:"#0D0D0D", dotStyle:"luxury",  cornerStyle:"luxury",  eyeColor:"#9CA3AF", ecc:"H", density:"high", margin:14, plan:"business" },

  // == RESTAURANT =============================================================
  { id:"italian-bistro",    label:"Italian Bistro",  cat:"restaurant", fg:"#B91C1C", bg:"#FFF7ED", dotStyle:"rounded", cornerStyle:"rounded", plan:"free" },
  { id:"french-gourmet",    label:"French Gourmet",  cat:"restaurant", fg:"#1F2937", bg:"#F5EFE0", dotStyle:"minimal", cornerStyle:"circle",  plan:"pro" },
  { id:"steak-house",       label:"Steak House",     cat:"restaurant", fg:"#7F1D1D", bg:"#1A0F0A", dotStyle:"square",  cornerStyle:"square",  ecc:"H", density:"high", plan:"pro" },
  { id:"sushi-premium",     label:"Sushi Premium",   cat:"restaurant", fg:"#0F172A", bg:"#FEF2F2", eyeColor:"#DC2626", dotStyle:"rounded", cornerStyle:"rounded", plan:"pro" },
  { id:"cocktail-bar",      label:"Cocktail Bar",    cat:"restaurant", fg:"#DB2777", bg:"#1A0A14", dotStyle:"neon",    cornerStyle:"diamond", gradient:"diagonal", fg2:"#F59E0B", plan:"pro" },
  { id:"coffee-house",      label:"Coffee House",    cat:"restaurant", fg:"#6B3F2A", bg:"#FDF6EE", dotStyle:"rounded", cornerStyle:"rounded", plan:"free" },
  { id:"wine-cellar",       label:"Wine Cellar",     cat:"restaurant", fg:"#7B1E3B", bg:"#1A0610", dotStyle:"luxury",  cornerStyle:"luxury",  ecc:"H", density:"high", margin:12, plan:"business" },
  { id:"fast-casual",       label:"Fast Casual",     cat:"restaurant", fg:"#EA580C", bg:"#FFFBEB", dotStyle:"dot",     cornerStyle:"circle",  plan:"free" },

  // == LUXE ===================================================================
  { id:"luxury-gold",       label:"Luxury Gold",     cat:"luxury", fg:"#C9A84C", bg:"#0A0700", dotStyle:"luxury",  cornerStyle:"luxury",  eyeColor:"#E8C766", ecc:"H", density:"high", margin:16, plan:"business" },
  { id:"royal-black",       label:"Royal Black",     cat:"luxury", fg:"#E5E5E5", bg:"#050505", dotStyle:"luxury",  cornerStyle:"diamond", ecc:"H", density:"high", margin:14, plan:"business" },
  { id:"diamond-elite",     label:"Diamond Elite",   cat:"luxury", fg:"#BFD7EA", bg:"#0A0F14", dotStyle:"luxury",  cornerStyle:"diamond", gradient:"linear", fg2:"#7FA8C9", ecc:"H", density:"high", plan:"business" },
  { id:"platinum-white",    label:"Platinum White",  cat:"luxury", fg:"#A8A190", bg:"#FAFAF7", dotStyle:"luxury",  cornerStyle:"luxury",  ecc:"H", margin:14, plan:"business" },
  { id:"luxury-emerald",    label:"Luxury Emerald",  cat:"luxury", fg:"#0FB37A", bg:"#021410", dotStyle:"luxury",  cornerStyle:"luxury",  eyeColor:"#34D399", ecc:"H", density:"high", plan:"business" },
  { id:"midnight-prestige", label:"Midnight Prestige",cat:"luxury",fg:"#C0A062", bg:"#0A0A12", dotStyle:"luxury",  cornerStyle:"diamond", gradient:"radial", fg2:"#8A6E3A", ecc:"H", density:"high", plan:"business" },
  { id:"black-velvet",      label:"Black Velvet",    cat:"luxury", fg:"#D4AF37", bg:"#0D0A05", dotStyle:"luxury",  cornerStyle:"luxury",  ecc:"H", density:"high", margin:16, plan:"business" },
  { id:"monaco-gold",       label:"Monaco Gold",     cat:"luxury", fg:"#E0B84C", bg:"#14110A", dotStyle:"luxury",  cornerStyle:"diamond", gradient:"diagonal", fg2:"#B8860B", ecc:"H", density:"high", plan:"business" },

  // == CREATEUR ===============================================================
  { id:"youtube-creator",   label:"YouTube Creator", cat:"creator", fg:"#FF0000", bg:"#0F0F0F", dotStyle:"rounded", cornerStyle:"circle",  plan:"pro" },
  { id:"twitch-streamer",   label:"Twitch Streamer", cat:"creator", fg:"#9146FF", bg:"#0E0B16", dotStyle:"neon",    cornerStyle:"diamond", gradient:"linear", fg2:"#C77DFF", plan:"pro" },
  { id:"tiktok-neon",       label:"TikTok Neon",     cat:"creator", fg:"#00F2EA", bg:"#010101", dotStyle:"neon",    cornerStyle:"circle",  gradient:"diagonal", fg2:"#FF0050", plan:"pro" },
  { id:"instagram-creator", label:"Instagram Creator",cat:"creator",fg:"#E1306C", bg:"#1A0A14", dotStyle:"rounded", cornerStyle:"circle",  gradient:"diagonal", fg2:"#F77737", plan:"pro" },
  { id:"podcast-pro",       label:"Podcast Pro",     cat:"creator", fg:"#A855F7", bg:"#150A1F", dotStyle:"rounded", cornerStyle:"rounded", plan:"pro" },
  { id:"personal-brand",    label:"Personal Brand",  cat:"creator", fg:"#F5F0E8", bg:"#1A1A1A", dotStyle:"dot",     cornerStyle:"rounded", plan:"pro" },
  { id:"purple-influence",  label:"Purple Influence",cat:"creator", fg:"#7C3AED", bg:"#FAF5FF", dotStyle:"dot",     cornerStyle:"circle",  plan:"free" },
  { id:"creator-gold",      label:"Creator Gold",    cat:"creator", fg:"#E0B84C", bg:"#0F0D0A", dotStyle:"luxury",  cornerStyle:"luxury",  ecc:"H", density:"high", plan:"business" },

  // == TECH ===================================================================
  { id:"cyber-neon",        label:"Cyber Neon",      cat:"tech", fg:"#00FFD1", bg:"#050810", dotStyle:"neon",    cornerStyle:"diamond", gradient:"linear", fg2:"#0EA5E9", plan:"pro" },
  { id:"matrix-green",      label:"Matrix Green",    cat:"tech", fg:"#00FF41", bg:"#000800", dotStyle:"pixel",   cornerStyle:"square",  density:"high", plan:"pro" },
  { id:"ai-future",         label:"AI Future",       cat:"tech", fg:"#38BDF8", bg:"#020617", dotStyle:"neon",    cornerStyle:"circle",  gradient:"diagonal", fg2:"#818CF8", plan:"pro" },
  { id:"web3-purple",       label:"Web3 Purple",     cat:"tech", fg:"#A78BFA", bg:"#0B0614", dotStyle:"pixel",   cornerStyle:"diamond", gradient:"linear", fg2:"#7C3AED", plan:"pro" },
  { id:"startup-tech",      label:"Startup Tech",    cat:"tech", fg:"#2DD4BF", bg:"#042F2E", dotStyle:"rounded", cornerStyle:"rounded", plan:"pro" },
  { id:"hacker-mode",       label:"Hacker Mode",     cat:"tech", fg:"#22C55E", bg:"#0A0A0A", dotStyle:"pixel",   cornerStyle:"square",  ecc:"H", density:"high", plan:"pro" },
  { id:"quantum-blue",      label:"Quantum Blue",    cat:"tech", fg:"#3B82F6", bg:"#060A18", dotStyle:"neon",    cornerStyle:"circle",  gradient:"diagonal", fg2:"#22D3EE", plan:"pro" },
  { id:"digital-grid",      label:"Digital Grid",    cat:"tech", fg:"#E2E8F0", bg:"#0F172A", dotStyle:"pixel",   cornerStyle:"square",  plan:"pro" },

  // == EVENT ==================================================================
  { id:"wedding-elegant",   label:"Wedding Elegant", cat:"event", fg:"#B08D57", bg:"#FBF7F0", dotStyle:"rounded", cornerStyle:"circle",  plan:"pro" },
  { id:"gala-night",        label:"Gala Night",      cat:"event", fg:"#D4AF37", bg:"#0A0A0A", dotStyle:"luxury",  cornerStyle:"diamond", gradient:"radial", fg2:"#8A6E3A", ecc:"H", density:"high", plan:"business" },
  { id:"festival-neon",     label:"Festival Neon",   cat:"event", fg:"#FF2EF0", bg:"#0A0014", dotStyle:"neon",    cornerStyle:"diamond", gradient:"diagonal", fg2:"#00F0FF", plan:"pro" },
  { id:"conference-pro",    label:"Conference Pro",  cat:"event", fg:"#1D4ED8", bg:"#F8FAFC", dotStyle:"square",  cornerStyle:"rounded", plan:"pro" },
  { id:"vip-event",         label:"VIP Event",       cat:"event", fg:"#C9A84C", bg:"#0D0D0D", dotStyle:"luxury",  cornerStyle:"luxury",  ecc:"H", density:"high", margin:14, plan:"business" },
  { id:"concert-live",      label:"Concert Live",    cat:"event", fg:"#EF4444", bg:"#0A0A0A", dotStyle:"neon",    cornerStyle:"circle",  gradient:"linear", fg2:"#F59E0B", plan:"pro" },
  { id:"birthday-gold",     label:"Birthday Gold",   cat:"event", fg:"#E0B84C", bg:"#1A140A", dotStyle:"rounded", cornerStyle:"circle",  plan:"free" },
  { id:"networking-elite",  label:"Networking Elite",cat:"event", fg:"#334155", bg:"#F1F5F9", dotStyle:"minimal", cornerStyle:"rounded", plan:"pro" },

  // == RETAIL / COMMERCE ======================================================
  { id:"boutique-chic",     label:"Boutique Chic",   cat:"retail", fg:"#2B2B2B", bg:"#F6F1EA", dotStyle:"rounded", cornerStyle:"rounded", plan:"free" },
  { id:"promo-rouge",       label:"Promo Rouge",     cat:"retail", fg:"#DC2626", bg:"#FFF7F7", dotStyle:"square",  cornerStyle:"square",  plan:"free" },
  { id:"soldes-flash",      label:"Soldes Flash",    cat:"retail", fg:"#EA580C", bg:"#FFFBEB", dotStyle:"rounded", cornerStyle:"circle",  gradient:"diagonal", fg2:"#F59E0B", plan:"pro" },
  { id:"black-friday",      label:"Black Friday",    cat:"retail", fg:"#E0B84C", bg:"#0A0A0A", dotStyle:"square",  cornerStyle:"square",  ecc:"H", density:"high", plan:"pro" },
  { id:"mode-premium",      label:"Mode Premium",    cat:"retail", fg:"#111827", bg:"#FAF5F7", eyeColor:"#DB2777", dotStyle:"minimal", cornerStyle:"circle",  plan:"pro" },
  { id:"epicerie-verte",    label:"Épicerie Verte",  cat:"retail", fg:"#15803D", bg:"#F0FDF4", dotStyle:"dot",     cornerStyle:"circle",  plan:"free" },
  { id:"pharmacie",         label:"Pharmacie",       cat:"retail", fg:"#059669", bg:"#FFFFFF", dotStyle:"rounded", cornerStyle:"rounded", plan:"free" },
  { id:"vitrine-or",        label:"Vitrine Or",      cat:"retail", fg:"#C9A84C", bg:"#0D0B06", dotStyle:"luxury",  cornerStyle:"luxury",  eyeColor:"#E8C766", ecc:"H", density:"high", margin:12, plan:"business" },
]

export const CORNER_STYLES = [
  { id: "square",  label: "Carré",   icon: "⬛" },
  { id: "rounded", label: "Arrondi", icon: "🔲" },
  { id: "dot",     label: "Points",  icon: "⚫" },
]

export const EC_LEVELS = [
  { id: "L", label: "L 7%",  desc: "Léger" },
  { id: "M", label: "M 15%", desc: "Standard" },
  { id: "Q", label: "Q 25%", desc: "Eleve" },
  { id: "H", label: "H 30%", desc: "Maximum" },
]

// PLAN_RANK vient de lib/plans : free 0, starter 1, pro 1, business 2.
// (Un commentaire annonçait ici « free 0, starter 1, pro 2, business 3 » : faux.)
// Trois niveaux de styles : plan gratuit = styles de base ; Établissement (et
// starter) = + les styles marqués « pro » ; Multi-sites = + les styles « business ».
export const presetMinRank = (plan: string) => (plan === "business" ? 2 : plan === "pro" ? 1 : 0)
export const presetUpsellPlan = (plan: string) => (plan === "business" ? "pro" : "starter")

/** Ce style est-il accessible avec ce plan ? Les DEUX écrans QR répondaient à cette
 *  question chacun de leur côté, avec deux copies de la même règle. */
export const canUsePreset = (userPlan: string, p: Preset) => PLAN_RANK[userPlan] >= presetMinRank(p.plan)

// -- Statuts pages (pour l'affichage de la page liee)
