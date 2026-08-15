"use client"

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react"
import {
  QrCode, Download, Link, Check, Lock, Pencil, Plus,
  Eye, EyeOff, ChevronRight, ScanLine, Clock,
  Palette, Settings, Share2, ExternalLink, Copy,
  RotateCcw, Loader2, Search, Trash2, Archive,
  MoreVertical, AlertTriangle, X,
  ImageIcon, FileText, Maximize2, ClipboardList, SlidersHorizontal,
  Printer, LayoutGrid, TrendingUp, TrendingDown, BarChart, Sparkles, ArrowRight, ChevronDown
} from "lucide-react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { useIsMobile } from "@/lib/useIsMobile"
import { onEnterSpace } from "@/lib/a11y"
import { useToast } from "@/components/Toast"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { PLAN_RANK, canPrintStudio, minPlanFor } from "@/lib/plans"
import { createQR, updateQR, getQRBlob, downloadBlob, blobToDataUrl, buildAndDownloadPdf, type QROptions } from "./qrRender"
import { composeLogo } from "./logoCompose"
import { BatchQrModal } from "./BatchQrModal"
import { SegmentedControl } from "./SegmentedControl"
import type QRCodeStyling from "qr-code-styling"

// Editeur libre (Fabric.js) : charge uniquement cote client (touche au DOM)

export type QRCode = {
  id:               string
  page_id:          string
  short_code:       string
  foreground_color: string
  background_color: string
  corner_style:     "square" | "rounded" | "dot"
  error_correction: "L" | "M" | "Q" | "H"
  style_config:     Record<string, any>
  logo_url:         string | null
  dest_override:    Record<string, any> | null
  dest_history:     Array<Record<string, any>>
  status:           "active"|"draft"|"paused"|"archived"|"expired"
  pause_message:    string | null
  expires_at:       string | null
  total_scans:      number
  last_scan_at:     string | null
  created_at:       string
  pages: {
    id:          string
    title:       string
    slug:        string
    status:      string
    total_views: number
    updated_at:  string
  } | null
}

interface Props {
  qrCodes:  QRCode[]
  userPlan: string
  appUrl:   string
}

// -- QR Style Config type -----------------------------------------------------
export type QRStyleConfig = {
  fg2?:          string    // couleur secondaire (degrade)
  cornerColor?:  string    // couleur des coins
  eyeColor?:     string    // couleur des yeux (centres)
  transparent?:  boolean   // fond transparent
  gradient?:     "none"|"linear"|"radial"|"diagonal"
  gradientBg?:   string    // couleur fin de degrade fond
  dotStyle?:     "square"|"rounded"|"dot"|"softSquare"|"pixel"|"minimal"|"neon"|"luxury"
  cornerStyle?:  "square"|"rounded"|"circle"|"diamond"|"luxury"|"minimal"
  margin?:       number    // 0-30
  density?:      "low"|"medium"|"high"
  logoUrl?:      string    // data URL ou URL Supabase
  logoSize?:     number    // % du QR, 10-30, defaut 18
  logoShape?:    "square"|"rounded"|"circle"
  logoBg?:       "transparent"|"white"|"black"|"custom"
  logoBgColor?:  string
  logoPadding?:  number    // px, 0-12, defaut 4
}

export const DOT_STYLES: { id: QRStyleConfig["dotStyle"]; label: string; emoji: string }[] = [
  { id:"square",     label:"Classique",    emoji:"⬛" },
  { id:"rounded",    label:"Arrondi",      emoji:"🔵" },
  { id:"dot",        label:"Dots",         emoji:"⚫" },
  { id:"softSquare", label:"Carrés doux",  emoji:"🟦" },
  { id:"pixel",      label:"Pixel",        emoji:"🟧" },
  { id:"minimal",    label:"Minimal",      emoji:"▫️" },
  { id:"neon",       label:"Neon",         emoji:"💜" },
  { id:"luxury",     label:"Luxury",       emoji:"💎" },
]

export const CORNER_STYLE_LIST: { id: QRStyleConfig["cornerStyle"]; label: string }[] = [
  { id:"square",   label:"Carré"   },
  { id:"rounded",  label:"Arrondi" },
  { id:"circle",   label:"Cercle"  },
  { id:"diamond",  label:"Diamond" },
  { id:"luxury",   label:"Luxury"  },
  { id:"minimal",  label:"Minimal" },
]

export const GRADIENT_OPTS: { id: QRStyleConfig["gradient"]; label: string }[] = [
  { id:"none",     label:"Aucun"    },
  { id:"linear",   label:"Lineaire" },
  { id:"radial",   label:"Radial"   },
  { id:"diagonal", label:"Diagonal" },
]

export const DEFAULT_STYLE: QRStyleConfig = {
  fg2: "", cornerColor: "", eyeColor: "", transparent: false,
  gradient: "none", gradientBg: "", dotStyle: "square",
  cornerStyle: "square", margin: 10, density: "medium",
  logoUrl: "", logoSize: 18, logoShape: "rounded",
  logoBg: "white", logoBgColor: "#FFFFFF", logoPadding: 4,
}

// -- Bibliotheque de presets premium ------------------------------------------
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

const CORNER_STYLES = [
  { id: "square",  label: "Carré",   icon: "⬛" },
  { id: "rounded", label: "Arrondi", icon: "🔲" },
  { id: "dot",     label: "Points",  icon: "⚫" },
]

const EC_LEVELS = [
  { id: "L", label: "L 7%",  desc: "Léger" },
  { id: "M", label: "M 15%", desc: "Standard" },
  { id: "Q", label: "Q 25%", desc: "Eleve" },
  { id: "H", label: "H 30%", desc: "Maximum" },
]

// PLAN_RANK importé de lib/plans (free 0, starter 1, pro 2, business 3)
// QR Studio à 3 niveaux : Free = styles de base | Starter = + styles "pro" (limité) | Pro/Business = + styles luxe (complet)
const presetMinRank = (plan: string) => (plan === "business" ? 2 : plan === "pro" ? 1 : 0)
const presetUpsellPlan = (plan: string) => (plan === "business" ? "pro" : "starter")

// -- Statuts pages (pour l'affichage de la page liee)
const STATUS_CFG: Record<string, { label: string; dot: string; badge: string; text: string }> = {
  published: { label: "Publié",    dot: "var(--success)", badge: "rgba(57,255,143,0.12)",  text: "var(--success)" },
  draft:     { label: "Brouillon", dot: "#A8A190", badge: "rgba(138,132,120,0.12)", text: "#A8A190" },
  archived:  { label: "Archivé",   dot: "#F97316", badge: "rgba(249,115,22,0.12)",  text: "#F97316" },
  paused:    { label: "En pause",  dot: "var(--danger)", badge: "rgba(255,107,107,0.12)", text: "var(--danger)" },
}

// -- Statuts QR Code
const QR_STATUS_CFG: Record<string, { label: string; dot: string; badge: string; text: string; desc: string }> = {
  active:   { label: "Actif",     dot: "var(--success)", badge: "rgba(57,255,143,0.12)",  text: "var(--success)", desc: "Redirection normale" },
  draft:    { label: "Brouillon", dot: "#A8A190", badge: "rgba(138,132,120,0.12)", text: "#A8A190", desc: "Visible dans le dashboard uniquement" },
  paused:   { label: "En pause",  dot: "#F97316", badge: "rgba(249,115,22,0.12)",  text: "#F97316", desc: "Page indisponible affichee" },
  archived: { label: "Archivé",   dot: "#6B7280", badge: "rgba(107,114,128,0.12)", text: "#6B7280", desc: "Masque et bloque" },
  expired:  { label: "Expire",    dot: "var(--danger)", badge: "rgba(255,107,107,0.12)", text: "var(--danger)", desc: "Acces expire" },
}

// Sous l'aperçu : bloc stats + éditeur de destination RETIRÉS du flux principal (audit §2/§9 : les stats
// appartiennent à Analytics, et ce bloc était la 1re cause de scroll). Masqué via flag (code conservé,
// réversible — la destination pourra être relogée dans le menu « ··· » ou Redirections si besoin).
const LEGACY_INFO = false as boolean
// Section « Choisir un style » (presets) retirée du panneau à la demande : Couleurs suffit. Masquée (réversible).
const SHOW_PRESETS = false as boolean
// Pavé « diagnostic scannabilité premium » du bas retiré : redondant avec la ligne de lisibilité sous le QR. Masqué (réversible).
const SHOW_DIAG = false as boolean

const PLAN_BADGE: Record<string, { color: string; label: string } | null> = {
  free: null, pro: { color: "var(--accent)", label: "PRO" }, business: { color: "var(--success)", label: "BIZ" },
}

const G     = "var(--accent)"
const MUTED = "#A8A190"
const SURF  = "#0F0E0B"
const BG    = "#080808"

function formatDate(iso: string | null): string {
  if (!iso) return "--"
  const d = new Date(iso), now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diff < 60)   return `il y a ${diff}min`
  if (diff < 1440) return `il y a ${Math.floor(diff / 60)}h`
  if (diff < 10080) return `il y a ${Math.floor(diff / 1440)}j`
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

// -- Section accordeon depliable (une seule ouverte a la fois) --------------
function AccSection({ id, title, icon, openId, setOpenId, children }: {
  id: string; title: string; icon?: string;
  openId: string; setOpenId: (v: string) => void; children: ReactNode
}) {
  const open = openId === id
  return (
    <div style={{ border:`1px solid ${open?"color-mix(in srgb, var(--accent) 25%, transparent)":"rgba(255,255,255,0.07)"}`, borderRadius:10, overflow:"hidden", background:"rgba(255,255,255,0.015)", transition:"border-color 0.2s" }}>
      <button type="button" onClick={() => setOpenId(open ? "" : id)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 13px", background: open ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "transparent", border:"none", cursor:"pointer" }}>
        <span style={{ display:"flex", alignItems:"center", gap:8, color: open ? "var(--accent)" : "#F5F0E8", fontSize:12, fontWeight:700 }}>
          {icon && <span style={{ fontSize:14 }}>{icon}</span>}{title}
        </span>
        <ChevronRight size={15} color={open ? "var(--accent)" : "#A8A190"} style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition:"transform 0.2s" }}/>
      </button>
      {open && (
        <div style={{ padding:"6px 13px 14px" }}>
          {children}
        </div>
      )}
    </div>
  )
}

// -- Color picker premium integre --------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim())
  if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex(r: number, g: number, b: number): string {
  const h = (x: number) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  return [h, max === 0 ? 0 : d / max, max]
}
function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c } else { r = c; b = x }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}

function ColorField({ label, value, onChange, onClear }: {
  label: string; value: string; onChange: (hex: string) => void; onClear?: () => void
}) {
  const [open, setOpen] = useState(false)
  const valid = /^#[0-9a-fA-F]{6}$/.test(value)
  const safe  = valid ? value : "#080808"
  const [hr, hg, hb] = hexToRgb(safe)
  const [h, s, v] = rgbToHsv(hr, hg, hb)
  const svRef  = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  const onSV = (e: React.PointerEvent) => {
    const r = svRef.current?.getBoundingClientRect(); if (!r) return
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))
    onChange(hsvToHex(h, x, 1 - y))
  }
  const onHue = (e: React.PointerEvent) => {
    const r = hueRef.current?.getBoundingClientRect(); if (!r) return
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    onChange(hsvToHex(x * 360, s || 1, v || 1))
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <label style={{ color:"#A8A190", fontSize:11, flex:1 }}>{label}</label>
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{ width:28, height:28, borderRadius:6, border:`1px solid ${open?"#C9A84C":"rgba(255,255,255,0.15)"}`, background: valid ? safe : "transparent", cursor:"pointer", flexShrink:0, position:"relative", overflow:"hidden", padding:0 }}>
          {!valid && <span style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(45deg,#222,#222 3px,#444 3px,#444 6px)" }}/>}
        </button>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="#----"
          style={{ width:72, background:"#111009", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, padding:"5px 7px", color:valid?"#F5F0E8":"#A8A190", fontSize:10, fontFamily:"monospace", outline:"none" }}/>
        {onClear && (
          <button type="button" onClick={onClear} title="Effacer"
            style={{ width:24, height:24, borderRadius:6, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)", color:"#A8A190", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, padding:0 }}>×</button>
        )}
      </div>

      {open && (
        <div style={{ padding:10, background:"rgba(255,255,255,0.02)", border:"1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius:10, display:"flex", flexDirection:"column", gap:9 }}>
          {/* Carre saturation / valeur */}
          <div ref={svRef} onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); onSV(e) }}
            onPointerMove={e => { if (e.buttons === 1) onSV(e) }}
            style={{ position:"relative", width:"100%", height:120, borderRadius:8, cursor:"crosshair", touchAction:"none",
              background:`linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(h,1,1)})` }}>
            <div style={{ position:"absolute", left:`${s*100}%`, top:`${(1-v)*100}%`, width:12, height:12, borderRadius:"50%", border:"2px solid #fff", boxShadow:"0 0 0 1px rgba(0,0,0,0.4)", transform:"translate(-50%,-50%)", pointerEvents:"none", background:safe }}/>
          </div>
          {/* Slider teinte */}
          <div ref={hueRef} onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); onHue(e) }}
            onPointerMove={e => { if (e.buttons === 1) onHue(e) }}
            style={{ position:"relative", width:"100%", height:14, borderRadius:7, cursor:"pointer", touchAction:"none",
              background:"linear-gradient(to right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)" }}>
            <div style={{ position:"absolute", left:`${(h/360)*100}%`, top:"50%", width:14, height:14, borderRadius:"50%", border:"2px solid #fff", boxShadow:"0 0 0 1px rgba(0,0,0,0.4)", transform:"translate(-50%,-50%)", pointerEvents:"none", background:hsvToHex(h,1,1) }}/>
          </div>
        </div>
      )}
    </div>
  )
}

// -- Themes d'imprimables (palette independante du QR) -----------------------
type SuppTheme = { id: string; label: string; bg: string; text: string; accent: string; plan: string }
const SUPP_THEMES: SuppTheme[] = [
  { id:"auto",      label:"Auto (couleurs du QR)", bg:"",        text:"",        accent:"",        plan:"free" },
  { id:"minimal",   label:"Minimal",               bg:"#FFFFFF", text:"#1A1A1A", accent:"#1A1A1A", plan:"free" },
  { id:"blackgold", label:"Black Gold",            bg:"#0A0A0A", text:"#F5F0E8", accent:"#C9A84C", plan:"free" },
  { id:"cream",     label:"Creme & Or",            bg:"#F6F1E7", text:"#2A2419", accent:"#C9A84C", plan:"free" },
  { id:"modern",    label:"Modern",                bg:"#0F1729", text:"#F1F5FF", accent:"#5B8DEF", plan:"free" },
  { id:"nature",    label:"Nature",                bg:"#F2F4EC", text:"#26331C", accent:"#5B8A3A", plan:"free" },
  { id:"coral",     label:"Coral",                 bg:"#FFF5F0", text:"#3A1E16", accent:"#E5634D", plan:"free" },
  // -- Premium --
  { id:"emeraude",  label:"Emeraude",              bg:"#06231C", text:"#EAF7F0", accent:"#34D399", plan:"pro" },
  { id:"velours",   label:"Velours",               bg:"#1A0F2E", text:"#F3ECFF", accent:"#C9A84C", plan:"pro" },
  { id:"ardoise",   label:"Ardoise",               bg:"#1E232B", text:"#EEF2F6", accent:"#C9A84C", plan:"pro" },
  { id:"marbre",    label:"Marbre",                bg:"#F4F2EC", text:"#262220", accent:"#8A7250", plan:"pro" },
  { id:"neon",      label:"Neon",                  bg:"#0A0A12", text:"#EAEAFF", accent:"#FF3D9A", plan:"business" },
  { id:"royal",     label:"Royal",                 bg:"#0C1A3A", text:"#F5F8FF", accent:"#D4AF37", plan:"business" },
  // -- Palettes signature (un clic = tout le support change) --
  { id:"corporate", label:"Corporate",             bg:"#F5F8FC", text:"#102A43", accent:"#1D4ED8", plan:"free" },
  { id:"restaurant",label:"Restaurant",            bg:"#FFF4E8", text:"#3A2316", accent:"#C0392B", plan:"free" },
  { id:"ocean",     label:"Ocean",                 bg:"#EAF6F6", text:"#0B3A3A", accent:"#0E7490", plan:"free" },
  { id:"dark",      label:"Dark",                  bg:"#0E0E11", text:"#F2F2F2", accent:"#FFFFFF", plan:"free" },
  { id:"luxgold",   label:"Luxury Gold",           bg:"#0B0805", text:"#F4E7C4", accent:"#D4AF37", plan:"pro" },
  { id:"crypto",    label:"Crypto",                bg:"#0A0F1A", text:"#E4ECF7", accent:"#F7931A", plan:"pro" },
  { id:"bordeaux",  label:"Bordeaux",              bg:"#1A0610", text:"#F5E4EA", accent:"#C9A84C", plan:"business" },
]

// Objectifs marketing : on pense "but" (avis, menu, reservation...) plutot que "format"
type SuppObjective = { id: string; label: string; emoji: string; cta: string; supports: string[] }
const SUPP_OBJECTIVES: SuppObjective[] = [
  { id:"avis",      label:"Obtenir des avis",      emoji:"⭐", cta:"Scannez pour laisser un avis",   supports:["Sticker","Carte de table","Sous-bock"] },
  { id:"menu",      label:"Faire voir le menu",    emoji:"🍽️", cta:"Scannez pour voir la carte",     supports:["Carte de table","Menu","Sous-bock"] },
  { id:"reserver",  label:"Faire réserver",        emoji:"📅", cta:"Scannez pour réserver",          supports:["Carte de table","Affiche"] },
  { id:"insta",     label:"Gagner des abonnés",    emoji:"📷", cta:"Scannez pour nous suivre",       supports:["Sticker","Story","Affiche"] },
  { id:"contact",   label:"Partager mes infos",    emoji:"💳", cta:"Scannez pour mes coordonnées",   supports:["Carte de visite"] },
  { id:"page",      label:"Faire voir ma page",    emoji:"🔗", cta:"Scannez pour découvrir",         supports:["Affiche","Flyer","Post"] },
]

export default function QRStudio({ qrCodes: initialQRCodes, userPlan, appUrl }: Props) {
  const toast = useToast()
  const [qrCodes,    setQRCodes]    = useState<QRCode[]>(initialQRCodes)
  const [activeId,   setActiveId]   = useState<string | null>(initialQRCodes[0]?.id ?? null)
  const [mobileView, setMobileView] = useState<"list"|"editor">("list") // mobile : liste OU éditeur (pas les deux empilés)
  const [activeTab,  setActiveTab]  = useState<"style" | "supports" | "export">("style")
  const [showMoreFmt, setShowMoreFmt] = useState(false)
  const [fg,         setFg]         = useState("")
  const [bg,         setBg]         = useState("")
  const [corner,     setCorner]     = useState<"square"|"rounded"|"dot">("square")
  const [ecLevel,    setEcLevel]    = useState<"L"|"M"|"Q"|"H">("M")
  const [styleConf,  setStyleConf]  = useState<QRStyleConfig>({ ...DEFAULT_STYLE })
  const [openAcc,    setOpenAcc]    = useState<string>("couleurs")
  const [morePresets, setMorePresets] = useState(false) // #12 : n'affiche que les premiers styles, "Voir plus" pour le reste
  const [scanOpen, setScanOpen] = useState(false) // diagnostic scannabilite : repli par defaut (ne mange plus l'ecran)
  const [autoMsg,    setAutoMsg]    = useState<string>("")
  const [applyAllOk,   setApplyAllOk]   = useState(false)
  const [selectedCat,  setSelectedCat]  = useState("classic")
  const [upsell,        setUpsell]        = useState<{ feature: string; plan: string } | null>(null)
  const [batchOpen,     setBatchOpen]     = useState(false)  // génération de QR en lot (B2B)
  const [expFormat,     setExpFormat]     = useState<"png"|"png-t"|"webp"|"svg"|"pdf">("png")
  const [expSize,       setExpSize]       = useState<512|1024|2048|4096|"custom">(1024)
  const [expCustomSize, setExpCustomSize] = useState(1024)
  const [expMargin,     setExpMargin]     = useState(10)
  const [expFilename,   setExpFilename]   = useState("")
  const [expIncludeName,setExpIncludeName]= useState(false)
  const [expIncludeUrl, setExpIncludeUrl] = useState(false)
  const [expExporting,  setExpExporting]  = useState(false)
  const [expWarnOpen,   setExpWarnOpen]   = useState(false)
  const [expCopied,     setExpCopied]     = useState<string | null>(null)
  // -- Types stats ---------------------------------------------------------
  type QRStats = {
    total: number; current: number; prev: number; evolution: number
    last_scan: string | null; top_device: string | null; top_country: string | null
    sparkline: number[]; period: number; created_at: string
  }

  const exportCanvasRef   = useRef<HTMLCanvasElement>(null)
  const supportCanvasRef  = useRef<HTMLCanvasElement>(null)
  const sparkCanvasRef    = useRef<HTMLCanvasElement>(null)
  const [stats,         setStats]         = useState<QRStats | null>(null)
  const [statsLoading,  setStatsLoading]  = useState(false)
  const [statsPeriod,   setStatsPeriod]   = useState<7|30>(7)
  const [statsExporting,setStatsExporting]= useState(false)
  // -- Destination states -----------------------------------------------
  type DestEntry = { type:string; value:string; url?:string; label?:string|null; set_at?:string|null }
  const [destMode,    setDestMode]    = useState<"view"|"edit">("view")
  const [destType,    setDestType]    = useState<"page"|"url"|"file"|"email"|"phone"|"whatsapp">("page")
  const [destValue,   setDestValue]   = useState("")
  const [destLabel,   setDestLabel]   = useState("")
  const [destLoading, setDestLoading] = useState(false)
  const [destError,   setDestError]   = useState("")
  const [destSaved,   setDestSaved]   = useState(false)
  const [destOverride,setDestOverride]= useState<DestEntry | null>(null)
  const [destHistory, setDestHistory] = useState<DestEntry[]>([])
  const [destConfirm, setDestConfirm] = useState(false)
  const [destCopied,  setDestCopied]  = useState(false)
  const [destModal,   setDestModal]   = useState(false)   // éditeur de destination PAR QR (ouvert depuis le menu ···)
  // -- QR Status states -------------------------------------------------
  const [qrStatusLoading,setQrStatusLoading]= useState<string | null>(null)
  const [pauseMsg,       setPauseMsg]       = useState("")
  const [showPauseMsgEdit,setShowPauseMsgEdit]=useState(false)
  const [confirmAction,  setConfirmAction]  = useState<{action:string;qrId:string;label:string}|null>(null)
  const [showArchived,   setShowArchived]   = useState(false)
  const [suppTplId,   setSuppTplId]   = useState("a4-poster")
  const [suppOpenGroup, setSuppOpenGroup] = useState("Affiche")
  const [suppObjective, setSuppObjective] = useState("")
  const [suppTheme,   setSuppTheme]   = useState("auto")
  const [suppTitle,   setSuppTitle]   = useState("")
  const [suppSubtitle,setSuppSubtitle]= useState("Scannez pour voir le menu")
  const [suppPhone,   setSuppPhone]   = useState("")
  const [suppWebsite, setSuppWebsite] = useState("")
  const [suppFont,     setSuppFont]     = useState("Fraunces")
  const [suppSubFont,  setSuppSubFont]  = useState("Arial")
  const [suppTracking, setSuppTracking] = useState(0)
  const [suppTitleSize, setSuppTitleSize] = useState(1)
  const [suppSubSize,   setSuppSubSize]   = useState(1)
  const [suppTitleColor, setSuppTitleColor] = useState("")
  const [suppSubColor,   setSuppSubColor]   = useState("")
  const [suppOffX,     setSuppOffX]     = useState(0)
  const [suppOffY,     setSuppOffY]     = useState(0)
  const [suppRendered,setSuppRendered]= useState(false)
  const [suppExporting,setSuppExporting]=useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [saveErr,    setSaveErr]    = useState("")
  const [copied,     setCopied]     = useState<"link"|"short"|null>(null)
  const [search,     setSearch]     = useState("")
  const [filterSt,   setFilterSt]   = useState("all")
  const [sortKey,    setSortKey]    = useState("date-desc")
  const [menuId,     setMenuId]     = useState<string | null>(null)
  const [confirmId,  setConfirmId]  = useState<string | null>(null)
  const [archivingId,setArchivingId]= useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copyQRId,   setCopyQRId]   = useState<string | null>(null)
  const [dupId,      setDupId]      = useState<string | null>(null)
  const [showModal,  setShowModal]  = useState(false)
  const [scene,      setScene]      = useState<"none"|"phone"|"card"|"poster"|"sticker"|"tent">("none") // aperçu immersif
  const [level,      setLevel]      = useState<"simple"|"inter"|"expert">("simple") // niveau de réglages (désencombre le panneau)
  const [modeSheet,  setModeSheet]  = useState(false) // mobile : sélecteur de mode en bottom sheet
  const [expOptsOpen, setExpOptsOpen] = useState(false) // options export techniques repliées sur mobile
  const [sceneSelOpen, setSceneSelOpen] = useState(false) // sélecteur d'aperçu replié sur mobile
  const [expMoreOpen, setExpMoreOpen] = useState(false) // actions secondaires export repliées sur mobile
  const [printDetailsOpen, setPrintDetailsOpen] = useState(false) // liste détaillée Print Studio repliée sur mobile
  const isMobile = useIsMobile(859) // mobile : on désencombre le panneau export
  const [qrPng,      setQrPng]      = useState<string>("") // PNG du QR composé dans les scènes
  const [diagFg,     setDiagFg]     = useState("")
  const [diagBg,     setDiagBg]     = useState("")
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const canvasRef      = useRef<HTMLDivElement>(null)
  const canvasModalRef = useRef<HTMLDivElement>(null)
  const qrInstRef      = useRef<QRCodeStyling | null>(null)
  const qrModalInstRef = useRef<QRCodeStyling | null>(null)
  const scanWidgetRef  = useRef<HTMLDivElement>(null)

  const active  = qrCodes.find(q => q.id === activeId) ?? null
  const qrUrl   = active ? `${appUrl}/q/${active.short_code}` : ""
  const pageUrl = active?.pages ? `${appUrl}/${active.pages.slug}` : ""

  useEffect(() => {
    if (!active) return
    setFg(active.foreground_color)
    setBg(active.background_color)
    setCorner(active.corner_style)
    setEcLevel(active.error_correction)
    const sc = { ...DEFAULT_STYLE, ...(active.style_config ?? {}) }
    // Initialiser logoUrl depuis style_config ou logo_url de la page
    if (!sc.logoUrl && active.logo_url) sc.logoUrl = active.logo_url
    setStyleConf(sc)
  }, [activeId])

  // Construire l'URL QR en tenant compte du style_config
  // ECC force H si logo actif (logo masque des modules QR)
  const effectiveEcc = styleConf.logoUrl ? "H" : ecLevel

  // Logo COMPOSE (conteneur forme + fond) — derive du logo brut, recalcule quand la
  // forme/le fond changent. Le logo brut reste dans styleConf (sauvegarde) ; cette
  // version composee n'est utilisee qu'au RENDU (renderStyle), pas de double stockage.
  const [composedLogo, setComposedLogo] = useState("")
  useEffect(() => {
    let cancelled = false
    const src = styleConf.logoUrl
    if (!src) { setComposedLogo(""); return }
    composeLogo(src, { shape: styleConf.logoShape, bg: styleConf.logoBg, bgColor: styleConf.logoBgColor })
      .then(u => { if (!cancelled) setComposedLogo(u) })
      .catch(() => { if (!cancelled) setComposedLogo(src) })
    return () => { cancelled = true }
  }, [styleConf.logoUrl, styleConf.logoShape, styleConf.logoBg, styleConf.logoBgColor])

  // Style de RENDU : logo remplace par sa version composee (fallback = logo brut).
  const renderStyle = (styleConf.logoUrl && composedLogo && composedLogo !== styleConf.logoUrl)
    ? { ...styleConf, logoUrl: composedLogo }
    : styleConf

  // Construit les options de rendu QR a partir de l'etat courant
  function qrOpts(size: number): QROptions {
    return { data: qrUrl, fg, bg, ecc: effectiveEcc, style: renderStyle, size }
  }

  // Rendu de l'apercu principal via qr-code-styling
  useEffect(() => {
    if (!canvasRef.current || !qrUrl) return
    const container = canvasRef.current
    if (!qrInstRef.current) {
      qrInstRef.current = createQR(qrOpts(720))
      container.innerHTML = ""
      qrInstRef.current.append(container)
    } else {
      updateQR(qrInstRef.current, qrOpts(720))
    }
  }, [qrUrl, fg, bg, corner, ecLevel, styleConf])

  // PNG du QR pour les scènes d'aperçu immersif (généré uniquement si une scène est active)
  useEffect(() => {
    if (scene === "none" || !qrUrl) return
    let cancelled = false
    ;(async () => {
      try {
        const blob = await getQRBlob({ data: qrUrl, fg, bg, ecc: effectiveEcc, style: renderStyle, size: 600 }, "png")
        const url = await blobToDataUrl(blob)
        if (!cancelled) setQrPng(url)
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [scene, qrUrl, fg, bg, ecLevel, styleConf])

  async function archiveQR(id: string) {
    setArchivingId(id)
    const sb = createClient()
    const pid = qrCodes.find(q => q.id === id)?.page_id ?? ""
    if (pid) await sb.from("pages").update({ status: "archived" }).eq("id", pid)
    setQRCodes(prev => prev.map(q => q.id === id
      ? { ...q, pages: q.pages ? { ...q.pages, status: "archived" } : null } : q))
    setArchivingId(null); setMenuId(null)
  }

  async function deleteQR(id: string) {
    setDeletingId(id)
    const sb = createClient()
    await sb.from("qr_codes").delete().eq("id", id)
    const rest = qrCodes.filter(q => q.id !== id)
    setQRCodes(rest)
    if (activeId === id) setActiveId(rest[0]?.id ?? null)
    setDeletingId(null); setConfirmId(null); setMenuId(null)
  }

  function copyQRLink(id: string, url: string) {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopyQRId(id); setTimeout(() => setCopyQRId(null), 2000)
  }

  // -- Calcul contraste WCAG -------------------------------------------------
  // (hexToRgb : on réutilise la fonction module-scope, plus robuste — elle valide
  // le format hex — au lieu d'une 2e définition qui la shadowait.)
  function relativeLuminance(r:number,g:number,b:number): number {
    const c = [r,g,b].map(v => { const s=v/255; return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4) })
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
  }
  function contrastRatio(hex1:string, hex2:string): number {
    const [r1,g1,b1] = hexToRgb(hex1)
    const [r2,g2,b2] = hexToRgb(hex2)
    const l1 = relativeLuminance(r1,g1,b1)
    const l2 = relativeLuminance(r2,g2,b2)
    const lMax = Math.max(l1,l2), lMin = Math.min(l1,l2)
    return (lMax+0.05)/(lMin+0.05)
  }
  // -- Moteur de scannabilité complet ------------------------------------------
  type ScanIssue = {
    id:       string
    severity: "critical"|"warning"|"info"
    title:    string
    detail:   string
    fix?:     string   // label du fix auto
    fixable:  boolean
  }

  type ScanScore = {
    score:      number   // 0-100
    grade:      "Excellent"|"Bon"|"Moyen"|"Risque"
    gradeColor: string
    issues:     ScanIssue[]
    ratio:      string
    minSize:    string
    canAutoFix: boolean
  }

  function computeScannability(): ScanScore {
    const issues: ScanIssue[] = []
    let score = 100

    const fgHex = diagFg || fg || "#080808"
    const bgHex = diagBg || bg || "#FFFFFF"

    // -- 1. Contraste QR/fond --------------------------------------------------
    const ratio = contrastRatio(fgHex, bgHex)
    if (ratio < 2) {
      issues.push({ id:"contrast-critical", severity:"critical",
        title:"Contraste insuffisant", detail:`Ratio ${ratio.toFixed(1)}:1 -- le QR sera illisible sur la plupart des scanners.`,
        fix:"Passer en noir sur blanc", fixable:true })
      score -= 35
    } else if (ratio < 3) {
      issues.push({ id:"contrast-low", severity:"critical",
        title:"Contraste trop faible", detail:`Ratio ${ratio.toFixed(1)}:1 -- moins de 50% des scanners liront ce QR.`,
        fix:"Renforcer le contraste", fixable:true })
      score -= 25
    } else if (ratio < 4.5) {
      issues.push({ id:"contrast-warn", severity:"warning",
        title:"Contraste moyen", detail:`Ratio ${ratio.toFixed(1)}:1 -- privilegiez 4.5:1 minimum pour le print.`,
        fix:"Renforcer le contraste", fixable:true })
      score -= 12
    }

    // -- 2. Fond transparent risque --------------------------------------------
    if (styleConf.transparent) {
      issues.push({ id:"transparent", severity:"warning",
        title:"Fond transparent", detail:"Le fond transparent peut rendre le QR illisible sur les surfaces colorees.",
        fix:"Ajouter un fond blanc", fixable:true })
      score -= 10
    }

    // -- 3. Logo trop grand ----------------------------------------------------
    if (styleConf.logoUrl) {
      const logoSize = styleConf.logoSize ?? 18
      if (logoSize > 25) {
        issues.push({ id:"logo-big", severity:"critical",
          title:"Logo trop grand", detail:`${logoSize}% du QR est masque -- max recommande : 25%.`,
          fix:"Reduire le logo a 20%", fixable:true })
        score -= 20
      } else if (logoSize > 20) {
        issues.push({ id:"logo-warn", severity:"warning",
          title:"Logo un peu grand", detail:`${logoSize}% -- recommande : 15-20%.`,
          fix:"Reduire le logo a 18%", fixable:true })
        score -= 8
      }
      // ECC insuffisant avec logo
      if (effectiveEcc !== "H") {
        issues.push({ id:"ecc-logo", severity:"critical",
          title:"Correction insuffisante pour le logo", detail:"Avec un logo, la correction H est obligatoire.",
          fix:"Passer en ECC H", fixable:true })
        score -= 15
      }
    }

    // -- 4. Correction d'erreur faible sans logo -------------------------------
    if (!styleConf.logoUrl) {
      if (ecLevel === "L") {
        issues.push({ id:"ecc-l", severity:"warning",
          title:"Correction L trop légère", detail:"ECC L (7%) est insuffisant pour l'impression ou les surfaces abimees.",
          fix:"Passer en ECC M", fixable:true })
        score -= 8
      }
    }

    // -- 5. Marge insuffisante -------------------------------------------------
    const margin = styleConf.margin ?? 10
    if (margin < 4) {
      issues.push({ id:"margin-none", severity:"critical",
        title:"Marge trop petite", detail:`Marge ${margin}px -- minimum 4 modules (10px) requis pour la decouverte.`,
        fix:"Ajouter une marge de 12px", fixable:true })
      score -= 18
    } else if (margin < 8) {
      issues.push({ id:"margin-low", severity:"warning",
        title:"Marge réduite", detail:`Marge ${margin}px -- 10px+ recommande pour l'impression.`,
        fix:"Ajouter une marge de 10px", fixable:true })
      score -= 6
    }

    // -- 6. Style trop complexe ------------------------------------------------
    const dotStyle = styleConf.dotStyle ?? "square"
    if (dotStyle === "neon" || dotStyle === "luxury") {
      issues.push({ id:"style-complex", severity:"warning",
        title:"Style QR complexe", detail:"Les styles Néon/Luxury peuvent perturber la détection par certains scanners anciens.",
        fix:undefined, fixable:false })
      score -= 6
    }

    // -- 7. Couleurs trop proches (QR ~ fond) ----------------------------------
    const fgComponents = hexToRgb(fgHex)
    const bgComponents = hexToRgb(bgHex)
    const colorDist = Math.sqrt(
      Math.pow(fgComponents[0]-bgComponents[0], 2) +
      Math.pow(fgComponents[1]-bgComponents[1], 2) +
      Math.pow(fgComponents[2]-bgComponents[2], 2)
    )
    if (colorDist < 60 && ratio >= 3) {
      issues.push({ id:"colors-close", severity:"info",
        title:"Couleurs proches", detail:"La distance chromatique est faible — peut poser problème sur écrans à faible gamme.",
        fix:undefined, fixable:false })
      score -= 4
    }

    // -- 8. Degrades risques ---------------------------------------------------
    if (styleConf.gradient !== "none" && styleConf.fg2) {
      const ratio2 = contrastRatio(styleConf.fg2, bgHex)
      if (ratio2 < 3) {
        issues.push({ id:"gradient-contrast", severity:"warning",
          title:"Dégradé — couleur secondaire peu contrastée",
          detail:`La couleur fin de degrade a un contraste de ${ratio2.toFixed(1)}:1 avec le fond.`,
          fix:"Supprimer le dégradé", fixable:true })
        score -= 10
      }
    }

    score = Math.max(0, Math.min(100, score))
    const grade: ScanScore["grade"] = score >= 85 ? "Excellent" : score >= 65 ? "Bon" : score >= 40 ? "Moyen" : "Risque"
    const gradeColor = score >= 85 ? "var(--success)" : score >= 65 ? "#C9A84C" : score >= 40 ? "#F97316" : "var(--danger)"
    const minSize = ratio >= 7 ? "15mm" : ratio >= 4.5 ? "20mm" : ratio >= 3 ? "25mm" : "30mm+"
    const canAutoFix = issues.some(i => i.fixable)

    return { score, grade, gradeColor, issues, ratio: ratio.toFixed(1), minSize, canAutoFix }
  }

  // Compat getDiagnostic (utilise dans la modal)
  function getDiagnostic(fgHex: string, bgHex: string) {
    if (!fgHex || !bgHex) return null
    const ratio   = contrastRatio(fgHex, bgHex)
    const percent = Math.min(100, Math.round(((ratio-1)/(21-1))*100))
    const warnContrast = ratio < 3; const warnLow = ratio < 4.5
    const readability = ratio >= 7 ? "Excellente" : ratio >= 4.5 ? "Bonne" : ratio >= 3 ? "Moyenne" : "Risquee"
    const readColor   = ratio >= 7 ? "var(--success)" : ratio >= 4.5 ? "#C9A84C" : ratio >= 3 ? "#F97316" : "var(--danger)"
    const minSize = ratio >= 7 ? "15mm" : ratio >= 4.5 ? "20mm" : ratio >= 3 ? "25mm" : "30mm+"
    return { ratio: ratio.toFixed(1), percent, readability, readColor, minSize, warnContrast, warnLow }
  }

  // Canvas modal plein ecran
  // Rendu du QR plein ecran (modal) via qr-code-styling
  useEffect(() => {
    if (!showModal || !canvasModalRef.current || !qrUrl) return
    const container = canvasModalRef.current
    container.innerHTML = ""
    qrModalInstRef.current = createQR(qrOpts(800))
    qrModalInstRef.current.append(container)
  }, [showModal, qrUrl, fg, bg, corner, ecLevel, styleConf])
  useEffect(() => {
    if (!active) return
    setDestOverride((active.dest_override ?? null) as DestEntry | null)
    setDestHistory((active.dest_history ?? []) as DestEntry[])
    setDestMode("view")
    setDestError("")
  }, [activeId])

  useEffect(() => { setDiagFg(fg); setDiagBg(bg) }, [fg, bg])

  // Score scannabilité calcule a chaque changement de config
  const scanScore = active ? computeScannability() : null

  // Charger stats QR au changement de selection ou periode
  useEffect(() => {
    if (!activeId) return
    setStats(null)
    setStatsLoading(true)
    fetch(`/api/qr-stats/${activeId}?period=${statsPeriod}`)
      .then(r => r.json())
      .then(d => { if (!d.error && !d.empty) setStats(d) }) // empty = QR introuvable/erreur -> on laisse l'état vide, pas des zéros
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [activeId, statsPeriod])

  // Dessiner la sparkline quand stats change
  useEffect(() => {
    const canvas = sparkCanvasRef.current
    if (!canvas || !stats?.sparkline?.length) return
    const ctx   = canvas.getContext("2d"); if (!ctx) return
    const data  = stats.sparkline
    const W     = canvas.offsetWidth || 260
    const H     = 48
    canvas.width  = W * 2; canvas.height = H * 2
    ctx.scale(2, 2)
    ctx.clearRect(0, 0, W, H)
    const max   = Math.max(...data, 1)
    const step  = W / (data.length - 1 || 1)
    const pts   = data.map((v, i) => [i * step, H - 4 - (v / max) * (H - 10)] as [number,number])
    // Zone de remplissage
    const grad  = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, "rgba(201,168,76,0.3)")
    grad.addColorStop(1, "rgba(201,168,76,0)")
    ctx.beginPath()
    ctx.moveTo(pts[0][0], H)
    pts.forEach(([x,y]) => ctx.lineTo(x, y))
    ctx.lineTo(pts[pts.length-1][0], H)
    ctx.closePath()
    ctx.fillStyle = grad; ctx.fill()
    // Ligne
    ctx.beginPath()
    pts.forEach(([x,y], i) => i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y))
    ctx.strokeStyle = "#C9A84C"; ctx.lineWidth = 1.5
    ctx.lineJoin = "round"; ctx.stroke()
    // Points
    pts.forEach(([x,y]) => {
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2)
      ctx.fillStyle = "#C9A84C"; ctx.fill()
    })
  }, [stats])

  // Export CSV des scans
  async function exportQRCSV() {
    if (!active || !stats) return
    setStatsExporting(true)
    try {
      const res  = await fetch(`/api/qr-stats/${activeId}?period=30`)
      const d    = await res.json()
      if (d.empty || d.error) { setStatsExporting(false); return } // pas de CSV vide si QR introuvable/erreur
      const rows = d.sparkline?.map((v: number, i: number) => {
        const date = new Date(); date.setDate(date.getDate() - 30 + i)
        return `${date.toLocaleDateString("fr-FR")},${v}`
      }) ?? []
      const csv  = ["Date,Scans", ...rows].join("\r\n")
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href = url; a.download = `scans-${active.short_code}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch {}
    setStatsExporting(false)
  }

  const saveCustomization = useCallback(async () => {
    if (!active) return
    setSaving(true)
    setSaveErr("")
    try {
      const res = await fetch("/api/qr-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr_id: active.id,
          foreground_color: fg,
          background_color: bg,
          corner_style: corner,
          error_correction: ecLevel,
          style_config: styleConf,
        }),
      })
      const d = await res.json()
      setSaving(false)
      if (!res.ok || d.error) {
        setSaveErr(d.error || "Echec de l'enregistrement")
        return
      }
      setQRCodes(prev => prev.map(q => q.id === active.id
        ? { ...q, foreground_color: fg, background_color: bg, corner_style: corner, error_correction: ecLevel, style_config: styleConf }
        : q))
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaving(false)
      setSaveErr("Erreur reseau")
    }
  }, [active, fg, bg, corner, ecLevel, styleConf])

  // -- Nom de fichier auto ----------------------------------------------------
  function getFilename(ext: string): string {
    const base = expFilename.trim() || active?.pages?.title?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || active?.short_code || "qr"
    return `${base}.${ext}`
  }

  // -- Construire canvas export a la taille voulue (avec logo) ----------------
  // Construit un canvas d'export via qr-code-styling (logo gere nativement)
  // + bandeau optionnel (nom page / url) dessine par-dessus.
  async function buildExportCanvas(px: number, transparent: boolean): Promise<HTMLCanvasElement> {
    const opts: QROptions = {
      data: qrUrl, fg, bg, ecc: effectiveEcc,
      style: { ...renderStyle, transparent: transparent || renderStyle.transparent },
      size: px,
    }
    const blob = await getQRBlob(opts, "png")
    if (!blob) throw new Error("QR generation failed")
    const url  = URL.createObjectURL(blob)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = () => reject(new Error("QR image load failed"))
        i.src = url
      })
      const canvas = document.createElement("canvas")
      canvas.width = px; canvas.height = px
      const ctx = canvas.getContext("2d")!
      ctx.clearRect(0, 0, px, px)
      ctx.drawImage(img, 0, 0, px, px)

      // Bandeau bas : nom page + URL
      if (expIncludeName || expIncludeUrl) {
        const bannerH = Math.round(px * 0.08)
        ctx.fillStyle = "rgba(0,0,0,0.7)"
        ctx.fillRect(0, px - bannerH, px, bannerH)
        const fSize = Math.round(bannerH * 0.32)
        ctx.textAlign = "center"
        if (expIncludeName && active?.pages?.title) {
          ctx.fillStyle = "#F5F0E8"; ctx.font = `600 ${fSize}px 'DM Sans', Arial, sans-serif`
          ctx.fillText(active.pages.title, px/2, px - bannerH + fSize*1.1, px*0.9)
        }
        if (expIncludeUrl) {
          ctx.fillStyle = "#C9A84C"; ctx.font = `400 ${Math.round(fSize*0.8)}px monospace`
          ctx.fillText(qrUrl, px/2, px - bannerH + (expIncludeName?fSize*2.2:fSize*1.5), px*0.9)
        }
        ctx.textAlign = "start"
      }
      return canvas
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }

  // -- Dupliquer un QR ----------------------------------------------------------
  async function duplicateQR(id: string) {
    setMenuId(null)
    if (dupId) return
    setDupId(id)
    try {
      const res = await fetch("/api/qr-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_id: id }),
      })
      const d = await res.json()
      if (!res.ok || d.error || !d.qr) {
        toast.error("Duplication impossible : " + (d.message || d.error || "erreur inconnue"))
        return
      }
      setQRCodes(prev => [d.qr, ...prev])
      setActiveId(d.qr.id)
      setMobileView("editor")
      if (d.qr.status === "draft") {
        toast.success("Copie créée en brouillon : limite de QR actifs atteinte. Activez-la après avoir mis un autre QR en pause.")
      }
    } catch {
      toast.error("Duplication impossible : erreur reseau")
    } finally {
      setDupId(null)
    }
  }

  // -- Fonctions QR Status ------------------------------------------------------
  async function changeQRStatus(qrId: string, action: string, extra?: Record<string, any>) {
    setQrStatusLoading(qrId)
    try {
      const res = await fetch("/api/qr-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_id: qrId, action, ...extra }),
      })
      const d = await res.json()
      if (d.ok) {
        setQRCodes(prev => prev.map(q => q.id === qrId
          ? { ...q, status: d.status, ...(extra?.pause_message !== undefined ? { pause_message: extra.pause_message } : {}) }
          : q
        ))
      } else {
        toast.error(d.error || "Action impossible")
      }
    } catch {
      toast.error("Erreur réseau")
    }
    setQrStatusLoading(null)
    setConfirmAction(null)
    setMenuId(null)
  }

  async function hardDeleteQR(qrId: string) {
    setQrStatusLoading(qrId)
    try {
      await fetch("/api/qr-status", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_id: qrId }),
      })
      const rest = qrCodes.filter(q => q.id !== qrId)
      setQRCodes(rest)
      if (activeId === qrId) setActiveId(rest[0]?.id ?? null)
    } catch {}
    setQrStatusLoading(null)
    setConfirmAction(null)
  }

  function requestAction(qrId: string, action: string, label: string) {
    setConfirmAction({ action, qrId, label })
    setMenuId(null)
  }

  // -- Auto-fix scannabilité ----------------------------------------------------
  function autoFix() {
    if (!scanScore) return
    let newFg = fg; let newBg = bg; let newEc = ecLevel
    let newStyleConf = { ...styleConf }

    for (const issue of scanScore.issues) {
      if (!issue.fixable) continue
      switch (issue.id) {
        case "contrast-critical":
        case "contrast-low":
          newFg = "#080808"; newBg = "#FFFFFF"
          break
        case "contrast-warn":
          // Assombrir fg si fond clair, eclaircir si fond sombre
          newFg = parseInt(bg.replace("#","").slice(0,2),16) > 128 ? "#000000" : "#FFFFFF"
          break
        case "transparent":
          newStyleConf = { ...newStyleConf, transparent: false }
          break
        case "logo-big":
          newStyleConf = { ...newStyleConf, logoSize: 20 }
          break
        case "logo-warn":
          newStyleConf = { ...newStyleConf, logoSize: 18 }
          break
        case "ecc-logo":
        case "ecc-l":
          newEc = "H"
          break
        case "margin-none":
          newStyleConf = { ...newStyleConf, margin: 12 }
          break
        case "margin-low":
          newStyleConf = { ...newStyleConf, margin: 10 }
          break
        case "gradient-contrast":
          newStyleConf = { ...newStyleConf, gradient: "none", fg2: "" }
          break
      }
    }
    setFg(newFg); setBg(newBg); setEcLevel(newEc); setStyleConf(newStyleConf)
  }

  // Thèmes prêts-à-l'emploi (haute lisibilité) — alternative créative à la correction mécanique
  const THEME_SUGGESTIONS = [
    { name: "Classique", fg: "#080808", bg: "#FFFFFF" },
    { name: "Nuit",      fg: "#0B1F3A", bg: "#FFFFFF" },
    { name: "Or",        fg: "#5A4410", bg: "#FFFDF5" },
  ]
  function applyTheme(t: { fg: string; bg: string }) {
    setFg(t.fg); setBg(t.bg)
    setStyleConf(s => ({ ...s, gradient: "none", fg2: "", transparent: false }))
  }

  // -- Fonctions destination dynamique -----------------------------------------
  const DEST_TYPES = [
    { id:"page",     label:"Page QRowg", icon:"📄", ph:"ID ou slug de la page" },
    { id:"url",      label:"URL externe",  icon:"🌐", ph:"https://mon-site.com"  },
    { id:"file",     label:"Fichier",      icon:"📎", ph:"https://drive.google.com/..." },
    { id:"email",    label:"Email",        icon:"✉️",  ph:"contact@mon-site.com" },
    { id:"phone",    label:"Telephone",    icon:"📞", ph:"+33 6 12 34 56 78"    },
    { id:"whatsapp", label:"WhatsApp",     icon:"💬", ph:"+33612345678"          },
  ]
  function getDestUrl(e: DestEntry | null): string { return e ? (e.url || e.value || pageUrl) : pageUrl }
  function getDestLabel(e: DestEntry | null): string {
    if (!e) return active?.pages?.title ?? "Page QRowg"
    const cfg = DEST_TYPES.find(d => d.id === e.type)
    return e.label || cfg?.label || e.type
  }
  function getDestStatusColor(e: DestEntry | null): string {
    if (!e) return active?.pages?.status === "published" ? "var(--success)" : "#A8A190"
    return e.type === "page" ? (active?.pages?.status === "published" ? "var(--success)" : "#F97316") : "var(--action)"
  }
  async function saveDest() {
    if (!active || !destValue.trim()) return
    setDestLoading(true); setDestError("")
    try {
      const res = await fetch("/api/qr-destination", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ qr_id:active.id, type:destType, value:destValue.trim(), label:destLabel.trim()||null }),
      })
      const d = await res.json()
      if (d.error) { setDestError(d.error); return }
      setDestOverride(d.dest_override); setDestHistory(d.dest_history ?? [])
      setQRCodes(prev => prev.map(q => q.id === active.id
        ? { ...q, dest_override:d.dest_override, dest_history:d.dest_history??[] } : q))
      setDestMode("view"); setDestSaved(true); setTimeout(()=>setDestSaved(false), 2500)
    } catch { setDestError("Erreur reseau") }
    setDestLoading(false); setDestConfirm(false)
  }
  async function removeDest() {
    if (!active) return
    setDestLoading(true)
    try {
      await fetch("/api/qr-destination", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({qr_id:active.id}) })
      setDestOverride(null)
      setQRCodes(prev => prev.map(q => q.id === active.id ? {...q,dest_override:null} : q))
    } catch {}
    setDestLoading(false)
  }
  async function restoreDest(index: number) {
    if (!active) return; setDestLoading(true)
    try {
      const res = await fetch("/api/qr-destination", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({qr_id:active.id, index}) })
      const d   = await res.json()
      if (d.ok) {
        const hd = await fetch(`/api/qr-destination?qr_id=${active.id}`).then(r=>r.json())
        setDestOverride(hd.dest_override); setDestHistory(hd.dest_history??[])
      }
    } catch {}
    setDestLoading(false)
  }
  function copyDest() {
    navigator.clipboard.writeText(getDestUrl(destOverride)).catch(()=>{})
    setDestCopied(true); setTimeout(()=>setDestCopied(false), 2000)
  }

  // -- Templates supports imprimables -----------------------------------------
  type SuppTpl = {
    id: string; label: string; emoji: string; w: number; h: number
    plan: string; cat: string; desc: string; support: string
  }

  const SUPP_TPLS: SuppTpl[] = [
    { id:"qr-only",     label:"QR seul",           emoji:"▣", w:800,  h:800,  plan:"free",     cat:"Base",       desc:"QR Code sans decoration" , support:"QR seul"},
    { id:"a4-poster",   label:"Affiche A4",         emoji:"📋", w:795,  h:1122, plan:"free",     cat:"Print",      desc:"Portrait A4 avec titre et fond" , support:"Affiche"},
    { id:"flyer",       label:"Flyer",              emoji:"📄", w:795,  h:561,  plan:"free",     cat:"Print",      desc:"Demi A4 paysage" , support:"Flyer"},
    { id:"sticker",     label:"Sticker vitrine",    emoji:"🏷️",  w:600,  h:600,  plan:"free",     cat:"Print",      desc:"Carré 6cm avec cadre" , support:"Sticker"},
    { id:"table-card",  label:"Carte de table",     emoji:"🪧",  w:900,  h:506,  plan:"free",      cat:"Restaurant", desc:"Format paysage 9x5cm" , support:"Carte de table"},
    { id:"menu-qr",     label:"Menu QR",            emoji:"🍽",  w:600,  h:900,  plan:"free",      cat:"Restaurant", desc:"Carte portrait avec titre menu" , support:"Menu"},
    { id:"business",    label:"Carte de visite",    emoji:"💳", w:1063, h:591,  plan:"free",      cat:"Business",   desc:"Format CR80 standard" , support:"Carte de visite"},
    { id:"event-badge", label:"Badge evenement",    emoji:"🎫", w:680,  h:400,  plan:"free",      cat:"Event",      desc:"Badge horizontal 85x50mm" , support:"Badge"},
    { id:"story",       label:"Story Instagram",    emoji:"📱", w:1080, h:1920, plan:"free", cat:"Social",     desc:"9:16 vertical stories" , support:"Story"},
    { id:"post",        label:"Post Instagram",     emoji:"🟫", w:1080, h:1080, plan:"free", cat:"Social",     desc:"Carré 1:1" , support:"Post"},

    // ===== LOT 15 templates supplementaires =====
  // ---- Print ----
  { id:"affiche-minimal",     label:"Affiche minimale",   emoji:"🖼️", w:795,  h:1122, plan:"free",     cat:"Print",      desc:"A4 épuré, grand QR centré" , support:"Affiche"},
  { id:"affiche-premium",     label:"Affiche premium",    emoji:"✨", w:795,  h:1122, plan:"free",      cat:"Print",      desc:"A4 filets dorés, look haut de gamme" , support:"Affiche"},
  { id:"flyer-paysage",       label:"Flyer paysage",      emoji:"📄", w:795,  h:561,  plan:"free",     cat:"Print",      desc:"Demi-A4, bande latérale + QR" , support:"Flyer"},

  // ---- Restaurant ----
  { id:"menu-resto-portrait", label:"Menu resto",         emoji:"🍽️", w:600,  h:900,  plan:"free",     cat:"Restaurant", desc:"Header coloré, QR vers la carte" , support:"Menu"},
  { id:"carte-table-resto",   label:"Carte de table",     emoji:"🍴", w:900,  h:506,  plan:"free",      cat:"Restaurant", desc:"Paysage, QR à gauche, texte à droite" , support:"Carte de table"},
  { id:"sticker-avis",        label:"Sticker avis",       emoji:"⭐", w:600,  h:600,  plan:"free",     cat:"Restaurant", desc:"Carré, demande d'avis client" , support:"Sticker"},

  // ---- Business ----
  { id:"carte-visite-classic",label:"Carte de visite",    emoji:"💼", w:1063, h:591,  plan:"free",      cat:"Business",   desc:"CR80, split coloré + QR" , support:"Carte de visite"},
  { id:"carte-visite-dark",   label:"Carte premium",      emoji:"🥇", w:1063, h:591,  plan:"free", cat:"Business",   desc:"CR80, cadre doré, ultra premium" , support:"Carte de visite"},

  // ---- Event ----
  { id:"badge-event-pro",     label:"Badge événement",    emoji:"🎫", w:680,  h:400,  plan:"free",      cat:"Event",      desc:"Badge header coloré + QR" , support:"Badge"},
  { id:"affiche-event",       label:"Affiche événement",  emoji:"🎉", w:795,  h:1122, plan:"free",      cat:"Event",      desc:"A4 bold, grand header" , support:"Affiche"},
    { id:"affiche-centre",  label:"Affiche centrée",     emoji:"🖼️", w:800, h:1131, plan:"free",     cat:"Print", desc:"Titre centré, QR encadré", support:"Affiche" },
    { id:"affiche-cadre",   label:"Affiche cadre",       emoji:"🖼️", w:800, h:1131, plan:"free",     cat:"Print", desc:"Cadre élégant, ornements", support:"Affiche" },
    { id:"affiche-bandeau", label:"Affiche bandeau",     emoji:"🖼️", w:800, h:1131, plan:"pro",      cat:"Print", desc:"QR en haut, bande de couleur", support:"Affiche" },
    { id:"affiche-split",   label:"Affiche split",       emoji:"🖼️", w:800, h:1131, plan:"pro",      cat:"Print", desc:"Colonne couleur + QR", support:"Affiche" },
    { id:"affiche-ticket",  label:"Affiche ticket",      emoji:"🎟️", w:800, h:1131, plan:"business", cat:"Print", desc:"Style billet, perforations", support:"Affiche" },
  { id:"carte-table-event",   label:"Carte table event",  emoji:"📋", w:900,  h:506,  plan:"free",      cat:"Event",      desc:"Paysage, QR centré, filets" , support:"Carte de table"},
    { id:"carte-bloc",    label:"Carte bloc",        emoji:"🍽️", w:900, h:506, plan:"free",     cat:"Restaurant", desc:"Bloc de couleur + QR", support:"Carte de table" },
    { id:"carte-header",  label:"Carte header",      emoji:"🍽️", w:900, h:506, plan:"pro",      cat:"Restaurant", desc:"Bandeau couleur en haut", support:"Carte de table" },
    { id:"carte-pleine",  label:"Carte pleine",      emoji:"🍽️", w:900, h:506, plan:"pro",      cat:"Restaurant", desc:"Couleur pleine + monogramme", support:"Carte de table" },
    { id:"carte-duo",     label:"Carte duo",         emoji:"🍽️", w:900, h:506, plan:"free",     cat:"Restaurant", desc:"QR à gauche, texte à droite", support:"Carte de table" },
    { id:"bock-plein",    label:"Sous-bock plein",   emoji:"🍺", w:900, h:900, plan:"free",     cat:"Bar",        desc:"Rond, couleur pleine", support:"Sous-bock" },
    { id:"bock-cerne",    label:"Sous-bock cerné",   emoji:"🍺", w:900, h:900, plan:"free",     cat:"Bar",        desc:"Rond, double anneau doré", support:"Sous-bock" },
    { id:"bock-mono",     label:"Sous-bock mono",    emoji:"🍺", w:900, h:900, plan:"pro",      cat:"Bar",        desc:"Rond, monogramme", support:"Sous-bock" },
  { id:"badge-nominatif",     label:"Badge nominatif",    emoji:"🪪", w:680,  h:400,  plan:"free", cat:"Event",      desc:"Badge avec nom du participant" , support:"Badge"},

  // ---- Social ----
  { id:"story-insta",         label:"Story Instagram",    emoji:"📱", w:1080, h:1920, plan:"free",      cat:"Social",     desc:"9:16, QR centré, bandes translucides" , support:"Story"},
  { id:"post-insta",          label:"Post Instagram",     emoji:"🟧", w:1080, h:1080, plan:"free",     cat:"Social",     desc:"1:1, QR cadré" , support:"Post"},
  { id:"story-promo",         label:"Story promo",        emoji:"🔥", w:1080, h:1920, plan:"free",      cat:"Social",     desc:"9:16, gros header promo, QR bas" , support:"Story"},
  ]

  // -- Rendu d'un support sur canvas ----------------------------------------
  async function renderSupport(
    canvas: HTMLCanvasElement,
    tpl: SuppTpl,
    opts: { title: string; subtitle: string; qrDataUrl: string; logoUrl?: string; scale?: number; theme?: SuppTheme; phone?: string; website?: string; font?: string; titleColor?: string; subColor?: string; offX?: number; offY?: number; subFont?: string; tracking?: number; titleScale?: number; subScale?: number }
  ): Promise<void> {
    const sc  = opts.scale ?? 1
    const w   = Math.round(tpl.w * sc)
    const h   = Math.round(tpl.h * sc)
    canvas.width  = w
    canvas.height = h
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, w, h)

    // Theme : si defini (autre que auto), il pilote fond/texte/accent du support
    const th       = opts.theme && opts.theme.bg ? opts.theme : null
    const fgColor  = th ? th.accent : (fg || "#080808")
    const bgColor  = th ? th.bg     : (bg || "#FFFFFF")
    const isDark   = parseInt(bgColor.replace("#","").slice(0,2), 16) < 128
    const textCol  = th ? th.text   : (isDark ? "#F5F0E8" : "#1A1A1A")
    const accentCol= th ? th.accent : fgColor
    const gold     = "#C9A84C"

    const loadImg  = (src: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => {
        const i = new Image(); i.crossOrigin = "anonymous"
        i.onload = () => res(i); i.onerror = () => rej(); i.src = src
      })

    // Charger le QR
    const qrImg = await loadImg(opts.qrDataUrl).catch(() => null)

    // -- QR seul ------------------------------------------------------------
    if (tpl.id === "qr-only") {
      if (qrImg) ctx.drawImage(qrImg, 0, 0, w, h)
      return
    }

    // -- Fond commun --------------------------------------------------------
    if (tpl.id === "story" || tpl.id === "post") {
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, bgColor); grad.addColorStop(1, isDark ? "#0A0A0A" : "#E8E8E8")
      ctx.fillStyle = grad
    } else {
      ctx.fillStyle = bgColor
    }
    ctx.fillRect(0, 0, w, h)

    // -- Bande de couleur laterale (sauf social) ----------------------------
    if (!["story","post","qr-only"].includes(tpl.id)) {
      ctx.fillStyle = fgColor
      const bw = Math.round(w * 0.04)
      ctx.fillRect(0, 0, bw, h)
    }

    // -- Templates specifiques ---------------------------------------------
    const pad    = Math.round(w * 0.06)
    const bw     = Math.round(w * 0.04)  // largeur bande

    const offX = Math.round((opts.offX ?? 0) / 100 * w)
    const offY = Math.round((opts.offY ?? 0) / 100 * h)
    const titleFont = opts.font && opts.font.trim() ? opts.font : "Fraunces"
    const subFont   = opts.subFont && opts.subFont.trim() ? opts.subFont : "Arial"
    const trk       = Math.max(0, opts.tracking ?? 0)
    const tScale    = opts.titleScale ?? 1
    const sScale    = opts.subScale ?? 1
    const setTrk = (px: number) => { try { (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px` } catch { /* noop */ } }

    const drawQR = (x: number, y: number, size: number) => {
      if (!qrImg) return
      x += offX; y += offY
      // Fond blanc derriere le QR si fond sombre
      if (isDark) {
        ctx.fillStyle = "#FFFFFF"
        const margin = Math.round(size * 0.04)
        ctx.fillRect(x - margin, y - margin, size + margin*2, size + margin*2)
      }
      ctx.drawImage(qrImg, x, y, size, size)
    }

    const drawTitle = (text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "left", maxW?: number) => {
      if (!text) return
      const col = opts.titleColor && opts.titleColor.trim() ? opts.titleColor : color
      ctx.fillStyle = col; ctx.font = `700 ${size*tScale}px '${titleFont}', Georgia, 'Times New Roman', serif`; ctx.textAlign = align; setTrk(trk)
      ctx.fillText(text, x + offX, y + offY, maxW ?? w * 0.9)
      ctx.textAlign = "left"; setTrk(0)
    }

    const drawSub = (text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "left", maxW?: number) => {
      if (!text) return
      const col = (opts.subColor && opts.subColor.trim() && text === opts.subtitle) ? opts.subColor : color
      ctx.fillStyle = col; ctx.font = `400 ${size*sScale}px '${subFont}', Arial, sans-serif`; ctx.textAlign = align; setTrk(trk)
      ctx.fillText(text, x + offX, y + offY, maxW ?? w * 0.85)
      ctx.textAlign = "left"; setTrk(0)
    }

    const drawAccentLine = (x: number, y: number, lineW: number) => {
      ctx.fillStyle = accentCol
      ctx.fillRect(x + offX, y + offY, lineW, Math.max(3, Math.round(w * 0.005)))
    }

    // Ligne de contact (tel + site) : dessinee seulement si renseignee
    const contactStr = [opts.phone?.trim(), opts.website?.trim()].filter(Boolean).join("   ·   ")
    const drawContact = (x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center", maxW?: number) => {
      if (!contactStr) return
      ctx.fillStyle = color; ctx.font = `500 ${size}px 'Arial', sans-serif`; ctx.textAlign = align
      ctx.fillText(contactStr, x + offX, y + offY, maxW ?? w * 0.85)
      ctx.textAlign = "left"
    }

    // -- Helpers premium (variantes abouties) -------------------------------
    const shade = (hex: string, amt: number) => {
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex
      const n = parseInt(hex.slice(1), 16)
      const cl = (v: number) => Math.max(0, Math.min(255, v))
      const r = cl((n >> 16) + amt), g = cl(((n >> 8) & 255) + amt), b = cl((n & 255) + amt)
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
    }
    const isDarkHex = (hex: string) => /^#/.test(hex) && parseInt(hex.replace("#","").slice(0,2), 16) < 128
    const rr = (x: number, y: number, ww: number, hh: number, r: number) => {
      ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+ww,y,x+ww,y+hh,r); ctx.arcTo(x+ww,y+hh,x,y+hh,r)
      ctx.arcTo(x,y+hh,x,y,r); ctx.arcTo(x,y,x+ww,y,r); ctx.closePath()
    }
    const shadowOn = (blur: number, oy: number, col = "rgba(0,0,0,0.18)") => { ctx.shadowColor = col; ctx.shadowBlur = blur; ctx.shadowOffsetY = oy }
    const shadowOff = () => { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0 }
    const drawLabel = (text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center") => {
      if (!text) return
      ctx.fillStyle = color; ctx.font = `700 ${size}px 'Arial', sans-serif`; ctx.textAlign = align
      try { (ctx as unknown as { letterSpacing: string }).letterSpacing = `${Math.max(2, Math.round(size*0.32))}px` } catch { /* noop */ }
      ctx.fillText(text.toUpperCase(), x + offX, y + offY)
      try { (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px" } catch { /* noop */ }
      ctx.textAlign = "left"
    }
    // Titre qui retrecit pour tenir sur une ligne (pas de compression)
    const drawTitleFit = (text: string, x: number, y: number, maxSize: number, color: string, align: CanvasTextAlign = "center", maxW = w*0.85) => {
      if (!text) return
      const col = opts.titleColor && opts.titleColor.trim() ? opts.titleColor : color
      let s = maxSize*tScale; setTrk(trk); ctx.font = `700 ${s}px '${titleFont}', Georgia, serif`
      while (s > maxSize*tScale*0.55 && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = `700 ${s}px '${titleFont}', Georgia, serif` }
      ctx.fillStyle = col; ctx.textAlign = align; ctx.fillText(text, x + offX, y + offY); ctx.textAlign = "left"; setTrk(0)
    }
    // Titre multi-lignes, renvoie le Y de la derniere ligne
    const drawTitleWrap = (text: string, x: number, y: number, size: number, lineH: number, color: string, align: CanvasTextAlign, maxW: number) => {
      const col = opts.titleColor && opts.titleColor.trim() ? opts.titleColor : color
      ctx.fillStyle = col; ctx.font = `700 ${size*tScale}px '${titleFont}', Georgia, serif`; ctx.textAlign = align; setTrk(trk)
      const words = (text || "").split(" "); let line = "", yy = y; const lh = lineH*tScale
      for (const wd of words) { const t = line ? line+" "+wd : wd; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x + offX, yy + offY); line = wd; yy += lh } else line = t }
      if (line) ctx.fillText(line, x + offX, yy + offY)
      ctx.textAlign = "left"; setTrk(0); return yy
    }
    // Separateur ornemental : ligne - losange - ligne
    const drawOrn = (cx: number, y: number, half: number, color: string) => {
      ctx.fillStyle = color
      ctx.fillRect(cx - half + offX, y - 1.5 + offY, half - 18, 3)
      ctx.fillRect(cx + 18 + offX, y - 1.5 + offY, half - 18, 3)
      ctx.save(); ctx.translate(cx + offX, y + offY); ctx.rotate(Math.PI/4); ctx.fillRect(-6, -6, 12, 12); ctx.restore()
    }
    // QR dans une carte blanche arrondie avec ombre douce
    const drawQRFramed = (x: number, y: number, size: number) => {
      if (!qrImg) return
      x += offX; y += offY
      const m = Math.round(size * 0.06)
      ctx.fillStyle = "#FFFFFF"; shadowOn(28, 10, "rgba(0,0,0,0.22)")
      rr(x - m, y - m, size + m*2, size + m*2, 14); ctx.fill(); shadowOff()
      ctx.drawImage(qrImg, x, y, size, size)
    }

    // -- A4 Poster ----------------------------------------------------------
    if (tpl.id === "a4-poster") {
      const qrSize = Math.round(w * 0.52)
      const qrX    = bw + pad
      const qrY    = Math.round(h * 0.28)
      drawAccentLine(bw + pad, Math.round(h * 0.07), Math.round(w * 0.2))
      drawTitle(opts.title || active?.pages?.title || "", bw + pad, Math.round(h * 0.13), Math.round(w * 0.045), textCol, "left", w - bw - pad*2)
      drawSub(opts.subtitle, bw + pad, Math.round(h * 0.19), Math.round(w * 0.03), accentCol)
      drawQR(qrX + (w - bw - pad*2 - qrSize)/2, qrY, qrSize)
      drawContact(w/2, Math.round(h * 0.84), Math.round(w * 0.024), accentCol, "center")
      drawSub(qrUrl, w/2, Math.round(h * 0.89), Math.round(w * 0.022), isDark ? "rgba(245,240,232,0.5)" : "rgba(26,26,26,0.4)", "center")
      ctx.fillStyle = accentCol; ctx.fillRect(bw, h - Math.round(h*0.04), w - bw, Math.round(h*0.04))
    }

    // -- Flyer --------------------------------------------------------------
    else if (tpl.id === "flyer") {
      const qrSize = Math.round(h * 0.72)
      const qrX    = w - qrSize - pad
      const qrY    = Math.round((h - qrSize) / 2)
      const txtX   = bw + pad
      ctx.fillStyle = fgColor; ctx.fillRect(w - qrSize - pad*2, 0, Math.round(w * 0.004), h)
      drawTitle(opts.title || active?.pages?.title || "", txtX, Math.round(h * 0.32), Math.round(w * 0.038), textCol, "left", qrX - txtX - pad)
      drawAccentLine(txtX, Math.round(h * 0.37), Math.round(w * 0.15))
      drawSub(opts.subtitle, txtX, Math.round(h * 0.55), Math.round(w * 0.026), accentCol)
      drawContact(txtX, Math.round(h * 0.70), Math.round(w * 0.023), textCol, "left")
      drawQR(qrX, qrY, qrSize)
    }

    // -- Sticker ------------------------------------------------------------
    else if (tpl.id === "sticker") {
      const r = Math.round(w * 0.08)
      ctx.save(); ctx.beginPath()
      ctx.moveTo(r,0); ctx.lineTo(w-r,0); ctx.quadraticCurveTo(w,0,w,r)
      ctx.lineTo(w,h-r); ctx.quadraticCurveTo(w,h,w-r,h)
      ctx.lineTo(r,h); ctx.quadraticCurveTo(0,h,0,h-r)
      ctx.lineTo(0,r); ctx.quadraticCurveTo(0,0,r,0); ctx.closePath()
      ctx.clip()
      ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
      // Bordure accent
      ctx.strokeStyle = accentCol; ctx.lineWidth = Math.round(w * 0.025)
      ctx.beginPath()
      ctx.moveTo(r,0); ctx.lineTo(w-r,0); ctx.quadraticCurveTo(w,0,w,r)
      ctx.lineTo(w,h-r); ctx.quadraticCurveTo(w,h,w-r,h)
      ctx.lineTo(r,h); ctx.quadraticCurveTo(0,h,0,h-r)
      ctx.lineTo(0,r); ctx.quadraticCurveTo(0,0,r,0); ctx.closePath(); ctx.stroke()
      ctx.restore()
      const qrSize = Math.round(w * 0.62)
      drawQR((w - qrSize)/2, Math.round(h * 0.12), qrSize)
      drawSub(opts.subtitle, w/2, Math.round(h * 0.88), Math.round(w * 0.038), accentCol, "center")
    }

    // -- Carte de table -----------------------------------------------------
    else if (tpl.id === "table-card") {
      const qrSize = Math.round(h * 0.7)
      const qrY    = Math.round((h - qrSize) / 2)
      const qrX    = w - qrSize - pad
      ctx.fillStyle = fgColor
      ctx.fillRect(0, 0, w, Math.round(h * 0.08))
      ctx.fillRect(0, h - Math.round(h*0.08), w, Math.round(h * 0.08))
      const txtX   = bw + pad
      drawTitle(opts.title || active?.pages?.title || "", txtX, Math.round(h * 0.38), Math.round(h * 0.09), textCol, "left", qrX - txtX - pad)
      drawAccentLine(txtX, Math.round(h * 0.44), Math.round(w * 0.1))
      drawSub(opts.subtitle, txtX, Math.round(h * 0.6), Math.round(h * 0.065), accentCol)
      drawContact(txtX, Math.round(h * 0.76), Math.round(h * 0.05), textCol, "left")
      drawQR(qrX, qrY, qrSize)
    }

    // -- Menu QR ------------------------------------------------------------
    else if (tpl.id === "menu-qr") {
      const headerH = Math.round(h * 0.22)
      ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, headerH)
      const qrSize  = Math.round(w * 0.62)
      drawTitle(opts.title || active?.pages?.title || "Notre Menu", w/2, Math.round(headerH * 0.55), Math.round(w * 0.055), bgColor, "center", w * 0.85)
      drawSub(opts.subtitle, w/2, Math.round(headerH * 0.80), Math.round(w * 0.034), isDark ? "rgba(201,168,76,0.85)" : "rgba(255,255,255,0.75)", "center")
      drawQR((w - qrSize)/2, Math.round(h * 0.3), qrSize)
      drawContact(w/2, Math.round(h * 0.86), Math.round(w * 0.026), accentCol, "center")
      drawSub(qrUrl, w/2, Math.round(h * 0.93), Math.round(w * 0.027), isDark ? "rgba(245,240,232,0.4)" : "rgba(26,26,26,0.35)", "center")
      ctx.fillStyle = fgColor; ctx.fillRect(0, h - Math.round(h*0.035), w, Math.round(h*0.035))
    }

    // -- Carte de visite ----------------------------------------------------
    else if (tpl.id === "business") {
      const qrSize  = Math.round(h * 0.72)
      const qrX     = w - qrSize - pad
      const qrY     = Math.round((h - qrSize) / 2)
      ctx.fillStyle = fgColor; ctx.fillRect(0, 0, Math.round(w * 0.38), h)
      ctx.fillStyle = bgColor
      const lx = Math.round(w * 0.19); const ly = Math.round(h * 0.3)
      drawTitle(opts.title || active?.pages?.title || "", lx, ly, Math.round(h * 0.11), isDark?"#F5F0E8":"#FFFFFF", "center", Math.round(w * 0.32))
      ctx.fillStyle = isDark ? "rgba(201,168,76,0.8)" : "rgba(255,255,255,0.6)"
      ctx.fillRect(lx - Math.round(w * 0.05), ly + Math.round(h*0.04), Math.round(w * 0.14), Math.round(h*0.007))
      drawSub(opts.subtitle, lx, Math.round(h * 0.66), Math.round(h * 0.05), isDark?"rgba(201,168,76,0.9)":"rgba(255,255,255,0.85)", "center", Math.round(w * 0.30))
      drawContact(lx, Math.round(h * 0.80), Math.round(h * 0.036), isDark?"rgba(245,240,232,0.85)":"rgba(255,255,255,0.85)", "center", Math.round(w * 0.30))
      drawQR(qrX, qrY, qrSize)
    }

    // -- Badge evenement ----------------------------------------------------
    else if (tpl.id === "event-badge") {
      const qrSize  = Math.round(h * 0.68)
      const qrX     = Math.round(w * 0.52)
      const qrY     = Math.round((h - qrSize) / 2)
      ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, Math.round(h * 0.14))
      ctx.fillStyle = fgColor; ctx.fillRect(0, h - Math.round(h*0.14), w, Math.round(h*0.14))
      drawTitle(opts.title || active?.pages?.title || "", pad, Math.round(h * 0.44), Math.round(h * 0.1), textCol, "left", qrX - pad - Math.round(w*0.03))
      drawAccentLine(pad, Math.round(h * 0.51), Math.round(w * 0.12))
      drawSub(opts.subtitle, pad, Math.round(h * 0.68), Math.round(h * 0.075), accentCol)
      drawContact(pad, Math.round(h * 0.79), Math.round(h * 0.05), textCol, "left")
      drawQR(qrX, qrY, qrSize)
    }

    // -- Story Instagram ----------------------------------------------------
    else if (tpl.id === "story") {
      const qrSize  = Math.round(w * 0.55)
      const qrY     = Math.round(h * 0.35)
      ctx.fillStyle = fgColor + "22"
      ctx.fillRect(0, 0, w, Math.round(h * 0.28))
      ctx.fillRect(0, Math.round(h * 0.72), w, Math.round(h * 0.28))
      drawTitle(opts.title || active?.pages?.title || "", w/2, Math.round(h * 0.12), Math.round(w * 0.055), textCol, "center", w * 0.82)
      drawAccentLine(Math.round(w*0.3), Math.round(h * 0.16), Math.round(w * 0.4))
      drawSub(opts.subtitle, w/2, Math.round(h * 0.21), Math.round(w * 0.038), accentCol, "center")
      drawQR((w - qrSize)/2, qrY, qrSize)
      drawSub(qrUrl, w/2, Math.round(h * 0.82), Math.round(w * 0.028), isDark?"rgba(245,240,232,0.5)":"rgba(26,26,26,0.4)", "center")
      drawContact(w/2, Math.round(h * 0.92), Math.round(w * 0.026), textCol, "center")
      ctx.fillStyle = accentCol
      ctx.fillRect(Math.round(w*0.1), Math.round(h*0.87), Math.round(w*0.8), Math.round(h*0.005))
    }

    // -- Post Instagram -----------------------------------------------------
    else if (tpl.id === "post") {
      const qrSize  = Math.round(w * 0.52)
      ctx.fillStyle = fgColor + "18"; ctx.fillRect(0, 0, w, h)
      drawTitle(opts.title || active?.pages?.title || "", w/2, Math.round(h * 0.14), Math.round(w * 0.052), textCol, "center", w * 0.82)
      drawAccentLine(Math.round(w*0.35), Math.round(h * 0.18), Math.round(w * 0.3))
      drawSub(opts.subtitle, w/2, Math.round(h * 0.24), Math.round(w * 0.036), accentCol, "center")
      drawQR((w - qrSize)/2, Math.round(h * 0.31), qrSize)
      drawSub(qrUrl, w/2, Math.round(h * 0.91), Math.round(w * 0.026), isDark?"rgba(245,240,232,0.4)":"rgba(26,26,26,0.35)", "center")
      ctx.strokeStyle = accentCol + "40"; ctx.lineWidth = Math.round(w * 0.018)
      ctx.strokeRect(Math.round(w*0.009), Math.round(h*0.009), w - Math.round(w*0.018), h - Math.round(h*0.018))
    }

  // ===== Print =====
  else if (tpl.id === "affiche-minimal") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    drawTitle(opts.title || active?.pages?.title || "", w/2, Math.round(h*0.16), Math.round(w*0.06), textCol, "center", w*0.82)
    drawAccentLine(Math.round(w*0.38), Math.round(h*0.21), Math.round(w*0.24))
    drawSub(opts.subtitle, w/2, Math.round(h*0.27), Math.round(w*0.032), accentCol, "center")
    const s = Math.round(w*0.52)
    drawQR((w-s)/2, Math.round(h*0.38), s)
    drawSub("Scannez-moi", w/2, Math.round(h*0.38)+s+Math.round(h*0.035), Math.round(w*0.026), textCol, "center")
    drawContact(w/2, Math.round(h*0.9), Math.round(w*0.024), textCol, "center")
  }
  else if (tpl.id === "affiche-premium") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = gold; ctx.fillRect(0, 0, w, Math.round(h*0.014))
    ctx.fillStyle = gold; ctx.fillRect(0, h-Math.round(h*0.014), w, Math.round(h*0.014))
    drawTitle(opts.title || active?.pages?.title || "", w/2, Math.round(h*0.15), Math.round(w*0.062), gold, "center", w*0.82)
    drawAccentLine(Math.round(w*0.4), Math.round(h*0.2), Math.round(w*0.2))
    drawSub(opts.subtitle, w/2, Math.round(h*0.25), Math.round(w*0.032), textCol, "center")
    const s = Math.round(w*0.5)
    drawQR((w-s)/2, Math.round(h*0.34), s)
    drawContact(w/2, Math.round(h*0.88), Math.round(w*0.024), textCol, "center")
    drawSub(qrUrl, w/2, Math.round(h*0.93), Math.round(w*0.022), isDark?"rgba(245,240,232,0.45)":"rgba(26,26,26,0.4)", "center")
  }
  else if (tpl.id === "flyer-paysage") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = fgColor; ctx.fillRect(0, 0, Math.round(w*0.42), h)
    const txtX = Math.round(w*0.06)
    drawTitle(opts.title || active?.pages?.title || "", txtX, Math.round(h*0.3), Math.round(w*0.045), bgColor, "left", w*0.32)
    drawAccentLine(txtX, Math.round(h*0.42), Math.round(w*0.18))
    drawSub(opts.subtitle, txtX, Math.round(h*0.52), Math.round(w*0.026), bgColor, "left")
    drawContact(txtX, Math.round(h*0.82), Math.round(w*0.02), bgColor, "left")
    const s = Math.round(h*0.62)
    drawQR(Math.round(w*0.42)+Math.round((w*0.58-s)/2), Math.round((h-s)/2), s)
  }

  // ===== Restaurant =====
  else if (tpl.id === "menu-resto-portrait") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, Math.round(h*0.18))
    drawTitle(opts.title || active?.pages?.title || "Notre Menu", w/2, Math.round(h*0.1), Math.round(w*0.07), bgColor, "center", w*0.85)
    drawSub(opts.subtitle, w/2, Math.round(h*0.26), Math.round(w*0.04), accentCol, "center")
    const s = Math.round(w*0.62)
    drawQR((w-s)/2, Math.round(h*0.36), s)
    drawSub("Scannez pour voir la carte", w/2, Math.round(h*0.36)+s+Math.round(h*0.04), Math.round(w*0.032), textCol, "center")
    drawContact(w/2, Math.round(h*0.92), Math.round(w*0.03), textCol, "center")
  }
  else if (tpl.id === "carte-table-resto") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    const s = Math.round(h*0.66)
    drawQR(Math.round(w*0.08), Math.round((h-s)/2), s)
    const tx = Math.round(w*0.08)+s+Math.round(w*0.06)
    drawTitle(opts.title || active?.pages?.title || "Commandez ici", tx, Math.round(h*0.34), Math.round(w*0.05), textCol, "left", w*0.42)
    drawAccentLine(tx, Math.round(h*0.46), Math.round(w*0.18))
    drawSub(opts.subtitle, tx, Math.round(h*0.58), Math.round(w*0.028), accentCol, "left")
    drawContact(tx, Math.round(h*0.8), Math.round(w*0.022), textCol, "left")
  }
  else if (tpl.id === "sticker-avis") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    drawTitle(opts.title || "Votre avis compte", w/2, Math.round(h*0.16), Math.round(w*0.07), textCol, "center", w*0.85)
    drawAccentLine(Math.round(w*0.38), Math.round(h*0.22), Math.round(w*0.24))
    const s = Math.round(w*0.5)
    drawQR((w-s)/2, Math.round(h*0.3), s)
    drawSub(opts.subtitle || "Scannez & laissez un avis", w/2, Math.round(h*0.3)+s+Math.round(h*0.05), Math.round(w*0.04), accentCol, "center")
    drawContact(w/2, Math.round(h*0.92), Math.round(w*0.03), textCol, "center")
  }

  // ===== Business =====
  else if (tpl.id === "carte-visite-classic") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = fgColor; ctx.fillRect(0, 0, Math.round(w*0.5), h)
    const lx = Math.round(w*0.06)
    drawTitle(opts.title || active?.pages?.title || "", lx, Math.round(h*0.3), Math.round(w*0.05), bgColor, "left", w*0.38)
    drawAccentLine(lx, Math.round(h*0.42), Math.round(w*0.14))
    drawSub(opts.subtitle, lx, Math.round(h*0.52), Math.round(w*0.026), bgColor, "left")
    drawContact(lx, Math.round(h*0.82), Math.round(w*0.022), bgColor, "left")
    const s = Math.round(h*0.6)
    drawQR(Math.round(w*0.5)+Math.round((w*0.5-s)/2), Math.round((h-s)/2), s)
  }
  else if (tpl.id === "carte-visite-dark") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = gold; ctx.lineWidth = Math.max(2, Math.round(w*0.006))
    ctx.strokeRect(Math.round(w*0.03), Math.round(h*0.05), w-Math.round(w*0.06), h-Math.round(h*0.1))
    const lx = Math.round(w*0.08)
    drawTitle(opts.title || active?.pages?.title || "", lx, Math.round(h*0.32), Math.round(w*0.052), gold, "left", w*0.46)
    drawAccentLine(lx, Math.round(h*0.44), Math.round(w*0.16))
    drawSub(opts.subtitle, lx, Math.round(h*0.55), Math.round(w*0.026), textCol, "left")
    drawContact(lx, Math.round(h*0.8), Math.round(w*0.022), textCol, "left")
    const s = Math.round(h*0.58)
    drawQR(w-s-Math.round(w*0.1), Math.round((h-s)/2), s)
  }

  // ===== Event =====
  else if (tpl.id === "badge-event-pro") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, Math.round(h*0.22))
    drawTitle(opts.title || active?.pages?.title || "BADGE", w/2, Math.round(h*0.13), Math.round(w*0.05), bgColor, "center", w*0.85)
    drawSub(opts.subtitle, Math.round(w*0.08), Math.round(h*0.42), Math.round(w*0.04), textCol, "left")
    drawContact(Math.round(w*0.08), Math.round(h*0.78), Math.round(w*0.028), accentCol, "left")
    const s = Math.round(h*0.5)
    drawQR(w-s-Math.round(w*0.08), Math.round(h*0.32), s)
  }
  else if (tpl.id === "affiche-event") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, Math.round(h*0.32))
    drawTitle(opts.title || active?.pages?.title || "ÉVÉNEMENT", w/2, Math.round(h*0.15), Math.round(w*0.075), bgColor, "center", w*0.88)
    drawSub(opts.subtitle, w/2, Math.round(h*0.25), Math.round(w*0.036), bgColor, "center")
    const s = Math.round(w*0.5)
    drawQR((w-s)/2, Math.round(h*0.42), s)
    drawSub("Scannez pour participer", w/2, Math.round(h*0.42)+s+Math.round(h*0.035), Math.round(w*0.03), accentCol, "center")
    drawContact(w/2, Math.round(h*0.9), Math.round(w*0.024), textCol, "center")
  }
  else if (tpl.id === "carte-table-event") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, Math.round(h*0.04))
    ctx.fillStyle = fgColor; ctx.fillRect(0, h-Math.round(h*0.04), w, Math.round(h*0.04))
    drawTitle(opts.title || active?.pages?.title || "Bienvenue", w/2, Math.round(h*0.2), Math.round(w*0.045), textCol, "center", w*0.8)
    const s = Math.round(h*0.42)
    drawQR((w-s)/2, Math.round(h*0.3), s)
    drawSub(opts.subtitle || "Scannez pour le programme", w/2, Math.round(h*0.3)+s+Math.round(h*0.06), Math.round(w*0.026), accentCol, "center")
    drawContact(w/2, Math.round(h*0.9), Math.round(w*0.02), textCol, "center")
  }
  else if (tpl.id === "badge-nominatif") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = fgColor; ctx.fillRect(0, 0, Math.round(w*0.04), h)
    const lx = Math.round(w*0.1)
    drawSub(opts.subtitle || "PARTICIPANT", lx, Math.round(h*0.2), Math.round(w*0.026), accentCol, "left")
    drawTitle(opts.title || active?.pages?.title || "Nom Prénom", lx, Math.round(h*0.42), Math.round(w*0.055), textCol, "left", w*0.55)
    drawAccentLine(lx, Math.round(h*0.54), Math.round(w*0.2))
    drawContact(lx, Math.round(h*0.82), Math.round(w*0.024), textCol, "left")
    const s = Math.round(h*0.5)
    drawQR(w-s-Math.round(w*0.08), Math.round((h-s)/2), s)
  }

  // ===== Social =====
  else if (tpl.id === "story-insta") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = fgColor + "22"; ctx.fillRect(0, Math.round(h*0.12), w, Math.round(h*0.1))
    drawTitle(opts.title || active?.pages?.title || "", w/2, Math.round(h*0.18), Math.round(w*0.07), textCol, "center", w*0.85)
    drawSub(opts.subtitle, w/2, Math.round(h*0.28), Math.round(w*0.034), accentCol, "center")
    const s = Math.round(w*0.62)
    drawQR((w-s)/2, Math.round(h*0.4), s)
    drawSub("Scannez l'écran", w/2, Math.round(h*0.4)+s+Math.round(h*0.035), Math.round(w*0.03), textCol, "center")
    drawContact(w/2, Math.round(h*0.82), Math.round(w*0.026), textCol, "center")
  }
  else if (tpl.id === "post-insta") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = accentCol; ctx.lineWidth = Math.max(2, Math.round(w*0.008))
    ctx.strokeRect(Math.round(w*0.06), Math.round(h*0.06), w-Math.round(w*0.12), h-Math.round(h*0.12))
    drawTitle(opts.title || active?.pages?.title || "", w/2, Math.round(h*0.2), Math.round(w*0.06), textCol, "center", w*0.8)
    const s = Math.round(w*0.46)
    drawQR((w-s)/2, Math.round(h*0.32), s)
    drawSub(opts.subtitle || "Scannez-moi", w/2, Math.round(h*0.32)+s+Math.round(h*0.05), Math.round(w*0.032), accentCol, "center")
    drawContact(w/2, Math.round(h*0.86), Math.round(w*0.024), textCol, "center")
  }
  else if (tpl.id === "story-promo") {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, Math.round(h*0.45))
    drawTitle(opts.title || active?.pages?.title || "PROMO", w/2, Math.round(h*0.2), Math.round(w*0.09), bgColor, "center", w*0.85)
    drawSub(opts.subtitle, w/2, Math.round(h*0.32), Math.round(w*0.038), bgColor, "center")
    const s = Math.round(w*0.55)
    drawQR((w-s)/2, Math.round(h*0.56), s)
    drawSub("Scannez pour en profiter", w/2, Math.round(h*0.56)+s+Math.round(h*0.04), Math.round(w*0.032), textCol, "center")
    drawContact(w/2, Math.round(h*0.9), Math.round(w*0.026), textCol, "center")
  }

  // ===== Affiches abouties =====
  else if (tpl.id === "affiche-centre") {
    const k = w/800, T = opts.title || active?.pages?.title || ""
    ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
    drawLabel("Établissement", w/2, 150*k, 16*k, accentCol)
    drawTitleFit(T, w/2, 250*k, 82*k, textCol, "center", w*0.86)
    drawOrn(w/2, 300*k, 90*k, accentCol)
    drawSub(opts.subtitle, w/2, 360*k, 27*k, isDark?"rgba(245,240,232,0.8)":"rgba(42,36,25,0.75)", "center", w*0.78)
    const s = 400*k, x = (w-s)/2, y = 440*k, p = 42*k
    ctx.fillStyle = isDark?"rgba(255,255,255,0.05)":"#FFFFFF"; shadowOn(40*k,16*k, isDark?"rgba(0,0,0,0.45)":"rgba(0,0,0,0.12)")
    rr(x-p, y-p, s+p*2, s+p*2, 22*k); ctx.fill(); shadowOff()
    ctx.strokeStyle = accentCol; ctx.lineWidth = 1; rr(x-p+10*k, y-p+10*k, s+p*2-20*k, s+p*2-20*k, 16*k); ctx.stroke()
    drawQR(x, y, s)
    drawLabel("Scannez pour découvrir", w/2, y+s+p+58*k, 15*k, accentCol)
    ctx.fillStyle = isDark?"rgba(245,240,232,0.18)":"rgba(42,36,25,0.15)"; ctx.fillRect(w/2-120*k, h-130*k, 240*k, 1)
    drawContact(w/2, h-90*k, 21*k, isDark?"rgba(245,240,232,0.6)":"rgba(42,36,25,0.6)", "center")
  }
  else if (tpl.id === "affiche-bandeau") {
    const k = w/800, T = opts.title || active?.pages?.title || ""
    ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
    drawLabel("Bienvenue", w/2, 120*k, 15*k, accentCol)
    drawTitleFit(T, w/2, 200*k, 66*k, textCol, "center", w*0.86)
    drawOrn(w/2, 250*k, 80*k, accentCol)
    const s = 400*k; drawQRFramed((w-s)/2, 300*k, s)
    const by = Math.round(h*0.72)
    const g = ctx.createLinearGradient(0,by,0,h); g.addColorStop(0, accentCol); g.addColorStop(1, shade(accentCol,-18))
    ctx.fillStyle = g; ctx.fillRect(0, by, w, h-by)
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(0, by, w, 2)
    const on = isDarkHex(accentCol) ? "#FFFFFF" : "#0A0A0A"
    drawSub(opts.subtitle, w/2, by+85*k, 30*k, on, "center", w*0.82)
    drawLabel("Scannez le code ci-dessus", w/2, by+135*k, 13*k, on)
    drawContact(w/2, h-65*k, 21*k, on, "center")
  }
  else if (tpl.id === "affiche-cadre") {
    const k = w/800, T = opts.title || active?.pages?.title || ""
    ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
    ctx.strokeStyle = accentCol; ctx.lineWidth = 2.5*k; ctx.strokeRect(42*k,42*k,w-84*k,h-84*k)
    ctx.lineWidth = 1; ctx.strokeRect(56*k,56*k,w-112*k,h-112*k)
    ;[[56*k,56*k],[w-56*k,56*k],[56*k,h-56*k],[w-56*k,h-56*k]].forEach(([cx,cy]) => { ctx.fillStyle = accentCol; ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.PI/4); ctx.fillRect(-7*k,-7*k,14*k,14*k); ctx.restore() })
    drawLabel("Établissement", w/2, 160*k, 15*k, accentCol)
    drawTitleFit(T, w/2, 250*k, 80*k, textCol, "center", w*0.74)
    drawOrn(w/2, 300*k, 80*k, accentCol)
    drawSub(opts.subtitle, w/2, 358*k, 25*k, isDark?"rgba(245,240,232,0.8)":"rgba(42,36,25,0.72)", "center", w*0.7)
    const s = 380*k; drawQRFramed((w-s)/2, 430*k, s)
    drawLabel("Scannez-moi", w/2, 430*k+s+70*k, 15*k, textCol)
    ctx.fillStyle = isDark?"rgba(245,240,232,0.18)":"rgba(42,36,25,0.15)"; ctx.fillRect(w/2-110*k, h-145*k, 220*k, 1)
    drawContact(w/2, h-110*k, 20*k, isDark?"rgba(245,240,232,0.6)":"rgba(42,36,25,0.6)", "center")
  }
  else if (tpl.id === "affiche-split") {
    const k = w/800, T = opts.title || active?.pages?.title || ""
    ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
    const cw = w*0.46
    const g = ctx.createLinearGradient(0,0,0,h); g.addColorStop(0, accentCol); g.addColorStop(1, shade(accentCol,-16))
    ctx.fillStyle = g; ctx.fillRect(0,0,cw,h)
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(cw-1, 0, 2, h)
    const on = isDarkHex(accentCol) ? "#FFFFFF" : "#0A0A0A"
    drawLabel("Établissement", 54*k, 150*k, 14*k, on, "left")
    const tb = drawTitleWrap(T, 54*k, 240*k, 56*k, 56*k, on, "left", cw-100*k)
    ctx.fillStyle = on; ctx.fillRect(54*k, tb+34*k, 80*k, 3)
    drawSub(opts.subtitle, 54*k, tb+90*k, 22*k, on, "left", cw-100*k)
    ctx.fillStyle = isDarkHex(accentCol)?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.25)"; ctx.fillRect(54*k, h-130*k, cw-108*k, 1)
    drawContact(54*k, h-95*k, 17*k, on, "left", cw-90*k)
    const s = Math.min((w-cw)*0.78, 360*k), x = cw + ((w-cw)-s)/2, y = (h-s)/2 - 20*k
    drawQRFramed(x, y, s)
    drawLabel("Scannez-moi", cw+(w-cw)/2, y+s+70*k, 14*k, textCol)
  }
  else if (tpl.id === "affiche-ticket") {
    const k = w/800, T = opts.title || active?.pages?.title || ""
    ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
    const cx = 86*k, cw = w-172*k, cy = 120*k, ch = h-240*k
    ctx.fillStyle = isDark?"#15140F":"#FFFFFF"; shadowOn(45*k,18*k, isDark?"rgba(0,0,0,0.5)":"rgba(0,0,0,0.14)")
    rr(cx, cy, cw, ch, 24*k); ctx.fill(); shadowOff()
    ctx.strokeStyle = accentCol; ctx.lineWidth = 1.5; rr(cx+8*k, cy+8*k, cw-16*k, ch-16*k, 18*k); ctx.stroke()
    const onC = isDark ? "#F5F0E8" : "#1A1A1A"
    drawLabel("Invitation", w/2, cy+72*k, 15*k, accentCol)
    drawTitleFit(T, w/2, cy+158*k, 66*k, onC, "center", cw-90*k)
    drawSub(opts.subtitle, w/2, cy+212*k, 23*k, isDark?"rgba(245,240,232,0.75)":"rgba(42,36,25,0.7)", "center", cw-90*k)
    const sy = cy+268*k; ctx.strokeStyle = accentCol; ctx.setLineDash([9*k,8*k]); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cx+34*k, sy); ctx.lineTo(cx+cw-34*k, sy); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle = bgColor; ctx.beginPath(); ctx.arc(cx, sy, 17*k, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx+cw, sy, 17*k, 0, 7); ctx.fill()
    const s = 300*k; drawQRFramed((w-s)/2, sy+48*k, s)
    drawLabel("Scannez pour réserver", w/2, sy+48*k+s+52*k, 14*k, accentCol)
    drawContact(w/2, h-78*k, 19*k, isDark?"rgba(245,240,232,0.6)":"rgba(42,36,25,0.6)", "center")
  }

  // ===== Cartes de table (v2, contraste fort) =====
  else if (tpl.id === "carte-bloc") {
    const k = w/900, T = opts.title || active?.pages?.title || "", pw = w*0.54
    ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
    const g = ctx.createLinearGradient(0,0,pw,h); g.addColorStop(0, shade(accentCol,12)); g.addColorStop(1, shade(accentCol,-22))
    ctx.fillStyle = g; ctx.fillRect(0,0,pw,h)
    const on = isDarkHex(accentCol) ? "#FFFFFF" : "#1A1209"
    drawLabel("Établissement", 56*k, 96*k, 15*k, on, "left")
    drawTitleFit(T, 56*k, 176*k, 58*k, on, "left", pw-100*k)
    ctx.fillStyle = on; ctx.fillRect(56*k, 206*k, 72*k, Math.max(2,Math.round(3*k)))
    drawSub(opts.subtitle, 56*k, 254*k, 23*k, on, "left", pw-100*k)
    drawContact(56*k, h-56*k, 17*k, on, "left", pw-90*k)
    const s = 300*k; drawQRFramed(pw + ((w-pw)-s)/2, (h-s)/2, s)
  }
  else if (tpl.id === "carte-header") {
    const k = w/900, T = opts.title || active?.pages?.title || "", bh = h*0.40
    ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
    const g = ctx.createLinearGradient(0,0,w,0); g.addColorStop(0, accentCol); g.addColorStop(1, shade(accentCol,-20))
    ctx.fillStyle = g; ctx.fillRect(0,0,w,bh)
    const on = isDarkHex(accentCol) ? "#FFFFFF" : "#1A1209"
    drawLabel("Bienvenue", 56*k, 70*k, 13*k, on, "left")
    drawTitleFit(T, 56*k, 140*k, 52*k, on, "left", w-120*k)
    const txt = isDark?"#F5F0E8":"#2A2419", soft = isDark?"rgba(245,240,232,0.7)":"rgba(42,36,25,0.65)"
    const qs = 210*k, qx = 64*k, qy = bh+30*k; drawQRFramed(qx, qy, qs)
    const tx = qx+qs+46*k
    drawSub(opts.subtitle, tx, bh+90*k, 24*k, txt, "left", w-tx-60*k)
    ctx.fillStyle = accentCol; ctx.fillRect(tx, bh+112*k, 60*k, Math.max(2,Math.round(3*k)))
    drawContact(tx, bh+170*k, 18*k, soft, "left", w-tx-60*k)
  }
  else if (tpl.id === "carte-pleine") {
    const k = w/900, T = opts.title || active?.pages?.title || ""
    const base = isDark ? bgColor : textCol, on = isDark ? textCol : bgColor
    const ini = ((T || "A").trim()[0] || "A").toUpperCase()
    ctx.fillStyle = base; ctx.fillRect(0,0,w,h)
    ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = on; ctx.font = `700 ${520*k}px '${titleFont}', serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ini, w*0.30, h*0.52); ctx.restore(); ctx.textBaseline = "alphabetic"
    drawLabel("La Carte", 60*k, 108*k, 14*k, accentCol, "left")
    drawTitleFit(T, 60*k, 182*k, 56*k, on, "left", w*0.56)
    ctx.fillStyle = accentCol; ctx.fillRect(60*k, 212*k, 72*k, Math.max(2,Math.round(3*k)))
    drawSub(opts.subtitle, 60*k, 262*k, 23*k, on, "left", w*0.52)
    drawContact(60*k, h-56*k, 17*k, accentCol, "left", w*0.52)
    const s = 300*k; drawQRFramed(w-s-70*k, (h-s)/2, s)
  }
  else if (tpl.id === "carte-duo") {
    const k = w/900, T = opts.title || active?.pages?.title || ""
    const txt = isDark?"#F5F0E8":"#2A2419", soft = isDark?"rgba(245,240,232,0.7)":"rgba(42,36,25,0.62)"
    const ini = ((T || "A").trim()[0] || "A").toUpperCase()
    ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
    ctx.fillStyle = accentCol; ctx.fillRect(0,0,14*k,h)
    const qs = 346*k, qx = 70*k, qy = (h-qs)/2; drawQRFramed(qx, qy, qs)
    const x0 = qx+qs+60*k, mw = w-x0-60*k
    ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = accentCol; ctx.font = `700 ${360*k}px '${titleFont}', serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ini, x0+mw*0.6, h*0.5); ctx.restore(); ctx.textBaseline = "alphabetic"
    drawLabel("Établissement", x0, 112*k, 15*k, accentCol, "left")
    drawTitleFit(T, x0, 180*k, 54*k, txt, "left", mw)
    ctx.fillStyle = accentCol; ctx.fillRect(x0, 210*k, 72*k, Math.max(2,Math.round(3*k)))
    drawSub(opts.subtitle, x0, 258*k, 23*k, txt, "left", mw)
    drawContact(x0, h-58*k, 17*k, soft, "left", mw)
  }
  // ===== Sous-bocks (ronds) =====
  else if (tpl.id === "bock-plein") {
    const k = w/900, T = opts.title || active?.pages?.title || "", R = 430*k
    ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
    ctx.save(); ctx.beginPath(); ctx.arc(w/2,h/2,R,0,Math.PI*2); ctx.clip()
    const base = isDark ? bgColor : textCol, on = isDark ? textCol : bgColor
    ctx.fillStyle = base; ctx.fillRect(0,0,w,h)
    drawLabel("La Carte des bières", w/2, 180*k, 18*k, accentCol, "center")
    drawTitleFit(T, w/2, 255*k, 52*k, on, "center", R*1.5)
    const qs = 300*k; drawQRFramed(w/2-qs/2, h/2-qs/2+30*k, qs)
    drawSub(opts.subtitle, w/2, h/2+qs/2+90*k, 22*k, on, "center", R*1.5)
    ctx.restore()
    ctx.strokeStyle = accentCol; ctx.lineWidth = 6*k; ctx.beginPath(); ctx.arc(w/2,h/2,R-3*k,0,Math.PI*2); ctx.stroke()
  }
  else if (tpl.id === "bock-cerne") {
    const k = w/900, T = opts.title || active?.pages?.title || "", R = 430*k
    ctx.fillStyle = isDark?"#0A0A0A":"#FFFFFF"; ctx.fillRect(0,0,w,h)
    ctx.save(); ctx.beginPath(); ctx.arc(w/2,h/2,R,0,Math.PI*2); ctx.clip(); ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h); ctx.restore()
    ctx.strokeStyle = accentCol; ctx.lineWidth = 8*k; ctx.beginPath(); ctx.arc(w/2,h/2,R-6*k,0,Math.PI*2); ctx.stroke()
    ctx.lineWidth = 2*k; ctx.beginPath(); ctx.arc(w/2,h/2,R-26*k,0,Math.PI*2); ctx.stroke()
    const txt = isDark?"#F5F0E8":"#2A2419"
    drawLabel("Bières & Cocktails", w/2, 210*k, 17*k, accentCol, "center")
    drawTitleFit(T, w/2, 285*k, 50*k, txt, "center", R*1.4)
    const qs = 300*k; drawQRFramed(w/2-qs/2, h/2-qs/2+40*k, qs)
    drawSub(opts.subtitle, w/2, h/2+qs/2+100*k, 21*k, txt, "center", R*1.4)
  }
  else if (tpl.id === "bock-mono") {
    const k = w/900, T = opts.title || active?.pages?.title || "", R = 430*k
    const ini = ((T || "A").trim()[0] || "A").toUpperCase()
    ctx.fillStyle = isDark?"#0A0A0A":"#FFFFFF"; ctx.fillRect(0,0,w,h)
    ctx.save(); ctx.beginPath(); ctx.arc(w/2,h/2,R,0,Math.PI*2); ctx.clip()
    const base = isDark ? bgColor : textCol, on = isDark ? textCol : bgColor
    ctx.fillStyle = base; ctx.fillRect(0,0,w,h); ctx.restore()
    ctx.strokeStyle = accentCol; ctx.lineWidth = 6*k; ctx.beginPath(); ctx.arc(w/2,h/2,R-4*k,0,Math.PI*2); ctx.stroke()
    ctx.lineWidth = 3*k; ctx.beginPath(); ctx.arc(w/2,205*k,54*k,0,Math.PI*2); ctx.stroke()
    const onTxt = isDark ? textCol : bgColor
    ctx.fillStyle = onTxt; ctx.font = `700 ${62*k}px '${titleFont}', serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ini, w/2, 208*k); ctx.textBaseline = "alphabetic"; ctx.textAlign = "left"
    drawTitleFit(T, w/2, 330*k, 40*k, onTxt, "center", R*1.3)
    const qs = 270*k; drawQRFramed(w/2-qs/2, h/2-qs/2+70*k, qs)
    drawLabel("Scannez la carte", w/2, h/2+qs/2+120*k, 14*k, accentCol, "center")
  }

  }

  // -- Ouvrir le Print Studio (GUIDÉ, gratuit) — entrée unique, pré-chargé avec ce QR ---------------
  // Convergence : l'ancien éditeur libre Fabric est remplacé par le nouveau Print Studio guidé
  // (cf. docs/PRINT-STUDIO-CONVERGENCE.md). On passe le short_code pour présélectionner le QR.
  const openEditor = () => {
    if (!active) return
    window.location.href = `/dashboard/print-studio?qr=${active.short_code}`
  }

  // -- Generer preview support -----------------------------------------------
  const previewSupport = useCallback(async () => {
    const canvas = supportCanvasRef.current; if (!canvas) return
    const tpl    = SUPP_TPLS.find(t => t.id === suppTplId)
    if (!tpl) return
    try {
      // Generer le QR a la bonne taille via qr-code-styling (logo inclus)
      const qrPx    = Math.min(tpl.w, tpl.h)
      const qrBlob  = await getQRBlob({ data: qrUrl, fg, bg, ecc: effectiveEcc, style: renderStyle, size: qrPx }, "png")
      if (!qrBlob) throw new Error("qr gen failed")
      const qrDataUrl = await blobToDataUrl(qrBlob)
      // Charger les polices choisies avant de dessiner (sinon rendu en police de secours)
      try { const d = (document as Document & { fonts?: { load: (f: string) => Promise<unknown> } }); if (d.fonts) { await Promise.all([d.fonts.load(`700 32px '${suppFont}'`), d.fonts.load(`400 24px '${suppSubFont}'`)]) } } catch { /* noop */ }
      // Scale pour la preview (max 300px de large)
      // Rendre l'apercu en HAUTE resolution (net), le CSS le reduit a la colonne
      const previewScale = Math.min(2.5, 760 / tpl.w)
      await renderSupport(canvas, tpl, { title:suppTitle, subtitle:suppSubtitle, qrDataUrl, logoUrl:styleConf.logoUrl, scale:previewScale, theme:SUPP_THEMES.find(t=>t.id===suppTheme), phone:suppPhone, website:suppWebsite, font:suppFont, titleColor:suppTitleColor, subColor:suppSubColor, offX:suppOffX, offY:suppOffY, subFont:suppSubFont, tracking:suppTracking, titleScale:suppTitleSize, subScale:suppSubSize })
      setSuppRendered(true)
    } catch { setSuppRendered(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppTplId, qrUrl, fg, bg, ecLevel, styleConf, suppTitle, suppSubtitle, suppTheme, suppPhone, suppWebsite, suppFont, suppTitleColor, suppSubColor, suppOffX, suppOffY, suppSubFont, suppTracking, suppTitleSize, suppSubSize])

  // Charger des polices Google pour les imprimables (titre + sous-titre)
  useEffect(() => {
    const id = "qrfolio-print-fonts"
    if (typeof document === "undefined" || document.getElementById(id)) return
    const link = document.createElement("link")
    link.id = id; link.rel = "stylesheet"
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Cormorant+Garamond:wght@500;700&family=Lora:wght@400;700&family=Merriweather:wght@400;700&family=Poppins:wght@400;600&family=Montserrat:wght@400;700&family=Raleway:wght@400;600&family=Oswald:wght@400;600&family=Bebas+Neue&family=Abril+Fatface&family=Dancing+Script:wght@700&family=Pacifico&display=swap"
    document.head.appendChild(link)
  }, [])

  // Preview LIVE : regenere automatiquement quand un parametre change (debounce)
  useEffect(() => {
    if (activeTab !== "supports" || !active) return
    const t = setTimeout(() => { previewSupport() }, 250)
    return () => clearTimeout(t)
  }, [activeTab, active, previewSupport])

  // -- Export support --------------------------------------------------------
  async function exportSupport(fmt: "png"|"pdf") {
    const tpl = SUPP_TPLS.find(t => t.id === suppTplId); if (!tpl) return
    setSuppExporting(true)
    try {
      const qrPx    = Math.min(tpl.w, tpl.h) * 2
      const qrBlob  = await getQRBlob({ data: qrUrl, fg, bg, ecc: effectiveEcc, style: renderStyle, size: qrPx }, "png")
      if (!qrBlob) throw new Error("qr gen failed")
      const qrDataUrl = await blobToDataUrl(qrBlob)
      try { const d = (document as Document & { fonts?: { load: (f: string) => Promise<unknown> } }); if (d.fonts) { await Promise.all([d.fonts.load(`700 32px '${suppFont}'`), d.fonts.load(`400 24px '${suppSubFont}'`)]) } } catch { /* noop */ }
      const outCanvas = document.createElement("canvas")
      await renderSupport(outCanvas, tpl, { title:suppTitle, subtitle:suppSubtitle, qrDataUrl, scale:2, theme:SUPP_THEMES.find(t=>t.id===suppTheme), phone:suppPhone, website:suppWebsite, font:suppFont, titleColor:suppTitleColor, subColor:suppSubColor, offX:suppOffX, offY:suppOffY, subFont:suppSubFont, tracking:suppTracking, titleScale:suppTitleSize, subScale:suppSubSize })
      const filename  = `${(tpl.label).replace(/\s+/g,"-").toLowerCase()}-${active?.short_code ?? "qr"}.${fmt}`
      if (fmt === "pdf") {
        // Vrai PDF via jsPDF, oriente selon le support
        const { jsPDF } = await import("jspdf")
        const isPort = tpl.h > tpl.w
        const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: isPort ? "portrait" : "landscape" })
        const PW = pdf.internal.pageSize.getWidth()
        const PH = pdf.internal.pageSize.getHeight()
        const dataUrl = outCanvas.toDataURL("image/png", 1.0)
        const ratio = Math.min(PW / outCanvas.width, PH / outCanvas.height)
        const iw = outCanvas.width * ratio
        const ih = outCanvas.height * ratio
        pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, PW, PH, "F")
        pdf.addImage(dataUrl, "PNG", (PW - iw) / 2, (PH - ih) / 2, iw, ih)
        pdf.save(filename)
      } else {
        const a = document.createElement("a"); a.href = outCanvas.toDataURL("image/png",1.0); a.download = filename; a.click()
      }
    } catch (e) { console.error("Export support error:", e) }
    setSuppExporting(false)
  }

    // -- Export principal -------------------------------------------------------
  function runExport() {
    if (!active || expExporting) return
    if (scanScore && scanScore.score < 30) {
      const crits = scanScore.issues.filter(i => i.severity === "critical")
      if (crits.length > 0) { setExpWarnOpen(true); return }
    }
    void doExport()
  }

  async function doExport() {
    if (!active || expExporting) return
    setExpExporting(true)
    try {
      // Plafond 4096 : au-delà, iOS Safari plafonne l'aire du canvas (~16,7 Mpx)
      // et renvoie un PNG VIDE sans erreur. 4096 est sûr sur toutes les plateformes.
      const px = expSize === "custom" ? Math.max(256, Math.min(4096, expCustomSize)) : expSize
      const isTransparent = expFormat === "png-t"
      const opts: QROptions = {
        data: qrUrl, fg, bg, ecc: effectiveEcc,
        style: { ...renderStyle, transparent: isTransparent || renderStyle.transparent, margin: expMargin },
        size: px,
      }

      if (expFormat === "svg") {
        const blob = await getQRBlob(opts, "svg")
        if (blob) downloadBlob(blob, getFilename("svg"))

      } else if (expFormat === "pdf") {
        // Vrai PDF A4 via jsPDF (QR PNG haute def + titre + url)
        const pngBlob = await getQRBlob({ ...opts, style: { ...opts.style, transparent: false } }, "png")
        if (pngBlob) {
          await buildAndDownloadPdf(pngBlob, getFilename("pdf"), {
            title: active?.pages?.title ?? "",
            url: qrUrl,
          })
        }

      } else {
        // PNG / PNG transparent / WEBP — avec bandeau optionnel si demande
        const ext = expFormat === "webp" ? "webp" : "png"
        if (expIncludeName || expIncludeUrl) {
          const canvas = await buildExportCanvas(px, isTransparent)
          const mime = expFormat === "webp" ? "image/webp" : "image/png"
          const dataUrl = expFormat === "webp" ? canvas.toDataURL(mime, 0.92) : canvas.toDataURL(mime)
          const a = document.createElement("a"); a.href = dataUrl; a.download = getFilename(ext); a.click()
        } else {
          const blob = await getQRBlob(opts, ext as "png" | "webp")
          if (blob) downloadBlob(blob, getFilename(ext))
        }
      }
    } catch (e) { console.error("Export error:", e) }
    setExpExporting(false)
  }

  // -- Copier image dans le presse-papier ------------------------------------
  async function copyImageToClipboard() {
    if (!active) return
    try {
      const px     = 512
      const canvas = await buildExportCanvas(px, false)
      canvas.toBlob(async blob => {
        if (!blob) return
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        setExpCopied("img"); setTimeout(() => setExpCopied(null), 2000)
      }, "image/png")
    } catch { setExpCopied("img-err"); setTimeout(() => setExpCopied(null), 2000) }
  }

  // -- Copier SVG texte ------------------------------------------------------
  async function copySVG() {
    if (!active) return
    try {
      const blob = await getQRBlob(qrOpts(400), "svg")
      if (!blob) throw new Error("no svg")
      const text = await blob.text()
      await navigator.clipboard.writeText(text)
      setExpCopied("svg"); setTimeout(() => setExpCopied(null), 2000)
    } catch { setExpCopied("svg-err"); setTimeout(() => setExpCopied(null), 2000) }
  }

  // Legacy compat
  function downloadPNG(size = 400) { runExport() }

  function copy(type: "link"|"short") {
    navigator.clipboard.writeText(type === "link" ? pageUrl : qrUrl).catch(() => {})
    setCopied(type); setTimeout(() => setCopied(null), 2000)
  }

  function resetColors() {
    if (!active) return
    setFg(active.foreground_color); setBg(active.background_color)
    setCorner(active.corner_style); setEcLevel(active.error_correction)
    setStyleConf({ ...DEFAULT_STYLE, ...(active.style_config ?? {}) })
    setSelectedCat("all")
  }

  // Upload logo -> Supabase Storage OU data URL si pas encore uploade
  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith("image/")) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo trop volumineux (max 2 Mo)")
      return
    }
    setLogoUploading(true)
    try {
      // Convertir en data URL pour preview immediate
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setStyleConf(p => ({ ...p, logoUrl: dataUrl }))
        // Si ECC n'est pas deja H, le forcer (effectiveEcc s'en charge automatiquement)
        setLogoUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setLogoUploading(false)
    }
  }

  function removeLogo() {
    setStyleConf(p => ({ ...p, logoUrl: "" }))
  }

  function applyPreset(preset: Preset) {
    const canAccess = PLAN_RANK[userPlan] >= presetMinRank(preset.plan)
    if (!canAccess) { setUpsell({ feature: `le style « ${preset.label} »`, plan: presetUpsellPlan(preset.plan) }); return }
    setFg(preset.fg)
    setBg(preset.bg)
    // Sync corner state legacy (utilise pour le clipping canvas)
    if (preset.cornerStyle === "rounded" || preset.cornerStyle === "circle" || preset.cornerStyle === "luxury" || preset.dotStyle === "rounded") setCorner("rounded")
    else if (preset.dotStyle === "dot" || preset.cornerStyle === "minimal") setCorner("dot")
    else setCorner("square")
    // ECC (uniquement si defini par le preset)
    if (preset.ecc) setEcLevel(preset.ecc)
    setStyleConf(p => ({
      ...p,
      fg2:          preset.fg2 ?? "",
      cornerColor:  preset.cornerColor ?? "",
      eyeColor:     preset.eyeColor ?? "",
      gradient:     preset.gradient ?? "none",
      gradientBg:   preset.gradientBg ?? "",
      dotStyle:     (preset.dotStyle as any) ?? "square",
      cornerStyle:  (preset.cornerStyle as any) ?? "square",
      ...(preset.margin  !== undefined ? { margin: preset.margin }   : {}),
      ...(preset.density !== undefined ? { density: preset.density } : {}),
      ...(preset.transparent !== undefined ? { transparent: preset.transparent } : {}),
    }))
  }

  // -- Style automatique : detecte la categorie via le titre/destination -------
  const RECO_KEYWORDS: { cat: string; words: string[] }[] = [
    { cat:"restaurant", words:["resto","restaurant","pizz","bistro","cafe","café","coffee","brasserie","burger","sushi","food","cuisine","traiteur","cocktail","wine","vin","boulang","patiss","menu","gourmet","steak","kebab","tacos","glace","trattoria","grill","tapas","ramen"] },
    { cat:"creator",    words:["photo","studio","portfolio","createur","créateur","creator","artist","artiste","design","youtube","tiktok","insta","twitch","stream","podcast","influence","blog","music","musique","beauty","makeup","tattoo","dj","mix","prod","beatmaker","danse","model"] },
    { cat:"tech",       words:["tech","dev","software","app","saas","web3","crypto","blockchain","data","cyber","code","digital","startup","ia "," ai","robot","quantum","gaming","game","esport"] },
    { cat:"event",      words:["mariage","wedding","event","evenement","événement","gala","soiree","soirée","concert","festival","conference","conférence","anniversaire","birthday","networking","seminaire","club","party","fete","fête"] },
    { cat:"luxury",     words:["luxe","luxury","premium","joaill","bijou","jewel","prestige","diamond","exclusif","exclusive","monaco","yacht","or fin","haute","spa","institut"] },
    { cat:"business",   words:["agence","agency","consult","avocat","cabinet","finance","immo","immobilier","entreprise","corporate","conseil","expert","comptable","assurance","freelance","b2b","coach","notaire","salon","coiffure","barber","auto","garage"] },
  ]

  function detectCat(): string {
    const blob = `${active?.pages?.title ?? ""} ${active?.pages?.slug ?? ""} ${destValue}`.toLowerCase()
    if (blob.trim()) {
      for (const g of RECO_KEYWORDS) {
        if (g.words.some(w => blob.includes(w))) return g.cat
      }
    }
    return "classic"
  }

  function pickPreset(cat: string): Preset | null {
    const inCat = PRESETS.filter(p => p.cat === cat)
    if (!inCat.length) return null
    const accessible = inCat.filter(p => PLAN_RANK[userPlan] >= presetMinRank(p.plan))
    const pool = accessible.length ? accessible : inCat
    // eviter de re-appliquer le style deja actif -> garantit un changement visible
    const different = pool.find(p => !(p.fg === fg && p.bg === bg))
    return different ?? pool[0]
  }

  function autoStyle() {
    const cat = detectCat()
    setSelectedCat(cat)
    const p = pickPreset(cat)
    if (p) {
      applyPreset(p)
      const catLabel = PRESET_CATS.find(c => c.id === cat)?.label ?? cat
      setAutoMsg(`Style « ${p.label} » applique (${catLabel})`)
      setTimeout(() => setAutoMsg(""), 3500)
    }
  }

  // -- Generateur de palette coherente (contraste garanti) ----------------------
  function hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => {
      const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
      return Math.round(255 * c).toString(16).padStart(2, "0")
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  function genPalette() {
    const hue = Math.floor(Math.random() * 360)
    const darkBg = Math.random() < 0.5
    let newFg: string, newBg: string, cornerC: string, eyeC: string
    if (darkBg) {
      newBg   = hslToHex(hue, 35, 8)
      newFg   = hslToHex(hue, 15, 92)
      cornerC = hslToHex((hue + 30) % 360, 80, 62)
      eyeC    = hslToHex((hue + 30) % 360, 85, 72)
    } else {
      newBg   = hslToHex(hue, 30, 97)
      newFg   = hslToHex(hue, 60, 20)
      cornerC = hslToHex((hue + 30) % 360, 70, 38)
      eyeC    = hslToHex((hue + 30) % 360, 72, 48)
    }
    setFg(newFg)
    setBg(newBg)
    setStyleConf(p => ({ ...p, cornerColor: cornerC, eyeColor: eyeC, gradient: "none", fg2: "", gradientBg: "" }))
  }

  async function applyToAll() {
    if (!active) return
    const payload = { foreground_color:fg, background_color:bg, corner_style:corner, error_correction:ecLevel, style_config:styleConf }
    try {
      const res = await fetch("/api/qr-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, ...payload }),
      })
      const d = await res.json()
      if (!res.ok || d.error) { toast.error("Application impossible : " + (d.error || "echec")); return }
      setQRCodes(prev => prev.map(q => ({ ...q, ...payload })))
      setApplyAllOk(true); setTimeout(()=>setApplyAllOk(false), 2500)
    } catch {
      toast.error("Application impossible : erreur reseau")
    }
  }

  const [sb_asc, sb_dir] = sortKey.split("-")
  const suppTpl    = SUPP_TPLS.find(t => t.id === suppTplId) ?? SUPP_TPLS[0]
  const suppCanTpl = PLAN_RANK[userPlan] >= PLAN_RANK[suppTpl.plan]

  const filteredQR = qrCodes
    .filter(qr => {
      const t  = qr.pages?.title?.toLowerCase() ?? ""
      const c  = qr.short_code?.toLowerCase() ?? ""
      const qs = qr.status ?? "active"
      // Masquer les archives sauf si filtre explicite ou showArchived
      if (qs === "archived" && filterSt !== "archived" && !showArchived) return false
      return (!search || t.includes(search.toLowerCase()) || c.includes(search.toLowerCase()))
        && (filterSt === "all" || qs === filterSt)
    })
    .sort((a, b) => {
      let cmp = 0
      if (sb_asc === "scans") cmp = (a.total_scans ?? 0) - (b.total_scans ?? 0)
      if (sb_asc === "date")  cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sb_asc === "name")  cmp = (a.pages?.title ?? "").localeCompare(b.pages?.title ?? "")
      return sb_dir === "desc" ? -cmp : cmp
    })

  const canPro      = PLAN_RANK[userPlan] >= 2
  const canBusiness = PLAN_RANK[userPlan] >= 3

  if (qrCodes.length === 0) {
    return (
      <div style={{ textAlign:"center", padding:"80px 40px", border:"1px dashed color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:20 }}>
        <div style={{ width:72, height:72, borderRadius:20, margin:"0 auto 20px", background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 15%, transparent)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <QrCode size={32} color={G}/>
        </div>
        <h2 style={{ fontFamily:"Fraunces, serif", fontSize:24, color:"#F5F0E8", fontWeight:700, margin:"0 0 10px" }}>Aucun QR code</h2>
        <p style={{ color:MUTED, fontSize:14, lineHeight:1.7, margin:"0 0 28px" }}>Crée ta première page pour générer automatiquement un QR code.</p>
        <a href="/dashboard" style={{ background:"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", color:"#080808", textDecoration:"none", fontSize:14, fontWeight:700, padding:"14px 28px", borderRadius:10, display:"inline-block" }}>
          Créer ma première page
        </a>
      </div>
    )
  }

  return (
    <div className="qr-grid" style={{ display:"grid", gridTemplateColumns:"clamp(200px,15vw,260px) 2.5fr clamp(290px,21vw,340px)", gap:0, minHeight:"calc(100vh - 80px)", background:BG, borderRadius:16, border:"1px solid color-mix(in srgb, var(--accent) 10%, transparent)", overflow:"hidden", fontFamily:"DM Sans, sans-serif", position:"relative" }}>


      {/* -- Modal preview plein ecran ------------------------------------------- */}
      {/* Sélecteur de mode (mobile) — bottom sheet (§10) */}
      {modeSheet && (
        <div onClick={() => setModeSheet(false)} style={{ position:"fixed", inset:0, zIndex:2050, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(3px)", display:"flex", alignItems:"flex-end" }}>
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", background:"#141109", borderTop:"1px solid color-mix(in srgb, var(--accent) 22%, transparent)", borderTopLeftRadius:22, borderTopRightRadius:22, padding:"10px 16px calc(18px + env(safe-area-inset-bottom))" }}>
            <div style={{ width:40, height:4, borderRadius:4, background:"rgba(255,255,255,0.18)", margin:"0 auto 14px" }} />
            <p style={{ color:"#F5F0E8", fontSize:16, fontWeight:700, margin:"0 0 12px", fontFamily:"Fraunces, serif" }}>Niveau de réglages</p>
            {([["simple","Simple","L'essentiel : un style et les couleurs. Pour aller vite."],["inter","Intermédiaire","+ formes des modules et des coins."],["expert","Expert","Tous les réglages : logo, dégradés, marge, correction d'erreur…"]] as const).map(([k,l,d]) => (
              <button key={k} type="button" onClick={() => { setLevel(k); setModeSheet(false) }}
                style={{ display:"flex", alignItems:"flex-start", gap:11, width:"100%", textAlign:"left" as const, padding:"13px 12px", marginBottom:6, borderRadius:12, cursor:"pointer",
                  background: level===k ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "rgba(255,255,255,0.03)",
                  border: "1px solid " + (level===k ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "rgba(255,255,255,0.08)") }}>
                <span style={{ marginTop:1, flexShrink:0, width:18, height:18, borderRadius:"50%", border:"2px solid " + (level===k?"var(--accent)":"rgba(255,255,255,0.25)"), display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {level===k && <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--accent)" }} />}
                </span>
                <span style={{ minWidth:0 }}>
                  <span style={{ display:"block", color: level===k ? "var(--accent)" : "#F5F0E8", fontSize:14, fontWeight:700 }}>{l}</span>
                  <span style={{ display:"block", color:"#A8A190", fontSize:12, lineHeight:1.4, marginTop:2 }}>{d}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:isMobile?16:32 }}
          onClick={() => setShowModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, maxWidth:600, width:"100%" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%" }}>
              <div>
                <p style={{ color:"#F5F0E8", fontSize:16, fontWeight:700, margin:"0 0 3px" }}>{active?.pages?.title}</p>
                <p style={{ color:"#A8A190", fontSize:11, margin:0 }}>Scannez pour tester * {appUrl}/q/{active?.short_code}</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)}
                style={{ width:36, height:36, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#A8A190" }}>
                <X size={16}/>
              </button>
            </div>

            {/* QR grand */}
            <div style={{ padding:isMobile?16:28, borderRadius:24, background:bg, boxShadow:"0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent), 0 32px 80px rgba(0,0,0,0.9)" }}>
              <div ref={canvasModalRef} data-qr-container style={{ display:"flex", width:isMobile?"min(300px,64vw)":320, aspectRatio:"1 / 1", alignItems:"center", justifyContent:"center" }}/>
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:10, width:"100%", maxWidth:400 }}>
              <button type="button" onClick={() => downloadPNG(1200)}
                style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"11px", background:"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", border:"none", borderRadius:10, color:"#080808", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                <Download size={14}/> PNG HD
              </button>
              <button type="button" onClick={() => copy("short")}
                style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"11px", background: copied==="short"?"rgba(57,255,143,0.12)":"rgba(255,255,255,0.05)", border:`1px solid ${copied==="short"?"rgba(57,255,143,0.3)":"rgba(255,255,255,0.1)"}`, borderRadius:10, color:copied==="short"?"var(--success)":"#F5F0E8", fontSize:13, cursor:"pointer" }}>
                {copied==="short" ? <Check size={14}/> : <Copy size={14}/>}
                {copied==="short" ? "Copie !" : "Copier lien"}
              </button>
              <a href={pageUrl} target="_blank" rel="noopener noreferrer"
                style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"11px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"#F5F0E8", fontSize:13, textDecoration:"none" }}>
                <ExternalLink size={14}/> Ouvrir
              </a>
            </div>

            {/* Diagnostic dans la modal */}
            {(() => {
              const diag = getDiagnostic(diagFg || fg, diagBg || bg)
              if (!diag) return null
              return (
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const, justifyContent:"center" }}>
                  {[
                    { label: diag.readability, color: diag.readColor },
                    { label: `Contraste ${diag.ratio}:1`, color: diag.warnContrast?"var(--danger)":diag.warnLow?"#F97316":"var(--success)" },
                    { label: `Min ${diag.minSize}`, color: "#A8A190" },
                    { label: `ECC ${ecLevel}`, color: "#C9A84C" },
                  ].map((b,i) => (
                    <span key={i} style={{ background:`${b.color}12`, border:`1px solid ${b.color}35`, borderRadius:7, padding:"4px 12px", fontSize:11, color:b.color, fontWeight:600 }}>{b.label}</span>
                  ))}
                </div>
              )
            })()}

            <p style={{ color:"rgba(138,132,120,0.6)", fontSize:11, textAlign:"center" as const }}>
              Cliquez en dehors pour fermer
            </p>
          </div>
        </div>
      )}

      {/* -- Modale UPGRADE (conversion) ---------------------------------------- */}
      {/* L'ancien éditeur libre Fabric a été retiré (convergence) : « Ouvrir QR Print Studio »
          redirige vers le Print Studio guidé /dashboard/print-studio (cf. docs/PRINT-STUDIO-CONVERGENCE.md). */}

      {upsell && (() => {
        const isBiz = upsell.plan === "business"
        const isStarter = upsell.plan === "starter"
        const planName = isBiz ? "Business" : isStarter ? "Starter" : "Pro"
        const accent = isBiz ? "var(--success)" : isStarter ? "var(--action)" : "#C9A84C"
        const benefits = isBiz
          ? ["Tous les presets premium ET luxe", "Modules & coins luxe", "Export PDF, SVG et WEBP", "Correction d'erreur maximale", "Logo central + branding complet"]
          : isStarter
          ? ["QR Print Studio (imprimables)", "QR Studio (personnalisation)", "5 pages · 850 vues/mois", "Sans branding QRowg", "Domaine personnalisé"]
          : ["Tous les presets premium", "Modules avances (pixel, neon...)", "Coins avances (diamond...)", "Export SVG et WEBP", "Correction d'erreur elevee (H)"]
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:4300, padding:24 }}
            onClick={() => setUpsell(null)}>
            <div onClick={e => e.stopPropagation()}
              style={{ width:"100%", maxWidth:380, background:"linear-gradient(180deg,#14120C,#0C0B08)", border:`1px solid ${accent}40`, borderRadius:18, padding:"24px 22px", position:"relative", boxShadow:`0 24px 80px rgba(0,0,0,0.7), 0 0 40px ${accent}15` }}>
              <button type="button" onClick={() => setUpsell(null)}
                style={{ position:"absolute", top:14, right:14, background:"rgba(255,255,255,0.05)", border:"none", borderRadius:8, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:MUTED }}>
                <X size={15}/>
              </button>

              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" as const, gap:6, marginBottom:18 }}>
                <div style={{ width:52, height:52, borderRadius:14, background:`${accent}18`, border:`1px solid ${accent}40`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:4 }}>
                  <Sparkles size={24} color={accent}/>
                </div>
                <p style={{ color:"#F5F0E8", fontSize:18, fontWeight:800, margin:0, fontFamily:"Fraunces, serif" }}>Passez à {planName}</p>
                <p style={{ color:MUTED, fontSize:12, margin:0, lineHeight:1.5 }}>Pour débloquer {upsell.feature} et bien plus.</p>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:20 }}>
                {benefits.map((b, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:9 }}>
                    <div style={{ width:18, height:18, borderRadius:"50%", background:`${accent}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Check size={11} color={accent}/>
                    </div>
                    <span style={{ color:"#F5F0E8", fontSize:12.5 }}>{b}</span>
                  </div>
                ))}
              </div>

              <a href="/upgrade"
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, width:"100%", padding:"13px", background:`linear-gradient(90deg,${accent},${isBiz?"#2bd673":"#b8953f"})`, borderRadius:11, color:"#080808", fontSize:14, fontWeight:800, textDecoration:"none", boxShadow:`0 6px 20px ${accent}30` }}>
                Voir les offres {planName}
              </a>
              <button type="button" onClick={() => setUpsell(null)}
                style={{ width:"100%", marginTop:8, padding:"8px", background:"none", border:"none", color:MUTED, fontSize:11, cursor:"pointer" }}>
                Plus tard
              </button>
            </div>
          </div>
        )
      })()}

      {/* -- Génération de QR en lot (B2B) --------------------------------------- */}
      <BatchQrModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        isPro={canPro}
        onUpsell={(feature, plan) => setUpsell({ feature, plan: plan || "pro" })}
        genBlob={(value, ext) => getQRBlob({ data: value, fg, bg, ecc: effectiveEcc, style: renderStyle, size: 1000 }, ext)}
      />

      {/* -- Modale suppression -------------------------------------------------- */}
      {confirmId !== null && (
        <Modal open onClose={() => setConfirmId(null)} title="Supprimer ce QR Code ?"
          footer={<>
            <Button variant="ghost" onClick={() => setConfirmId(null)} disabled={!!deletingId}>Annuler</Button>
            <Button variant="danger" onClick={() => deleteQR(confirmId)} loading={!!deletingId} leftIcon={<Trash2 size={13} />}>Supprimer</Button>
          </>}>
          Action irréversible. Toutes les statistiques seront perdues.
        </Modal>
      )}

      {/* Avertissement score de scannabilité critique avant export */}
      {expWarnOpen && (
        <Modal open onClose={() => setExpWarnOpen(false)} title="Scannabilité critique"
          footer={<>
            <Button variant="ghost" onClick={() => setExpWarnOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={() => { setExpWarnOpen(false); void doExport() }} leftIcon={<Download size={13} />}>Exporter quand même</Button>
          </>}>
          Le score de scannabilité est critique{scanScore ? ` (${scanScore.score}/100)` : ""}. Ce QR Code risque de ne pas être lu de façon fiable. Voulez-vous quand même l'exporter ?
        </Modal>
      )}

      {/* Overlay fermeture menu */}
      {menuId !== null && (
        <div style={{ position:"fixed", inset:0, zIndex:90 }} onClick={() => setMenuId(null)}/>
      )}

      {/* -- COL 1 : Liste ------------------------------------------------------ */}
      <div className="qr-col-list" style={{ borderRight:"1px solid rgba(255,255,255,0.06)", display:(isMobile && mobileView==="editor") ? "none" : "flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header + filtres */}
        <div style={{ padding:"12px 12px 10px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <p style={{ color:"#F5F0E8", fontSize:11, fontWeight:700, margin:"0 0 1px" }}>QR Codes</p>
              <p style={{ color:MUTED, fontSize:9, margin:0 }}>
                {qrCodes.length} total
              </p>
            </div>
            <div style={{ display:"flex", gap:5, alignItems:"center" }}>
              <span style={{ background:"color-mix(in srgb, var(--accent) 12%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:5, padding:"1px 7px", fontSize:10, color:G, fontWeight:700 }}>{filteredQR.length}/{qrCodes.length}</span>
              <button type="button" onClick={() => setShowArchived(p => !p)}
                style={{ padding:"1px 6px", background:showArchived?"rgba(107,114,128,0.2)":"transparent", border:"1px solid rgba(107,114,128,0.2)", borderRadius:5, color:MUTED, fontSize:8, cursor:"pointer" }}>
                {showArchived?"- Archives":"+ Archives"}
              </button>
            </div>
          </div>
          <div style={{ position:"relative" }}>
            <Search size={11} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:MUTED, pointerEvents:"none" }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, URL..."
              style={{ width:"100%", background:"#111009", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, padding:"6px 26px 6px 26px", color:"#F5F0E8", fontSize:11, outline:"none", boxSizing:"border-box" as const }}/>
            {search && (
              <button type="button" onClick={() => setSearch("")} style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:MUTED, display:"flex" }}>
                <X size={11}/>
              </button>
            )}
          </div>
          {/* Filtres statut/tri : masques sur mobile (peu utiles avec peu de QR, la
              recherche suffit) pour desencombrer. Toujours presents sur desktop. */}
          {!isMobile && (
          <div style={{ display:"flex", gap:5 }}>
            <select value={filterSt} onChange={e => setFilterSt(e.target.value)}
              style={{ flex:1, background:"#111009", border:"1px solid rgba(255,255,255,0.07)", borderRadius:7, color:MUTED, padding:"5px 6px", fontSize:10, outline:"none", cursor:"pointer" }}>
              <option value="all">Tous</option>
              <option value="active">Actif</option>
              <option value="draft">Brouillon</option>
              <option value="paused">En pause</option>
              <option value="archived">Archive</option>
              <option value="expired">Expire</option>
            </select>
            <select value={sortKey} onChange={e => setSortKey(e.target.value)}
              style={{ flex:1, background:"#111009", border:"1px solid rgba(255,255,255,0.07)", borderRadius:7, color:MUTED, padding:"5px 6px", fontSize:10, outline:"none", cursor:"pointer" }}>
              <option value="date-desc">Date rec.</option>
              <option value="date-asc">Date anc.</option>
              <option value="scans-desc">+ scans</option>
              <option value="scans-asc">- scans</option>
              <option value="name-asc">A - Z</option>
              <option value="name-desc">Z - A</option>
            </select>
          </div>
          )}
        </div>

        {/* Liste */}
        <div className="qr-scroll" style={{ flex:1, overflowY:"auto", paddingTop:10 }}>
          {filteredQR.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 12px", color:MUTED }}>
              <QrCode size={24} color={MUTED} style={{ marginBottom:8 }}/>
              {qrCodes.length === 0 ? (
                <>
                  <p style={{ fontSize:12, margin:"0 0 3px", color:"#F5F0E8", fontWeight:600 }}>Aucun QR pour l'instant</p>
                  <p style={{ fontSize:10, margin:0, lineHeight:1.5 }}>Créez votre première page<br/>pour démarrer</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize:12, margin:"0 0 3px", color:"#F5F0E8", fontWeight:600 }}>Aucun resultat</p>
                  <p style={{ fontSize:10, margin:0, lineHeight:1.5 }}>Aucun QR ne correspond<br/>a vos filtres</p>
                </>
              )}
            </div>
          ) : filteredQR.map(qr => {
            const page = qr.pages
            const isA  = qr.id === activeId
            const qs   = qr.status ?? "active"
            const sCfg = QR_STATUS_CFG[qs] ?? QR_STATUS_CFG.active
            const url  = `${appUrl}/q/${qr.short_code}`
            const isM  = menuId === qr.id
            const isC  = copyQRId === qr.id
            return (
              <div key={qr.id} role="button" tabIndex={0} onKeyDown={onEnterSpace(() => { setActiveId(qr.id); setMenuId(null); setMobileView("editor") })} onClick={() => { setActiveId(qr.id); setMenuId(null); setMobileView("editor") }}
                style={{ margin:"0 8px 3px", padding:isMobile?"9px 10px":"7px 9px", cursor:"pointer", borderRadius:9, border:`1px solid ${isA?"color-mix(in srgb, var(--accent) 40%, transparent)":"transparent"}`, background:isA?"color-mix(in srgb, var(--accent) 9%, transparent)":"transparent", position:"relative", transition:"background 0.14s, border-color 0.14s" }}
                onMouseEnter={e => { if (!isA) e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
                onMouseLeave={e => { if (!isA) e.currentTarget.style.background = "transparent" }}>
                {/* Ligne compacte : pastille (avec point de statut) + titre + /q·scans + menu. Dates/actions -> menu ··· (§8). */}
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:26, height:26, borderRadius:7, background:qr.background_color, border:"1px solid rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative" }}>
                    <QrCode size={13} color={qr.foreground_color}/>
                    <span title={sCfg.label} style={{ position:"absolute", bottom:-3, right:-3, width:8, height:8, borderRadius:"50%", background:sCfg.dot, border:"1.5px solid #0F0E0B" }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:isA?"#F5F0E8":"#D4CFC7", fontSize:12, fontWeight:600, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                      {page?.title ?? "Sans titre"}
                    </p>
                    <p style={{ color:MUTED, fontSize:9.5, margin:"1px 0 0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                      <span style={{ fontFamily:"monospace" }}>/q/{qr.short_code}</span>{qr.total_scans>0?` · ${qr.total_scans} scan${qr.total_scans>1?"s":""}`:""}
                    </p>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); setMenuId(isM ? null : qr.id) }}
                    style={{ width:isMobile?32:20, height:isMobile?32:20, background:"none", border:"none", color:MUTED, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <MoreVertical size={isMobile?16:13}/>
                  </button>
                </div>

                {/* Menu contextuel */}
                {isM && (
                  <div style={{ position:"absolute", right:8, top:32, zIndex:200, background:"#1A1710", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:10, padding:"5px", boxShadow:"0 8px 32px rgba(0,0,0,0.7)", minWidth:158 }}
                    onClick={e => e.stopPropagation()}>
                    {([
                      { icon: <Pencil size={11}/>,  label: "Modifier",     action: () => { window.location.href = `/dashboard/builder/${page?.id}` }, color: "#F5F0E8", disabled: false },
                      { icon: <ExternalLink size={11}/>, label: "Changer la destination", action: () => { setActiveId(qr.id); setMenuId(null); setDestModal(true) }, color: "#F5F0E8", disabled: false },
                      { icon: isC ? <Check size={11}/> : <Copy size={11}/>, label: isC ? "Copie !" : "Copier lien", action: () => copyQRLink(qr.id, url), color: isC ? "var(--success)" : "#F5F0E8", disabled: false },
                      { icon: <Download size={11}/>, label: "PNG",          action: () => { setActiveId(qr.id); setTimeout(() => downloadPNG(400), 100); setMenuId(null) }, color: "#F5F0E8", disabled: false },
                      { icon: dupId === qr.id ? <Loader2 size={11} style={{ animation:"mo-spin 0.8s linear infinite" }}/> : <Copy size={11}/>, label: dupId === qr.id ? "Duplication..." : "Dupliquer", action: () => duplicateQR(qr.id), color: "#F5F0E8", disabled: dupId === qr.id },
                      ...(qs === "active" ? [{ icon: <Archive size={11}/>, label: "Mettre en pause", action: () => requestAction(qr.id, "pause", "Mettre en pause"), color: "#F97316", disabled: false }] : []),
                      ...(qs === "paused" || qs === "draft" ? [{ icon: <Check size={11}/>, label: "Activer", action: () => changeQRStatus(qr.id, "activate"), color: "var(--success)", disabled: false }] : []),
                      ...(qs !== "archived" ? [{ icon: <Archive size={11}/>, label: "Archiver", action: () => requestAction(qr.id, "archive", "Archiver ce QR"), color: "#6B7280", disabled: false }] : [{ icon: <RotateCcw size={11}/>, label: "Restaurer", action: () => changeQRStatus(qr.id, "restore"), color: "var(--action)", disabled: false }]),
                      { icon: <Trash2 size={11}/>,   label: "Supprimer definitif", action: () => requestAction(qr.id, "delete", "Supprimer definitivement ce QR ?"), color: "var(--danger)", disabled: qs !== "archived" },
                    ]).map((item, i) => (
                      <button key={i} type="button" onClick={item.disabled ? undefined : item.action} disabled={item.disabled}
                        style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:"none", border:"none", color:item.disabled ? "rgba(138,132,120,0.4)" : item.color, fontSize:11, cursor:item.disabled ? "not-allowed" : "pointer", borderRadius:7, textAlign:"left" as const }}>
                        {archivingId === qr.id && item.label === "Archiver"
                          ? <Loader2 size={11} style={{ animation:"mo-spin 0.8s linear infinite" }}/>
                          : item.icon
                        }
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}

              </div>
            )
          })}
        </div>
      </div>

      {/* -- COL 2 : Preview premium -------------------------------------------- */}
      <div className="qr-col-preview" style={{ display:(isMobile && mobileView==="list") ? "none" : "flex", flexDirection:"column", overflow:"hidden", background:"#0A0907" }}>
        {/* Retour à la liste (mobile uniquement) */}
        {isMobile && (
          <button type="button" onClick={() => setMobileView("list")}
            style={{ position:"sticky", top:0, zIndex:20, display:"flex", alignItems:"center", gap:7, width:"100%", padding:"12px 16px", background:"#0A0907", border:"none", borderBottom:"1px solid rgba(255,255,255,0.08)", color:"#F5F0E8", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            <ArrowRight size={15} style={{ transform:"rotate(180deg)" }} /> Mes QR codes
          </button>
        )}
        {/* Section label */}
        <div style={{ padding:"9px 16px 8px", borderBottom:"1px solid rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
            <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:0 }}>Aperçu</p>
            {active && (() => {
              const st = active.pages?.status ?? "draft"
              const sCfg = ({ published:{dot:"var(--success)",label:"Publié"}, draft:{dot:"#A8A190",label:"Brouillon"}, archived:{dot:"#F97316",label:"Archivé"}, paused:{dot:"var(--danger)",label:"En pause"} } as any)[st] ?? {dot:"#A8A190",label:"Inconnu"}
              return (
                <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, color:sCfg.dot, background:`${sCfg.dot}15`, border:`1px solid ${sCfg.dot}40`, borderRadius:6, padding:"2px 8px", fontWeight:600, flexShrink:0 }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:sCfg.dot }}/>{sCfg.label}
                </span>
              )
            })()}
          </div>
          {active && (
            <div style={{ display:"flex", gap:5, flexShrink:0 }}>
              {([["none","QR","▦"],["card","Carte","💳"],["poster","Affiche","🖼️"]] as const).map(([k,l,e]) => (
                <button key={k} type="button" onClick={() => setScene(k)}
                  style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 9px", borderRadius:7, fontSize:10.5, fontWeight:scene===k?700:500, cursor:"pointer",
                    background: scene===k ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${scene===k ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "rgba(255,255,255,0.08)"}`,
                    color: scene===k ? "var(--accent)" : "#A8A190" }}>
                  <span style={{ fontSize:11 }}>{e}</span> {l}
                </button>
              ))}
            </div>
          )}
        </div>
        {active ? (() => {
          const diag = getDiagnostic(diagFg || fg, diagBg || bg)
          return (
            <div className="qr-scroll" style={{ display:"flex", flexDirection:"column", height:"100%", overflowY:"auto" }}>

              {/* QR Card */}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:isMobile?"14px 16px 16px":"16px 22px 16px", gap:12, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                {/* Groupe visuel QR (sélecteur + QR + Agrandir) — placé APRÈS infos/actions sur mobile via order */}
                <div style={{ order: isMobile ? 3 : 0, width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
                {/* Sélecteur d'aperçu (QR/Carte/Affiche) déplacé dans l'en-tête « Aperçu » (haut droite) → aperçu remonté. */}
                <div style={{ position:"relative" }}>
                  {/* Scène immersive (produit fini) */}
                  {scene !== "none" && (
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", width:"min(46vh,360px,100%)", maxWidth:"100%", minHeight:"min(46vh,360px)", animation:"mo-fade-up .35s ease" }}>
                      {!qrPng ? (
                        <div className="skeleton" style={{ width:200, height:200 }} />
                      ) : scene === "phone" ? (
                        <div style={{ width:206, borderRadius:30, background:"#0b0b0d", padding:"12px 10px 16px", boxShadow:"0 30px 70px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.06)", position:"relative" }}>
                          <div style={{ width:46, height:5, background:"#222", borderRadius:3, margin:"2px auto 9px" }}/>
                          <div style={{ borderRadius:18, overflow:"hidden", background:"#fff" }}>
                            <div style={{ height:40, background:"linear-gradient(135deg,var(--accent),color-mix(in srgb, var(--accent) 70%, #000))", display:"flex", alignItems:"center", justifyContent:"center", color:"#080808", fontSize:11, fontWeight:800 }}>{active.pages?.title ?? "Ma page"}</div>
                            <div style={{ padding:"16px 14px", display:"flex", flexDirection:"column", alignItems:"center", gap:9 }}>
                              <img src={qrPng} alt="QR" style={{ width:130, height:130, borderRadius:8, display:"block" }}/>
                              <p style={{ color:"#111", fontSize:10.5, fontWeight:700, margin:0 }}>Scannez pour ouvrir</p>
                              <div style={{ width:"80%", height:9, borderRadius:5, background:"var(--accent)", opacity:0.9 }}/>
                              <div style={{ width:"60%", height:7, borderRadius:5, background:"#e5e5e5" }}/>
                            </div>
                          </div>
                        </div>
                      ) : scene === "card" ? (
                        <div style={{ width:isMobile?260:320, height:isMobile?153:188, borderRadius:14, background:"linear-gradient(135deg,#16140d,#0c0b08)", border:"1px solid color-mix(in srgb, var(--accent) 22%, transparent)", boxShadow:"0 24px 60px rgba(0,0,0,0.6)", display:"flex", overflow:"hidden" }}>
                          <div style={{ flex:1, padding:"20px 18px", display:"flex", flexDirection:"column", justifyContent:"center", gap:7 }}>
                            <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(135deg,var(--accent),color-mix(in srgb, var(--accent) 70%, #000))", display:"flex", alignItems:"center", justifyContent:"center", color:"#080808", fontWeight:800, fontSize:15 }}>{(active.pages?.title ?? "Q")[0].toUpperCase()}</div>
                            <p style={{ color:"#F5F0E8", fontSize:14, fontWeight:700, margin:"4px 0 0" }}>{active.pages?.title ?? "Votre nom"}</p>
                            <div style={{ width:90, height:6, background:"color-mix(in srgb, var(--accent) 40%, transparent)", borderRadius:4 }}/>
                            <div style={{ width:120, height:5, background:"rgba(255,255,255,0.12)", borderRadius:4 }}/>
                          </div>
                          <div style={{ width:150, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <img src={qrPng} alt="QR" style={{ width:116, height:116, display:"block" }}/>
                          </div>
                        </div>
                      ) : scene === "poster" ? (
                        <div style={{ width:236, height:318, borderRadius:12, background:"linear-gradient(160deg,#1a160c,#0a0906)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", boxShadow:"0 28px 70px rgba(0,0,0,0.6)", display:"flex", flexDirection:"column", alignItems:"center", padding:"26px 20px", gap:14 }}>
                          <p style={{ color:"#C9A84C", fontSize:11, fontWeight:800, letterSpacing:2, margin:0 }}>SCANNEZ-MOI</p>
                          <p style={{ color:"#F5F0E8", fontFamily:"Fraunces, serif", fontSize:24, fontWeight:700, textAlign:"center", lineHeight:1.1, margin:0 }}>{active.pages?.title ?? "Découvrez-nous"}</p>
                          <div style={{ padding:14, background:"#fff", borderRadius:14, marginTop:"auto" }}>
                            <img src={qrPng} alt="QR" style={{ width:128, height:128, display:"block" }}/>
                          </div>
                          <p style={{ color:"#A8A190", fontSize:10, margin:"auto 0 0" }}>qrowg · /q/{active.short_code}</p>
                        </div>
                      ) : scene === "sticker" ? (
                        <div style={{ width:244, height:244, borderRadius:"50%", background:"radial-gradient(circle at 50% 35%, #fff, #f1eee6)", boxShadow:"0 24px 60px rgba(0,0,0,0.5), inset 0 0 0 7px var(--accent), inset 0 0 0 9px rgba(0,0,0,0.08)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
                          <p style={{ color:"color-mix(in srgb, var(--accent) 80%, #000)", fontSize:11, fontWeight:900, letterSpacing:3, margin:0 }}>▼ SCANNEZ ▼</p>
                          <img src={qrPng} alt="QR" style={{ width:130, height:130, display:"block", borderRadius:6 }}/>
                          <p style={{ color:"color-mix(in srgb, var(--accent) 80%, #000)", fontSize:10, fontWeight:800, letterSpacing:2, margin:0 }}>MERCI !</p>
                        </div>
                      ) : (
                        // tent / chevalet
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                          <div style={{ width:210, borderRadius:"14px 14px 4px 4px", background:"linear-gradient(135deg,#16140d,#0c0b08)", border:"1px solid color-mix(in srgb, var(--accent) 22%, transparent)", padding:"18px 18px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:10, boxShadow:"0 20px 50px rgba(0,0,0,0.55)", transform:"perspective(700px) rotateX(6deg)" }}>
                            <p style={{ color:"#C9A84C", fontSize:12, fontWeight:800, letterSpacing:1, margin:0 }}>VOIR LE MENU</p>
                            <div style={{ padding:11, background:"#fff", borderRadius:12 }}>
                              <img src={qrPng} alt="QR" style={{ width:120, height:120, display:"block" }}/>
                            </div>
                            <p style={{ color:"#A8A190", fontSize:9.5, margin:0 }}>Scannez avec votre téléphone</p>
                          </div>
                          <div style={{ width:150, height:14, background:"rgba(0,0,0,0.5)", filter:"blur(7px)", borderRadius:"50%", marginTop:-2 }}/>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ display: scene==="none" ? "block" : "none", position:"relative", padding:isMobile?16:28, borderRadius:isMobile?22:28, background:bg, boxShadow:`0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent), 0 28px 80px rgba(0,0,0,0.85)`, transition:"background 0.3s", cursor:"pointer" }}
                    role="button" tabIndex={0} aria-label="Ouvrir l'aperçu" onKeyDown={onEnterSpace(() => setShowModal(true))} onClick={() => setShowModal(true)}>
                    {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h], i) => (
                      <div key={i} style={{ position:"absolute", [v]:10, [h]:10, width:18, height:18,
                        borderTop:    v==="top"    ? "2px solid color-mix(in srgb, var(--accent) 70%, transparent)" : "none",
                        borderBottom: v==="bottom" ? "2px solid color-mix(in srgb, var(--accent) 70%, transparent)" : "none",
                        borderLeft:   h==="left"   ? "2px solid color-mix(in srgb, var(--accent) 70%, transparent)" : "none",
                        borderRight:  h==="right"  ? "2px solid color-mix(in srgb, var(--accent) 70%, transparent)" : "none",
                      }}/>
                    ))}
                    <div ref={canvasRef} data-qr-container style={{ display:"flex", width:isMobile?"min(220px, 58vw)":"min(42vh, 320px)", height:isMobile?"min(220px, 58vw)":"min(42vh, 320px)", alignItems:"center", justifyContent:"center" }}/>
                    {/* Hover overlay */}
                    <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:28, transition:"background 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.background="rgba(0,0,0,0.4)")}
                      onMouseLeave={e => (e.currentTarget.style.background="rgba(0,0,0,0)")}>
                      <span style={{ color:"rgba(255,255,255,0)", fontSize:13, fontWeight:700, transition:"color 0.2s", pointerEvents:"none" }}
                        onMouseEnter={e => (e.currentTarget.style.color="#F5F0E8")}
                        onMouseLeave={e => (e.currentTarget.style.color="rgba(255,255,255,0)")}>
                        Agrandir
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bouton Agrandir (mobile : le hover n'existe pas au doigt) */}
                {isMobile && scene === "none" && (
                  <button type="button" onClick={() => setShowModal(true)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, margin:"12px auto 0", padding:"8px 18px", borderRadius:9, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", color:"#A8A29A", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    <Maximize2 size={13}/> Agrandir
                  </button>
                )}

                </div>{/* fin groupe visuel QR */}

                {/* Nom + URL + statut */}
                <div style={{ order: isMobile ? 1 : 0, textAlign:"center", width:"100%" }}>
                  <p style={{ color:"#F5F0E8", fontSize:15, fontWeight:700, margin:"0 0 4px" }}>{active.pages?.title ?? "Sans titre"}</p>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:6 }}>
                    <code style={{ color:"var(--accent)", fontSize:10, background:"color-mix(in srgb, var(--accent) 8%, transparent)", padding:"2px 8px", borderRadius:5 }}>
                      /q/{active.short_code}
                    </code>
                    <button type="button" onClick={() => copy("short")}
                      style={{ width:isMobile?32:20, height:isMobile?32:20, background:"none", border:"none", cursor:"pointer", color:copied==="short"?"var(--success)":"#A8A190", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {copied==="short" ? <Check size={isMobile?14:11}/> : <Copy size={isMobile?14:11}/>}
                    </button>
                  </div>
                  {/* Statut déplacé en haut à gauche (en-tête « Aperçu »). */}

                  {/* Carte score scannabilité — pédagogique */}
                  {scanScore && (
                    <div style={{ width:"100%", marginTop:8, padding:"10px 12px", background:`${scanScore.gradeColor}0e`, border:`1px solid ${scanScore.gradeColor}33`, borderRadius:13, display:"flex", flexDirection:"column", gap:8 }}>
                      {/* En-tête cliquable : déplie le détail (contraste / taille / ECC / problèmes). */}
                      <button type="button" onClick={() => setScanOpen(o => !o)} aria-expanded={scanOpen} style={{ display:"flex", alignItems:"center", gap:10, background:"none", border:"none", padding:0, cursor:"pointer", width:"100%", textAlign:"left" as const }}>
                        <span style={{ display:"flex", alignItems:"center", justifyContent:"center", width:32, height:32, borderRadius:"50%", background:scanScore.gradeColor, color:"#080808", fontSize:12, fontWeight:800, flexShrink:0 }}>
                          {scanScore.score}
                        </span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ color:scanScore.gradeColor, fontSize:12.5, fontWeight:800, margin:0 }}>{scanScore.grade} · scannabilité</p>
                          <p style={{ color:MUTED, fontSize:10.5, margin:"1px 0 0", lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                            {scanScore.grade === "Excellent"
                              ? "Contraste élevé et marge suffisante : il se scanne sans souci."
                              : (scanScore.issues[0]?.detail || scanScore.issues[0]?.title || "Quelques réglages amélioreraient la lisibilité.")}
                          </p>
                        </div>
                        <ChevronDown size={16} color={MUTED} style={{ transform: scanOpen ? "rotate(180deg)" : "none", transition:"transform .2s", flexShrink:0 }}/>
                      </button>
                      {scanOpen && (
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const }}>
                          <span style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, padding:"3px 9px", fontSize:9.5, color:MUTED }}>Contraste {scanScore.ratio}:1</span>
                          <span style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, padding:"3px 9px", fontSize:9.5, color:MUTED }}>Taille min {scanScore.minSize}</span>
                          <span style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, padding:"3px 9px", fontSize:9.5, color:MUTED }}>ECC {ecLevel}</span>
                        </div>
                      )}
                      {scanOpen && scanScore.issues.length > 0 && (
                        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                          {scanScore.issues.map(issue => (
                            <div key={issue.id} style={{ display:"flex", alignItems:"flex-start", gap:7, padding:"7px 9px", background:`${issue.severity==="critical"?"rgba(255,107,107,0.07)":issue.severity==="warning"?"rgba(249,115,22,0.06)":"rgba(255,255,255,0.03)"}`, border:`1px solid ${issue.severity==="critical"?"rgba(255,107,107,0.2)":issue.severity==="warning"?"rgba(249,115,22,0.18)":"rgba(255,255,255,0.07)"}`, borderRadius:8 }}>
                              <span style={{ fontSize:11, flexShrink:0, marginTop:1 }}>{issue.severity==="critical"?"🔴":issue.severity==="warning"?"🟡":"🔵"}</span>
                              <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ color:"#F5F0E8", fontSize:10.5, fontWeight:600, margin:"0 0 1px" }}>{issue.title}</p>
                                <p style={{ color:MUTED, fontSize:9, margin:0, lineHeight:1.45 }}>{issue.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {scanScore.grade !== "Excellent" && (<>
                        <button type="button" onClick={autoFix}
                          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"9px", background:`${scanScore.gradeColor}1c`, border:`1px solid ${scanScore.gradeColor}55`, borderRadius:10, color:scanScore.gradeColor, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                          <Sparkles size={13}/> Optimiser automatiquement
                        </button>
                        {/* … ou un thème lisible prêt-à-l'emploi */}
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ color:MUTED, fontSize:10.5, flexShrink:0 }}>ou un thème&nbsp;:</span>
                          <div style={{ display:"flex", gap:6, flex:1 }}>
                            {THEME_SUGGESTIONS.map(t => (
                              <button key={t.name} type="button" onClick={() => applyTheme(t)} title={`Appliquer le thème ${t.name}`}
                                style={{ flex:1, display:"flex", alignItems:"center", gap:6, padding:"5px 8px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, cursor:"pointer", color:"#C9C3B6", fontSize:10.5, fontWeight:600 }}>
                                <span style={{ width:13, height:13, borderRadius:4, flexShrink:0, background:t.bg, border:"1px solid rgba(0,0,0,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                  <span style={{ width:6, height:6, borderRadius:1.5, background:t.fg }}/>
                                </span>
                                {t.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>)}
                    </div>
                  )}

                  {/* Assistant : prochaine étape contextuelle selon l'état du QR */}
                  {(() => {
                    const published = active.pages?.status === "published"
                    const scans = active.total_scans ?? 0
                    const recBtn = { flexShrink: 0, display: "inline-flex", alignItems: "center", padding: "7px 13px", borderRadius: 8, background: "color-mix(in srgb, var(--accent) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)", color: G, fontSize: 11.5, fontWeight: 700, cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" as const }
                    let icon: string, text: ReactNode, cta: ReactNode
                    if (!published) {
                      icon = "🚀"; text = <>Publiez votre page pour activer ce QR.</>
                      cta = <a href={`/dashboard/builder/${active.page_id}`} style={recBtn}>Publier</a>
                    } else if (scans === 0) {
                      icon = "📣"; text = <>Aucun scan pour l&apos;instant — testez-le ou partagez-le.</>
                      cta = <button type="button" onClick={() => setShowModal(true)} style={recBtn}>Tester</button>
                    } else if (PLAN_RANK[userPlan] < PLAN_RANK["pro"]) {
                      icon = "🔥"; text = <><strong style={{ color: "#F5F0E8" }}>{scans}</strong> scan{scans > 1 ? "s" : ""} ! Passez Pro pour les stats avancées.</>
                      cta = <a href="/upgrade" style={recBtn}>Passer Pro</a>
                    } else {
                      icon = "🖨️"; text = <><strong style={{ color: "#F5F0E8" }}>{scans}</strong> scan{scans > 1 ? "s" : ""} — créez un support imprimable.</>
                      cta = <button type="button" onClick={() => setActiveTab("supports")} style={recBtn}>Créer un support</button>
                    }
                    return (
                      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 11, textAlign: "left", padding: "12px 14px", borderRadius: 13, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                        <p style={{ flex: 1, minWidth: 0, margin: 0, color: "#C9C3B6", fontSize: 12.5, lineHeight: 1.45 }}>{text}</p>
                        {cta}
                      </div>
                    )
                  })()}
                </div>

                {/* Actions rapides */}
                <div style={{ order: isMobile ? 2 : 0, display:"flex", flexDirection:"column", gap:7, width:"100%" }}>
                  <button type="button" onClick={() => downloadPNG(1024)}
                    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"11px", background:"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", border:"none", borderRadius:10, color:"#080808", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                    <Download size={15}/> Télécharger
                  </button>
                  <div style={{ display:"flex", gap:6, width:"100%" }}>
                    <button type="button" onClick={() => setShowModal(true)}
                      style={{ flex:1.3, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px", background:"color-mix(in srgb, var(--accent) 12%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 35%, transparent)", borderRadius:9, color:"#C9A84C", fontSize:11.5, fontWeight:700, cursor:"pointer" }}>
                      <Eye size={13}/> Tester
                    </button>
                    <button type="button" onClick={() => copy("link")}
                      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px", background:copied==="link"?"rgba(57,255,143,0.1)":"rgba(255,255,255,0.04)", border:`1px solid ${copied==="link"?"rgba(57,255,143,0.3)":"rgba(255,255,255,0.08)"}`, borderRadius:9, color:copied==="link"?"var(--success)":"#A8A190", fontSize:11, cursor:"pointer", transition:"all 0.15s" }}>
                      {copied==="link" ? <Check size={12}/> : <Copy size={12}/>}
                      {copied==="link" ? "Copié !" : "Copier"}
                    </button>
                    <a href={pageUrl} target="_blank" rel="noopener noreferrer"
                      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, color:"#A8A190", fontSize:11, textDecoration:"none" }}>
                      <ExternalLink size={12}/> Ouvrir
                    </a>
                  </div>
                </div>
              </div>

              {/* Stats RETIRÉES du flux principal (§2/§9) — masquées via LEGACY_INFO (réversible). */}
              {LEGACY_INFO && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                {[
                  { label:"Scans total",   value:active.total_scans.toLocaleString(),               color:"var(--accent)", icon:"📡" },
                  { label:"Vues page",     value:(active.pages?.total_views ?? 0).toLocaleString(),  color:"var(--success)", icon:"👁" },
                  { label:"Dernier scan",  value:formatDate(active.last_scan_at),                   color:"#A8A190", icon:"🕐" },
                  { label:"Créé le",       value:new Date(active.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}), color:"#A8A190", icon:"📅" },
                ].map((s,i) => (
                  <div key={i} style={{ background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.06)", borderRadius:9, padding:"10px 12px" }}>
                    <p style={{ color:"#A8A190", fontSize:9, textTransform:"uppercase", letterSpacing:1.2, margin:"0 0 4px" }}>{s.icon} {s.label}</p>
                    <p style={{ color:s.color, fontSize:12, fontWeight:700, margin:0 }}>{s.value}</p>
                  </div>
                ))}
              </div>
              )}

              {/* Destination — éditable PAR QR depuis le menu ··· (modale ; §11 : hors du flux permanent). */}
              <Modal open={destModal} onClose={() => setDestModal(false)} title="Destination du QR" maxWidth={460}>
              <div>

                {/* Header */}
                <div style={{ padding:"12px 16px 10px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:getDestStatusColor(destOverride) }}/>
                    <p style={{ color:"#A8A190", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, margin:0 }}>
                      Destination {destOverride ? "* Modifiee" : "* Page par defaut"}
                    </p>
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <button type="button" onClick={copyDest}
                      style={{ width:22, height:22, background:"none", border:"none", cursor:"pointer", color:destCopied?"var(--success)":"#A8A190", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {destCopied ? <Check size={11}/> : <Copy size={11}/>}
                    </button>
                    <a href={getDestUrl(destOverride)} target="_blank" rel="noopener noreferrer"
                      style={{ width:22, height:22, background:"none", border:"none", color:"#A8A190", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <ExternalLink size={11}/>
                    </a>
                    {destMode === "view" ? (
                      <button type="button" onClick={() => { setDestMode("edit"); setDestType("url"); setDestValue(""); setDestError("") }}
                        style={{ width:22, height:22, background:"none", border:"none", cursor:"pointer", color:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Pencil size={11}/>
                      </button>
                    ) : (
                      <button type="button" onClick={() => setDestMode("view")}
                        style={{ width:22, height:22, background:"none", border:"none", cursor:"pointer", color:"#A8A190", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <X size={11}/>
                      </button>
                    )}
                  </div>
                </div>

                {/* URL actuelle */}
                <div style={{ padding:"0 16px 10px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 10px", background:"#0F0E0B", border:`1px solid ${destOverride?"rgba(56,189,248,0.25)":"rgba(255,255,255,0.07)"}`, borderRadius:8 }}>
                    <span style={{ fontSize:13, flexShrink:0 }}>
                      {DEST_TYPES.find(d => d.id === (destOverride?.type ?? "page"))?.icon ?? "📄"}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ color:"#A8A190", fontSize:8, textTransform:"uppercase", letterSpacing:1, margin:"0 0 1px" }}>
                        {getDestLabel(destOverride)}
                      </p>
                      <code style={{ color:"var(--accent)", fontSize:9, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const, display:"block" }}>
                        {getDestUrl(destOverride)}
                      </code>
                    </div>
                    {destOverride && (
                      <button type="button" onClick={removeDest} disabled={destLoading}
                        style={{ width:20, height:20, background:"rgba(255,107,107,0.1)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--danger)", flexShrink:0 }}>
                        <X size={10}/>
                      </button>
                    )}
                  </div>

                  {/* Message dynamique */}
                  {!destOverride && (
                    <p style={{ color:"rgba(138,132,120,0.6)", fontSize:9, margin:"5px 0 0", lineHeight:1.5 }}>
                      ?️ Ce QR est dynamique : changez la destination sans reimprimer.
                    </p>
                  )}
                </div>

                {/* Formulaire edition */}
                {destMode === "edit" && (
                  <div style={{ padding:"0 16px 12px", display:"flex", flexDirection:"column", gap:8 }}>

                    {/* Type */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4 }}>
                      {DEST_TYPES.map(dt => (
                        <button key={dt.id} type="button" onClick={() => { setDestType(dt.id as any); setDestValue(""); setDestError("") }}
                          style={{ padding:"5px 4px", background:destType===dt.id?"color-mix(in srgb, var(--accent) 10%, transparent)":"rgba(255,255,255,0.02)", border:`1px solid ${destType===dt.id?"color-mix(in srgb, var(--accent) 35%, transparent)":"rgba(255,255,255,0.07)"}`, borderRadius:7, cursor:"pointer", textAlign:"center" as const }}>
                          <span style={{ fontSize:12, display:"block", marginBottom:1 }}>{dt.icon}</span>
                          <span style={{ color:destType===dt.id?G:"#A8A190", fontSize:8, fontWeight:destType===dt.id?700:400 }}>{dt.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Valeur */}
                    <input
                      value={destValue}
                      onChange={e => { setDestValue(e.target.value); setDestError("") }}
                      placeholder={DEST_TYPES.find(d => d.id === destType)?.ph ?? ""}
                      style={{ width:"100%", background:"#111009", border:`1px solid ${destError?"rgba(255,107,107,0.4)":"rgba(255,255,255,0.08)"}`, borderRadius:8, padding:"8px 10px", color:"#F5F0E8", fontSize:11, outline:"none", boxSizing:"border-box" as const }}/>

                    {/* Label optionnel */}
                    <input
                      value={destLabel}
                      onChange={e => setDestLabel(e.target.value)}
                      placeholder="Note interne (optionnel)"
                      style={{ width:"100%", background:"#111009", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8, padding:"7px 10px", color:"#F5F0E8", fontSize:10, outline:"none", boxSizing:"border-box" as const }}/>

                    {destError && (
                      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 9px", background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:7 }}>
                        <AlertTriangle size={11} color="var(--danger)"/>
                        <span style={{ color:"var(--danger)", fontSize:10 }}>{destError}</span>
                      </div>
                    )}

                    {/* Warning changement critique */}
                    {destValue && !destConfirm && (
                      <div style={{ display:"flex", alignItems:"flex-start", gap:6, padding:"7px 9px", background:"color-mix(in srgb, var(--accent) 7%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:7 }}>
                        <AlertTriangle size={10} color="#C9A84C" style={{ marginTop:1, flexShrink:0 }}/>
                        <p style={{ color:"#C9A84C", fontSize:9, margin:0, lineHeight:1.5 }}>
                          Les QR deja imprimes pointeront vers cette nouvelle destination.
                        </p>
                      </div>
                    )}

                    <div style={{ display:"flex", gap:6 }}>
                      <button type="button" onClick={() => setDestMode("view")}
                        style={{ flex:1, padding:"8px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, color:"#A8A190", fontSize:11, cursor:"pointer" }}>
                        Annuler
                      </button>
                      <button type="button" onClick={() => destValue ? setDestConfirm(true) : null} disabled={!destValue || destLoading}
                        style={{ flex:2, padding:"8px", background:destValue?"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))":"rgba(255,255,255,0.05)", border:"none", borderRadius:8, color:destValue?"#080808":"#A8A190", fontSize:11, fontWeight:700, cursor:destValue&&!destLoading?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                        {destLoading ? <><Loader2 size={11} style={{ animation:"mo-spin 0.8s linear infinite" }}/> Enregistrement...</> : destSaved ? <><Check size={11}/> Applique !</> : "Appliquer la destination"}
                      </button>
                    </div>

                    {/* Modal confirmation */}
                    {destConfirm && (
                      <div style={{ padding:"10px 12px", background:"rgba(255,107,107,0.07)", border:"1px solid rgba(255,107,107,0.25)", borderRadius:9 }}>
                        <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:700, margin:"0 0 6px" }}>Confirmer le changement</p>
                        <p style={{ color:"#A8A190", fontSize:10, margin:"0 0 10px", lineHeight:1.5 }}>
                          Tous les QR codes imprimes pointeront vers <strong style={{ color:"#F5F0E8" }}>{destValue}</strong>. Cette action est immediate.
                        </p>
                        <div style={{ display:"flex", gap:6 }}>
                          <button type="button" onClick={() => setDestConfirm(false)}
                            style={{ flex:1, padding:"7px", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, color:"#A8A190", fontSize:11, cursor:"pointer" }}>
                            Annuler
                          </button>
                          <button type="button" onClick={saveDest} disabled={destLoading}
                            style={{ flex:2, padding:"7px", background:"linear-gradient(90deg,var(--danger),#e05555)", border:"none", borderRadius:7, color:"#F5F0E8", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                            Confirmer le changement
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Historique */}
                {destMode === "view" && destHistory.length > 0 && (
                  <div style={{ padding:"0 16px 12px" }}>
                    <p style={{ color:"#A8A190", fontSize:8, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, margin:"0 0 6px" }}>
                      Historique ({destHistory.length})
                    </p>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {destHistory.slice(0, 5).map((h, i) => {
                        const cfg = DEST_TYPES.find(d => d.id === h.type)
                        return (
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 8px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:7 }}>
                            <span style={{ fontSize:11, flexShrink:0 }}>{cfg?.icon ?? "📄"}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ color:"#A8A190", fontSize:9, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                                {h.label || cfg?.label || h.type}
                              </p>
                              <code style={{ color:"color-mix(in srgb, var(--accent) 60%, transparent)", fontSize:8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const, display:"block" }}>
                                {h.url || h.value}
                              </code>
                            </div>
                            <button type="button" onClick={() => restoreDest(i)} disabled={destLoading}
                              style={{ padding:"3px 7px", background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:5, color:"#C9A84C", fontSize:8, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center" }}>
                              <RotateCcw size={11}/>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              </Modal>


{/* Diagnostic scannabilité premium — masqué (redondant avec la ligne sous le QR) ; SHOW_DIAG réversible. */}
              {SHOW_DIAG && scanScore && (
                <div ref={scanWidgetRef} style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"12px 16px" }}>

                  {/* Resume compact (repli par defaut si tout est bon) — ne mange plus l'ecran */}
                  <button type="button" onClick={() => setScanOpen(o => !o)}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 11px", background:`${scanScore.gradeColor}0e`, border:`1px solid ${scanScore.gradeColor}33`, borderRadius:12, cursor: scanScore.issues.length ? "default" : "pointer", textAlign:"left" as const }}>
                    <span style={{ width:30, height:30, borderRadius:"50%", background:scanScore.gradeColor, color:"#080808", fontSize:12, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{scanScore.score}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ color:scanScore.gradeColor, fontSize:12.5, fontWeight:800, margin:0 }}>{scanScore.grade} · scannabilité</p>
                      <p style={{ color:"#A8A190", fontSize:10, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>Contraste {scanScore.ratio}:1 · ECC {ecLevel}</p>
                    </div>
                    {scanScore.issues.length === 0 && <ChevronDown size={16} color="#A8A190" style={{ transform: scanOpen ? "rotate(180deg)" : "none", transition:"transform .2s", flexShrink:0 }}/>}
                  </button>

                  {(scanOpen || scanScore.issues.length > 0) && (<div style={{ marginTop:14 }}>

                  {/* Score central premium */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginBottom:14 }}>
                    <div style={{ position:"relative", width:96, height:96 }}>
                      <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform:"rotate(-90deg)" }}>
                        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
                        <circle cx="48" cy="48" r="40" fill="none"
                          stroke={scanScore.gradeColor} strokeWidth="7"
                          strokeDasharray={`${(scanScore.score/100)*251.2} 251.2`}
                          strokeLinecap="round"
                          style={{ transition:"stroke-dasharray 0.6s ease, stroke 0.3s", filter:`drop-shadow(0 0 6px ${scanScore.gradeColor}66)` }}/>
                      </svg>
                      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ color:scanScore.gradeColor, fontSize:28, fontWeight:800, lineHeight:1 }}>{scanScore.score}</span>
                        <span style={{ color:"#A8A190", fontSize:9, marginTop:2 }}>/ 100</span>
                      </div>
                    </div>
                    <span style={{ background:`${scanScore.gradeColor}15`, border:`1px solid ${scanScore.gradeColor}40`, borderRadius:8, padding:"4px 14px", fontSize:13, color:scanScore.gradeColor, fontWeight:700 }}>
                      {scanScore.grade}
                    </span>
                  </div>

                  {/* Chips infos */}
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const, justifyContent:"center", marginBottom:14 }}>
                    <span style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, padding:"3px 9px", fontSize:9, color:"#A8A190" }}>
                      Contraste {scanScore.ratio}:1
                    </span>
                    <span style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, padding:"3px 9px", fontSize:9, color:"#A8A190" }}>
                      Taille min {scanScore.minSize}
                    </span>
                    <span style={{ background:`${ecLevel==="H"?"rgba(57,255,143,0.1)":ecLevel==="M"?"color-mix(in srgb, var(--accent) 10%, transparent)":"rgba(249,115,22,0.1)"}`, border:`1px solid ${ecLevel==="H"?"rgba(57,255,143,0.25)":ecLevel==="M"?"color-mix(in srgb, var(--accent) 25%, transparent)":"rgba(249,115,22,0.25)"}`, borderRadius:6, padding:"3px 9px", fontSize:9, color:ecLevel==="H"?"var(--success)":ecLevel==="M"?G:"#F97316" }}>
                      ECC {ecLevel}
                    </span>
                  </div>

                  {/* Bouton corriger auto (proeminent) */}
                  {scanScore.canAutoFix && (
                    <button type="button" onClick={autoFix}
                      style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"10px", marginBottom:12, background:"color-mix(in srgb, var(--accent) 10%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius:9, color:G, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      <Check size={13}/> Corriger automatiquement
                    </button>
                  )}

                  {/* Etat : tout bon -> checklist verte */}
                  {scanScore.issues.length === 0 ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {[
                        `Contraste parfait (${scanScore.ratio}:1)`,
                        "Marge suffisante pour la détection",
                        `Correction d'erreur optimale (ECC ${ecLevel})`,
                      ].map((txt, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:"rgba(57,255,143,0.05)", border:"1px solid rgba(57,255,143,0.15)", borderRadius:8 }}>
                          <Check size={13} color="var(--success)" style={{ flexShrink:0 }}/>
                          <span style={{ color:"#F5F0E8", fontSize:11 }}>{txt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Liste des problemes */
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {scanScore.issues.map(issue => (
                        <div key={issue.id} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"9px 10px", background:`${issue.severity==="critical"?"rgba(255,107,107,0.07)":issue.severity==="warning"?"rgba(249,115,22,0.06)":"rgba(255,255,255,0.03)"}`, border:`1px solid ${issue.severity==="critical"?"rgba(255,107,107,0.2)":issue.severity==="warning"?"rgba(249,115,22,0.18)":"rgba(255,255,255,0.07)"}`, borderRadius:9 }}>
                          <span style={{ fontSize:12, flexShrink:0, marginTop:1 }}>
                            {issue.severity==="critical"?"🔴":issue.severity==="warning"?"🟡":"🔵"}
                          </span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ color:"#F5F0E8", fontSize:11, fontWeight:600, margin:"0 0 2px" }}>{issue.title}</p>
                            <p style={{ color:"#A8A190", fontSize:9, margin:0, lineHeight:1.5 }}>{issue.detail}</p>
                            {issue.fix && (
                              <p style={{ color:`${issue.severity==="critical"?"var(--danger)":"#F97316"}`, fontSize:9, margin:"3px 0 0", fontWeight:600 }}>
                                {issue.fix}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>)}

                </div>
              )}


            </div>
          )
        })() : (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:16, padding:32 }}>
            <div style={{ width:72, height:72, borderRadius:20, background:"color-mix(in srgb, var(--accent) 6%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 12%, transparent)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <QrCode size={28} color="color-mix(in srgb, var(--accent) 40%, transparent)"/>
            </div>
            {qrCodes.length === 0 ? (
              <>
                <div style={{ textAlign:"center" as const }}>
                  <p style={{ color:"#F5F0E8", fontSize:15, fontWeight:700, margin:"0 0 6px" }}>Bienvenue dans QR Codes Studio</p>
                  <p style={{ color:MUTED, fontSize:12, margin:0, lineHeight:1.6 }}>Créez votre première page pour générer<br/>un QR Code personnalisable.</p>
                </div>
                <a href="/dashboard" style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"11px 20px", background:"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", borderRadius:10, color:"#080808", fontSize:13, fontWeight:700, textDecoration:"none", boxShadow:"0 4px 14px color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                  <Plus size={15}/> Créer ma première page
                </a>
              </>
            ) : (
              <div style={{ textAlign:"center" as const }}>
                <p style={{ color:"#F5F0E8", fontSize:14, fontWeight:600, margin:"0 0 6px" }}>Aucun QR selectionne</p>
                <p style={{ color:MUTED, fontSize:12, margin:0, lineHeight:1.6 }}>Choisissez un QR dans la liste<br/>pour le personnaliser</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* -- COL 3 : Personnalisation premium ------------------------------------ */}
      <div className="qr-col-settings" style={{ borderLeft:"1px solid rgba(255,255,255,0.06)", display:(isMobile && mobileView==="list") ? "none" : "flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Section label */}
        <div style={{ padding:"10px 16px 8px", borderBottom:"1px solid rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:0 }}>Personnaliser</p>
          {active && saved && (
            <span style={{ color:"var(--success)", fontSize:9, display:"flex", alignItems:"center", gap:3 }}>
              <Check size={9}/> Sauvegarde
            </span>
          )}
        </div>

        {/* Tabs principaux Style/Export */}
        <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
          {([["style","Style","🎨"],["export","Télécharger","📤"],["supports","Supports","🖨️"]] as const).map(([id,label,emoji]) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)}
              style={{ flex:1, minHeight:isMobile?48:undefined, padding:isMobile?"14px 8px":"11px 8px", background:activeTab===id?"color-mix(in srgb, var(--accent) 14%, transparent)":"transparent", border:"none", borderBottom:activeTab===id?`3px solid ${G}`:"3px solid transparent", color:activeTab===id?G:MUTED, fontSize:isMobile?13.5:12, fontWeight:activeTab===id?800:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
              <span>{emoji}</span>{label}
            </button>
          ))}
        </div>

        {/* Fil guidé (mobile) : étape courante + Suivant, sans bloquer les onglets */}
        {isMobile && active && (() => {
          const steps = ["style","export","supports"] as const
          const labels: Record<string,string> = { style:"Style", supports:"Supports", export:"Télécharger" }
          const idx = steps.indexOf(activeTab as any)
          const next = steps[idx + 1]
          return (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"9px 14px", borderBottom:"1px solid rgba(255,255,255,0.05)", background:"rgba(255,255,255,0.015)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                {steps.map((_, i) => (
                  <span key={i} style={{ width:i===idx?16:6, height:6, borderRadius:3, background:i<=idx?G:"rgba(255,255,255,0.15)", transition:"all 0.25s" }}/>
                ))}
                <span style={{ color:MUTED, fontSize:11, marginLeft:4 }}>Étape {idx+1}/3 · {labels[activeTab]}</span>
              </div>
              {next ? (
                <button type="button" onClick={() => setActiveTab(next)}
                  style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 13px", borderRadius:8, background:"color-mix(in srgb, var(--accent) 14%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 35%, transparent)", color:G, fontSize:11.5, fontWeight:700, cursor:"pointer" }}>
                  {labels[next]} <ArrowRight size={12}/>
                </button>
              ) : (
                <span style={{ color:"var(--success)", fontSize:11, fontWeight:600 }}>Dernière étape ✓</span>
              )}
            </div>
          )
        })()}

        {activeTab === "style" && active && (
          <div className="qr-scroll" style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>

            {/* Onglets Apparence/Branding/Qualité RETIRÉS (§4/6/7) — une seule hiérarchie verticale d'accordéons. */}

            <div className="qr-scroll" style={{ flex:1, overflowY:"auto", padding:"14px" }}>

              {/* -- APPARENCE (accordeons) ----------------------------------- */}
              {(
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>

                  {/* Niveau de réglages : désencombre le panneau (Simple → Expert) */}
                  {isMobile ? (
                    // Mobile : bouton compact -> bottom sheet (§10)
                    <button type="button" onClick={() => setModeSheet(true)}
                      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, width:"100%", padding:"10px 14px", marginBottom:4, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:11, color:"#F5F0E8", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                      <span>Mode : <strong style={{ color:"var(--accent)" }}>{level==="simple"?"Simple":level==="inter"?"Intermédiaire":"Expert"}</strong></span>
                      <ChevronDown size={16} color="#A8A190" />
                    </button>
                  ) : (<>
                    <div style={{ marginBottom:8 }}>
                      <SegmentedControl dense ariaLabel="Niveau de réglages"
                        labels={["Simple","Intermédiaire","Expert"]}
                        value={level==="simple"?0:level==="inter"?1:2}
                        onChange={i => setLevel(i===0?"simple":i===1?"inter":"expert")} />
                    </div>
                    <p style={{ color:MUTED, fontSize:9.5, margin:"0 0 4px", lineHeight:1.4 }}>
                      {level==="simple" ? "L'essentiel : choisir un style et les couleurs. Idéal pour aller vite." : level==="inter" ? "+ formes des modules et des coins." : "Tous les réglages : logo, dégradés, marge, correction d'erreur…"}
                    </p>
                  </>)}

                  {/* 1. « Choisir un style » (presets) RETIRÉ — Couleurs suffit (SHOW_PRESETS, réversible). */}
                  {SHOW_PRESETS && (
                  <AccSection id="presets" title="Choisir un style" icon="✨" openId={openAcc} setOpenId={setOpenAcc}>
                    {/* Bouton style automatique */}
                    <button type="button" onClick={autoStyle}
                      style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:7, marginBottom:autoMsg?6:12, padding:"10px", background:"linear-gradient(90deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--accent) 8%, transparent))", border:"1px solid color-mix(in srgb, var(--accent) 35%, transparent)", borderRadius:10, color:G, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      <Sparkles size={14}/> Générer un style automatiquement
                    </button>
                    {autoMsg && (
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12, padding:"7px 10px", background:"rgba(57,255,143,0.08)", border:"1px solid rgba(57,255,143,0.25)", borderRadius:8, color:"var(--success)", fontSize:11, fontWeight:600 }}>
                        <Check size={12}/> {autoMsg}
                      </div>
                    )}

                    {/* Filtres par metier */}
                    <div style={{ display:"flex", gap:4, overflowX:"auto", paddingBottom:8, marginBottom:10 }}>
                      {PRESET_CATS.map(cat => {
                        const isReco = cat.id !== "all" && cat.id === detectCat()
                        return (
                        <button key={cat.id} type="button" onClick={() => { setSelectedCat(cat.id); setMorePresets(false) }}
                          style={{ position:"relative" as const, display:"inline-flex", alignItems:"center", gap:3, padding:"5px 10px", background:selectedCat===cat.id?"color-mix(in srgb, var(--accent) 15%, transparent)":"rgba(255,255,255,0.04)", border:`1px solid ${selectedCat===cat.id?"color-mix(in srgb, var(--accent) 40%, transparent)":isReco?"rgba(57,255,143,0.4)":"rgba(255,255,255,0.08)"}`, borderRadius:20, color:selectedCat===cat.id?G:MUTED, fontSize:10, fontWeight:selectedCat===cat.id?700:500, cursor:"pointer", whiteSpace:"nowrap" as const, flexShrink:0 }}>
                          <span>{cat.emoji}</span>{cat.label}
                          {isReco && <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--success)", flexShrink:0 }}/>}
                        </button>
                      )})}
                    </div>

                    {/* Grille presets (limitee a 6/9 + "Voir plus" pour ne pas tout deverser, #12) */}
                    {(() => {
                    const _list = PRESETS.filter(p => selectedCat==="all" || p.cat===selectedCat)
                    const _cap = isMobile ? 6 : 9
                    const _shown = morePresets ? _list : _list.slice(0, _cap)
                    const _hidden = _list.length - _shown.length
                    return (<>
                    <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)", gap:isMobile?10:7 }}>
                      {_shown.map(preset => {
                        const canAccess = PLAN_RANK[userPlan] >= presetMinRank(preset.plan)
                        const isActive  = fg===preset.fg && bg===preset.bg
                        const planLabel = preset.plan === "free" ? null : preset.plan === "pro" ? "STARTER" : "PRO"
                        // forme des modules de l'apercu selon le style du preset
                        const dotR = preset.dotStyle === "dot" ? "50%" : preset.dotStyle === "rounded" ? "30%" : "2px"
                        const cornR = preset.cornerStyle === "circle" || preset.cornerStyle === "rounded" || preset.cornerStyle === "luxury" ? "30%" : "2px"
                        return (
                          <div key={preset.id} role="button" tabIndex={0} onKeyDown={onEnterSpace(() => applyPreset(preset))} onClick={() => applyPreset(preset)}
                            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent) 45%, transparent)"; e.currentTarget.style.transform = "translateY(-2px)" } }}
                            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = canAccess?"rgba(255,255,255,0.08)":"color-mix(in srgb, var(--accent) 28%, transparent)"; e.currentTarget.style.transform = "translateY(0)" } }}
                            style={{ position:"relative", cursor:"pointer", borderRadius:10, overflow:"hidden", border:`1.5px solid ${isActive?"var(--accent)":canAccess?"rgba(255,255,255,0.08)":"color-mix(in srgb, var(--accent) 28%, transparent)"}`, transition:"all 0.15s", opacity:1 }}>

                            {/* Apercu QR miniature realiste */}
                            <div style={{ background:preset.bg, padding:"12px", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", minHeight:isMobile?80:64 }}>
                              {preset.gradient && preset.gradient !== "none" && preset.fg2 && (
                                <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg,${preset.fg}25,${preset.fg2}25)` }}/>
                              )}
                              <div style={{ position:"relative", display:"grid", gridTemplateColumns:"repeat(5,1fr)", gridTemplateRows:"repeat(5,1fr)", gap:2, width:isMobile?48:38, height:isMobile?48:38 }}>
                                {/* 3 coins (finder patterns) + modules pseudo-aleatoires */}
                                {Array.from({ length: 25 }).map((_, i) => {
                                  const row = Math.floor(i/5), col = i%5
                                  const isCorner = (row<2&&col<2) || (row<2&&col>2) || (row>2&&col<2)
                                  if (isCorner && ((row===0||row===1)&&(col===0||col===1) || (row===0||row===1)&&(col===3||col===4) || (row===3||row===4)&&(col===0||col===1))) {
                                    // afficher le finder comme un carre plein avec la couleur coin
                                    if ((row===0&&col===0)||(row===0&&col===3)||(row===3&&col===0)) {
                                      return <div key={i} style={{ gridColumn: col===3?"4 / 6":"1 / 3", gridRow: row===3?"4 / 6":"1 / 3", background:preset.cornerColor||preset.fg, borderRadius:cornR }}/>
                                    }
                                    return null
                                  }
                                  // modules data : motif pseudo-aleatoire stable
                                  const on = (i*7 + 3) % 5 < 2
                                  return on ? <div key={i} style={{ background:preset.fg, borderRadius:dotR }}/> : <div key={i}/>
                                })}
                              </div>
                              {isActive && (
                                <div style={{ position:"absolute", top:5, left:5, width:14, height:14, background:G, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                  <Check size={8} color="#080808"/>
                                </div>
                              )}
                            </div>

                            {/* Nom + badge plan */}
                            <div style={{ background:"#0F0E0B", padding:"6px 5px 7px", textAlign:"center" as const }}>
                              <p style={{ color:isActive?G:"#F5F0E8", fontSize:isMobile?11:9, fontWeight:isActive?700:500, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                                {preset.label}
                              </p>
                              {planLabel && (
                                <span style={{ background:preset.plan==="pro"?"color-mix(in srgb, var(--accent) 15%, transparent)":"rgba(57,255,143,0.12)", borderRadius:3, padding:"1px 4px", fontSize:7, color:preset.plan==="pro"?G:"var(--success)", fontWeight:700 }}>
                                  {planLabel}
                                </span>
                              )}
                            </div>

                            {!canAccess && (
                              <div style={{ position:"absolute", top:5, right:5, display:"flex", alignItems:"center", gap:2, padding:"2px 5px", background:preset.plan==="business"?"var(--success)":G, borderRadius:5, boxShadow:"0 2px 7px rgba(0,0,0,0.45)" }}>
                                <Sparkles size={7} color="#080808"/>
                                <span style={{ color:"#080808", fontSize:7, fontWeight:800 }}>{preset.plan==="business"?"BIZ":"PRO"}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {!morePresets && _hidden > 0 && (
                      <button type="button" onClick={() => setMorePresets(true)}
                        style={{ width:"100%", marginTop:10, padding:"11px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, color:G, fontSize:12.5, fontWeight:700, cursor:"pointer" }}>
                        Voir plus de styles ({_hidden})
                      </button>
                    )}
                    </>)
                    })()}

                    {/* Upsell modal inline */}
                  </AccSection>
                  )}

                  {/* 2. Couleurs principales (ouvert par defaut) */}
                  <AccSection id="couleurs" title="Couleurs" icon="🎨" openId={openAcc} setOpenId={setOpenAcc}>
                    {/* Generer une palette */}
                    <button type="button" onClick={genPalette}
                      style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:7, marginBottom:10, padding:"9px", background:"linear-gradient(90deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent) 6%, transparent))", border:"1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius:9, color:G, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      <Sparkles size={13}/> Générer une palette
                    </button>
                    {/* Palettes en un clic */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:6, marginBottom:12 }}>
                      {[
                        { name:"Noir classique", fg:"#0A0A0A", bg:"#FFFFFF" },
                        { name:"Or & Noir",       fg:"#C9A84C", bg:"#0A0A0A" },
                        { name:"Corporate",       fg:"#1E3A5F", bg:"#FFFFFF" },
                        { name:"Néon",            fg:"#39FF14", bg:"#0A0A0A" },
                        { name:"Crypto",          fg:"#F7931A", bg:"#0A0A0A" },
                        { name:"Forêt",           fg:"#2D5A3D", bg:"#F2F4EC" },
                        { name:"Corail",          fg:"#E5634D", bg:"#FFF5F0" },
                        { name:"Océan",           fg:"#0E5C7F", bg:"#EAF4F8" },
                        { name:"Bordeaux",        fg:"#6E1423", bg:"#FBF4F1" },
                        { name:"Minimal",         fg:"#4A4A4A", bg:"#F5F5F5" },
                      ].map(p => {
                        const sel = fg.toUpperCase() === p.fg && bg.toUpperCase() === p.bg
                        return (
                          <button key={p.name} type="button" onClick={() => { setFg(p.fg); setBg(p.bg) }}
                            style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 8px", background:sel?"color-mix(in srgb, var(--accent) 12%, transparent)":"rgba(255,255,255,0.02)", border:`1px solid ${sel?G:"rgba(255,255,255,0.07)"}`, borderRadius:8, cursor:"pointer", textAlign:"left" as const }}>
                            <span style={{ width:22, height:22, borderRadius:5, background:p.bg, border:"1px solid rgba(0,0,0,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              <span style={{ width:11, height:11, borderRadius:2, background:p.fg }}/>
                            </span>
                            <span style={{ color:sel?G:"#F5F0E8", fontSize:10, fontWeight:sel?700:500, whiteSpace:"nowrap" as const, overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      <ColorField label="QR principal" value={fg} onChange={setFg}/>
                      <ColorField label="Fond"          value={bg} onChange={setBg}/>
                    </div>
                    {/* Indicateur de contraste en direct */}
                    {(() => {
                      const r = contrastRatio(fg, bg)
                      const ok = r >= 4.5, mid = r >= 3
                      const col = ok ? "var(--success)" : mid ? "#F97316" : "var(--danger)"
                      const txt = ok ? "Bon contraste" : mid ? "Contraste moyen" : "Contraste insuffisant"
                      return (
                        <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:10, padding:"7px 10px", background:`${col}10`, border:`1px solid ${col}30`, borderRadius:8 }}>
                          {ok ? <Check size={12} color={col}/> : <AlertTriangle size={12} color={col}/>}
                          <span style={{ color:col, fontSize:11, fontWeight:600 }}>{txt}</span>
                          <span style={{ color:MUTED, fontSize:10, marginLeft:"auto" }}>{r.toFixed(1)}:1</span>
                        </div>
                      )
                    })()}
                  </AccSection>

                  {/* 3. Style des modules (Intermédiaire+) */}
                  {level !== "simple" && (
                  <AccSection id="modules" title="Style des modules" icon="🔲" openId={openAcc} setOpenId={setOpenAcc}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                      {DOT_STYLES.map(ds => {
                        const isActive = (styleConf.dotStyle??"square") === ds.id
                        const isPro = ["pixel","neon","luxury"].includes(ds.id ?? "")
                        const canAccess = !isPro || PLAN_RANK[userPlan] >= 2
                        return (
                          <button key={ds.id ?? "sq"} type="button" onClick={() => canAccess ? setStyleConf(p => ({ ...p, dotStyle: ds.id })) : setUpsell({ feature: `le style de modules « ${ds.label} »`, plan: "pro" })}
                            style={{ position:"relative", padding:"10px 8px", background:isActive?"color-mix(in srgb, var(--accent) 10%, transparent)":"rgba(255,255,255,0.02)", border:`1px solid ${isActive?"color-mix(in srgb, var(--accent) 40%, transparent)":"rgba(255,255,255,0.07)"}`, borderRadius:9, cursor:"pointer", opacity:canAccess?1:0.85, textAlign:"center" as const }}>
                            <div style={{ fontSize:18, marginBottom:4 }}>{ds.emoji}</div>
                            <p style={{ color:isActive?G:"#F5F0E8", fontSize:10, fontWeight:isActive?700:500, margin:0 }}>{ds.label}</p>
                            {isPro && !canAccess && (
                              <span style={{ position:"absolute", top:4, right:4, display:"inline-flex", alignItems:"center", gap:1, background:G, borderRadius:4, padding:"1px 4px", fontSize:7, color:"#080808", fontWeight:800, boxShadow:"0 2px 6px rgba(0,0,0,0.4)" }}><Sparkles size={6} color="#080808"/>PRO</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </AccSection>

                  )}

                  {/* 4. Style des coins (Intermédiaire+) */}
                  {level !== "simple" && (
                  <AccSection id="coins" title="Style des coins" icon="⬛" openId={openAcc} setOpenId={setOpenAcc}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:14 }}>
                      {CORNER_STYLE_LIST.map(cs => {
                        const isActive = (styleConf.cornerStyle??"square") === cs.id
                        const isPro = ["diamond","luxury"].includes(cs.id ?? "")
                        const canAccess = !isPro || PLAN_RANK[userPlan] >= 2
                        return (
                          <button key={cs.id ?? "sq"} type="button" onClick={() => {
                        if (!canAccess) { setUpsell({ feature: `le style de coins « ${cs.label} »`, plan: "pro" }); return }
                        setStyleConf(p => ({ ...p, cornerStyle: cs.id }))
                        if (cs.id === "rounded" || cs.id === "circle" || cs.id === "luxury") setCorner("rounded")
                        else if (cs.id === "minimal") setCorner("dot")
                        else setCorner("square")
                      }}
                            style={{ padding:"10px 8px", background:isActive?"color-mix(in srgb, var(--accent) 10%, transparent)":"rgba(255,255,255,0.02)", border:`1px solid ${isActive?"color-mix(in srgb, var(--accent) 40%, transparent)":"rgba(255,255,255,0.07)"}`, borderRadius:9, cursor:"pointer", opacity:canAccess?1:0.85, position:"relative" as const }}>
                            <p style={{ color:isActive?G:"#F5F0E8", fontSize:11, fontWeight:isActive?700:500, margin:0, textAlign:"center" as const }}>{cs.label}</p>
                            {isPro && !canAccess && (
                              <span style={{ position:"absolute", top:4, right:4, display:"inline-flex", alignItems:"center", gap:1, background:G, borderRadius:4, padding:"1px 4px", fontSize:7, color:"#080808", fontWeight:800, boxShadow:"0 2px 6px rgba(0,0,0,0.4)" }}><Sparkles size={6} color="#080808"/>PRO</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 8px" }}>Arrondi general</p>
                    <div style={{ display:"flex", gap:6 }}>
                      {(["square","rounded","dot"] as const).map(c => (
                        <button key={c} type="button" onClick={() => setCorner(c)}
                          style={{ flex:1, padding:"7px 6px", background:corner===c?"color-mix(in srgb, var(--accent) 12%, transparent)":"rgba(255,255,255,0.03)", border:`1px solid ${corner===c?"color-mix(in srgb, var(--accent) 40%, transparent)":"rgba(255,255,255,0.07)"}`, borderRadius:8, color:corner===c?G:MUTED, fontSize:10, cursor:"pointer", fontWeight:corner===c?700:400 }}>
                          {c==="square"?"Carré":c==="rounded"?"Arrondi":"Dots"}
                        </button>
                      ))}
                    </div>
                  </AccSection>

                  )}

                  {/* 5. Reglages avances (Expert) : logo, couleurs avancees + degrade */}
                  {level === "expert" && (
                  <AccSection id="avances" title="Réglages avancés" icon="⚙️" openId={openAcc} setOpenId={setOpenAcc}>
                    <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 8px" }}>Couleurs avancees</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                      {([
                        { label:"QR secondaire",   key:"fg2"         },
                        { label:"Couleur coins",   key:"cornerColor" },
                        { label:"Couleur yeux",    key:"eyeColor"    },
                        { label:"Fond dégradé",    key:"gradientBg"  },
                      ] as const).map(c => (
                        <ColorField key={c.key} label={c.label}
                          value={(styleConf as any)[c.key] ?? ""}
                          onChange={(hex) => setStyleConf(p => ({ ...p, [c.key]: hex }))}
                          onClear={() => setStyleConf(p => ({ ...p, [c.key]: "" }))}/>
                      ))}
                    </div>

                    {/* Fond transparent */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:9, marginBottom:14 }}>
                      <div>
                        <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:"0 0 2px" }}>Fond transparent</p>
                        <p style={{ color:MUTED, fontSize:10, margin:0 }}>PNG avec canal alpha</p>
                      </div>
                      <button type="button" onClick={() => setStyleConf(p => ({ ...p, transparent: !p.transparent }))}
                        style={{ width:38, height:22, borderRadius:11, background:styleConf.transparent?"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))":"rgba(255,255,255,0.1)", border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
                        <div style={{ position:"absolute", top:3, left:styleConf.transparent?18:3, width:16, height:16, borderRadius:"50%", background:"#F5F0E8", transition:"left 0.2s" }}/>
                      </button>
                    </div>

                    <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 8px" }}>Degrade</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                      {GRADIENT_OPTS.map(g => (
                        <button key={g.id ?? "none"} type="button" onClick={() => setStyleConf(p => ({ ...p, gradient: g.id ?? "none" }))}
                          style={{ padding:"7px 8px", background:(styleConf.gradient??"none")===(g.id??"none")?"color-mix(in srgb, var(--accent) 10%, transparent)":"rgba(255,255,255,0.02)", border:`1px solid ${(styleConf.gradient??"none")===(g.id??"none")?"color-mix(in srgb, var(--accent) 35%, transparent)":"rgba(255,255,255,0.07)"}`, borderRadius:8, color:(styleConf.gradient??"none")===(g.id??"none")?G:MUTED, fontSize:10, cursor:"pointer", fontWeight:(styleConf.gradient??"none")===(g.id??"none")?700:400 }}>
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </AccSection>
                  )}

                </div>
              )}


              {/* -- LOGO (accordéon) --------------------------------------- */}
              {(
                <AccSection id="logo" title="Logo" icon="🖼" openId={openAcc} setOpenId={setOpenAcc}>
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                  {/* ECC warning automatique */}
                  {styleConf.logoUrl && (
                    <div style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 12px", background:"color-mix(in srgb, var(--accent) 7%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:9 }}>
                      <AlertTriangle size={13} color={G}/>
                      <p style={{ color:G, fontSize:11, margin:0, lineHeight:1.4 }}>
                        Correction d&apos;erreur forcée à <strong>H</strong> automatiquement pour garantir la scannabilité.
                      </p>
                    </div>
                  )}

                  {/* Dropzone / apercu */}
                  <div>
                    <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 8px" }}>Logo central</p>

                    {!styleConf.logoUrl ? (
                      <div
                        role="button" tabIndex={0} onKeyDown={onEnterSpace(() => logoInputRef.current?.click())} onClick={() => logoInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = G }}
                        onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)" }}
                        onDrop={e => {
                          e.preventDefault();
                          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"
                          const file = e.dataTransfer.files[0]
                          if (file) handleLogoUpload(file)
                        }}
                        style={{ border:"2px dashed rgba(255,255,255,0.1)", borderRadius:12, padding:"24px 16px", textAlign:"center" as const, cursor:"pointer", transition:"border-color 0.2s", background:"rgba(255,255,255,0.01)" }}>
                        <div style={{ fontSize:28, marginBottom:8 }}>{logoUploading ? "⏳" : "🖼️"}</div>
                        <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:"0 0 4px" }}>
                          {logoUploading ? "Chargement..." : "Deposer votre logo"}
                        </p>
                        <p style={{ color:MUTED, fontSize:10, margin:"0 0 10px" }}>PNG, SVG, WEBP -- max 2 Mo</p>
                        <span style={{ display:"inline-block", padding:"5px 14px", background:"color-mix(in srgb, var(--accent) 10%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius:7, color:G, fontSize:11, fontWeight:600 }}>
                          Parcourir
                        </span>
                        <input ref={logoInputRef} type="file" accept="image/*" style={{ display:"none" }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = "" }}/>
                      </div>
                    ) : (
                      <div style={{ display:"flex", gap:10, alignItems:"center", padding:"12px", background:"rgba(255,255,255,0.02)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:10 }}>
                        <div style={{ width:48, height:48, borderRadius:8, overflow:"hidden", flexShrink:0, background:"rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(255,255,255,0.1)" }}>
                          <img src={styleConf.logoUrl} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:"0 0 2px" }}>Logo actif</p>
                          <p style={{ color:MUTED, fontSize:10, margin:0 }}>ECC forcé H -- scannabilité optimale</p>
                        </div>
                        <button type="button" onClick={removeLogo}
                          style={{ width:30, height:30, background:"rgba(255,107,107,0.1)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--danger)", flexShrink:0 }}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Options logo (si logo actif) */}
                  {styleConf.logoUrl && (
                    <>
                      {/* Taille */}
                      <div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:0 }}>Taille du logo</p>
                          <span style={{ color: (styleConf.logoSize ?? 18) > 25 ? "var(--danger)" : G, fontSize:11, fontWeight:700 }}>
                            {styleConf.logoSize ?? 18}%
                          </span>
                        </div>
                        <input type="range" min={10} max={30} step={1} value={styleConf.logoSize ?? 18}
                          onChange={e => setStyleConf(p => ({ ...p, logoSize: Number(e.target.value) }))}
                          style={{ width:"100%", accentColor: (styleConf.logoSize ?? 18) > 25 ? "var(--danger)" : G, cursor:"pointer" }}/>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:4 }}>
                          <span style={{ color:MUTED, fontSize:9 }}>10% -- Min</span>
                          <span style={{ color:G, fontSize:9, fontWeight:600 }}>✓ 15-20% recommande</span>
                          <span style={{ color:MUTED, fontSize:9 }}>30% -- Max</span>
                        </div>
                        {(styleConf.logoSize ?? 18) > 25 && (
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:7, padding:"7px 10px", background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:8 }}>
                            <AlertTriangle size={12} color="var(--danger)"/>
                            <p style={{ color:"var(--danger)", fontSize:10, margin:0 }}>Logo trop grand -- risque de rendre le QR illisible</p>
                          </div>
                        )}
                      </div>

                      {/* Forme du conteneur */}
                      <div>
                        <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 8px" }}>Forme du conteneur</p>
                        <div style={{ display:"flex", gap:6 }}>
                          {([
                            { id:"square",  label:"Carré",   icon:"⬛" },
                            { id:"rounded", label:"Arrondi", icon:"🔲" },
                            { id:"circle",  label:"Cercle",  icon:"⚫" },
                          ] as const).map(s => (
                            <button key={s.id} type="button" onClick={() => setStyleConf(p => ({ ...p, logoShape: s.id }))}
                              style={{ flex:1, padding:"9px 6px", background:(styleConf.logoShape??"rounded")===s.id?"color-mix(in srgb, var(--accent) 12%, transparent)":"rgba(255,255,255,0.03)", border:`1px solid ${(styleConf.logoShape??"rounded")===s.id?"color-mix(in srgb, var(--accent) 40%, transparent)":"rgba(255,255,255,0.07)"}`, borderRadius:9, cursor:"pointer", textAlign:"center" as const }}>
                              <div style={{ fontSize:16, marginBottom:3 }}>{s.icon}</div>
                              <p style={{ color:(styleConf.logoShape??"rounded")===s.id?G:MUTED, fontSize:9, margin:0, fontWeight:(styleConf.logoShape??"rounded")===s.id?700:400 }}>{s.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Fond du conteneur */}
                      <div>
                        <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 8px" }}>Fond du conteneur</p>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:8 }}>
                          {([
                            { id:"transparent", label:"Transparent" },
                            { id:"white",       label:"Blanc" },
                            { id:"black",       label:"Noir" },
                            { id:"custom",      label:"Personnalise" },
                          ] as const).map(b => (
                            <button key={b.id} type="button" onClick={() => setStyleConf(p => ({ ...p, logoBg: b.id }))}
                              style={{ padding:"7px 8px", background:(styleConf.logoBg??"white")===b.id?"color-mix(in srgb, var(--accent) 10%, transparent)":"rgba(255,255,255,0.02)", border:`1px solid ${(styleConf.logoBg??"white")===b.id?"color-mix(in srgb, var(--accent) 35%, transparent)":"rgba(255,255,255,0.07)"}`, borderRadius:8, color:(styleConf.logoBg??"white")===b.id?G:MUTED, fontSize:10, cursor:"pointer", fontWeight:(styleConf.logoBg??"white")===b.id?700:400 }}>
                              {b.label}
                            </button>
                          ))}
                        </div>
                        {styleConf.logoBg === "custom" && (
                          <ColorField label="Couleur du fond"
                            value={styleConf.logoBgColor ?? "#FFFFFF"}
                            onChange={(hex) => setStyleConf(p => ({ ...p, logoBgColor: hex }))}/>
                        )}
                      </div>

                      {/* Padding */}
                      <div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:0 }}>Padding</p>
                          <span style={{ color:G, fontSize:11, fontWeight:700 }}>{styleConf.logoPadding ?? 4}px</span>
                        </div>
                        <input type="range" min={0} max={12} step={1} value={styleConf.logoPadding ?? 4}
                          onChange={e => setStyleConf(p => ({ ...p, logoPadding: Number(e.target.value) }))}
                          style={{ width:"100%", accentColor:G, cursor:"pointer" }}/>
                      </div>
                    </>
                  )}
                </div>
                </AccSection>
              )}

              {/* -- MARGE & SCANNABILITÉ (accordéon) ------------------------- */}
              {(
                <AccSection id="qualite" title="Marge & scannabilité" icon="🛡" openId={openAcc} setOpenId={setOpenAcc}>
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                  {/* Marge : 2 choix simples (Petit / Grand) — plus de curseur. */}
                  <div>
                    <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 7px" }}>Marge (zone silencieuse)</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                      {([["Petit",8],["Grand",20]] as const).map(([lbl,val]) => {
                        const on = (styleConf.margin ?? 10) <= 12 ? val === 8 : val === 20
                        return (
                          <button key={lbl} type="button" onClick={() => setStyleConf(p => ({ ...p, margin: val }))}
                            style={{ padding:"10px 8px", background:on?"color-mix(in srgb, var(--accent) 12%, transparent)":"rgba(255,255,255,0.02)", border:`1px solid ${on?"color-mix(in srgb, var(--accent) 40%, transparent)":"rgba(255,255,255,0.07)"}`, borderRadius:9, color:on?G:"#F5F0E8", fontSize:12, fontWeight:on?700:500, cursor:"pointer" }}>
                            {lbl}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Correction d'erreur */}
                  <div>
                    <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 8px" }}>Correction erreur</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                      {EC_LEVELS.map(ec => {
                        const locked = (ec.id==="Q"||ec.id==="H") && !canPro
                        return (
                          <button key={ec.id} type="button" onClick={() => locked ? setUpsell({ feature: `la correction d'erreur « ${ec.label} »`, plan: "pro" }) : setEcLevel(ec.id as any)}
                            style={{ position:"relative", padding:"7px 8px", background:ecLevel===ec.id?"color-mix(in srgb, var(--accent) 10%, transparent)":"rgba(255,255,255,0.02)", border:`1px solid ${ecLevel===ec.id?"color-mix(in srgb, var(--accent) 35%, transparent)":"rgba(255,255,255,0.07)"}`, borderRadius:8, color:locked?MUTED:ecLevel===ec.id?G:"#F5F0E8", fontSize:10, cursor:"pointer", opacity:locked?0.5:1, textAlign:"center" as const }}>
                            <div style={{ fontWeight:700, marginBottom:1 }}>{ec.label}</div>
                            <div style={{ color:MUTED, fontSize:9 }}>{ec.desc}</div>
                            {locked && <Lock size={9} color={MUTED} style={{ position:"absolute", top:4, right:4 }}/>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Explication simple ECC */}
                  <p style={{ color:MUTED, fontSize:10, margin:"-4px 0 0", lineHeight:1.5 }}>
                    La correction d&apos;erreur permet au QR de rester lisible meme abime, sale ou partiellement couvert (logo). Plus elle est elevee, plus le QR est robuste -- mais aussi plus dense.
                  </p>
                  {styleConf.logoUrl && (
                    <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 10px", background:"color-mix(in srgb, var(--accent) 7%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:8 }}>
                      <AlertTriangle size={12} color={G}/>
                      <p style={{ color:G, fontSize:10, margin:0, lineHeight:1.4 }}>Un logo est actif : correction forcee a H quel que soit le choix ci-dessus.</p>
                    </div>
                  )}

                  {/* Reset */}
                  <button type="button" onClick={resetColors}
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"9px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, color:MUTED, fontSize:12, cursor:"pointer" }}>
                    <RotateCcw size={12}/> Reinitialiser par defaut
                  </button>
                </div>
                </AccSection>
              )}
            </div>

            {/* Actions en bas */}
            <div style={{ padding:"12px 14px", borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", gap:7, flexShrink:0 }}>
              <button type="button" onClick={saveCustomization} disabled={saving}
                style={{ padding:"10px", background:saved?"rgba(57,255,143,0.12)":"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", border:saved?"1px solid rgba(57,255,143,0.3)":"none", borderRadius:9, color:saved?"var(--success)":"#080808", fontSize:12, fontWeight:700, cursor:saving?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7, opacity:saving?0.7:1, transition:"all 0.2s" }}>
                {saving ? <><Loader2 size={12} style={{ animation:"mo-spin 0.8s linear infinite" }}/> Enregistrement...</>
                  : saved ? <><Check size={12}/> Sauvegarde !</>
                  : <><Palette size={12}/> Enregistrer le style</>}
              </button>
              {saveErr && (
                <div style={{ padding:"8px 10px", background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.25)", borderRadius:8, color:"var(--danger)", fontSize:10, lineHeight:1.4 }}>
                  Echec de l'enregistrement : {saveErr}
                </div>
              )}
              <button type="button" onClick={applyToAll}
                style={{ padding:"9px", background:applyAllOk?"rgba(57,255,143,0.1)":"rgba(255,255,255,0.03)", border:`1px solid ${applyAllOk?"rgba(57,255,143,0.25)":"rgba(255,255,255,0.08)"}`, borderRadius:9, color:applyAllOk?"var(--success)":MUTED, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                {applyAllOk ? <><Check size={11}/> Applique a tous !</> : <><Settings size={11}/> Appliquer a tous mes QR</>}
              </button>
            </div>
          </div>
        )}

        {/* -- Imprimables : entree vers QR Print Studio + explicatif ---------- */}
        {activeTab === "supports" && active && (
          <div className="qr-scroll" style={{ display:"flex", flexDirection:"column", flex:1, overflow:"auto", padding:"18px 16px", gap:14 }}>
            {/* CTA principal : ouvrir l'editeur QR Print Studio */}
            <button type="button" onClick={openEditor}
              style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:9, padding:"15px", background:"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", border:"none", borderRadius:12, color:"#080808", fontSize:14, fontWeight:800, cursor:"pointer", boxShadow:"0 8px 26px color-mix(in srgb, var(--accent) 30%, transparent)" }}>
              <Sparkles size={16}/>
              Ouvrir QR Print Studio
            </button>
            <p style={{ color:MUTED, fontSize:11.5, textAlign:"center" as const, margin:0, lineHeight:1.5 }}>
              Créez une affiche, un flyer, une carte ou un sticker prêt à imprimer.
            </p>

            {/* Chips des supports (compact, toujours visible) */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
              {["Affiche","Flyer","Carte","Sticker","Menu","Avis"].map(s => (
                <span key={s} style={{ padding:"5px 11px", borderRadius:100, background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 22%, transparent)", color:G, fontSize:11, fontWeight:600 }}>{s}</span>
              ))}
            </div>

            {/* Explicatif détaillé : replié sur mobile, déplié sur desktop */}
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"4px 15px" }}>
              {isMobile ? (
                <button type="button" onClick={() => setPrintDetailsOpen(o => !o)} aria-expanded={printDetailsOpen}
                  style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"none", border:"none", padding:"12px 0", cursor:"pointer" }}>
                  <span style={{ color:"#F5F0E8", fontSize:12.5, fontWeight:700, display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ width:7, height:7, borderRadius:2, background:G }}/> Tout ce qu'on peut créer
                  </span>
                  <span style={{ color:G, fontSize:12, transform:printDetailsOpen?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▾</span>
                </button>
              ) : (
                <p style={{ color:"#F5F0E8", fontSize:12.5, fontWeight:700, margin:"11px 0 13px", display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ width:7, height:7, borderRadius:2, background:G }}/> Ce que vous pouvez créer
                </p>
              )}
              <div style={{ display:(!isMobile || printDetailsOpen) ? "block" : "none", paddingBottom:5 }}>
              {([
                ["🎯","Création guidée en 30 s","Votre métier → votre objectif → un design pro généré automatiquement."],
                ["🖼️","Modèles premium","Affiches, flyers, cartes, stickers, cartes de table — formats A4, carré, story, carte."],
                ["📶","Supports métier","Wifi, carte de fidélité, menu, avis, réservation, abonnés…"],
                ["🎨","Éditeur libre","Déplacez, redimensionnez, ajoutez textes, formes, photos, icônes."],
                ["✨","Réglages avancés","Dégradés, motifs, ombres colorées, contour de texte, transformer, aligner…"],
                ["📸","Photos & logos","Banque d'images intégrée + vos propres visuels."],
                ["⬇️","Export pro","PNG haute résolution & PDF prêt à imprimer."],
              ] as const).map(([emoji,title,desc]) => (
                <div key={title} style={{ display:"flex", gap:10, marginBottom:12 }}>
                  <span style={{ fontSize:17, flexShrink:0, lineHeight:1.2 }}>{emoji}</span>
                  <div>
                    <p style={{ color:"#F5F0E8", fontSize:11.5, fontWeight:700, margin:"0 0 2px" }}>{title}</p>
                    <p style={{ color:MUTED, fontSize:10.5, margin:0, lineHeight:1.45 }}>{desc}</p>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "export" && active && (() => {
          const realPx = expSize === "custom" ? Math.max(256, Math.min(8192, expCustomSize)) : expSize
          const FORMAT_CFG: Record<string, { label: string; ext: string; color: string; desc: string; plan: string }> = {
            "png":   { label:"PNG",       ext:"png",  color:"var(--action)", desc:"Universel, opaque",        plan:"free"     },
            "png-t": { label:"PNG Alpha", ext:"png",  color:"var(--success)", desc:"Fond transparent, sticker", plan:"pro"      },
            "webp":  { label:"WEBP",      ext:"webp", color:"#818CF8", desc:"Web optimisé, plus léger",  plan:"pro"      },
            "svg":   { label:"SVG",       ext:"svg",  color:"#C9A84C", desc:"Vectoriel, impression HD",  plan:"pro"      },
            "pdf":   { label:"PDF",       ext:"pdf",  color:"var(--danger)", desc:"Impression A4 avec titre",  plan:"pro" },
          }
          const fmt = FORMAT_CFG[expFormat] ?? FORMAT_CFG["png"]
          return (
          <div className="qr-scroll" style={{ flex:1, overflowY:"auto", padding:"14px" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* -- Génération en lot (B2B) ---------------------------------- */}
              <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:12 }}>
                <p style={{ color:"#F5F0E8", fontSize:13, fontWeight:700, margin:"0 0 3px" }}>Générer en lot {!canPro && <span style={{ color:MUTED, fontSize:10, fontWeight:600 }}>🔒 Pro</span>}</p>
                <p style={{ color:MUTED, fontSize:10, margin:"0 0 10px", lineHeight:1.4 }}>Une liste d'URL → un QR par ligne dans ce style, téléchargés en ZIP (tables, billets, produits…).</p>
                <button type="button" onClick={() => canPro ? setBatchOpen(true) : setUpsell({ feature:"la génération de QR en lot", plan:"pro" })}
                  style={{ width:"100%", padding:"10px", borderRadius:10, border:"1px solid color-mix(in srgb, var(--accent) 40%, transparent)", background:"color-mix(in srgb, var(--accent) 14%, transparent)", color:"var(--accent)", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                  <QrCode size={14}/> Générer un lot de QR
                </button>
              </div>

              {/* -- Format (cartes) ------------------------------------------ */}
              <div>
                <p style={{ color:"#F5F0E8", fontSize:13, fontWeight:700, margin:"0 0 3px" }}>Télécharger votre QR en fichier</p>
                <p style={{ color:MUTED, fontSize:10, margin:"0 0 12px", lineHeight:1.4 }}>L'image de votre QR a integrer ou imprimer ou vous voulez.</p>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {([
                    { id:"png",   emoji:"🌐", usage:"Usage web",        desc:"Universel, fond opaque. Le plus polyvalent." },
                    { id:"svg",   emoji:"🖨️", usage:"Impression HD",     desc:"Vectoriel, net à toutes les tailles." },
                    { id:"pdf",   emoji:"📄", usage:"Flyers & affiches", desc:"Document A4 prêt à imprimer, avec titre." },
                    ...(showMoreFmt ? [
                      { id:"webp",  emoji:"⚡", usage:"Web optimise", desc:"Plus léger que le PNG, idéal sites rapides." },
                      { id:"png-t", emoji:"🏷️", usage:"Sticker",     desc:"PNG à fond transparent, pour autocollants." },
                    ] : []),
                  ] as const).map(f => {
                    const cfg   = FORMAT_CFG[f.id]
                    const canFmt = PLAN_RANK[userPlan] >= PLAN_RANK[cfg.plan]
                    const isA    = expFormat === f.id
                    return (
                      <button key={f.id} type="button"
                        role="button" tabIndex={0} onKeyDown={onEnterSpace(() => canFmt ? setExpFormat(f.id as any) : setUpsell({ feature: `l'export ${cfg.label}`, plan: cfg.plan }))} onClick={() => canFmt ? setExpFormat(f.id as any) : setUpsell({ feature: `l'export ${cfg.label}`, plan: cfg.plan })}
                        style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:isA?`${cfg.color}14`:"rgba(255,255,255,0.02)", border:`1.5px solid ${isA?cfg.color+"66":"rgba(255,255,255,0.07)"}`, borderRadius:12, cursor:"pointer", opacity:canFmt?1:0.5, textAlign:"left" as const, position:"relative" as const, transition:"all 0.15s" }}>
                        <div style={{ width:38, height:38, borderRadius:10, background:isA?`${cfg.color}22`:"rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                          {f.emoji}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                            <span style={{ color:isA?cfg.color:"#F5F0E8", fontSize:13, fontWeight:700 }}>{cfg.label}</span>
                            <span style={{ color:MUTED, fontSize:11 }}>{f.usage}</span>
                          </div>
                          <p style={{ color:MUTED, fontSize:10, margin:0, lineHeight:1.4 }}>{f.desc}</p>
                        </div>
                        <div style={{ flexShrink:0 }}>
                          {canFmt ? (
                            cfg.plan === "free"
                              ? <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:"rgba(57,255,143,0.12)", border:"1px solid rgba(57,255,143,0.3)", borderRadius:6, padding:"3px 8px", fontSize:9, color:"var(--success)", fontWeight:700 }}><Check size={9}/> Gratuit</span>
                              : <span style={{ background:`${cfg.color}20`, border:`1px solid ${cfg.color}40`, borderRadius:6, padding:"3px 8px", fontSize:9, color:cfg.color, fontWeight:800 }}>{cfg.plan === "pro" ? "PRO" : "BIZ"}</span>
                          ) : (
                            <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, padding:"3px 8px", fontSize:9, color:MUTED, fontWeight:700 }}><Lock size={9}/> {cfg.plan === "pro" ? "Pro" : "Business"}</span>
                          )}
                        </div>
                        {isA && (
                          <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:3, height:"60%", background:cfg.color, borderRadius:"0 3px 3px 0" }}/>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Toggle autres formats */}
                <button type="button" onClick={() => setShowMoreFmt(v => !v)}
                  style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:8, padding:"8px", background:"none", border:"1px dashed rgba(255,255,255,0.12)", borderRadius:9, color:MUTED, fontSize:10, cursor:"pointer" }}>
                  <ChevronRight size={12} style={{ transform: showMoreFmt ? "rotate(90deg)" : "rotate(0deg)", transition:"transform 0.2s" }}/>
                  {showMoreFmt ? "Masquer les autres formats" : "Autres formats (WEBP, transparent)"}
                </button>
              </div>

              {/* -- Conseils selon l'usage (réglages en 1 clic) -------------- */}
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"12px 14px" }}>
                <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1.5, margin:"0 0 9px" }}>Quel format pour quel usage ?</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                  {([
                    { emoji:"📸", label:"Réseaux sociaux", hint:"PNG · 1024px", fmt:"png",   size:1024, plan:"free" },
                    { emoji:"🖨️", label:"Imprimeur",       hint:"PDF ou SVG",  fmt:"pdf",   size:2048, plan:"pro" },
                    { emoji:"🏷️", label:"Sticker",         hint:"PNG transparent", fmt:"png-t", size:1024, plan:"pro" },
                    { emoji:"🖼️", label:"Affiche HD",      hint:"SVG · 4096px", fmt:"svg",   size:4096, plan:"pro" },
                  ] as const).map(r => {
                    const ok = PLAN_RANK[userPlan] >= PLAN_RANK[r.plan]
                    return (
                      <button key={r.label} type="button"
                        role="button" tabIndex={0} onKeyDown={onEnterSpace(() => { if (!ok) { setUpsell({ feature: `l'export ${r.hint}`, plan: r.plan }); return } if (r.fmt === "png-t") setShowMoreFmt(true); setExpFormat(r.fmt as any); setExpSize(r.size as any) })} onClick={() => { if (!ok) { setUpsell({ feature: `l'export ${r.hint}`, plan: r.plan }); return } if (r.fmt === "png-t") setShowMoreFmt(true); setExpFormat(r.fmt as any); setExpSize(r.size as any) }}
                        style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 10px", background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:9, cursor:"pointer", textAlign:"left" as const, opacity: ok ? 1 : 0.6 }}>
                        <span style={{ fontSize:15, flexShrink:0 }}>{r.emoji}</span>
                        <span style={{ minWidth:0 }}>
                          <span style={{ display:"block", color:"#F5F0E8", fontSize:11, fontWeight:600, whiteSpace:"nowrap" as const, overflow:"hidden", textOverflow:"ellipsis" }}>{r.label}</span>
                          <span style={{ display:"block", color: ok ? G : MUTED, fontSize:9.5, fontWeight:600 }}>{ok ? r.hint : (r.plan === "pro" ? "Pro" : "Business")}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* -- Taille --------------------------------------------------- */}
              <div>
                <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 8px" }}>Taille</p>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" as const, marginBottom:8 }}>
                  {([512, 1024, 2048, 4096, "custom"] as const).map(s => {
                    const isHD  = s === 4096 || s === 2048
                    const canHD = !isHD || canPro
                    return (
                      <button key={String(s)} type="button"
                        role="button" tabIndex={0} onKeyDown={onEnterSpace(() => { if (canHD) setExpSize(s as any) })} onClick={() => canHD && setExpSize(s as any)}
                        style={{ padding:"5px 10px", background:expSize===s?"color-mix(in srgb, var(--accent) 12%, transparent)":"rgba(255,255,255,0.03)", border:`1px solid ${expSize===s?"color-mix(in srgb, var(--accent) 40%, transparent)":"rgba(255,255,255,0.07)"}`, borderRadius:8, color:expSize===s?G:canHD?"#F5F0E8":MUTED, fontSize:10, cursor:canHD?"pointer":"not-allowed", fontWeight:expSize===s?700:400, opacity:canHD?1:0.55 }}>
                        {s === "custom" ? "Perso" : `${s}px`}
                        {isHD && !canHD && <Lock size={8} color={MUTED} style={{ marginLeft:3 }}/>}
                      </button>
                    )
                  })}
                </div>
                {expSize === "custom" && (
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input type="number" min={256} max={8192} value={expCustomSize}
                      onChange={e => setExpCustomSize(Math.max(256, Math.min(8192, Number(e.target.value))))}
                      style={{ flex:1, background:"#111009", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"7px 10px", color:"#F5F0E8", fontSize:12, outline:"none" }}/>
                    <span style={{ color:MUTED, fontSize:11 }}>px</span>
                  </div>
                )}
                <p style={{ color:MUTED, fontSize:10, margin:"5px 0 0" }}>
                  Export : <strong style={{ color:G }}>{realPx}×{realPx}px</strong>
                  {(expIncludeName || expIncludeUrl) && " + bandeau"}
                </p>
              </div>

              {/* -- Options (repliées sur mobile pour désencombrer) ---------- */}
              <div>
                {isMobile ? (
                  <button type="button" onClick={() => setExpOptsOpen(o => !o)} aria-expanded={expOptsOpen}
                    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"none", border:"none", padding:"2px 0 8px", cursor:"pointer" }}>
                    <span style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5 }}>Options avancées</span>
                    <span style={{ color:G, fontSize:12, transform:expOptsOpen?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▾</span>
                  </button>
                ) : (
                  <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 8px" }}>Options</p>
                )}
                <div style={{ display: (!isMobile || expOptsOpen) ? "flex" : "none", flexDirection:"column", gap:7 }}>

                  {/* Marge */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ color:MUTED, fontSize:11 }}>Marge</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <input type="range" min={0} max={30} value={expMargin}
                        onChange={e => setExpMargin(Number(e.target.value))}
                        style={{ width:80, accentColor:G, cursor:"pointer" }}/>
                      <span style={{ color:G, fontSize:11, fontWeight:700, width:28, textAlign:"right" as const }}>{expMargin}px</span>
                    </div>
                  </div>

                  {/* Nom de fichier */}
                  <div>
                    <label style={{ color:MUTED, fontSize:11, display:"block", marginBottom:4 }}>Nom du fichier</label>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <input type="text" value={expFilename}
                        onChange={e => setExpFilename(e.target.value)}
                        placeholder={active?.pages?.title?.replace(/[^a-z0-9]/gi,"-").toLowerCase() ?? "qr-code"}
                        style={{ flex:1, background:"#111009", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"7px 9px", color:"#F5F0E8", fontSize:11, outline:"none" }}/>
                      <span style={{ color:MUTED, fontSize:11 }}>.{fmt.ext}</span>
                    </div>
                  </div>

                  {/* Inclure nom + URL (sauf SVG) */}
                  {expFormat !== "svg" && (
                    <>
                      {[
                        { state:expIncludeName, set:setExpIncludeName, label:"Inclure nom de la page", plan:"free"     },
                        { state:expIncludeUrl,  set:setExpIncludeUrl,  label:"Inclure URL courte",    plan:"pro"      },
                      ].map((opt, i) => {
                        const can = PLAN_RANK[userPlan] >= PLAN_RANK[opt.plan]
                        return (
                          <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", opacity:can?1:0.5 }}>
                            <span style={{ color:MUTED, fontSize:11 }}>{opt.label}{!can&&" (Pro)"}</span>
                            <button type="button" onClick={() => can && opt.set(!opt.state)}
                              style={{ width:34, height:20, borderRadius:10, background:opt.state&&can?"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))":"rgba(255,255,255,0.1)", border:"none", cursor:can?"pointer":"not-allowed", position:"relative" as const, transition:"background 0.2s" }}>
                              <div style={{ position:"absolute", top:2, left:opt.state&&can?16:2, width:16, height:16, borderRadius:"50%", background:"#F5F0E8", transition:"left 0.2s" }}/>
                            </button>
                          </div>
                        )
                      })}
                    </>
                  )}

                  {/* Logo actif */}
                  {styleConf.logoUrl && (
                    <div style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 10px", background:"rgba(57,255,143,0.06)", border:"1px solid rgba(57,255,143,0.15)", borderRadius:8 }}>
                      <Check size={11} color="var(--success)"/>
                      <span style={{ color:"var(--success)", fontSize:10 }}>Logo inclus dans l&apos;export</span>
                    </div>
                  )}
                </div>
              </div>

              {/* -- Actions -------------------------------------------------- */}
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>

                {/* Bouton principal Telecharger — dominant sur mobile */}
                <button type="button" onClick={runExport} disabled={expExporting}
                  style={{ padding:isMobile?"15px":"11px", background:`linear-gradient(90deg,${fmt.color},${fmt.color}cc)`, border:"none", borderRadius:isMobile?13:10, color:"#080808", fontSize:isMobile?15:13, fontWeight:800, cursor:expExporting?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7, opacity:expExporting?0.7:1, boxShadow:isMobile?`0 6px 20px ${fmt.color}40`:"none" }}>
                  {expExporting
                    ? <><Loader2 size={14} style={{ animation:"mo-spin 0.8s linear infinite" }}/> Export en cours...</>
                    : <><Download size={14}/> Télécharger {fmt.label} {realPx}px</>}
                </button>

                {/* Actions secondaires — repliées sur mobile sous "Plus d'actions" */}
                {isMobile && (
                  <button type="button" onClick={() => setExpMoreOpen(o => !o)} aria-expanded={expMoreOpen}
                    style={{ padding:"8px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, color:MUTED, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    Plus d&apos;actions <span style={{ color:G, fontSize:12, transform:expMoreOpen?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▾</span>
                  </button>
                )}
                <div style={{ display: (!isMobile || expMoreOpen) ? "flex" : "none", flexDirection:"column", gap:7 }}>

                {/* Copier image */}
                <button type="button" onClick={copyImageToClipboard}
                  style={{ padding:"9px", background:expCopied==="img"?"rgba(57,255,143,0.1)":"rgba(255,255,255,0.04)", border:`1px solid ${expCopied==="img"?"rgba(57,255,143,0.3)":"rgba(255,255,255,0.08)"}`, borderRadius:9, color:expCopied==="img"?"var(--success)":expCopied==="img-err"?"var(--danger)":MUTED, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  {expCopied==="img" ? <><Check size={12}/> ImageIcon copiee !</>
                    : expCopied==="img-err" ? <><AlertTriangle size={12}/> Non supporte</>
                    : <><ClipboardList size={12}/> Copier l&apos;image (PNG 512px)</>}
                </button>

                {/* Copier SVG */}
                <button type="button" onClick={copySVG}
                  style={{ padding:"9px", background:expCopied==="svg"?"color-mix(in srgb, var(--accent) 10%, transparent)":"rgba(255,255,255,0.04)", border:`1px solid ${expCopied==="svg"?"color-mix(in srgb, var(--accent) 30%, transparent)":"rgba(255,255,255,0.08)"}`, borderRadius:9, color:expCopied==="svg"?G:MUTED, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  {expCopied==="svg" ? <><Check size={12}/> SVG copie !</> : <><Copy size={12}/> Copier le SVG</>}
                </button>

                {/* Copier lien */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {[
                    { key:"short", label:"Lien scan", val:qrUrl   },
                    { key:"link",  label:"Lien page", val:pageUrl  },
                  ].map(l => (
                    <button key={l.key} type="button" onClick={() => copy(l.key as any)}
                      style={{ padding:"7px", background:copied===l.key?"rgba(57,255,143,0.08)":"rgba(255,255,255,0.03)", border:`1px solid ${copied===l.key?"rgba(57,255,143,0.2)":"rgba(255,255,255,0.07)"}`, borderRadius:8, color:copied===l.key?"var(--success)":MUTED, fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                      {copied===l.key ? <Check size={10}/> : <Link size={10}/>} {l.label}
                    </button>
                  ))}
                </div>
                </div>
              </div>

              {/* Upsell */}
              {!canPro && (
                <div style={{ padding:"12px 14px", background:"color-mix(in srgb, var(--accent) 5%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 15%, transparent)", borderRadius:10 }}>
                  <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:"0 0 4px" }}>Formats HD + SVG + PDF</p>
                  <p style={{ color:MUTED, fontSize:10, margin:"0 0 8px" }}>Pro: PNG alpha, WEBP, SVG . Business: PDF A4</p>
                  <a href="/upgrade" style={{ display:"block", textAlign:"center" as const, padding:"7px", background:"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", borderRadius:7, color:"#080808", fontSize:11, fontWeight:700, textDecoration:"none" }}>
                    Voir les plans
                  </a>
                </div>
              )}

            </div>
          </div>
          )
        })()}

      </div>


      <style>{`[data-qr-container] canvas, [data-qr-container] svg { width:100% !important; height:100% !important; display:block; } @media (max-width: 859px) { .qr-grid { display:flex !important; flex-direction:column !important; min-height:0 !important; overflow:visible !important; } .qr-col-preview { order:1 !important; width:100% !important; overflow:visible !important; } .qr-col-settings { order:2 !important; width:100% !important; overflow:visible !important; border-left:none !important; border-top:1px solid rgba(255,255,255,0.06) !important; } .qr-col-list { order:3 !important; width:100% !important; overflow:visible !important; border-right:none !important; border-top:1px solid rgba(255,255,255,0.06) !important; } .qr-scroll { flex:none !important; height:auto !important; max-height:none !important; overflow:visible !important; } } button { transition: transform 0.08s ease, opacity 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease; } button:active { transform: scale(0.97); } input:focus, select:focus, textarea:focus { border-color: color-mix(in srgb, var(--accent) 55%, transparent) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent) !important; } .qr-scroll::-webkit-scrollbar { width:8px; height:8px; } .qr-scroll::-webkit-scrollbar-track { background:transparent; } .qr-scroll::-webkit-scrollbar-thumb { background:color-mix(in srgb, var(--accent) 18%, transparent); border-radius:8px; } .qr-scroll::-webkit-scrollbar-thumb:hover { background:color-mix(in srgb, var(--accent) 35%, transparent); }`}</style>
    </div>
  )
}
