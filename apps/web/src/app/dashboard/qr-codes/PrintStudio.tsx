"use client"

// =============================================================================
// PrintStudio.tsx — QR Print Studio (Phase 1)
// Editeur de supports marketing type Canva, specialise QR, base sur Fabric.js (v5).
// Plein ecran (overlay). Monte dans l'onglet "Imprimables" de QRStudio derriere un flag.
//
// Garde-fous :
// - Composant CLIENT. Fabric initialise/dispose dans useEffect (StrictMode-safe).
// - Le VRAI QR est injecte (prop qrDataUrl) et marque isQR (regenerable plus tard).
// - Sauvegarde via route serveur /api/print-design (RLS). Jamais d'ecriture client directe.
// - Export haute def via toDataURL({ multiplier }).
// - Charger Fabric via import npm (pas de CDN).
// =============================================================================

import { useEffect, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { useDeviceOrientation } from "@/lib/useDeviceOrientation"
import { onEnterSpace } from "@/lib/a11y"
import { fabric } from "fabric"
import {
  X, Type as TypeIcon, QrCode, Square, Circle as CircleIcon, Minus,
  Copy, Trash2, Lock, Unlock, ChevronUp, ChevronDown,
  Download, Printer, Loader2, Check, Save,
  Shapes, Star, Award, MousePointerClick, ArrowRight, ArrowLeft, LayoutTemplate,
  Undo2, Redo2, Sparkles, Image as ImageIcon, Palette, Eye, Search,
  RotateCw, AlignCenterHorizontal, HelpCircle, MoreHorizontal, ShieldCheck,
} from "lucide-react"
import PrintCenterPanel from "./PrintCenterPanel"
import MobileDock, { type DockTool } from "@/components/mobile/MobileDock"
import { printPreflight, hexContrastRatio, quietZonePx, edgeMarginPx, type PreflightMetrics, type PreflightResult, type Rect } from "./printPreflight"
import { alignDeltas, type AlignMode, type Box } from "./alignDistribute"
import { qrScannability, scanLevelColor } from "./qrScannability"
import { selKind, mobileContextTools } from "./mobileContextTools"
import { stackedAt, boxCenter, type LayerBox } from "./stackedObjects"
import { exportPlan, type ExportType } from "./exportPlan"
import { dist as gDist, LONG_PRESS_MS, MOVE_TOLERANCE } from "./touchGestures"
import { showSection, coerceMode, type UiMode } from "./uiComplexity"
import BigSlider from "./BigSlider"
import { pushRecent } from "./colorTools"
import ColorPicker from "./ColorPicker"
import { isFav, toggleFav, pushRecentTpl, keepValid } from "./templateGallery"

// ---- Constantes design (Clair & aere, style Canva) -------------------------
const G       = "#C9A84C"   // accent (or de marque) : etats actifs, boutons primaires
const INK     = "#1F2430"   // texte principal (fonce sur clair)
const MUTED   = "#6B7280"   // texte secondaire (gris)
const SURFACE = "#FFFFFF"   // panneaux / barres
const BG      = "#EDEFF3"   // zone de travail + champs (gris clair)
const CANVAS_BG_DEFAULT = "#FFFFFF"

// ---- Formats supportes -----------------------------------------------------
// ratio = largeur / hauteur ; exportW = largeur cible export (~300 DPI / format reseau)
type FormatId = "a4" | "square" | "story" | "carte" | "flyer" | "table"
const FORMATS: Record<FormatId, { label: string; ratio: number; exportW: number }> = {
  a4:     { label: "A4",     ratio: 210 / 297,   exportW: 2480 }, // portrait, ~300 DPI
  square: { label: "Carré",  ratio: 1,           exportW: 2000 },
  story:  { label: "Story",  ratio: 1080 / 1920, exportW: 1080 }, // 9:16
  carte:  { label: "Carte",  ratio: 85 / 55,     exportW: 1004 }, // carte de visite 85x55mm paysage
  flyer:  { label: "Flyer",  ratio: 148 / 210,   exportW: 1748 }, // A5 portrait
  table:  { label: "Table",  ratio: 100 / 70,    exportW: 1181 }, // carte de table 10x7cm paysage
}
const EDIT_MAX_H = 600 // hauteur max du canvas d'edition a l'ecran
const EDIT_MAX_W = 860 // largeur max (pour les formats paysage / carre -> remplit mieux)
// Largeur physique reelle du support, en mm (pour estimer la taille du QR imprime). 0 = format ecran.
const FORMAT_MM: Record<FormatId, number> = { a4: 210, square: 100, story: 0, carte: 85, flyer: 148, table: 100 }

function editDims(fmt: FormatId) {
  const { ratio } = FORMATS[fmt] // largeur / hauteur
  let h = EDIT_MAX_H, w = h * ratio
  if (w > EDIT_MAX_W) { w = EDIT_MAX_W; h = w / ratio }
  return { w: Math.round(w), h: Math.round(h) }
}

// ---- Polices web-safe (rendu canvas fiable) --------------------------------
// Polices : web-safe + Google (injectees par QRStudio et par PrintStudio)
const FONT_GROUPS: { label: string; fonts: string[] }[] = [
  { label: "Luxe & raffinées", fonts: ["Cinzel", "Marcellus", "Italiana", "Fraunces", "Playfair Display", "Fraunces", "DM Serif Display", "EB Garamond", "Libre Baskerville", "Abril Fatface"] },
  { label: "Élégantes",  fonts: ["Lora", "Merriweather", "Georgia", "Times New Roman"] },
  { label: "Modernes",   fonts: ["Inter", "Manrope", "Outfit", "Space Grotesk", "Sora", "Archivo", "Poppins", "Montserrat", "Raleway", "Josefin Sans"] },
  { label: "Impact & display", fonts: ["Bebas Neue", "Anton", "Oswald", "Syne", "Unbounded", "Bricolage Grotesque", "Impact"] },
  { label: "Manuscrites", fonts: ["Dancing Script", "Pacifico", "Lobster", "Caveat", "Great Vibes"] },
  { label: "Système",    fonts: ["Arial", "Helvetica", "Trebuchet MS", "Verdana", "Courier New"] },
]

// ---- Helpers geometrie (etoile / polygone reguliers) -----------------------
function starPts(spikes: number, outer: number, inner: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes
  for (let i = 0; i < spikes; i++) {
    pts.push({ x: outer + Math.cos(rot) * outer, y: outer + Math.sin(rot) * outer }); rot += step
    pts.push({ x: outer + Math.cos(rot) * inner, y: outer + Math.sin(rot) * inner }); rot += step
  }
  return pts
}
function polyPts(sides: number, r: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides - Math.PI / 2
    pts.push({ x: r + r * Math.cos(a), y: r + r * Math.sin(a) })
  }
  return pts
}

// ---- Catalogue d'icones (SVG mono-path => recolorables via le panneau) ------
const LIB_ICONS: { key: string; label: string; d: string }[] = [
  { key:"star",  label:"Avis",      d:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { key:"phone", label:"Téléphone", d:"M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.21z" },
  { key:"mail",  label:"Email",     d:"M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" },
  { key:"pin",   label:"Adresse",   d:"M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" },
  { key:"clock", label:"Horaires",  d:"M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" },
  { key:"web",   label:"Site web",  d:"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" },
  { key:"cal",   label:"Réserver",  d:"M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" },
  { key:"cam",   label:"Photo",     d:"M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15a5 5 0 110-10 5 5 0 010 10zm0-2a3 3 0 100-6 3 3 0 000 6z" },
  { key:"heart", label:"J'aime",    d:"M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" },
  { key:"check", label:"Validé",    d:"M12 2a10 10 0 100 20 10 10 0 000-20zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" },
  { key:"cart",  label:"Commander", d:"M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 15h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" },
  { key:"gift",  label:"Offre",     d:"M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 00-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z" },
  { key:"play",  label:"Vidéo",     d:"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM10 16.5v-9l6 4.5-6 4.5z" },
  { key:"chat",  label:"Message",   d:"M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" },
  { key:"like",  label:"J'aime",    d:"M1 21h4V9H1v12zM23 10c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1z" },
  { key:"music", label:"Audio",     d:"M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" },
  { key:"home",  label:"Adresse",   d:"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" },
  { key:"user",  label:"Profil",    d:"M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" },
  { key:"tag",   label:"Étiquette", d:"M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" },
  { key:"bell",  label:"Alerte",    d:"M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" },
  { key:"key",   label:"Accès",     d:"M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" },
  { key:"coffee",label:"Café",      d:"M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM2 21h18v-2H2v2z" },
  { key:"truck", label:"Livraison", d:"M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm12 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-1.5-9l1.96 2.5H17V9.5h-.5z" },
  { key:"search",label:"Recherche", d:"M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" },
  { key:"share", label:"Partager",  d:"M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" },
  { key:"link",  label:"Lien",      d:"M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" },
  { key:"dl",    label:"Télécharger",d:"M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" },
  { key:"sun",   label:"Soleil",    d:"M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm-7 6H2v-2h3v2zm17 0h-3v-2h3v2zM13 2v3h-2V2h2zm0 17v3h-2v-3h2zM6.76 5.34L4.96 3.55 3.55 4.96l1.79 1.8 1.42-1.42zm12.69 12.69l-1.79-1.8-1.42 1.42 1.8 1.79 1.41-1.41zM5.34 17.24l-1.79 1.8 1.41 1.41 1.8-1.79-1.42-1.42zM20.45 4.96l-1.41-1.41-1.8 1.79 1.42 1.42 1.79-1.8z" },
  { key:"info",  label:"Info",      d:"M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" },
  { key:"lock",  label:"Sécurité",  d:"M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm3 11c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" },
  { key:"eye",   label:"Voir",      d:"M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z" },
  { key:"flag",  label:"Drapeau",   d:"M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" },
  { key:"book",  label:"Favori",    d:"M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" },
  { key:"send",  label:"Envoyer",   d:"M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" },
  { key:"smile", label:"Avis +",    d:"M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" },
]

// ---- Props -----------------------------------------------------------------
type Props = {
  qrId: string
  qrDataUrl: string
  userPlan: string
  onClose: () => void
  onUpsell?: (feature: string, plan: string) => void
  // Donnees deja saisies cote QRStudio, pour pre-remplir les modeles
  prefill?: { name?: string; phone?: string; website?: string }
  // Regenere le QR (couleurs / style / correction / marge) via le moteur qrRender de QRStudio
  regenQr?: (opts: { fg?: string; bg?: string; dotStyle?: string; cornerStyle?: string; eyeColor?: string; ecc?: "L" | "M" | "Q" | "H"; margin?: number }) => Promise<string | null>
  // Config initiale du QR injecte, pour que l'editeur QR & la jauge de scannabilite soient exacts d'emblee
  qrInit?: { fg?: string; bg?: string; ecc?: "L" | "M" | "Q" | "H"; dotStyle?: string; cornerStyle?: string; eyeColor?: string; hasLogo?: boolean; margin?: number }
}

// ---- Etat de selection (pour le panneau proprietes) ------------------------
type SelState = {
  isText: boolean
  fill: string
  opacity: number
  fontFamily: string
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  locked: boolean
  label: string | null    // libelle editable (groupe CTA/badge contenant un texte)
  isGroup: boolean        // true => "Couleur" recolore les formes du groupe
  textFill: string | null // couleur du texte interne (groupe avec texte)
  shadow: boolean         // ombre portee active
  shadowBlur: number      // intensite du flou de l'ombre
  shadowX: number         // decalage horizontal de l'ombre
  shadowY: number         // decalage vertical de l'ombre
  textAlign: string       // alignement du texte (gauche/centre/droite)
  charSpacing: number     // espacement des lettres
  lineHeight: number      // interligne
  border: boolean         // bordure/contour active
  strokeColor: string     // couleur du contour
  strokeWidth: number     // epaisseur du contour
  radius: number | null   // coins arrondis (rectangles uniquement), null sinon
  isGroupObj: boolean     // un vrai groupe (degroupable)
  multi: boolean          // selection multiple (groupable)
  isQr: boolean           // l'objet selectionne est le QR (regenerable)
  isImage: boolean        // image (photo/logo) -> filtres disponibles
} | null

// Trouve l'objet texte dans un groupe (CTA / badge), s'il y en a un
function groupText(o: fabric.Object | undefined | null): fabric.Text | null {
  if (!o || o.type !== "group") return null
  const child = (o as fabric.Group).getObjects().find(c => c.type === "text" || c.type === "i-text" || c.type === "textbox")
  return (child as fabric.Text) ?? null
}

const TOJSON_PROPS = [
  "isQR", "name", "role", "isQrCard", "isQrLabel", "isQrFrame", "isQrSticker",
  "lockMovementX", "lockMovementY",
  "lockScalingX", "lockScalingY",
  "lockRotation", "selectable", "evented",
  "crossOrigin", // indispensable : sinon une photo distante "tainte" le canvas au rechargement -> export casse
  "keepColor",   // texte sur photo : ne pas ecraser sa couleur lors d'un theme global
]
const ROLE_PREFIX: Record<string, string> = { phone: "📞  ", website: "🌐  " }
const ROLE_LABEL: Record<string, string> = { title: "Titre", subtitle: "Sous-titre", phone: "Téléphone", website: "Site / adresse" }
const ROLE_ORDER = ["title", "subtitle", "phone", "website"]

// Couleur de texte lisible (noir/blanc) sur un fond donne
function lum(hex: string): number {
  const h = hex.replace("#", "")
  if (h.length < 6) return 1
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
function readableOn(hex: string): string { return lum(hex) > 0.6 ? "#111111" : "#FFFFFF" }

// Construit un bouton "pilule" (rect arrondi + texte) dimensionne au texte
function buildPill(label: string, o: { rectFill: string; textFill: string; height: number; fontSize: number }): fabric.Group {
  const txt = new fabric.Text(label, { fontSize: o.fontSize, fontFamily: "Arial", fontWeight: "bold", fill: o.textFill, originX: "center", originY: "center" })
  const padX = o.height * 0.6
  const rw = Math.max(o.height * 2, (txt.width ?? 0) + padX * 2)
  const rect = new fabric.Rect({ width: rw, height: o.height, rx: o.height / 2, ry: o.height / 2, fill: o.rectFill })
  txt.set({ left: rw / 2, top: o.height / 2 })
  return new fabric.Group([rect, txt])
}

// ---- Modeles orientes objectifs (points de depart editables) ---------------
// Chaque modele compose un design (fond + titre + sous-titre + QR + decor) dans
// l'editeur. Les couleurs sont reprises des palettes signature de QRStudio.
const PRINT_TEMPLATES: { id: string; label: string; obj: string; emoji: string; desc: string; bg: string; ink: string; accent: string }[] = [
  { id:"avis-or",       label:"Avis — Or",          obj:"Avis",     emoji:"⭐", desc:"5 étoiles dorées + invitation à noter",   bg:"#0B0805", ink:"#F4E7C4", accent:"#D4AF37" },
  { id:"avis-clair",    label:"Avis — Clair",       obj:"Avis",     emoji:"⭐", desc:"Fond crème, sobre et lisible",            bg:"#FFF9EF", ink:"#2A2419", accent:"#C0392B" },
  { id:"menu",          label:"Menu — Élégant",     obj:"Menu",     emoji:"🍽️", desc:"Bandeau coloré + « Notre carte »",        bg:"#101010", ink:"#F5F0E8", accent:"#C9A84C" },
  { id:"menu-clair",    label:"Menu — Clair",       obj:"Menu",     emoji:"🍽️", desc:"Fond crème, bandeau doré",               bg:"#FBF3E7", ink:"#3A2316", accent:"#B8860B" },
  { id:"reserver",      label:"Réservation",        obj:"Réserver", emoji:"📅", desc:"Picto agenda + « Réservez votre table »", bg:"#06231C", ink:"#EAF7F0", accent:"#34D399" },
  { id:"reserver-clair",label:"Réservation — Clair",obj:"Réserver", emoji:"📅", desc:"Fond clair, accent vert",                bg:"#F2F7F4", ink:"#10271E", accent:"#0E7A5F" },
  { id:"insta",         label:"Instagram",          obj:"Abonnés",  emoji:"📷", desc:"Picto photo + « Suivez-nous » + @compte", bg:"#1A0A14", ink:"#FFF0F6", accent:"#E1306C" },
  { id:"insta-clair",   label:"Instagram — Clair",  obj:"Abonnés",  emoji:"📷", desc:"Fond clair, accent rose",                bg:"#FFF5F8", ink:"#2A0A18", accent:"#E1306C" },
  { id:"contact",       label:"Carte contact",      obj:"Contact",  emoji:"💳", desc:"Nom, métier, coordonnées + QR",          bg:"#0F1729", ink:"#F1F5FF", accent:"#5B8DEF" },
  { id:"contact-clair", label:"Carte contact — Clair",obj:"Contact",emoji:"💳", desc:"Fond clair, sobre",                      bg:"#F7F9FC", ink:"#0F2540", accent:"#1D4ED8" },
  { id:"decouvrir",     label:"Découvrir",          obj:"Page",     emoji:"🔗", desc:"Invitation simple à scanner",            bg:"#FFFFFF", ink:"#1A1A1A", accent:"#1D4ED8" },
  { id:"decouvrir-or",  label:"Découvrir — Or",     obj:"Page",     emoji:"🔗", desc:"Fond sombre, accent or",                 bg:"#0B0805", ink:"#F4E7C4", accent:"#D4AF37" },
  { id:"avis-band",     label:"Avis — Bandeau",     obj:"Avis",     emoji:"⭐", desc:"Grand bandeau en-tête doré",              bg:"#1A1206", ink:"#F4E7C4", accent:"#D4AF37" },
  { id:"reserver-band", label:"Réservation — Bandeau", obj:"Réserver", emoji:"📅", desc:"Bandeau d'en-tête, accent teal",       bg:"#0E1B2A", ink:"#EAF2FF", accent:"#2DD4BF" },
  { id:"insta-band",    label:"Instagram — Bandeau",obj:"Abonnés",  emoji:"📷", desc:"Grand bandeau rose",                    bg:"#15101C", ink:"#FBEAF4", accent:"#E1306C" },
  { id:"contact-band",  label:"Contact — Bandeau",  obj:"Contact",  emoji:"💳", desc:"Bandeau d'en-tête bleu",                bg:"#0F1729", ink:"#F1F5FF", accent:"#5B8DEF" },
  { id:"decouvrir-band",label:"Découvrir — Bandeau",obj:"Page",     emoji:"🔗", desc:"Bandeau d'en-tête vert",                bg:"#10130F", ink:"#EAF4E6", accent:"#16A34A" },
  { id:"avis-frame",    label:"Avis — Cadre",       obj:"Avis",     emoji:"⭐", desc:"Filet doré, élégant",                   bg:"#FBF6EC", ink:"#2A2419", accent:"#B8860B" },
  { id:"menu-frame",    label:"Menu — Cadre",       obj:"Menu",     emoji:"🍽️", desc:"Cadre or sur fond sombre",              bg:"#0E0E0E", ink:"#F5F0E8", accent:"#C9A84C" },
  { id:"reserver-frame",label:"Réservation — Cadre",obj:"Réserver", emoji:"📅", desc:"Cadre vert, sobre",                     bg:"#F2F7F4", ink:"#10271E", accent:"#0E7A5F" },
  { id:"insta-frame",   label:"Instagram — Cadre",  obj:"Abonnés",  emoji:"📷", desc:"Cadre rose sur fond clair",            bg:"#FFF5F8", ink:"#2A0A18", accent:"#E1306C" },
  { id:"contact-frame", label:"Contact — Cadre",    obj:"Contact",  emoji:"💳", desc:"Cadre or, premium",                    bg:"#0F1729", ink:"#F1F5FF", accent:"#C9A84C" },
  { id:"decouvrir-frame",label:"Découvrir — Cadre", obj:"Page",     emoji:"🔗", desc:"Cadre bleu, minimal",                  bg:"#FFFFFF", ink:"#1A1A1A", accent:"#1D4ED8" },
  { id:"avis-footer",    label:"Avis — Footer",      obj:"Avis",     emoji:"⭐", desc:"Barre d'appel en bas",                  bg:"#FFFDF7", ink:"#2A2419", accent:"#C0392B" },
  { id:"menu-footer",    label:"Menu — Footer",      obj:"Menu",     emoji:"🍽️", desc:"Footer doré sur fond sombre",           bg:"#101010", ink:"#F5F0E8", accent:"#C9A84C" },
  { id:"reserver-footer",label:"Réservation — Footer",obj:"Réserver",emoji:"📅", desc:"Footer bleu, pro",                      bg:"#F3F7FB", ink:"#0F2540", accent:"#1D4ED8" },
  { id:"insta-footer",   label:"Instagram — Footer", obj:"Abonnés",  emoji:"📷", desc:"Footer rose",                          bg:"#FFF7FB", ink:"#2A0A18", accent:"#E1306C" },
  { id:"contact-footer", label:"Contact — Footer",   obj:"Contact",  emoji:"💳", desc:"Footer teal",                          bg:"#0E1B2A", ink:"#EAF2FF", accent:"#2DD4BF" },
  { id:"decouvrir-footer",label:"Découvrir — Footer",obj:"Page",     emoji:"🔗", desc:"Footer or sur fond sombre",            bg:"#0B0805", ink:"#F4E7C4", accent:"#D4AF37" },
  { id:"avis-hero",     label:"Avis — QR géant",    obj:"Avis",     emoji:"⭐", desc:"Minimal, QR dominant",                  bg:"#FFFFFF", ink:"#1A1A1A", accent:"#C0392B" },
  { id:"menu-hero",     label:"Menu — QR géant",    obj:"Menu",     emoji:"🍽️", desc:"Minimal sombre, QR dominant",           bg:"#0E0E0E", ink:"#F5F0E8", accent:"#C9A84C" },
  { id:"reserver-hero", label:"Réservation — QR géant",obj:"Réserver",emoji:"📅",desc:"Minimal, QR dominant",                 bg:"#FFFFFF", ink:"#0F2540", accent:"#0E7A5F" },
  { id:"insta-hero",    label:"Instagram — QR géant",obj:"Abonnés", emoji:"📷", desc:"Minimal, QR dominant",                  bg:"#FFFFFF", ink:"#2A0A18", accent:"#E1306C" },
  { id:"contact-hero",  label:"Contact — QR géant", obj:"Contact",  emoji:"💳", desc:"Minimal sombre, QR dominant",          bg:"#0F1729", ink:"#F1F5FF", accent:"#5B8DEF" },
  { id:"decouvrir-hero",label:"Découvrir — QR géant",obj:"Page",    emoji:"🔗", desc:"Minimal sombre, QR dominant",          bg:"#0B0805", ink:"#F4E7C4", accent:"#D4AF37" },
  { id:"avis-diag",     label:"Avis — Diagonale",   obj:"Avis",     emoji:"⭐", desc:"Bandeau en biais, dynamique",          bg:"#0B0805", ink:"#F4E7C4", accent:"#D4AF37" },
  { id:"menu-diag",     label:"Menu — Diagonale",   obj:"Menu",     emoji:"🍽️", desc:"Bandeau en biais, chaleureux",         bg:"#FFF6EC", ink:"#3A2316", accent:"#C0392B" },
  { id:"reserver-diag", label:"Réservation — Diagonale",obj:"Réserver",emoji:"📅",desc:"Bandeau en biais, vert",            bg:"#06231C", ink:"#EAF7F0", accent:"#34D399" },
  { id:"insta-diag",    label:"Instagram — Diagonale",obj:"Abonnés",emoji:"📷", desc:"Bandeau en biais, rose",              bg:"#1A0A14", ink:"#FFF0F6", accent:"#E1306C" },
  { id:"contact-diag",  label:"Contact — Diagonale",obj:"Contact",  emoji:"💳", desc:"Bandeau en biais, bleu",              bg:"#0F1729", ink:"#F1F5FF", accent:"#5B8DEF" },
  { id:"decouvrir-diag",label:"Découvrir — Diagonale",obj:"Page",   emoji:"🔗", desc:"Bandeau en biais, violet",            bg:"#FFFFFF", ink:"#1A1A1A", accent:"#7C3AED" },
  { id:"avis-ornate",   label:"Avis — Orné",        obj:"Avis",     emoji:"⭐", desc:"Étoiles décoratives, élégant",          bg:"#0B0805", ink:"#F4E7C4", accent:"#D4AF37" },
  { id:"menu-ornate",   label:"Menu — Orné",        obj:"Menu",     emoji:"🍽️", desc:"Ornements dorés",                       bg:"#1A0A14", ink:"#FFF0F6", accent:"#E0B84C" },
  { id:"reserver-ornate",label:"Réservation — Orné",obj:"Réserver", emoji:"📅", desc:"Ornements verts",                       bg:"#06231C", ink:"#EAF7F0", accent:"#34D399" },
  { id:"insta-ornate",  label:"Instagram — Orné",   obj:"Abonnés",  emoji:"📷", desc:"Ornements roses",                       bg:"#15101C", ink:"#FBEAF4", accent:"#E1306C" },
  { id:"contact-ornate",label:"Contact — Orné",     obj:"Contact",  emoji:"💳", desc:"Ornements dorés, royal",               bg:"#0C1A3A", ink:"#F5F8FF", accent:"#D4AF37" },
  { id:"decouvrir-ornate",label:"Découvrir — Orné", obj:"Page",     emoji:"🔗", desc:"Ornements dorés, crème",               bg:"#FBF6EC", ink:"#2A2419", accent:"#B8860B" },
  { id:"resto-footer",  label:"Restaurant — Ardoise",obj:"Menu",    emoji:"🍽️", desc:"Footer chaleureux, ardoise",            bg:"#1C1C1A", ink:"#F0E8D8", accent:"#C9A84C" },
  { id:"immo-frame",    label:"Immobilier — Carte", obj:"Contact",  emoji:"🏠", desc:"Cadre épuré, pro",                      bg:"#FFFFFF", ink:"#10243F", accent:"#1F6F8B" },
  { id:"event-ornate",  label:"Événement — Affiche",obj:"Page",     emoji:"🎉", desc:"Orné festif",                           bg:"#160726", ink:"#FBEAF6", accent:"#E0479E" },
  { id:"avis-premium",  label:"Avis — Premium",     obj:"Avis",     emoji:"⭐", desc:"En-tête + badge, haut de gamme",        bg:"#0E0D0B", ink:"#F4ECD8", accent:"#C9A84C" },
  { id:"menu-premium",  label:"Menu — Premium",     obj:"Menu",     emoji:"🍽️", desc:"En-tête + badge, terracotta",          bg:"#14110C", ink:"#F0E6CE", accent:"#B8472F" },
  { id:"promo-premium", label:"Promo — Premium",    obj:"Page",     emoji:"🏷️", desc:"En-tête + badge promo",                 bg:"#0B1E2D", ink:"#EAF4FA", accent:"#F0A93B" },
  { id:"reserver-premium",label:"Réservation — Premium",obj:"Réserver",emoji:"📅",desc:"En-tête + badge, vert",              bg:"#0F2027", ink:"#EAF4F4", accent:"#2E8B7B" },
  { id:"insta-premium", label:"Instagram — Premium",obj:"Abonnés",   emoji:"📷", desc:"En-tête + badge, rose",                bg:"#1A0E18", ink:"#FBE9F4", accent:"#E1306C" },
  { id:"contact-premium",label:"Contact — Premium", obj:"Contact",   emoji:"💳", desc:"En-tête + badge, bleu",                bg:"#0C1322", ink:"#EEF3FB", accent:"#5B8DEF" },
  { id:"avis-photo",    label:"Avis — Photo",       obj:"Avis",     emoji:"📸", desc:"Image plein cadre + QR en coin",        bg:"#1A1410", ink:"#FFFFFF", accent:"#C9A84C" },
  { id:"menu-photo",    label:"Menu — Photo",       obj:"Menu",     emoji:"📸", desc:"Photo gourmande + QR en coin",          bg:"#14110C", ink:"#FFFFFF", accent:"#C9A84C" },
  { id:"reserver-photo",label:"Réservation — Photo",obj:"Réserver", emoji:"📸", desc:"Ambiance resto + QR en coin",           bg:"#0E1A16", ink:"#FFFFFF", accent:"#34D399" },
  { id:"insta-photo",   label:"Instagram — Photo",  obj:"Abonnés",  emoji:"📸", desc:"Lifestyle + QR en coin",               bg:"#1A0E18", ink:"#FFFFFF", accent:"#E1306C" },
  { id:"contact-photo", label:"Contact — Photo",    obj:"Contact",  emoji:"📸", desc:"Bureau moderne + QR en coin",           bg:"#0C1322", ink:"#FFFFFF", accent:"#5B8DEF" },
  { id:"decouvrir-photo",label:"Découvrir — Photo", obj:"Page",     emoji:"📸", desc:"Boutique + QR en coin",                 bg:"#14110C", ink:"#FFFFFF", accent:"#C9A84C" },
  { id:"menu-split",    label:"Menu — Bandeau",     obj:"Menu",     emoji:"🖼️", desc:"Photo en haut, infos en bas",          bg:"#F6F1E7", ink:"#2A2419", accent:"#C0392B" },
  { id:"reserver-split",label:"Réservation — Bandeau",obj:"Réserver",emoji:"🖼️",desc:"Photo en haut, infos en bas",          bg:"#F6F1E7", ink:"#2A2419", accent:"#0E7A5F" },
  { id:"decouvrir-split",label:"Découvrir — Bandeau",obj:"Page",    emoji:"🖼️", desc:"Photo en haut, infos en bas",          bg:"#F6F1E7", ink:"#2A2419", accent:"#7C3AED" },
  { id:"avis-card",     label:"Avis — Carte photo", obj:"Avis",     emoji:"🪟", desc:"Carte blanche sur photo",              bg:"#1A1410", ink:"#FFFFFF", accent:"#C9A84C" },
  { id:"insta-card",    label:"Instagram — Carte photo",obj:"Abonnés",emoji:"🪟",desc:"Carte blanche sur photo",             bg:"#1A0E18", ink:"#FFFFFF", accent:"#E1306C" },
  { id:"contact-card",  label:"Contact — Carte photo",obj:"Contact",emoji:"🪟", desc:"Carte blanche sur photo",              bg:"#0C1322", ink:"#FFFFFF", accent:"#5B8DEF" },
  { id:"avis-studio",   label:"Avis — Studio",      obj:"Avis",     emoji:"🎨", desc:"Photo + picto + badge + CTA",          bg:"#1A1410", ink:"#FFFFFF", accent:"#C9A84C" },
  { id:"menu-studio",   label:"Menu — Studio",      obj:"Menu",     emoji:"🎨", desc:"Photo + picto + badge + CTA",          bg:"#14110C", ink:"#FFFFFF", accent:"#C0392B" },
  { id:"reserver-studio",label:"Réservation — Studio",obj:"Réserver",emoji:"🎨",desc:"Photo + picto + badge + CTA",          bg:"#0E1A16", ink:"#FFFFFF", accent:"#2E8B7B" },
  { id:"insta-studio",  label:"Instagram — Studio", obj:"Abonnés",  emoji:"🎨", desc:"Photo + picto + badge + CTA",          bg:"#1A0E18", ink:"#FFFFFF", accent:"#E1306C" },
  { id:"contact-studio",label:"Contact — Studio",   obj:"Contact",  emoji:"🎨", desc:"Photo + picto + badge + CTA",          bg:"#0C1322", ink:"#FFFFFF", accent:"#5B8DEF" },
  { id:"decouvrir-studio",label:"Découvrir — Studio",obj:"Page",    emoji:"🎨", desc:"Photo + picto + badge + CTA",          bg:"#160726", ink:"#FFFFFF", accent:"#A855F7" },
  { id:"coach-studio",  label:"Coach — Studio",     obj:"Réserver", emoji:"🧘", desc:"Bien-être, RDV",                        bg:"#10231C", ink:"#FFFFFF", accent:"#5FA88C" },
  { id:"beaute-studio", label:"Beauté — Studio",    obj:"Réserver", emoji:"💇", desc:"Salon, prise de RDV",                  bg:"#2A0E1E", ink:"#FFFFFF", accent:"#E08AAE" },
  { id:"immo-studio",   label:"Immobilier — Studio",obj:"Contact",  emoji:"🏠", desc:"Bien immobilier, visite",              bg:"#0E1726", ink:"#FFFFFF", accent:"#3FA796" },
  { id:"event-studio",  label:"Événement — Studio", obj:"Page",     emoji:"🎉", desc:"Soirée, billetterie",                  bg:"#160726", ink:"#FFFFFF", accent:"#E0479E" },
  { id:"cafe-studio",   label:"Café — Studio",      obj:"Menu",     emoji:"☕", desc:"Café, carte du jour",                  bg:"#1C140C", ink:"#FFFFFF", accent:"#C9874C" },
  { id:"boutique-studio",label:"Boutique — Studio", obj:"Page",     emoji:"🛍️", desc:"Commerce, collection",                 bg:"#1A1018", ink:"#FFFFFF", accent:"#C9A84C" },
  { id:"wifi-or",       label:"Wifi — Doré",        obj:"Wifi",     emoji:"📶", desc:"Réseau + mot de passe, scan",          bg:"#0E0D0B", ink:"#F4ECD8", accent:"#C9A84C" },
  { id:"wifi-vert",     label:"Wifi — Vert",        obj:"Wifi",     emoji:"📶", desc:"Réseau + mot de passe, scan",          bg:"#0E1A16", ink:"#EAF4F0", accent:"#2E8B7B" },
  { id:"wifi-bleu",     label:"Wifi — Bleu",        obj:"Wifi",     emoji:"📶", desc:"Réseau + mot de passe, scan",          bg:"#0C1322", ink:"#EAF1FB", accent:"#3B82F6" },
  { id:"fidelite-or",   label:"Fidélité — Doré",    obj:"Fidélité", emoji:"🎁", desc:"Tampons + offre + QR",                 bg:"#0E0D0B", ink:"#F4ECD8", accent:"#C9A84C" },
  { id:"fidelite-rouge",label:"Fidélité — Rouge",   obj:"Fidélité", emoji:"🎁", desc:"Tampons + offre + QR",                 bg:"#1A0E0C", ink:"#F8E8E0", accent:"#C0392B" },
  // — Bespoke premium (calibrage qualité) —
  { id:"avis-prestige", label:"Avis — Prestige",    obj:"Avis",     emoji:"⭐", desc:"Éditorial sombre & or, 5 étoiles, déco",   bg:"#0C0B08", ink:"#F4ECD8", accent:"#C9A84C" },
  { id:"resto-ornate",  label:"Menu — Ornement",    obj:"Menu",     emoji:"🍽️", desc:"Cadre ornemental crème & bronze, chic",    bg:"#FBF6EC", ink:"#2A2419", accent:"#9A6E3A" },
  { id:"insta-block",   label:"Instagram — Color-block", obj:"Abonnés", emoji:"📸", desc:"Bloc couleur + QR chevauchant, moderne", bg:"#140A1E", ink:"#FFFFFF", accent:"#E1306C" },
  { id:"cocktail-noir", label:"Bar — Cocktails Noir", obj:"Menu",     emoji:"🍸", desc:"Lounge sombre & or, filets, serif",        bg:"#0E0B07", ink:"#F2E6CE", accent:"#C9A84C" },
  { id:"promo-burst",   label:"Commerce — Offre",    obj:"Page",      emoji:"🔥", desc:"Badge éclaté + offre, punchy",             bg:"#1A0E0A", ink:"#FFF3EA", accent:"#E8602C" },
  { id:"contact-card",  label:"Carte de visite",     obj:"Contact",   emoji:"💼", desc:"Panneau couleur + QR, corporate clean",    bg:"#F4F1EA", ink:"#1F2430", accent:"#1E5F8C" },
  { id:"immo-fiche",    label:"Immobilier — Fiche",  obj:"Contact",   emoji:"🏠", desc:"Bandeau + specs + visite, pro",            bg:"#F2F4F1", ink:"#1E2A24", accent:"#2E6F5E" },
  { id:"airbnb-welcome",label:"Airbnb — Bienvenue",  obj:"Page",      emoji:"🏡", desc:"Carte de bienvenue chaleureuse + guide",   bg:"#EFE3D2", ink:"#2A2419", accent:"#C56B3E" },
  { id:"event-ticket",  label:"Événement — Ticket",  obj:"Page",      emoji:"🎉", desc:"Invitation style ticket + perforation",    bg:"#160726", ink:"#F3E9FF", accent:"#A855F7" },
  { id:"reserve-stripe",label:"Réserver — Élégant",  obj:"Réserver",  emoji:"📅", desc:"Bande latérale + RDV en ligne, chic",        bg:"#F5F2EC", ink:"#22282E", accent:"#3B6E8F" },
  { id:"creator-bio",   label:"Créateur — Link in bio", obj:"Abonnés", emoji:"✦", desc:"Avatar + chips réseaux, neon",               bg:"#120A1F", ink:"#F2E9FF", accent:"#9B5CF6" },
  { id:"portfolio-grid",label:"Portfolio — Grille",  obj:"Page",      emoji:"🖼️", desc:"Mini-grille déco + QR, créatif",            bg:"#15181C", ink:"#F0F2F4", accent:"#D9A441" },
  { id:"soldes-mega",   label:"Soldes — Méga %",     obj:"Page",      emoji:"🏷️", desc:"Chiffre géant, offre punchy",              bg:"#0E1116", ink:"#FFFFFF", accent:"#FF4D4D" },
  { id:"happyhour-diag",label:"Bar — Happy Hour",    obj:"Menu",      emoji:"🍹", desc:"Split diagonal + horaire, festif",         bg:"#0F0A14", ink:"#F3E9FF", accent:"#E0479E" },
  { id:"guide-steps",   label:"Guide — Étapes 1·2·3",obj:"Page",      emoji:"📖", desc:"Étapes numérotées + QR, check-in/how-to",  bg:"#F3F0E9", ink:"#2A2419", accent:"#3FA796" },
]

// Collections : familles cohérentes (curées d'ids) pour parcourir par style
const COLLECTIONS: { id: string; label: string; emoji: string; ids: string[] }[] = [
  { id: "luxury",     label: "Luxury",     emoji: "💎", ids: ["avis-prestige", "cocktail-noir", "resto-ornate", "avis-or", "menu", "avis-premium", "menu-premium", "contact-premium", "insta-premium", "reserver-premium", "decouvrir-or"] },
  { id: "elegant",    label: "Élégant",    emoji: "🕊️", ids: ["avis-ornate", "menu-ornate", "contact-ornate", "insta-ornate", "event-ornate", "reserver-ornate", "decouvrir-ornate", "resto-ornate", "avis-clair", "menu-clair"] },
  { id: "premium",    label: "Premium",    emoji: "✨", ids: ["avis-prestige", "avis-premium", "menu-premium", "contact-premium", "insta-premium", "reserver-premium", "promo-premium"] },
  { id: "photo",      label: "Photo",      emoji: "📷", ids: ["avis-studio", "menu-studio", "insta-studio", "contact-studio", "reserver-studio", "decouvrir-studio", "event-studio", "cafe-studio", "coach-studio", "beaute-studio", "immo-studio", "boutique-studio", "avis-photo", "menu-photo", "insta-photo", "contact-photo", "reserver-photo", "decouvrir-photo"] },
  { id: "modern",     label: "Modern",     emoji: "⬡", ids: ["insta-block", "soldes-mega", "portfolio-grid", "menu-diag", "avis-diag", "contact-diag", "insta-diag", "reserver-diag", "decouvrir-diag", "menu-split", "reserver-split", "decouvrir-split"] },
  { id: "minimal",    label: "Minimal",    emoji: "◻️", ids: ["avis-clair", "menu-clair", "insta-clair", "contact-clair", "reserver-clair", "avis-band", "contact-band", "insta-band", "menu-footer", "avis-footer", "contact-footer", "reserver-footer"] },
  { id: "neon",       label: "Neon",       emoji: "⚡", ids: ["insta-block", "creator-bio", "happyhour-diag", "event-ticket"] },
  { id: "restaurant", label: "Restaurant", emoji: "🍽️", ids: ["resto-ornate", "cocktail-noir", "happyhour-diag", "cafe-studio", "menu", "menu-studio", "menu-premium", "menu-ornate", "menu-photo", "resto-footer", "menu-diag", "menu-split"] },
  { id: "corporate",  label: "Corporate",  emoji: "💼", ids: ["contact-card", "immo-fiche", "reserve-stripe", "contact-studio", "immo-studio", "contact-premium", "immo-frame", "contact-frame", "reserver-studio"] },
  { id: "event",      label: "Event",      emoji: "🎉", ids: ["event-ticket", "event-studio", "event-ornate", "soldes-mega", "promo-burst"] },
  { id: "creator",    label: "Creator",    emoji: "🎨", ids: ["insta-block", "creator-bio", "portfolio-grid", "insta-studio", "insta-photo", "insta-premium", "decouvrir-studio", "decouvrir-photo"] },
]

// Secteurs d'activite -> objectifs pertinents (pour filtrer la galerie)
const SECTORS: { id: string; label: string; emoji: string; objs: string[] }[] = [
  { id: "resto",   label: "Restaurant",  emoji: "🍽️", objs: ["Menu", "Réserver", "Avis", "Wifi", "Fidélité", "Page"] },
  { id: "bar",     label: "Bar / Café",  emoji: "🍸", objs: ["Menu", "Réserver", "Abonnés", "Wifi", "Fidélité", "Page"] },
  { id: "commerce",label: "Commerce",    emoji: "🛍️", objs: ["Avis", "Abonnés", "Contact", "Fidélité", "Wifi", "Page"] },
  { id: "immo",    label: "Immobilier",  emoji: "🏠", objs: ["Contact", "Réserver", "Page"] },
  { id: "airbnb",  label: "Airbnb",      emoji: "🛏️", objs: ["Wifi", "Contact", "Avis", "Réserver", "Page"] },
  { id: "event",   label: "Événement",   emoji: "🎉", objs: ["Réserver", "Abonnés", "Page"] },
  { id: "createur",label: "Créateur",    emoji: "🎨", objs: ["Abonnés", "Contact", "Avis", "Page"] },
]

// Composants metier 1-clic, ranges par objectif (logique metier, pas graphique)
const COMP_CATS = ["Avis", "Réseaux", "Restaurant", "Contact", "Pratique", "Business"] as const
const COMPONENTS: { key: string; emoji: string; label: string; desc: string; cat: typeof COMP_CATS[number] }[] = [
  { key: "avis",     emoji: "⭐", label: "Avis Google",     desc: "Bloc 5 étoiles + invitation",   cat: "Avis" },
  { key: "insta",    emoji: "📷", label: "Instagram",       desc: "Votre @ en pastille",           cat: "Réseaux" },
  { key: "tiktok",   emoji: "🎵", label: "TikTok",          desc: "Bouton TikTok",                 cat: "Réseaux" },
  { key: "facebook", emoji: "👍", label: "Facebook",        desc: "Bouton Facebook",               cat: "Réseaux" },
  { key: "youtube",  emoji: "▶️", label: "YouTube",         desc: "Bouton YouTube",                cat: "Réseaux" },
  { key: "menu",     emoji: "🍽️", label: "Menu",            desc: "Bouton voir le menu",           cat: "Restaurant" },
  { key: "reserver", emoji: "📅", label: "Réservation",     desc: "Bouton réserver",               cat: "Restaurant" },
  { key: "phone",    emoji: "📞", label: "Téléphone",       desc: "Numéro en pastille",            cat: "Contact" },
  { key: "email",    emoji: "✉️", label: "Email",           desc: "Adresse en pastille",           cat: "Contact" },
  { key: "whatsapp", emoji: "💬", label: "WhatsApp",        desc: "Bouton de contact",             cat: "Contact" },
  { key: "site",     emoji: "🌐", label: "Site web",        desc: "Lien vers votre site",          cat: "Contact" },
  { key: "contact",  emoji: "🪪", label: "Carte de visite", desc: "Nom, métier, contact",          cat: "Contact" },
  { key: "wifi",     emoji: "📶", label: "Wifi",            desc: "Réseau + mot de passe",         cat: "Pratique" },
  { key: "horaires", emoji: "🕐", label: "Horaires",        desc: "Vos horaires d'ouverture",      cat: "Pratique" },
  { key: "adresse",  emoji: "📍", label: "Adresse",         desc: "Votre adresse postale",         cat: "Pratique" },
  { key: "maps",     emoji: "🗺️", label: "Itinéraire",      desc: "Bouton Google Maps",            cat: "Pratique" },
  { key: "pay",      emoji: "💳", label: "Paiement",        desc: "Bouton payer en ligne",         cat: "Business" },
  { key: "catalogue",emoji: "🛍️", label: "Catalogue",       desc: "Bouton voir le catalogue",      cat: "Business" },
  { key: "portfolio",emoji: "🎨", label: "Portfolio",       desc: "Bouton voir le portfolio",      cat: "Business" },
  { key: "promo",    emoji: "🎟️", label: "Code promo",      desc: "Carte offre / réduction",       cat: "Business" },
  { key: "newsletter",emoji: "📨", label: "Newsletter",     desc: "Bouton inscription",            cat: "Business" },
  { key: "don",      emoji: "❤️", label: "Faire un don",    desc: "Bouton de don",                 cat: "Business" },
]

// Generateur guide : objectif -> meta (emoji, libelle, pool de modeles premium-first)
const OBJ_META: Record<string, { emoji: string; label: string; pool: string[] }> = {
  "Avis":     { emoji: "⭐", label: "Obtenir plus d'avis",        pool: ["avis-studio", "avis-premium", "avis-photo", "avis-card", "avis-ornate"] },
  "Abonnés":  { emoji: "📱", label: "Gagner des abonnés",         pool: ["insta-studio", "insta-premium", "insta-photo", "insta-card"] },
  "Menu":     { emoji: "🍽️", label: "Montrer mon menu",           pool: ["menu-studio", "cafe-studio", "menu-premium", "menu-photo", "menu-split"] },
  "Réserver": { emoji: "📅", label: "Prendre des réservations",   pool: ["reserver-studio", "coach-studio", "beaute-studio", "reserver-premium", "reserver-photo"] },
  "Contact":  { emoji: "💳", label: "Partager mes coordonnées",   pool: ["contact-studio", "immo-studio", "contact-premium", "contact-photo", "contact-card"] },
  "Page":     { emoji: "🏷️", label: "Présenter / faire découvrir", pool: ["decouvrir-studio", "event-studio", "boutique-studio", "promo-premium", "decouvrir-photo"] },
  "Wifi":     { emoji: "📶", label: "Partager le Wifi",          pool: ["wifi-or", "wifi-vert", "wifi-bleu"] },
  "Fidélité": { emoji: "🎁", label: "Carte de fidélité",         pool: ["fidelite-or", "fidelite-rouge"] },
}
// Generateur guide : metier -> objectifs pertinents + style recommande
const GUIDE_METIERS: { id: string; emoji: string; label: string; objs: string[]; style: string }[] = [
  { id: "resto",    emoji: "🍽️", label: "Restaurant",        objs: ["Menu", "Réserver", "Avis", "Wifi", "Fidélité", "Page"], style: "restofresh" },
  { id: "bar",      emoji: "🍸", label: "Bar / Café",        objs: ["Menu", "Abonnés", "Avis", "Wifi", "Fidélité", "Page"], style: "premiumdark" },
  { id: "commerce", emoji: "🛍️", label: "Commerce",          objs: ["Avis", "Abonnés", "Contact", "Fidélité", "Wifi", "Page"], style: "minimal" },
  { id: "immo",     emoji: "🏠", label: "Immobilier",        objs: ["Contact", "Réserver", "Page"],              style: "corporate" },
  { id: "beaute",   emoji: "💇", label: "Beauté / Bien-être", objs: ["Réserver", "Avis", "Abonnés"],             style: "sage" },
  { id: "createur", emoji: "🎨", label: "Créateur",          objs: ["Abonnés", "Contact", "Page"],               style: "neon" },
  { id: "event",    emoji: "🎉", label: "Événement",         objs: ["Réserver", "Abonnés", "Page"],              style: "sunset" },
  { id: "airbnb",   emoji: "🏡", label: "Location / Airbnb",  objs: ["Wifi", "Contact", "Avis", "Réserver", "Page"], style: "sage" },
  { id: "hotel",    emoji: "🏨", label: "Hôtel",             objs: ["Wifi", "Réserver", "Avis", "Contact", "Page"], style: "corporate" },
  { id: "fitness",  emoji: "💪", label: "Sport / Coach",      objs: ["Réserver", "Abonnés", "Avis"],              style: "neon" },
  { id: "artisan",  emoji: "🔧", label: "Artisan",           objs: ["Contact", "Avis", "Page"],                  style: "premiumdark" },
  { id: "autre",    emoji: "✨", label: "Autre",             objs: ["Avis", "Abonnés", "Menu", "Réserver", "Contact", "Page"], style: "luxgold" },
]

// Photo representative par objectif (pour les vignettes de galerie) — 6 requetes max, mises en cache
const OBJ_PHOTO_Q: Record<string, string> = {
  "Avis": "happy customer cafe", "Menu": "gourmet food plate", "Réserver": "restaurant interior",
  "Abonnés": "lifestyle aesthetic", "Contact": "modern office desk", "Page": "boutique shop interior",
}
// Mini-apercu schematique d'un modele (fond + couleurs + disposition). photoUrl : vraie photo de fond (galerie)
function tplThumb(t: { id: string; bg: string; ink: string; accent: string }, photoUrl?: string) {
  const photoBg = photoUrl ? `#222 url(${photoUrl}) center/cover no-repeat` : ""
  // — Aperçus fidèles des templates bespoke premium —
  if (t.id === "avis-prestige") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg }}>
        <div style={{ position: "absolute", top: "-12%", right: "-16%", width: "56%", aspectRatio: "1", borderRadius: "50%", background: t.accent, opacity: 0.16 }} />
        <div style={{ position: "absolute", bottom: "-8%", left: "-10%", width: "28%", aspectRatio: "1", borderRadius: "50%", background: t.accent, opacity: 0.12 }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "13%", gap: 4 }}>
          <div style={{ color: t.accent, fontSize: 8, letterSpacing: 1, fontWeight: 700 }}>★ ★ ★ ★ ★</div>
          <div style={{ height: 6, width: "60%", borderRadius: 3, background: t.ink, marginTop: 5 }} />
          <div style={{ height: 6, width: "46%", borderRadius: 3, background: t.ink }} />
          <div style={{ width: "34%", aspectRatio: "1", background: "#fff", borderRadius: 4, marginTop: "7%" }} />
          <div style={{ marginTop: "7%", height: "9%", width: "50%", borderRadius: 20, background: t.accent }} />
        </div>
      </div>
    )
  }
  if (t.id === "resto-ornate") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg }}>
        <div style={{ position: "absolute", inset: "5%", border: `1.5px solid ${t.accent}`, borderRadius: 2 }} />
        <div style={{ position: "absolute", inset: "8%", border: `0.5px solid ${t.accent}`, opacity: 0.5 }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "13%", gap: 4 }}>
          <div style={{ fontSize: 13 }}>🍽️</div>
          <div style={{ color: t.accent, fontSize: 6, letterSpacing: 2, fontWeight: 700, marginTop: 3 }}>LA CARTE</div>
          <div style={{ height: 6, width: "48%", borderRadius: 3, background: t.ink, marginTop: 2 }} />
          <div style={{ width: "26%", height: 2, background: t.accent, marginTop: 3, borderRadius: 2 }} />
          <div style={{ width: "31%", aspectRatio: "1", background: "#fff", borderRadius: 3, marginTop: "6%", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
          <div style={{ marginTop: "6%", height: "8%", width: "44%", borderRadius: 20, background: t.accent }} />
        </div>
      </div>
    )
  }
  if (t.id === "insta-block") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "47%", background: `linear-gradient(135deg, ${t.accent}, ${t.accent}cc)` }} />
        <div style={{ position: "absolute", top: "8%", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 12 }}>📸</div>
          <div style={{ height: 6, width: "48%", borderRadius: 3, background: "#fff" }} />
          <div style={{ height: 3, width: "36%", borderRadius: 2, background: "rgba(255,255,255,0.82)" }} />
        </div>
        <div style={{ position: "absolute", top: "37%", left: "34%", width: "32%", aspectRatio: "1", background: "#fff", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.32)" }} />
        <div style={{ position: "absolute", bottom: "9%", left: "27%", width: "46%", height: "8%", borderRadius: 20, background: t.accent }} />
      </div>
    )
  }
  if (t.id === "cocktail-noir") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg }}>
        <div style={{ position: "absolute", top: "5%", left: 0, right: 0, height: 2, background: t.accent }} />
        <div style={{ position: "absolute", bottom: "5%", left: 0, right: 0, height: 2, background: t.accent }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "13%", gap: 4 }}>
          <div style={{ fontSize: 13 }}>🍸</div>
          <div style={{ color: t.accent, fontSize: 5.5, letterSpacing: 1.5, fontWeight: 700, marginTop: 3 }}>BAR · COCKTAILS</div>
          <div style={{ height: 6, width: "52%", borderRadius: 3, background: t.ink, marginTop: 2 }} />
          <div style={{ height: 6, width: "40%", borderRadius: 3, background: t.ink }} />
          <div style={{ width: "30%", aspectRatio: "1", background: "#fff", borderRadius: 3, marginTop: "7%" }} />
          <div style={{ marginTop: "7%", height: "8%", width: "48%", borderRadius: 20, background: t.accent }} />
        </div>
      </div>
    )
  }
  if (t.id === "promo-burst") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "10%", gap: 4 }}>
        <div style={{ width: "40%", aspectRatio: "1", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", color: t.bg, fontSize: 8, fontWeight: 800, clipPath: "polygon(50% 0,61% 12%,76% 6%,78% 23%,94% 26%,86% 41%,100% 50%,86% 59%,94% 74%,78% 77%,76% 94%,61% 88%,50% 100%,39% 88%,24% 94%,22% 77%,6% 74%,14% 59%,0 50%,14% 41%,6% 26%,22% 23%,24% 6%,39% 12%)" }}>OFFRE</div>
        <div style={{ height: 6, width: "56%", borderRadius: 3, background: t.ink, marginTop: "6%" }} />
        <div style={{ height: 3, width: "44%", borderRadius: 2, background: t.ink, opacity: 0.6 }} />
        <div style={{ width: "30%", aspectRatio: "1", background: "#fff", borderRadius: 3, marginTop: "5%" }} />
        <div style={{ marginTop: "5%", height: "8%", width: "44%", borderRadius: 20, background: t.accent }} />
      </div>
    )
  }
  if (t.id === "contact-card") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "32%", background: t.accent, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <div style={{ fontSize: 11 }}>💼</div>
          <div style={{ height: 5, width: "52%", borderRadius: 3, background: "#fff" }} />
          <div style={{ height: 3, width: "38%", borderRadius: 2, background: "rgba(255,255,255,0.8)" }} />
        </div>
        <div style={{ position: "absolute", top: "40%", left: "34%", width: "32%", aspectRatio: "1", background: "#fff", borderRadius: 3, boxShadow: "0 1px 5px rgba(0,0,0,0.15)" }} />
        <div style={{ position: "absolute", bottom: "8%", left: "27%", width: "46%", height: "7%", borderRadius: 20, background: t.accent }} />
      </div>
    )
  }
  if (t.id === "immo-fiche") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "14%", background: t.accent }} />
        <div style={{ position: "absolute", top: "18%", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ height: 6, width: "56%", borderRadius: 3, background: t.ink }} />
          <div style={{ height: 6, width: "40%", borderRadius: 3, background: t.ink }} />
        </div>
        <div style={{ position: "absolute", top: "37%", left: "10%", right: "10%", display: "flex", gap: 4, justifyContent: "center" }}>
          {[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: 14, borderRadius: 4, border: `1px solid ${t.accent}` }} />)}
        </div>
        <div style={{ position: "absolute", top: "50%", left: "34%", width: "32%", aspectRatio: "1", background: "#fff", borderRadius: 3, boxShadow: "0 1px 5px rgba(0,0,0,0.12)" }} />
        <div style={{ position: "absolute", bottom: "9%", left: "26%", width: "48%", height: "7%", borderRadius: 20, background: t.accent }} />
      </div>
    )
  }
  if (t.id === "airbnb-welcome") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "80%", height: "76%", background: "#fff", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "0 8%" }}>
          <div style={{ fontSize: 14 }}>🏡</div>
          <div style={{ color: t.accent, fontSize: 5.5, letterSpacing: 2, fontWeight: 700, marginTop: 2 }}>BIENVENUE</div>
          <div style={{ height: 6, width: "70%", borderRadius: 3, background: "#2A2419" }} />
          <div style={{ width: "40%", aspectRatio: "1", background: "#111", borderRadius: 3, marginTop: "5%" }} />
          <div style={{ marginTop: "6%", height: 11, width: "62%", borderRadius: 20, background: t.accent }} />
        </div>
      </div>
    )
  }
  if (t.id === "event-ticket") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%", background: t.accent, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <div style={{ fontSize: 10 }}>🎉</div>
          <div style={{ height: 6, width: "54%", borderRadius: 3, background: "#fff" }} />
        </div>
        <div style={{ position: "absolute", top: "40%", left: "6%", right: "6%", borderTop: `2px dashed ${t.accent}` }} />
        <div style={{ position: "absolute", top: "47%", left: "34%", width: "32%", aspectRatio: "1", background: "#fff", borderRadius: 3 }} />
        <div style={{ position: "absolute", bottom: "9%", left: "27%", width: "46%", height: "7%", borderRadius: 20, background: t.accent }} />
      </div>
    )
  }
  if (t.id === "reserve-stripe") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "10%", background: t.accent }} />
        <div style={{ position: "absolute", inset: 0, paddingLeft: "10%", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "14%", gap: 4 }}>
          <div style={{ fontSize: 12 }}>📅</div>
          <div style={{ color: t.accent, fontSize: 5, letterSpacing: 1.5, fontWeight: 700, marginTop: 2 }}>SUR RÉSERVATION</div>
          <div style={{ height: 6, width: "58%", borderRadius: 3, background: t.ink }} />
          <div style={{ height: 6, width: "42%", borderRadius: 3, background: t.ink }} />
          <div style={{ width: "30%", aspectRatio: "1", background: "#fff", borderRadius: 3, marginTop: "6%", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }} />
          <div style={{ marginTop: "6%", height: "8%", width: "50%", borderRadius: 20, background: t.accent }} />
        </div>
      </div>
    )
  }
  if (t.id === "creator-bio") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "11%", gap: 4 }}>
        <div style={{ width: "22%", aspectRatio: "1", borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11 }}>✦</div>
        <div style={{ height: 6, width: "50%", borderRadius: 3, background: t.ink, marginTop: 4 }} />
        <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 22, height: 9, borderRadius: 6, border: `1px solid ${t.accent}` }} />)}
        </div>
        <div style={{ width: "30%", aspectRatio: "1", background: "#fff", borderRadius: 3, marginTop: "6%" }} />
        <div style={{ marginTop: "6%", height: "8%", width: "40%", borderRadius: 20, background: t.accent }} />
      </div>
    )
  }
  if (t.id === "portfolio-grid") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "8%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, width: "52%" }}>
          {[0.32, 0.24, 0.2, 0.34].map((op, i) => <div key={i} style={{ aspectRatio: "1", borderRadius: 4, background: t.accent, opacity: op }} />)}
        </div>
        <div style={{ color: t.accent, fontSize: 5.5, letterSpacing: 2, fontWeight: 700, marginTop: "7%" }}>PORTFOLIO</div>
        <div style={{ height: 6, width: "48%", borderRadius: 3, background: t.ink, marginTop: 3 }} />
        <div style={{ width: "30%", aspectRatio: "1", background: "#fff", borderRadius: 3, marginTop: "5%" }} />
        <div style={{ marginTop: "5%", height: "7%", width: "50%", borderRadius: 20, background: t.accent }} />
      </div>
    )
  }
  if (t.id === "soldes-mega") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "12%" }}>
        <div style={{ color: t.accent, fontSize: 7, letterSpacing: 3, fontWeight: 800 }}>SOLDES</div>
        <div style={{ color: t.ink, fontSize: 38, fontWeight: 800, lineHeight: 1, marginTop: 4 }}>-50%</div>
        <div style={{ height: 5, width: "54%", borderRadius: 3, background: t.ink, opacity: 0.85, marginTop: "8%" }} />
        <div style={{ width: "30%", aspectRatio: "1", background: "#fff", borderRadius: 3, marginTop: "6%" }} />
        <div style={{ marginTop: "6%", height: "8%", width: "46%", borderRadius: 20, background: t.accent }} />
      </div>
    )
  }
  if (t.id === "happyhour-diag") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "46%", background: t.accent, clipPath: "polygon(0 0, 100% 0, 100% 65%, 0 100%)" }} />
        <div style={{ position: "absolute", top: "10%", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ height: 6, width: "56%", borderRadius: 3, background: "#fff" }} />
          <div style={{ height: 3, width: "42%", borderRadius: 2, background: "rgba(255,255,255,0.82)" }} />
        </div>
        <div style={{ position: "absolute", top: "52%", left: 0, right: 0, textAlign: "center" }}>
          <div style={{ display: "inline-block", height: 5, width: "50%", borderRadius: 3, background: t.ink }} />
        </div>
        <div style={{ position: "absolute", top: "60%", left: "33%", width: "34%", aspectRatio: "1", background: "#fff", borderRadius: 4 }} />
        <div style={{ position: "absolute", bottom: "8%", left: "27%", width: "46%", height: "7%", borderRadius: 20, background: t.accent }} />
      </div>
    )
  }
  if (t.id === "guide-steps") {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "13%", background: t.accent }} />
        <div style={{ position: "absolute", top: "16%", left: "10%", right: "10%", height: 5, borderRadius: 3, background: t.ink }} />
        <div style={{ position: "absolute", top: "26%", left: "10%", right: "10%", display: "flex", flexDirection: "column", gap: 7 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: t.accent, color: "#fff", fontSize: 7, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: t.ink, opacity: 0.7 }} />
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", top: "58%", left: "34%", width: "32%", aspectRatio: "1", background: "#fff", borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }} />
        <div style={{ position: "absolute", bottom: "8%", left: "27%", width: "46%", height: "7%", borderRadius: 20, background: t.accent }} />
      </div>
    )
  }
  if (t.id.endsWith("-photo")) {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: photoBg || `linear-gradient(135deg, ${t.accent}, ${t.bg})` }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.5), transparent 42%, rgba(0,0,0,0.42))" }} />
        <div style={{ position: "absolute", top: "12%", left: "12%", right: "12%", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ height: 6, width: "78%", borderRadius: 3, background: "#fff" }} />
          <div style={{ height: 4, width: "52%", borderRadius: 2, background: "rgba(255,255,255,0.72)" }} />
        </div>
        <div style={{ position: "absolute", bottom: "10%", right: "12%", width: "30%", aspectRatio: "1", background: "#fff", borderRadius: 3 }} />
      </div>
    )
  }
  if (t.id.endsWith("-split")) {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: t.bg, display: "flex", flexDirection: "column" }}>
        <div style={{ height: "50%", background: photoBg || `linear-gradient(135deg, ${t.accent}, ${t.bg})` }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: "0 12%" }}>
          <div style={{ height: 5, width: "70%", borderRadius: 3, background: t.ink, opacity: 0.9 }} />
          <div style={{ height: 3, width: "48%", borderRadius: 2, background: t.ink, opacity: 0.5 }} />
          <div style={{ width: "30%", aspectRatio: "1", background: "#fff", borderRadius: 3, marginTop: "4%", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
        </div>
      </div>
    )
  }
  if (t.id.endsWith("-card")) {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: photoBg || `linear-gradient(135deg, ${t.accent}, ${t.bg})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)" }} />
        <div style={{ position: "relative", width: "74%", height: "56%", background: "#fff", borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: "0 10%" }}>
          <div style={{ height: 5, width: "72%", borderRadius: 3, background: "#1A1A1A" }} />
          <div style={{ width: "42%", aspectRatio: "1", background: "#111", borderRadius: 3, marginTop: "4%" }} />
        </div>
      </div>
    )
  }
  if (t.id.endsWith("-studio")) {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", background: photoBg || `linear-gradient(135deg, ${t.accent}, ${t.bg})`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.55))" }} />
        <div style={{ position: "absolute", top: "6%", right: "10%", width: "15%", aspectRatio: "1", borderRadius: "50%", background: "#fff" }} />
        <div style={{ position: "relative", marginTop: "13%", width: "20%", aspectRatio: "1", borderRadius: "50%", background: t.accent }} />
        <div style={{ position: "relative", marginTop: "7%", width: "66%", height: 6, borderRadius: 3, background: "#fff" }} />
        <div style={{ position: "relative", marginTop: "4%", width: "30%", height: 4, borderRadius: 2, background: t.accent }} />
        <div style={{ position: "relative", marginTop: "7%", width: "40%", aspectRatio: "1", background: "#fff", borderRadius: 3 }} />
        <div style={{ position: "relative", marginTop: "7%", width: "50%", height: 9, borderRadius: 5, background: t.accent }} />
      </div>
    )
  }
  const isPremium = t.id.endsWith("-premium")
  const isMenu = (t.id.startsWith("menu") || t.id.endsWith("-band")) && !isPremium
  const isContact = t.id === "contact" || t.id === "contact-clair"
  const isAvis = t.id.startsWith("avis") && !t.id.endsWith("-band") && !isPremium
  const isFrame = t.id.endsWith("-frame")
  const isFooter = t.id.endsWith("-footer")
  const isHero = t.id.endsWith("-hero")
  const isDiag = t.id.endsWith("-diag")
  const isOrnate = t.id.endsWith("-ornate")
  const starClip = "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)"
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", background: t.bg, borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", gap: "6%", padding: (isMenu || isPremium) ? "0 10% 12%" : "13% 10%", boxSizing: "border-box" }}>
      {isFrame && <div style={{ position: "absolute", inset: "7%", border: `1.5px solid ${t.accent}`, borderRadius: 4, pointerEvents: "none" }} />}
      {isDiag && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "32%", background: t.accent, clipPath: "polygon(0 0,100% 0,100% 55%,0 100%)" }} />}
      {isOrnate && <><div style={{ position: "absolute", top: "9%", left: "12%", width: "11%", aspectRatio: "1", background: t.accent, clipPath: starClip }} /><div style={{ position: "absolute", bottom: "9%", right: "12%", width: "9%", aspectRatio: "1", background: t.accent, clipPath: starClip }} /></>}
      {isMenu && <div style={{ width: "100%", height: "18%", background: t.accent, marginBottom: "8%" }} />}
      {isPremium && <div style={{ width: "100%", height: "17%", background: t.accent, marginBottom: "7%" }} />}
      {isPremium && <div style={{ position: "absolute", top: "5%", right: "11%", width: "15%", aspectRatio: "1", borderRadius: "50%", background: t.ink }} />}
      <div style={{ width: "68%", height: 5, borderRadius: 3, background: t.ink, opacity: 0.92 }} />
      {isAvis ? (
        <div style={{ display: "flex", gap: "4%", width: "52%", justifyContent: "center" }}>
          {[0, 1, 2, 3, 4].map(i => <div key={i} style={{ width: "13%", aspectRatio: "1", background: t.accent, clipPath: starClip }} />)}
        </div>
      ) : (
        <div style={{ width: "38%", height: 4, borderRadius: 2, background: t.accent }} />
      )}
      <div style={{ width: isHero ? "66%" : "44%", aspectRatio: "1", background: "#fff", borderRadius: 3, marginTop: "2%" }} />
      {isContact ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "72%", alignItems: "center", marginTop: "5%" }}>
          <div style={{ width: "82%", height: 3, borderRadius: 2, background: t.ink, opacity: 0.7 }} />
          <div style={{ width: "64%", height: 3, borderRadius: 2, background: t.ink, opacity: 0.7 }} />
        </div>
      ) : isFooter ? null : (
        <div style={{ width: "56%", height: 8, borderRadius: 5, background: t.accent, marginTop: "6%" }} />
      )}
      {isFooter && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "20%", background: t.accent }} />}
    </div>
  )
}

// Palette de couleurs rapides (pastilles cliquables)
const SWATCHES = ["#C9A84C", "#0A0A0A", "#FFFFFF", "#F5F0E8", "#A8A190", "#C0392B", "#EA580C", "#E0B84C", "#16A34A", "#0E7490", "#1D4ED8", "#7C3AED", "#E1306C", "#6B3F2A"]

// Degrades prets a l'emploi (1 clic) pour les elements
const GRADIENT_PRESETS: [string, string][] = [
  ["#FF6FD8", "#3813C2"], ["#F0A93B", "#C0392B"], ["#46C2A8", "#1E6F5C"],
  ["#2E8FD0", "#0E4C7A"], ["#E1306C", "#F0A93B"], ["#C9A84C", "#6B3F2A"],
]
// Couleurs de QR garanties scannables (foncees, fort contraste sur la carte blanche)
const QR_FG = ["#0A0A0A", "#13243A", "#0F3D2E", "#3A1212", "#2A0A2E", "#5A3A12", "#1D4ED8", "#7C3AED"]
const QR_BG = ["#FFFFFF", "#F8F8F8", "#FBF8F0", "#EAF2FF", "#0A0A0A"]
// Styles de modules du QR (cle compatible qrRender)
const QR_DOTS: { k: string; label: string; icon: string }[] = [
  { k: "square", label: "Carré", icon: "▦" },
  { k: "rounded", label: "Arrondi", icon: "▢" },
  { k: "dot", label: "Points", icon: "⣿" },
  { k: "luxury", label: "Luxe", icon: "◆" },
]

// Fonds prets a l'emploi (couleurs unies + degrades) — galerie visible
const BG_PRESETS: { id: string; type: "solid" | "grad" | "mesh"; c1: string; c2?: string; c3?: string }[] = [
  { id: "white",   type: "solid", c1: "#FFFFFF" },
  { id: "cream",   type: "solid", c1: "#F6F1E7" },
  { id: "sand",    type: "solid", c1: "#EFE7D8" },
  { id: "rose",    type: "solid", c1: "#FBEEF0" },
  { id: "mint",    type: "solid", c1: "#E7F4EC" },
  { id: "sky",     type: "solid", c1: "#E7F0FA" },
  { id: "black",   type: "solid", c1: "#0A0A0A" },
  { id: "dark",    type: "solid", c1: "#101010" },
  { id: "navy",    type: "solid", c1: "#0F1729" },
  { id: "emerald", type: "solid", c1: "#06231C" },
  { id: "wine",    type: "solid", c1: "#1A0A14" },
  { id: "plum",    type: "solid", c1: "#1A0F2E" },
  { id: "gold",    type: "grad",  c1: "#1A1206", c2: "#0A0703" },
  { id: "sunset",  type: "grad",  c1: "#FF7E5F", c2: "#FEB47B" },
  { id: "ocean",   type: "grad",  c1: "#2193B0", c2: "#6DD5ED" },
  { id: "purple",  type: "grad",  c1: "#41295A", c2: "#2F0743" },
  { id: "night",   type: "grad",  c1: "#0F2027", c2: "#203A43" },
  { id: "peach",   type: "grad",  c1: "#FFF1EB", c2: "#ACE0F9" },
  { id: "roseg",   type: "grad",  c1: "#FFF5F8", c2: "#F7C5D6" },
  { id: "charcoal",type: "grad",  c1: "#3A3D40", c2: "#181A1B" },
  { id: "teal",    type: "solid", c1: "#0B3A3A" },
  { id: "terra",   type: "solid", c1: "#7A2E1E" },
  { id: "slate",   type: "solid", c1: "#1E232B" },
  { id: "blush",   type: "solid", c1: "#F7E9E4" },
  { id: "goldrich",type: "grad",  c1: "#D4AF37", c2: "#8A6E2F" },
  { id: "fire",    type: "grad",  c1: "#F83600", c2: "#FE8C00" },
  { id: "forest",  type: "grad",  c1: "#134E5E", c2: "#71B280" },
  { id: "lavender",type: "grad",  c1: "#C9D6FF", c2: "#E2E2F0" },
  { id: "midnight",type: "grad",  c1: "#0F2027", c2: "#2C5364" },
  { id: "candy",   type: "grad",  c1: "#FF6FD8", c2: "#3813C2" },
  { id: "coral",   type: "grad",  c1: "#FF512F", c2: "#DD2476" },
  { id: "lime",    type: "grad",  c1: "#56AB2F", c2: "#A8E063" },
  { id: "steel",   type: "grad",  c1: "#485563", c2: "#29323C" },
  { id: "cream2",  type: "solid", c1: "#F3E9DC" },
  { id: "aurora",  type: "mesh",  c1: "#6D3B8E", c2: "#3B2F6B", c3: "#140C28" },
  { id: "oceanm",  type: "mesh",  c1: "#2E8FD0", c2: "#0E4C7A", c3: "#05192B" },
  { id: "sunsetm", type: "mesh",  c1: "#F0A93B", c2: "#C0392B", c3: "#2A0A1E" },
  { id: "emerm",   type: "mesh",  c1: "#46C2A8", c2: "#1E6F5C", c3: "#05201A" },
  { id: "rosem",   type: "mesh",  c1: "#E89ABC", c2: "#B84C7A", c3: "#240A18" },
  { id: "noirm",   type: "mesh",  c1: "#44444E", c2: "#1C1C24", c3: "#08080C" },
]

// Styles globaux : un clic recolore + retypographie tout le design
const GLOBAL_STYLES: { id: string; label: string; bg: string; ink: string; accent: string; titleFont: string; bodyFont: string }[] = [
  { id: "luxgold",     label: "Luxury Gold",      bg: "#0B0805", ink: "#F4E7C4", accent: "#D4AF37", titleFont: "Fraunces", bodyFont: "Montserrat" },
  { id: "modernblack", label: "Modern Black",     bg: "#0E0E10", ink: "#FFFFFF", accent: "#FFFFFF", titleFont: "Bebas Neue",         bodyFont: "Montserrat" },
  { id: "restofresh",  label: "Restaurant Fresh", bg: "#FFF8EE", ink: "#2A2419", accent: "#C0392B", titleFont: "Playfair Display",   bodyFont: "Poppins" },
  { id: "corporate",   label: "Corporate Blue",   bg: "#F4F8FC", ink: "#0F2540", accent: "#1D4ED8", titleFont: "Montserrat",         bodyFont: "Arial" },
  { id: "neon",        label: "Neon Creator",     bg: "#0A0A14", ink: "#EAEAFF", accent: "#FF3D9A", titleFont: "Bebas Neue",         bodyFont: "Poppins" },
  { id: "minimal",     label: "Minimal White",    bg: "#FFFFFF", ink: "#1A1A1A", accent: "#1A1A1A", titleFont: "Raleway",            bodyFont: "Arial" },
  { id: "premiumdark", label: "Premium Dark",     bg: "#101010", ink: "#F5F0E8", accent: "#C9A84C", titleFont: "Fraunces", bodyFont: "Montserrat" },
  { id: "sunset",      label: "Bold Sunset",      bg: "#1A0E14", ink: "#FFE8D6", accent: "#FF7A4D", titleFont: "Bebas Neue",         bodyFont: "Poppins" },
  { id: "sage",        label: "Sage Natural",     bg: "#F2F4EE", ink: "#2B3326", accent: "#6B8E5A", titleFont: "Lora",               bodyFont: "Raleway" },
  { id: "editorial",   label: "Ink Editorial",    bg: "#FBFAF7", ink: "#1A1A1A", accent: "#1A1A1A", titleFont: "Playfair Display",   bodyFont: "Montserrat" },
]

// Generateur par metier : metier -> objectifs (template + style + textes pre-remplis)
type MObj = { label: string; tpl: string; title: string; subtitle: string; cta: string }
const METIERS: { id: string; label: string; emoji: string; style: string; objs: MObj[] }[] = [
  { id: "resto", label: "Restaurant", emoji: "🍽️", style: "restofresh", objs: [
    { label: "Voir le menu", tpl: "menu", title: "Notre Carte", subtitle: "Scannez pour découvrir nos plats", cta: "Voir le menu" },
    { label: "Réserver une table", tpl: "reserver", title: "Réservez votre table", subtitle: "En quelques secondes", cta: "Réserver" },
    { label: "Laisser un avis", tpl: "avis-clair", title: "Vous avez aimé ?", subtitle: "Laissez-nous un avis en 30 s", cta: "Donner mon avis" },
    { label: "Suivre Instagram", tpl: "insta", title: "Suivez-nous", subtitle: "@votrecompte", cta: "Nous suivre" },
  ] },
  { id: "bar", label: "Bar", emoji: "🍸", style: "neon", objs: [
    { label: "Voir la carte", tpl: "menu", title: "La Carte", subtitle: "Cocktails & boissons", cta: "Voir la carte" },
    { label: "Instagram", tpl: "insta", title: "Suivez le bar", subtitle: "@votrecompte", cta: "Nous suivre" },
    { label: "Laisser un avis", tpl: "avis-or", title: "Bonne soirée ?", subtitle: "Laissez un avis", cta: "Donner mon avis" },
  ] },
  { id: "commerce", label: "Commerce", emoji: "🛍️", style: "corporate", objs: [
    { label: "Laisser un avis", tpl: "avis-clair", title: "Votre avis compte", subtitle: "30 secondes suffisent", cta: "Donner mon avis" },
    { label: "Voir le catalogue", tpl: "decouvrir", title: "Notre catalogue", subtitle: "Découvrez nos produits", cta: "Voir le catalogue" },
    { label: "Obtenir une réduction", tpl: "decouvrir", title: "Votre réduction", subtitle: "Scannez pour en profiter", cta: "J'en profite" },
    { label: "Programme fidélité", tpl: "decouvrir", title: "Programme fidélité", subtitle: "Rejoignez le programme", cta: "M'inscrire" },
  ] },
  { id: "immo", label: "Immobilier", emoji: "🏠", style: "premiumdark", objs: [
    { label: "Visite virtuelle", tpl: "decouvrir", title: "Visite virtuelle", subtitle: "Découvrez ce bien", cta: "Voir le bien" },
    { label: "Me contacter", tpl: "contact", title: "Votre conseiller", subtitle: "Agent immobilier", cta: "Me contacter" },
    { label: "Estimer un bien", tpl: "decouvrir", title: "Estimation gratuite", subtitle: "En 2 minutes", cta: "Estimer mon bien" },
  ] },
  { id: "airbnb", label: "Airbnb", emoji: "🛏️", style: "minimal", objs: [
    { label: "Guide du logement", tpl: "decouvrir", title: "Bienvenue !", subtitle: "Le guide du logement", cta: "Voir le guide" },
    { label: "Laisser un avis", tpl: "avis-clair", title: "Bon séjour ?", subtitle: "Laissez un avis", cta: "Donner mon avis" },
    { label: "Wifi & infos", tpl: "decouvrir", title: "Infos pratiques", subtitle: "Wifi, check-out, contacts…", cta: "Voir les infos" },
  ] },
  { id: "event", label: "Événement", emoji: "🎉", style: "modernblack", objs: [
    { label: "Le programme", tpl: "decouvrir", title: "Le programme", subtitle: "Toutes les infos", cta: "Voir le programme" },
    { label: "Billetterie", tpl: "decouvrir", title: "Réservez vos places", subtitle: "Billetterie en ligne", cta: "Réserver" },
    { label: "Instagram", tpl: "insta", title: "Suivez l'événement", subtitle: "@votrecompte", cta: "Nous suivre" },
  ] },
  { id: "createur", label: "Créateur", emoji: "🎬", style: "neon", objs: [
    { label: "Mes réseaux", tpl: "insta", title: "Suivez-moi", subtitle: "@votrecompte", cta: "Me suivre" },
    { label: "Tous mes liens", tpl: "decouvrir", title: "Tous mes liens", subtitle: "Retrouvez-moi ici", cta: "Découvrir" },
  ] },
  { id: "coach", label: "Coach", emoji: "💪", style: "corporate", objs: [
    { label: "Prendre RDV", tpl: "reserver", title: "Réservez une séance", subtitle: "En quelques clics", cta: "Prendre RDV" },
    { label: "Me contacter", tpl: "contact", title: "Votre coach", subtitle: "Coach certifié", cta: "Me contacter" },
    { label: "Mes offres", tpl: "decouvrir", title: "Mes programmes", subtitle: "Découvrez mes offres", cta: "Voir les offres" },
  ] },
  { id: "artisan", label: "Artisan", emoji: "🔨", style: "premiumdark", objs: [
    { label: "Devis gratuit", tpl: "decouvrir", title: "Devis gratuit", subtitle: "Réponse rapide", cta: "Demander un devis" },
    { label: "Me contacter", tpl: "contact", title: "Votre artisan", subtitle: "Savoir-faire local", cta: "Me contacter" },
    { label: "Mes réalisations", tpl: "decouvrir", title: "Mes réalisations", subtitle: "Découvrez mon travail", cta: "Voir le portfolio" },
  ] },
  { id: "asso", label: "Association", emoji: "🤝", style: "corporate", objs: [
    { label: "Faire un don", tpl: "decouvrir", title: "Soutenez-nous", subtitle: "Chaque don compte", cta: "Faire un don" },
    { label: "Adhérer", tpl: "decouvrir", title: "Rejoignez-nous", subtitle: "Devenez membre", cta: "Adhérer" },
    { label: "Nos actions", tpl: "decouvrir", title: "Nos actions", subtitle: "Découvrez nos projets", cta: "En savoir plus" },
  ] },
]

export default function PrintStudio({ qrId, qrDataUrl, userPlan, onClose, onUpsell, prefill, regenQr, qrInit }: Props) {
  const elRef   = useRef<HTMLCanvasElement>(null)
  const fcRef   = useRef<fabric.Canvas | null>(null)
  const qrUrlRef = useRef(qrDataUrl)
  const vGuideRef = useRef<fabric.Line | null>(null)
  const hGuideRef = useRef<fabric.Line | null>(null)
  const safeAreaRef = useRef<fabric.Rect | null>(null)   // repère de marge de sécurité (overlay)
  const clipRef = useRef<fabric.Object | null>(null) // presse-papier (copier/coller)
  const histRef = useRef<{ stack: string[]; i: number; lock: boolean }>({ stack: [], i: -1, lock: false })
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dragIdxRef = useRef<number | null>(null) // index du calque en cours de glissement
  const scrollRef = useRef<HTMLDivElement>(null) // zone scrollable autour du canvas
  const fileRef = useRef<HTMLInputElement>(null) // import d'image / logo
  const replaceRef = useRef<HTMLInputElement>(null) // remplacement de l'image selectionnee

  const [format, setFormat]   = useState<FormatId>("a4")
  const [sel, setSel]         = useState<SelState>(null)
  const [bgColor, setBgColor] = useState(CANVAS_BG_DEFAULT)
  const [bgGrad, setBgGrad]   = useState(false)
  const [bgC2, setBgC2]       = useState("#0A0A0A")
  const [gradC2, setGradC2]   = useState(G)      // 2e couleur pour le degrade d'un element
  const styleClipRef = useRef<any>(null)         // pinceau de format (style copie)
  const [hasStyleClip, setHasStyleClip] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [exporting, setExporting] = useState(false)
  const [expOpen, setExpOpen] = useState(false)
  const [expDpi, setExpDpi]   = useState(300)
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)  // Print Center (contrôle qualité)
  const [showSafe, setShowSafe]   = useState(false)  // repère « marge de sécurité » (zone où garder le contenu)
  const [expMarks, setExpMarks] = useState(false)
  const [expWiz, setExpWiz] = useState(-1)                 // assistant d'export : etape 0..2, -1 = ferme
  const [wizType, setWizType] = useState<ExportType>("png") // type de fichier choisi dans l'assistant
  const [mockOpen, setMockOpen] = useState(false)
  const [mockEnv, setMockEnv] = useState<"wall" | "table" | "window" | "desk" | "cadre" | "counter" | "main" | "carte">("wall")
  const mockTouchX = useRef<number | null>(null) // swipe entre décors de l'aperçu
  const [mockUrl, setMockUrl] = useState("")
  const [mockBg, setMockBg] = useState("") // photo d'environnement (Unsplash) pour le mockup
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null) // menu clic-droit
  const [showAdvanced, setShowAdvanced] = useState(false) // panneau de reglages avances (progressive disclosure)
  const [uiMode, setUiMode] = useState<UiMode>("simple")   // mode Simple / Expert (#3) — persiste
  const [pickerOpen, setPickerOpen] = useState(false)      // selecteur de couleurs avance (#14)
  const [recentColors, setRecentColors] = useState<string[]>([]) // historique de couleurs (persiste)
  const [favsTpl, setFavsTpl] = useState<string[]>([])     // modeles favoris (#13, persiste)
  const [recentTpl, setRecentTpl] = useState<string[]>([]) // modeles recents (#13, persiste)
  const [libOpen, setLibOpen] = useState(false)
  const [libCat, setLibCat]   = useState<"text" | "shapes" | "lines" | "frames" | "cta" | "icons" | "badges" | "arrows" | "deco">("text")
  const [tplOpen, setTplOpen] = useState(true) // menu Modeles deplie par defaut (vue globale)
  const [tplSearch, setTplSearch] = useState("")
  const [tplSector, setTplSector] = useState("")
  const [tplColl, setTplColl] = useState("") // collection sélectionnée ("" = vue par objectif)
  const [rightW, setRightW]   = useState(288) // largeur du panneau Réglages (redimensionnable)
  const [leftW, setLeftW]     = useState(300) // largeur des flyouts de gauche (Modèles, Photos…)
  const [railW, setRailW]     = useState(150) // largeur du rail d'outils tout à gauche
  // Phase 1 paysage mobile : rail compact (icônes) + top bar resserrée, canvas héros
  const { isMobile: orMobile, isPortrait: orPortrait } = useDeviceOrientation()
  // Téléphone (toute orientation) : refonte mobile-first — rail remplacé par un dock en bas,
  // panneaux en bottom-sheets, canvas plein écran. (orMobile exige déjà petit écran + pointeur grossier.)
  const landscapeMobile = orMobile
  const effRailW = landscapeMobile ? 56 : railW
  // Theme des PANNEAUX sur mobile (#22) : sombre premium pour coller au chrome.
  // Desktop -> valeurs claires d'origine (aucun changement). Utilise dans le panneau
  // Reglages + les styles partages btnTool/layerBtn.
  const darkPanel = landscapeMobile
  const pInk   = darkPanel ? "#ECE8E0" : INK
  const pMuted = darkPanel ? "#9B9385" : MUTED
  const pSurf  = darkPanel ? "#17171B" : SURFACE
  const pField = darkPanel ? "rgba(255,255,255,0.06)" : BG
  const pCard  = darkPanel ? "rgba(255,255,255,0.06)" : "#FFFFFF"
  const pLine  = darkPanel ? "rgba(255,255,255,0.14)" : "rgba(31,36,48,0.1)"
  const [dropFx, setDropFx] = useState(0) // incrémenté à chaque pose de modèle -> effet « posé sur la feuille »
  const [moreOpen, setMoreOpen] = useState(false) // paysage mobile : menu ⋯ (actions secondaires)
  const [formatW, setFormatW] = useState(84)  // largeur du panneau Format (tout à droite)
  const [formatCollapsed, setFormatCollapsed] = useState(false)  // desktop : replier le panneau Format pour agrandir l'aperçu
  const fmtW = landscapeMobile ? formatW : (formatCollapsed ? 34 : formatW)  // largeur effective du panneau Format
  const [compOpen, setCompOpen] = useState(false) // flyout composants metier
  const [thumbCache, setThumbCache] = useState<Record<string, string>>({}) // photo par objectif pour les vignettes
  const [photoOpen, setPhotoOpen] = useState(false) // flyout recherche photos (Unsplash)
  const [photoQuery, setPhotoQuery] = useState("")
  const [photoResults, setPhotoResults] = useState<{ id: string; thumb: string; regular: string; author: string }[]>([])
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoErr, setPhotoErr] = useState("")
  const [showHelp, setShowHelp] = useState(false)
  const [hintOff, setHintOff] = useState(() => typeof window !== "undefined" && localStorage.getItem("ps_hint_seen") === "1")
  const dismissHint = useCallback(() => { setHintOff(true); try { localStorage.setItem("ps_hint_seen", "1") } catch {} }, [])
  const [showStart, setShowStart] = useState(false) // ecran d'accueil guide (metier -> objectif -> style)
  const [startStep, setStartStep] = useState<"metier" | "objectif" | "design">("metier")
  const [guideMetier, setGuideMetier] = useState<typeof GUIDE_METIERS[number] | null>(null)
  const [guideObj, setGuideObj] = useState<string>("")
  const [starting, setStarting] = useState(false)   // generation en cours depuis l'accueil
  const genIdxRef = useRef(0)                        // rotation des propositions de l'accueil
  const saveRef = useRef<(silent?: boolean) => void>(() => {}) // ref vers le save courant (evite closure perimee dans Ctrl+S)
  const applyingRef = useRef(false)                  // verrou anti-reentrance pendant l'application d'un modele (async photo)
  const [lastPool, setLastPool] = useState<string[] | null>(null) // dernier objectif (pour Régénérer)
  // Config courante du QR (initialisee depuis qrInit -> l'editeur & la jauge sont exacts d'emblee)
  const [qrFg, setQrFg] = useState(qrInit?.fg ?? "")        // couleur des modules
  const [qrDot, setQrDot] = useState(qrInit?.dotStyle ?? "")// style de modules
  const [qrBg, setQrBg] = useState(qrInit?.bg ?? "")        // couleur de fond
  const [qrCorner, setQrCorner] = useState(qrInit?.cornerStyle ?? "") // style des coins/yeux
  const [qrEcc, setQrEcc] = useState<"L" | "M" | "Q" | "H">(qrInit?.ecc ?? "M") // correction d'erreur
  const qrHasLogo = !!qrInit?.hasLogo
  const [qrBusy, setQrBusy] = useState(false)
  // Scannabilite estimee en direct depuis la config QR courante (moteur pur teste)
  const qrScan = qrScannability({ fg: qrFg || "#0A0A0A", bg: qrBg || "#FFFFFF", ecc: qrEcc, dotStyle: qrDot || undefined, hasLogo: qrHasLogo })
  // Mobile : le panneau Reglages (58vh) ne s'ouvre plus automatiquement a la selection
  // (ecrasait le canvas). Il s'ouvre a la demande via la barre contextuelle du bas.
  const [regOpen, setRegOpen] = useState(false)
  // Selecteur d'objets superposes (critique #10) : liste des elements sous le point courant.
  const [stackPick, setStackPick] = useState<{ id: string; name: string; active: boolean }[] | null>(null)
  const stackRef = useRef<Record<string, fabric.Object>>({})
  // Sheets QR focalises (#4/#5) : un seul aspect a la fois (couleurs/modules/coins/correction/cadre).
  const [qrSheet, setQrSheet] = useState<"" | "colors" | "modules" | "corners" | "ecc" | "frame">("")
  // Sheets Texte focalises : police / couleur / taille / effets / alignement.
  const [txtSheet, setTxtSheet] = useState<"" | "font" | "color" | "size" | "effects" | "align">("")
  // Sheets Image focalises : filtres / opacite.
  const [imgSheet, setImgSheet] = useState<"" | "filters" | "opacity">("")
  // Sheets Forme focalises : couleur / bordure / ombre.
  const [shapeSheet, setShapeSheet] = useState<"" | "color" | "border" | "shadow">("")
  // Sheets Bouton (CTA/badge) focalises : texte / couleur.
  const [btnSheet, setBtnSheet] = useState<"" | "text" | "color">("")
  // Sheet "Plus" : actions secondaires de l'objet (empilement/ordre/verrou/supprimer...).
  const [moreSel, setMoreSel] = useState(false)
  const [shadowAdv, setShadowAdv] = useState(false) // #20 : flou/decalages caches derriere "Avance" en mode simple
  // Toast (avec Annuler) : feedback des actions destructives (#15 audit).
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4500)
  }
  // Gestes tactiles (#8) : long-press -> dupliquer. Timer + point de depart.
  const lpTimerRef = useRef<number | null>(null)
  const lpStartRef = useRef<{ x: number; y: number } | null>(null)
  // Feedback (#16) : etat de magnetisme courant, pour un "tick" haptique a l'accroche.
  const snapOnRef = useRef(false)
  // Immersion (#18) : reference stable vers onClose pour l'effet monte une seule fois.
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose
  const mobileRef = useRef(false) // etat "mobile" courant (evite une closure perimee dans les handlers Fabric)
  // Bouton Retour : etat courant des overlays + fonction de fermeture (refs stables pour l'effet monte une fois).
  const overlayOpenRef = useRef(false)
  const closeOverlaysRef = useRef<() => void>(() => {})

  // Immersion "appli dans l'appli" : plein ecran (le rendu est porte vers <body>),
  // scroll du fond verrouille, et le bouton RETOUR du telephone ferme le studio
  // (comportement de page, plus de sensation de popup).
  useEffect(() => {
    if (typeof document === "undefined") return
    const body = document.body, html = document.documentElement
    // Verrou de scroll ROBUSTE (iOS ignore overflow:hidden pour le tactile) :
    // on fige le body en position:fixed en memorisant le scroll, on coupe le
    // chainage de scroll (overscroll-behavior), puis on restaure a la fermeture.
    const scrollY = window.scrollY || window.pageYOffset || 0
    const prev = {
      bOverflow: body.style.overflow, bPosition: body.style.position, bTop: body.style.top,
      bWidth: body.style.width, bOver: body.style.overscrollBehavior,
      hOverflow: html.style.overflow, hOver: html.style.overscrollBehavior,
    }
    body.style.overflow = "hidden"; body.style.position = "fixed"; body.style.top = `-${scrollY}px`
    body.style.width = "100%"; body.style.overscrollBehavior = "none"
    html.style.overflow = "hidden"; html.style.overscrollBehavior = "none"
    // Bouton retour du telephone : ferme d'abord l'overlay ouvert (sheet/menu/panneau),
    // sinon ferme le studio. On re-empile un etat pour que le "retour" suivant fonctionne.
    try { window.history.pushState({ qfPrintStudio: 1 }, "") } catch { /* historique indisponible */ }
    const onPop = () => {
      if (overlayOpenRef.current) {
        closeOverlaysRef.current()
        try { window.history.pushState({ qfPrintStudio: 1 }, "") } catch { /* noop */ }
      } else {
        onCloseRef.current()
      }
    }
    window.addEventListener("popstate", onPop)
    return () => {
      body.style.overflow = prev.bOverflow; body.style.position = prev.bPosition; body.style.top = prev.bTop
      body.style.width = prev.bWidth; body.style.overscrollBehavior = prev.bOver
      html.style.overflow = prev.hOverflow; html.style.overscrollBehavior = prev.hOver
      window.scrollTo(0, scrollY) // restaure la position de scroll du dashboard
      window.removeEventListener("popstate", onPop)
      // Pas de history.back() ici : en dev (StrictMode) le double-montage refermerait
      // le studio a l'ouverture. L'entree empilee restante est inoffensive.
    }
  }, [])

  // Mode Simple / Expert (#3) : chargement + persistance locale.
  useEffect(() => { try { setUiMode(coerceMode(localStorage.getItem("qf_ui_mode"))) } catch { /* noop */ } }, [])
  useEffect(() => { try { localStorage.setItem("qf_ui_mode", uiMode) } catch { /* noop */ } }, [uiMode])

  // Historique de couleurs (#14) : chargement + persistance.
  useEffect(() => {
    try { const raw = localStorage.getItem("qf_recent_colors"); if (raw) setRecentColors(JSON.parse(raw)) } catch { /* noop */ }
  }, [])
  useEffect(() => { try { localStorage.setItem("qf_recent_colors", JSON.stringify(recentColors)) } catch { /* noop */ } }, [recentColors])

  // Favoris / recents de modeles (#13) : chargement (filtre les ids disparus) + persistance.
  useEffect(() => {
    try {
      const ids = new Set(PRINT_TEMPLATES.map(t => t.id))
      const f = JSON.parse(localStorage.getItem("qf_fav_tpl") || "[]")
      const r = JSON.parse(localStorage.getItem("qf_recent_tpl") || "[]")
      setFavsTpl(keepValid(Array.isArray(f) ? f : [], ids))
      setRecentTpl(keepValid(Array.isArray(r) ? r : [], ids))
    } catch { /* noop */ }
  }, [])
  useEffect(() => { try { localStorage.setItem("qf_fav_tpl", JSON.stringify(favsTpl)) } catch { /* noop */ } }, [favsTpl])
  useEffect(() => { try { localStorage.setItem("qf_recent_tpl", JSON.stringify(recentTpl)) } catch { /* noop */ } }, [recentTpl])
  const [histVer, setHistVer] = useState(0) // force le rafraichissement des boutons undo/redo
  const [layersVer, setLayersVer] = useState(0) // force le rafraichissement de la liste des calques
  const [dragOver, setDragOver] = useState<number | null>(null) // ligne survolee pendant un glisser
  const [editLayer, setEditLayer] = useState<number | null>(null) // index du calque en cours de renommage
  const [layerSearch, setLayerSearch] = useState("") // filtre de recherche dans les calques
  const [zoom, setZoom] = useState(1)
  const [wizard, setWizard] = useState(0) // 0 = ferme, 1 = objectif, 2 = style, 3 = pret
  const [wizMetier, setWizMetier] = useState("")
  const [infoVer, setInfoVer] = useState(0) // rafraichit le panneau infos
  const [side, setSide] = useState<"" | "layers" | "bg" | "styles">("") // panneaux gauche Calques / Fond / Styles

  const isPro = userPlan === "pro" || userPlan === "business"

  // ---- Lecture d'un objet -> etat de selection -----------------------------
  const readSel = useCallback((o: fabric.Object | undefined | null): SelState => {
    if (!o) return null
    const isText = o.type === "i-text" || o.type === "text" || o.type === "textbox"
    const isGroup = o.type === "group"
    const t = o as any
    const txtChild = groupText(o)
    // Pour un groupe, la "couleur" affichee = celle de la 1re forme (non-texte)
    let fill = typeof o.fill === "string" ? o.fill : "#C9A84C"
    if (isGroup) {
      const shape = (o as fabric.Group).getObjects().find(c => c.type !== "text" && c.type !== "i-text" && c.type !== "textbox")
      if (shape && typeof shape.fill === "string") fill = shape.fill
    }
    return {
      isText,
      fill,
      opacity: o.opacity ?? 1,
      fontFamily: isText ? (t.fontFamily ?? "Georgia") : "Georgia",
      fontSize: isText ? (t.fontSize ?? 40) : 40,
      bold: isText ? (t.fontWeight === "bold" || t.fontWeight === 700) : false,
      italic: isText ? (t.fontStyle === "italic") : false,
      underline: isText ? !!t.underline : false,
      strike: isText ? !!(t as fabric.IText).linethrough : false,
      locked: !!o.lockMovementX,
      label: txtChild?.text ?? null,
      isGroup,
      textFill: txtChild && typeof txtChild.fill === "string" ? txtChild.fill : null,
      shadow: !!o.shadow,
      shadowBlur: o.shadow ? ((o.shadow as fabric.Shadow).blur ?? 18) : 18,
      shadowX: o.shadow ? ((o.shadow as fabric.Shadow).offsetX ?? 0) : 0,
      shadowY: o.shadow ? ((o.shadow as fabric.Shadow).offsetY ?? 0) : 0,
      textAlign: isText ? (t.textAlign ?? "left") : "left",
      charSpacing: isText ? (t.charSpacing ?? 0) : 0,
      lineHeight: isText ? (t.lineHeight ?? 1.16) : 1.16,
      border: !!o.stroke && (o.strokeWidth ?? 0) > 0,
      strokeColor: typeof o.stroke === "string" ? o.stroke : G,
      strokeWidth: o.strokeWidth ?? 0,
      radius: o.type === "rect" ? ((o as fabric.Rect).rx ?? 0) : null,
      isGroupObj: o.type === "group",
      multi: o.type === "activeSelection",
      isQr: !!(o as any).isQR,
      isImage: o.type === "image" && !(o as any).isQR,
    }
  }, [])

  const refreshSel = useCallback(() => {
    const fc = fcRef.current
    setSel(readSel(fc?.getActiveObject()))
  }, [readSel])

  // ---- Centrer un objet ----------------------------------------------------
  const centerObj = useCallback((o: fabric.Object) => {
    const fc = fcRef.current; if (!fc) return
    fc.add(o)
    fc.viewportCenterObject(o)
    // ne jamais poser un nouvel element PILE sur le QR : le decaler au-dessus (ou en dessous)
    const qrc = (fc.getObjects().find(x => (x as any).isQrCard) || fc.getObjects().find(x => (x as any).isQR)) as fabric.Object | undefined
    if (qrc && !(o as any).isQR && !(o as any).isQrCard) {
      const z = fc.getZoom() || 1, H = fc.getHeight() / z
      const c = qrc.getCenterPoint(), half = qrc.getScaledHeight() / 2, oh = o.getScaledHeight(), cx = o.getCenterPoint().x
      let cy = c.y - half - oh / 2 - 18 // au-dessus du QR
      if (cy - oh / 2 < 12) cy = c.y + half + oh / 2 + 18 // sinon en dessous
      if (cy + oh / 2 > H - 12) cy = Math.max(oh / 2 + 12, c.y - half - oh / 2 - 18)
      o.setPositionByOrigin(new fabric.Point(cx, cy), "center", "center"); o.setCoords()
    }
    fc.setActiveObject(o)
    fc.requestRenderAll()
    refreshSel()
  }, [refreshSel])

  // ---- Historique (undo / redo) --------------------------------------------
  // Snapshot du canvas en JSON (guides exclus). Le verrou evite que la
  // restauration (loadFromJSON) ne reempile des etats.
  const snapshot = (fc: fabric.Canvas): string => {
    const json = fc.toJSON([...TOJSON_PROPS, "isGuide"]) as { objects?: { isGuide?: boolean }[] }
    json.objects = (json.objects ?? []).filter(o => !o.isGuide)
    return JSON.stringify(json)
  }
  const pushHistory = () => {
    const fc = fcRef.current, h = histRef.current
    if (!fc || h.lock) return
    h.stack = h.stack.slice(0, h.i + 1)
    h.stack.push(snapshot(fc))
    if (h.stack.length > 60) h.stack.shift()
    h.i = h.stack.length - 1
    setHistVer(v => v + 1)
  }
  const pushHistorySoon = () => {
    if (histRef.current.lock) return
    clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(pushHistory, 350)
  }
  const restoreHistory = (s: string) => {
    const fc = fcRef.current; if (!fc) return
    histRef.current.lock = true
    fc.loadFromJSON(JSON.parse(s), () => {
      const vG = vGuideRef.current, hG = hGuideRef.current
      if (vG) fc.add(vG)
      if (hG) fc.add(hG)
      syncBgFromCanvas(fc)
      fc.discardActiveObject(); fc.requestRenderAll()
      histRef.current.lock = false
      setSel(null)
    })
  }
  const undo = () => {
    const h = histRef.current
    if (h.i <= 0) return
    h.i--; restoreHistory(h.stack[h.i]); setHistVer(v => v + 1)
  }
  const redo = () => {
    const h = histRef.current
    if (h.i >= h.stack.length - 1) return
    h.i++; restoreHistory(h.stack[h.i]); setHistVer(v => v + 1)
  }

  // ---- Init Fabric (une seule fois) ---------------------------------------
  useEffect(() => {
    if (!elRef.current) return
    const { w, h } = editDims("a4")
    const fc = new fabric.Canvas(elRef.current, {
      width: w,
      height: h,
      backgroundColor: CANVAS_BG_DEFAULT,
      preserveObjectStacking: true,
    })
    fcRef.current = fc

    // Poignees & cadre de selection premium (cercles dores) — sensation soignee a chaque clic.
    // Sur ecran tactile : poignees nettement plus grosses (critique UX "poignees trop petites").
    const coarse = typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)")?.matches
    fabric.Object.prototype.set({
      borderColor: G, cornerColor: "#FFFFFF", cornerStrokeColor: G,
      cornerStyle: "circle", cornerSize: coarse ? 18 : 11, transparentCorners: false,
      borderScaleFactor: 1.4, padding: coarse ? 5 : 3,
    })
    ;(fabric.Object.prototype as any).touchCornerSize = coarse ? 50 : 40  // zone de prehension au doigt (non type dans cette version)

    // Guides de centrage (dores), exclus de l'export
    const guideOpts = {
      stroke: G, strokeWidth: 1, selectable: false, evented: false,
      excludeFromExport: true, visible: false,
    }
    const vG = new fabric.Line([0, 0, 0, 0], guideOpts)
    const hG = new fabric.Line([0, 0, 0, 0], guideOpts)
    ;(vG as any).isGuide = true; (hG as any).isGuide = true
    fc.add(vG); fc.add(hG)
    vGuideRef.current = vG; hGuideRef.current = hG

    // Snap au centre + guides (dimensions en coords design = element / zoom)
    // Guides magnetiques : centre/bords du support + bords/centres des autres objets
    fc.on("object:moving", (e) => {
      const o = e.target; if (!o) return
      const z = fc.getZoom() || 1
      const cw = fc.getWidth() / z, ch = fc.getHeight() / z
      const snap = 7
      const b = o.getBoundingRect(true)
      const ax = [b.left, b.left + b.width / 2, b.left + b.width]
      const ay = [b.top, b.top + b.height / 2, b.top + b.height]
      const xs = [0, cw / 2, cw], ys = [0, ch / 2, ch]
      fc.getObjects().forEach(t => {
        if (t === o || (t as any).isGuide) return
        const r = t.getBoundingRect(true)
        xs.push(r.left, r.left + r.width / 2, r.left + r.width)
        ys.push(r.top, r.top + r.height / 2, r.top + r.height)
      })
      let dx: number | null = null, dxBest = snap, gx = 0
      for (const a of ax) for (const c of xs) { const d = Math.abs(a - c); if (d < dxBest) { dxBest = d; dx = c - a; gx = c } }
      let dy: number | null = null, dyBest = snap, gy = 0
      for (const a of ay) for (const c of ys) { const d = Math.abs(a - c); if (d < dyBest) { dyBest = d; dy = c - a; gy = c } }
      if (dx !== null) { o.set("left", (o.left ?? 0) + dx); vG.set({ x1: gx, y1: 0, x2: gx, y2: ch, visible: true }) } else vG.set({ visible: false })
      if (dy !== null) { o.set("top", (o.top ?? 0) + dy); hG.set({ x1: 0, y1: gy, x2: cw, y2: gy, visible: true }) } else hG.set({ visible: false })
      o.setCoords()
      fc.bringToFront(vG); fc.bringToFront(hG)
      // Feedback (#16) : petit "tick" haptique quand un alignement vient de s'accrocher.
      const snapNow = dx !== null || dy !== null
      if (snapNow && !snapOnRef.current) { try { (navigator as any).vibrate?.(4) } catch { /* pas de vibreur */ } }
      snapOnRef.current = snapNow
    })
    fc.on("object:modified", () => { vG.set({ visible: false }); hG.set({ visible: false }); snapOnRef.current = false; fc.requestRenderAll() })
    fc.on("mouse:up",       () => { vG.set({ visible: false }); hG.set({ visible: false }); snapOnRef.current = false; fc.requestRenderAll() })

    // Geste long-press (tactile) : appui maintenu sur un objet -> duplication (#8).
    if (coarse) {
      fc.on("mouse:down", (e) => {
        const t = e.target
        if (!t || (t as any).isGuide) { lpStartRef.current = null; return }
        const p = fc.getPointer(e.e)
        lpStartRef.current = { x: p.x, y: p.y }
        if (lpTimerRef.current) window.clearTimeout(lpTimerRef.current)
        lpTimerRef.current = window.setTimeout(() => {
          lpTimerRef.current = null; lpStartRef.current = null
          if (!fcRef.current) return // canvas demonte pendant l'appui -> on abandonne
          fc.setActiveObject(t); layer("dup")
          try { (navigator as any).vibrate?.(15) } catch { /* pas de vibreur */ }
        }, LONG_PRESS_MS)
      })
      fc.on("mouse:move", (e) => {
        if (!lpStartRef.current || lpTimerRef.current == null) return
        const p = fc.getPointer(e.e)
        if (gDist(lpStartRef.current, { x: p.x, y: p.y }) > MOVE_TOLERANCE) {
          window.clearTimeout(lpTimerRef.current); lpTimerRef.current = null
        }
      })
      fc.on("mouse:up", () => {
        if (lpTimerRef.current) { window.clearTimeout(lpTimerRef.current); lpTimerRef.current = null }
        lpStartRef.current = null
      })
    }

    // Bruit de poignees (#17) : TOUT objet selectionne -> 4 coins + rotation
    // seulement (poignees de milieu masquees). Moins de bruit sur les petits
    // objets + scale uniforme (pas de deformation, protege la scannabilite du QR).
    const tuneControls = (o?: fabric.Object | null) => {
      if (!o) return
      o.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false })
      fc.requestRenderAll()
    }
    fc.on("selection:created", () => { refreshSel(); setShowAdvanced(false); tuneControls(fc.getActiveObject()) })
    fc.on("selection:updated", () => { refreshSel(); setShowAdvanced(false); tuneControls(fc.getActiveObject()) })
    fc.on("selection:cleared", () => { setSel(null); setShowAdvanced(false) })

    // Double-tap / double-clic (#8) : sur un objet = editer ; sur le vide = ajouter un texte.
    fc.on("mouse:dblclick", (e) => {
      if (e.target) {
        const t = e.target
        if ((t as any).isGuide) return
        // Texte : Fabric entre deja en edition nativement -> ne rien faire de plus.
        if (t.type === "i-text" || t.type === "textbox" || t.type === "text") return
        // Autre objet : ouvrir ses reglages (edition). Sans effet visible cote desktop
        // (le panneau y est deja affiche a la selection), ouvre la feuille sur mobile.
        fc.setActiveObject(t); refreshSel(); setRegOpen(true)
        return
      }
      const p = (e as any).absolutePointer || fc.getPointer(e.e)
      const t = new fabric.IText("Votre texte", { left: p.x, top: p.y, originX: "center", originY: "center", fontFamily: "Georgia", fontWeight: "bold", fontSize: 38, fill: INK })
      fc.add(t); fc.setActiveObject(t)
      t.enterEditing(); t.selectAll()
      fc.requestRenderAll(); refreshSel()
    })

    // Historique : capter ajout / suppression / modification (drag, scale, rotate)
    fc.on("object:added", (e) => {
      pushHistory(); setLayersVer(v => v + 1)
      // Ajout par l'utilisateur (hors chargement/modele en masse, hors guides/QR initial)
      // -> on ferme le panneau gauche ouvert pour REVELER le canvas + l'element ajoute.
      const o = e?.target as any
      if (!histRef.current.lock && o && !o.isGuide && !o.isOverlay && !o.isQR && !o.isQrCard) {
        // Premiere vraie interaction -> l'astuce d'accueil ne doit plus revenir (#16)
        dismissHint()
        if (mobileRef.current) { setTplOpen(false); setLibOpen(false); setCompOpen(false); setPhotoOpen(false); setSide("") }
      }
    })
    fc.on("object:removed", () => { pushHistory(); setLayersVer(v => v + 1) })
    fc.on("object:modified", pushHistory)

    // ---- Chargement du design existant ou QR initial ----------------------
    ;(async () => {
      try {
        const res = await fetch(`/api/print-design?qr_id=${encodeURIComponent(qrId)}`)
        const json = res.ok ? await res.json() : null
        if (json?.format && (json.format in FORMATS)) {
          setFormat(json.format)
          const d = editDims(json.format)
          fc.setDimensions({ width: d.w, height: d.h })
        }
        if (json?.design) {
          histRef.current.lock = true // ne pas empiler pendant le chargement
          fc.loadFromJSON(json.design, () => {
            // remettre les guides au-dessus apres rechargement
            fc.add(vG); fc.add(hG)
            syncBgFromCanvas(fc)
            fc.requestRenderAll()
            histRef.current.lock = false
            pushHistory() // etat initial = design charge
            setLoading(false)
          })
          return
        }
      } catch { /* pas de design : on pose le QR */ }
      // Aucun design sauvegarde -> poser le vrai QR au centre + ecran d'accueil guide
      placeQr(fc)
      setLoading(false)
      setShowStart(true)
    })()

    return () => { if (lpTimerRef.current) window.clearTimeout(lpTimerRef.current); if (toastTimer.current) window.clearTimeout(toastTimer.current); if (pushTimerRef.current) clearTimeout(pushTimerRef.current); fc.dispose(); fcRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Maj de la ref qrDataUrl + regeneration du QR present ----------------
  useEffect(() => {
    qrUrlRef.current = qrDataUrl
    const fc = fcRef.current; if (!fc) return
    const existing = fc.getObjects().find(o => (o as any).isQR) as fabric.Image | undefined
    if (existing) {
      fabric.Image.fromURL(qrDataUrl, (img) => {
        existing.setElement((img as any).getElement())
        fc.requestRenderAll()
      })
    }
  }, [qrDataUrl])

  // ---- Raccourcis clavier (supprimer, copier/coller, dupliquer, deplacer) --
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement as HTMLElement | null
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
    }
    // Clone + ajoute au canvas, decale et selectionne
    const dropClone = (fc: fabric.Canvas, src: fabric.Object, dx: number, dy: number) => {
      src.clone((c: fabric.Object) => {
        c.set({ left: (src.left ?? 0) + dx, top: (src.top ?? 0) + dy })
        ;(c as any).isQR = (src as any).isQR
        fc.add(c); fc.setActiveObject(c); fc.requestRenderAll(); refreshSel()
      }, TOJSON_PROPS)
    }
    const onKey = (e: KeyboardEvent) => {
      const fc = fcRef.current; if (!fc) return
      const o = fc.getActiveObject()
      if (isTyping() || (o as any)?.isEditing) return // ne pas gener la saisie de texte
      const meta = e.ctrlKey || e.metaKey

      if (e.key === "Delete" || e.key === "Backspace") {
        const objs = fc.getActiveObjects() // gere la selection multiple
        if (!objs.length) return
        e.preventDefault(); objs.forEach(x => fc.remove(x)); fc.discardActiveObject(); fc.requestRenderAll(); setSel(null)
      } else if (e.key === "Escape") {
        setTplOpen(false); setLibOpen(false); setCompOpen(false); setPhotoOpen(false); setSide(""); setShowHelp(false)
        fc.discardActiveObject(); fc.requestRenderAll(); setSel(null)
      } else if (meta && (e.key === "s" || e.key === "S")) {
        e.preventDefault(); saveRef.current()
      } else if (meta && (e.key === "c" || e.key === "C")) {
        if (!o) return
        e.preventDefault(); o.clone((c: fabric.Object) => { clipRef.current = c }, TOJSON_PROPS)
      } else if (meta && (e.key === "v" || e.key === "V")) {
        if (!clipRef.current) return
        e.preventDefault(); dropClone(fc, clipRef.current, 24, 24)
      } else if (meta && (e.key === "d" || e.key === "D")) {
        if (!o) return
        e.preventDefault(); dropClone(fc, o, 24, 24)
      } else if (meta && (e.key === "z" || e.key === "Z")) {
        e.preventDefault(); if (e.shiftKey) redo(); else undo()
      } else if (meta && (e.key === "y" || e.key === "Y")) {
        e.preventDefault(); redo()
      } else if (meta && (e.key === "a" || e.key === "A")) {
        e.preventDefault(); selectAll()
      } else if (meta && e.shiftKey && (e.key === "g" || e.key === "G")) {
        e.preventDefault(); ungroupSel()
      } else if (meta && (e.key === "g" || e.key === "G")) {
        e.preventDefault(); groupSel()
      } else if (meta && (e.key === "+" || e.key === "=")) {
        e.preventDefault(); applyZoom((fcRef.current?.getZoom() || 1) * 1.25)
      } else if (meta && e.key === "-") {
        e.preventDefault(); applyZoom((fcRef.current?.getZoom() || 1) / 1.25)
      } else if (meta && e.key === "0") {
        e.preventDefault(); applyZoom(1)
      } else if (o && e.key.startsWith("Arrow")) {
        e.preventDefault()
        const s = e.shiftKey ? 10 : 1
        if (e.key === "ArrowLeft")  o.set("left", (o.left ?? 0) - s)
        if (e.key === "ArrowRight") o.set("left", (o.left ?? 0) + s)
        if (e.key === "ArrowUp")    o.set("top",  (o.top  ?? 0) - s)
        if (e.key === "ArrowDown")  o.set("top",  (o.top  ?? 0) + s)
        o.setCoords(); fc.requestRenderAll(); pushHistorySoon()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [refreshSel])

  // ---- Zoom a la molette (Ctrl/Cmd + molette), centre sur le curseur -------
  useEffect(() => {
    const cont = scrollRef.current; if (!cont) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return // sinon : scroll normal
      e.preventDefault()
      const fc = fcRef.current, canvas = elRef.current; if (!fc || !canvas) return
      const r0 = canvas.getBoundingClientRect()
      const fx = (e.clientX - r0.left) / r0.width   // fraction design sous le curseur
      const fy = (e.clientY - r0.top) / r0.height
      applyZoom((fc.getZoom() || 1) * (e.deltaY < 0 ? 1.1 : 1 / 1.1))
      // garder le point sous le curseur en compensant via le scroll
      const r1 = canvas.getBoundingClientRect()
      cont.scrollLeft += (r1.left + fx * r1.width) - e.clientX
      cont.scrollTop += (r1.top + fy * r1.height) - e.clientY
    }
    cont.addEventListener("wheel", onWheel, { passive: false })
    return () => cont.removeEventListener("wheel", onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Polices Google (injecter le lien si absent) -------------------------
  useEffect(() => {
    const id = "qrfolio-print-fonts"
    if (typeof document === "undefined" || document.getElementById(id)) return
    const link = document.createElement("link")
    link.id = id; link.rel = "stylesheet"
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Cormorant+Garamond:wght@500;700&family=Lora:wght@400;700&family=Merriweather:wght@400;700&family=Poppins:wght@400;600&family=Montserrat:wght@400;700&family=Raleway:wght@400;600&family=Oswald:wght@400;600&family=Bebas+Neue&family=Abril+Fatface&family=Dancing+Script:wght@700&family=Pacifico&family=EB+Garamond:wght@400;700&family=Josefin+Sans:wght@400;600&family=Anton&family=Lobster&family=Caveat:wght@400;700&family=Great+Vibes&family=Inter:wght@400;600;800&family=Manrope:wght@400;700&family=Space+Grotesk:wght@400;600&family=Sora:wght@400;700&family=Outfit:wght@400;700&family=Archivo:wght@400;700&family=Fraunces:wght@400;700&family=DM+Serif+Display&family=Libre+Baskerville:wght@400;700&family=Italiana&family=Cinzel:wght@400;700&family=Marcellus&family=Syne:wght@400;800&family=Unbounded:wght@400;700&family=Bricolage+Grotesque:wght@400;700&display=swap"
    document.head.appendChild(link)
  }, [])

  // Changer la police d'un texte : charger la fonte puis re-rendre (sinon fallback)
  const setFont = (family: string) => {
    mutate(o => (o as fabric.IText).set("fontFamily", family))
    try {
      const d = document as Document & { fonts?: { load: (f: string) => Promise<unknown> } }
      d.fonts?.load(`700 40px '${family}'`).then(() => fcRef.current?.requestRenderAll()).catch(() => {})
    } catch { /* noop */ }
  }

  // ---- Poser le vrai QR ----------------------------------------------------
  function placeQr(fc: fabric.Canvas) {
    fabric.Image.fromURL(qrUrlRef.current, (img) => {
      const w = Math.round((fc.getWidth() / (fc.getZoom() || 1)) * 0.42)
      img.scaleToWidth(w)
      ;(img as any).isQR = true
      const pad = Math.round(w * 0.07)
      const card = new fabric.Rect({
        width: w + pad * 2, height: w + pad * 2, rx: Math.round(w * 0.06), ry: Math.round(w * 0.06),
        fill: "#FFFFFF", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.20)", blur: 26, offsetX: 0, offsetY: 10 }),
      })
      ;(card as any).isQrCard = true
      fc.add(card); fc.add(img)
      fc.viewportCenterObject(card); fc.viewportCenterObject(img)
      fc.setActiveObject(img)
      fc.requestRenderAll()
      refreshSel()
    })
  }

  // ---- Outils d'ajout ------------------------------------------------------
  const addQr = () => { const fc = fcRef.current; if (fc) placeQr(fc) }
  // Regenere le QR (couleur / style) et remplace l'image en place (position/taille conservees)
  const applyQrRender = async (opts: { fg?: string; bg?: string; dotStyle?: string; cornerStyle?: string; ecc?: "L" | "M" | "Q" | "H" }) => {
    if (!regenQr || qrBusy) return
    const fc = fcRef.current; if (!fc) return
    const img = fc.getObjects().find(o => (o as any).isQR) as fabric.Image | undefined
    if (!img) return
    setQrBusy(true)
    try {
      const url = await regenQr({
        fg: opts.fg ?? (qrFg || undefined),
        bg: opts.bg ?? (qrBg || undefined),
        dotStyle: opts.dotStyle ?? (qrDot || undefined),
        cornerStyle: opts.cornerStyle ?? (qrCorner || undefined),
        ecc: opts.ecc ?? qrEcc,
      })
      if (url) {
        // conserver largeur affichee + centre meme si le QR regenere a d'autres dimensions pixel
        const w = img.getScaledWidth(); const center = img.getCenterPoint()
        img.setSrc(url, () => {
          img.scaleToWidth(w); img.setPositionByOrigin(center, "center", "center"); img.setCoords()
          fc.requestRenderAll(); pushHistorySoon()
        }, { crossOrigin: "anonymous" } as fabric.IImageOptions)
        if (opts.fg) setQrFg(opts.fg)
        if (opts.bg) setQrBg(opts.bg)
        if (opts.dotStyle) setQrDot(opts.dotStyle)
        if (opts.cornerStyle) setQrCorner(opts.cornerStyle)
        if (opts.ecc) setQrEcc(opts.ecc)
      }
    } catch { /* noop */ } finally { setQrBusy(false) }
  }
  // Redimensionne le QR ET sa carte ensemble (concentriques), centre conserve
  const scaleQrBy = (factor: number) => {
    const fc = fcRef.current; if (!fc) return
    const img = fc.getObjects().find(o => (o as any).isQR)
    const card = fc.getObjects().find(o => (o as any).isQrCard)
    if (!img) return
    const center = img.getCenterPoint()
    ;[card, img].forEach(o => {
      if (!o) return
      o.scaleX = (o.scaleX ?? 1) * factor; o.scaleY = (o.scaleY ?? 1) * factor
      o.setCoords(); o.setPositionByOrigin(center, "center", "center"); o.setCoords()
    })
    fc.requestRenderAll(); pushHistorySoon()
  }
  // Ajuste la marge blanche : on redimensionne seulement la carte autour du QR
  const adjustQrMargin = (factor: number) => {
    const fc = fcRef.current; if (!fc) return
    const img = fc.getObjects().find(o => (o as any).isQR)
    const card = fc.getObjects().find(o => (o as any).isQrCard)
    if (!card || !img) return
    const center = img.getCenterPoint()
    card.scaleX = (card.scaleX ?? 1) * factor; card.scaleY = (card.scaleY ?? 1) * factor
    card.setCoords(); card.setPositionByOrigin(center, "center", "center"); card.setCoords()
    fc.requestRenderAll(); pushHistorySoon()
  }
  // Habiller le QR : cadre decoratif autour + label "SCANNEZ-MOI" en dessous (1 clic)
  const dressQr = () => {
    const fc = fcRef.current; if (!fc) return
    const img = fc.getObjects().find(o => (o as any).isQR) as fabric.Image | undefined; if (!img) return
    const c = img.getCenterPoint(); const w = img.getScaledWidth()
    const fr = w * 1.34
    const frame = new fabric.Rect({ width: fr, height: fr, rx: Math.round(w * 0.1), ry: Math.round(w * 0.1), fill: "transparent", stroke: G, strokeWidth: Math.max(3, Math.round(w * 0.03)), strokeUniform: true, originX: "center", originY: "center", left: c.x, top: c.y })
    ;(frame as any).perPixelTargetFind = true
    const label = buildPill("SCANNEZ-MOI", { rectFill: G, textFill: "#080808", height: Math.round(w * 0.2), fontSize: Math.round(w * 0.1) })
    label.set({ originX: "center", originY: "top", left: c.x, top: c.y + fr / 2 + 12 })
    fc.add(frame); fc.add(label)
    fc.setActiveObject(label); refreshSel(); fc.requestRenderAll(); pushHistorySoon(); setLayersVer(v => v + 1)
  }
  // Etiquette QR : pilule de texte sous le QR (remplace l'etiquette precedente)
  const addQrLabel = (text: string) => {
    const fc = fcRef.current; if (!fc) return
    const img = fc.getObjects().find(o => (o as any).isQR) as fabric.Image | undefined; if (!img) return
    fc.getObjects().filter(o => (o as any).isQrLabel).forEach(o => fc.remove(o)) // une seule etiquette
    const card = fc.getObjects().find(o => (o as any).isQrCard) as fabric.Object | undefined
    const ref = card || img
    const c = ref.getCenterPoint(), w = ref.getScaledWidth(), h = ref.getScaledHeight()
    const pill = buildPill(text, { rectFill: G, textFill: readableOn(G), height: Math.round(w * 0.17), fontSize: Math.round(w * 0.08) })
    ;(pill as any).isQrLabel = true
    pill.set({ originX: "center", originY: "top", left: c.x, top: c.y + h / 2 + Math.round(w * 0.06) })
    fc.add(pill); fc.setActiveObject(pill); refreshSel(); fc.requestRenderAll(); pushHistorySoon(); setLayersVer(v => v + 1)
  }
  const removeQrLabel = () => {
    const fc = fcRef.current; if (!fc) return
    fc.getObjects().filter(o => (o as any).isQrLabel).forEach(o => fc.remove(o))
    // On garde le QR selectionne (coherent avec Retirer cadre/sticker ; ne ferme pas le sheet).
    const img = fc.getObjects().find(o => (o as any).isQR)
    if (img) { fc.setActiveObject(img); refreshSel() } else { fc.discardActiveObject(); setSel(null) }
    fc.requestRenderAll(); pushHistorySoon(); setLayersVer(v => v + 1)
  }
  // Cadre QR nomme (Luxury / Corporate / Modern / Neon) autour du QR
  const setQrFrame = (style: "luxury" | "corporate" | "modern" | "neon") => {
    const fc = fcRef.current; if (!fc) return
    const img = fc.getObjects().find(o => (o as any).isQR) as fabric.Image | undefined; if (!img) return
    fc.getObjects().filter(o => (o as any).isQrFrame).forEach(o => fc.remove(o))
    const card = fc.getObjects().find(o => (o as any).isQrCard) as fabric.Object | undefined
    const ref = card || img
    const c = ref.getCenterPoint(), sz = Math.max(ref.getScaledWidth(), ref.getScaledHeight())
    const mk = (extra: number, sw: number, stroke: string, glow?: boolean) => {
      const r = new fabric.Rect({ width: sz + extra, height: sz + extra, rx: Math.round(sz * 0.08), ry: Math.round(sz * 0.08), fill: "transparent", stroke, strokeWidth: sw, strokeUniform: true, originX: "center", originY: "center", left: c.x, top: c.y })
      if (glow) r.set("shadow", new fabric.Shadow({ color: stroke, blur: 22, offsetX: 0, offsetY: 0 }))
      ;(r as any).isQrFrame = true; (r as any).perPixelTargetFind = true
      fc.add(r)
    }
    if (style === "luxury") { mk(sz * 0.22, Math.max(2, Math.round(sz * 0.012)), G); mk(sz * 0.30, 1, G) }
    else if (style === "corporate") mk(sz * 0.24, Math.max(3, Math.round(sz * 0.02)), "#1F2430")
    else if (style === "modern") mk(sz * 0.26, Math.max(5, Math.round(sz * 0.04)), "#1F2430")
    else mk(sz * 0.24, Math.max(3, Math.round(sz * 0.02)), "#39FF8F", true) // neon
    fc.requestRenderAll(); pushHistorySoon(); setLayersVer(v => v + 1)
  }
  const removeQrFrame = () => {
    const fc = fcRef.current; if (!fc) return
    fc.getObjects().filter(o => (o as any).isQrFrame).forEach(o => fc.remove(o))
    fc.requestRenderAll(); pushHistorySoon(); setLayersVer(v => v + 1)
  }
  // Sticker QR : pastille décorative DERRIÈRE le QR (rond / badge crénelé / carré arrondi)
  const setQrSticker = (kind: "round" | "badge" | "square") => {
    const fc = fcRef.current; if (!fc) return
    const img = fc.getObjects().find(o => (o as any).isQR) as fabric.Image | undefined; if (!img) return
    fc.getObjects().filter(o => (o as any).isQrSticker).forEach(o => fc.remove(o))
    const card = fc.getObjects().find(o => (o as any).isQrCard) as fabric.Object | undefined
    const ref = card || img
    const c = ref.getCenterPoint(), sz = Math.max(ref.getScaledWidth(), ref.getScaledHeight())
    const r = sz * 0.72
    const common = { fill: "#FFFFFF", originX: "center" as const, originY: "center" as const, left: c.x, top: c.y, stroke: G, strokeWidth: Math.max(3, Math.round(sz * 0.02)), strokeUniform: true, shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.22)", blur: 26, offsetX: 0, offsetY: 10 }) }
    let o: fabric.Object
    if (kind === "round") o = new fabric.Circle({ ...common, radius: r })
    else if (kind === "square") o = new fabric.Rect({ ...common, width: r * 2, height: r * 2, rx: Math.round(r * 0.22), ry: Math.round(r * 0.22) })
    else o = new fabric.Polygon(starPts(28, r * 1.06, r * 0.9), common) // badge crénelé (sceau)
    ;(o as any).isQrSticker = true
    fc.add(o); fc.sendToBack(o)
    // garder le fond (degrade/pattern) derriere et les guides devant
    if (vGuideRef.current) fc.bringToFront(vGuideRef.current)
    if (hGuideRef.current) fc.bringToFront(hGuideRef.current)
    fc.setActiveObject(img); fc.requestRenderAll(); pushHistorySoon(); setLayersVer(v => v + 1)
  }
  const removeQrSticker = () => {
    const fc = fcRef.current; if (!fc) return
    fc.getObjects().filter(o => (o as any).isQrSticker).forEach(o => fc.remove(o))
    fc.requestRenderAll(); pushHistorySoon(); setLayersVer(v => v + 1)
  }
  // Repartir d'une page vierge : on retire tout (sauf guides) et on replace le QR
  const resetCanvas = () => {
    const fc = fcRef.current; if (!fc) return
    if (typeof window !== "undefined" && !window.confirm("Repartir d'une page vierge ? Le contenu actuel sera supprimé (le QR est replacé au centre).")) return
    fc.getObjects().slice().forEach(o => { if (!(o as any).isGuide) fc.remove(o) })
    placeQr(fc)
    pushHistorySoon(); refreshSel()
  }
  // Import d'une image / logo depuis le disque
  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // permettre de re-importer le meme fichier
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      fabric.Image.fromURL(String(reader.result), (img) => {
        const fc = fcRef.current; if (!fc) return
        const W = fc.getWidth() / (fc.getZoom() || 1)
        img.scaleToWidth(Math.min(W * 0.6, img.width ?? W * 0.6))
        ;(img as any).name = "Image"
        centerObj(img)
      })
    }
    reader.readAsDataURL(file)
  }
  // Remplacer l'image selectionnee : on echange sa source en conservant taille + position.
  const onReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ""
    if (!file) return
    const fc = fcRef.current; if (!fc) return
    const img = fc.getActiveObject() as fabric.Image | undefined
    if (!img || img.type !== "image" || (img as any).isQR) return // jamais ecraser un QR
    const reader = new FileReader()
    reader.onload = () => {
      const w = img.getScaledWidth(); const center = img.getCenterPoint()
      img.setSrc(String(reader.result), () => {
        img.scaleToWidth(w); img.setPositionByOrigin(center, "center", "center"); img.setCoords()
        fc.requestRenderAll(); pushHistorySoon()
      }, { crossOrigin: "anonymous" } as fabric.IImageOptions)
    }
    reader.readAsDataURL(file)
  }

  // ---- Bibliotheque d'elements ---------------------------------------------
  // Icone : SVG mono-path => Fabric renvoie un Path unique (recolorable via panneau)
  const addIcon = (d: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}" fill="${G}"/></svg>`
    fabric.loadSVGFromString(svg, (objects, options) => {
      const obj = fabric.util.groupSVGElements(objects, options) as fabric.Object
      obj.scaleToWidth(110)
      centerObj(obj)
    })
  }
  // Formes decoratives
  const addShape = (k: string) => {
    let o: fabric.Object
    switch (k) {
      case "rect":    o = new fabric.Rect({ width: 220, height: 140, fill: G }); break
      case "square":  o = new fabric.Rect({ width: 150, height: 150, fill: G }); break
      case "rrect":   o = new fabric.Rect({ width: 220, height: 130, rx: 18, ry: 18, fill: G }); break
      case "ticket": {
        const base = new fabric.Rect({ width: 280, height: 130, rx: 12, ry: 12, fill: G })
        const perf = new fabric.Line([196, 10, 196, 120], { stroke: "rgba(255,255,255,0.65)", strokeWidth: 3, strokeDashArray: [6, 6] })
        o = new fabric.Group([base, perf]); break
      }
      case "ribbon":  o = new fabric.Polygon([{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 268, y: 35 }, { x: 300, y: 70 }, { x: 0, y: 70 }, { x: 32, y: 35 }], { fill: G }); break
      case "circle":  o = new fabric.Circle({ radius: 75, fill: G }); break
      case "tri":     o = new fabric.Triangle({ width: 160, height: 140, fill: G }); break
      case "star":    o = new fabric.Polygon(starPts(5, 85, 36), { fill: G }); break
      case "hexa":    o = new fabric.Polygon(polyPts(6, 85), { fill: G }); break
      case "diamond": o = new fabric.Polygon(polyPts(4, 90), { fill: G }); break
      case "penta":   o = new fabric.Polygon(polyPts(5, 85), { fill: G }); break
      case "pill":    o = new fabric.Rect({ width: 280, height: 96, rx: 48, ry: 48, fill: G }); break
      case "banner":  o = new fabric.Rect({ width: 300, height: 70, fill: G }); break
      case "octo":    o = new fabric.Polygon(polyPts(8, 85), { fill: G }); break
      case "heart":   o = new fabric.Path("M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21z", { fill: G }); o.scaleToWidth(150); break
      case "cross": {
        const a = new fabric.Rect({ width: 44, height: 150, rx: 8, ry: 8, fill: G, left: 53, top: 0 })
        const b = new fabric.Rect({ width: 150, height: 44, rx: 8, ry: 8, fill: G, left: 0, top: 53 })
        o = new fabric.Group([a, b]); break
      }
      case "tag":     o = new fabric.Polygon([{ x: 40, y: 0 }, { x: 230, y: 0 }, { x: 230, y: 120 }, { x: 40, y: 120 }, { x: 0, y: 60 }], { fill: G }); break
      case "bubble": {
        const r = new fabric.Rect({ left: 0, top: 0, width: 210, height: 130, rx: 18, ry: 18, fill: G })
        const tail = new fabric.Polygon([{ x: 0, y: 0 }, { x: 46, y: 0 }, { x: 8, y: 36 }], { fill: G, left: 38, top: 128 })
        o = new fabric.Group([r, tail]); break
      }
      case "capsule": o = new fabric.Rect({ width: 250, height: 96, rx: 48, ry: 48, fill: G }); break
      case "blob":    o = new fabric.Path("M120 18 C168 8 210 44 205 96 C200 150 158 188 104 182 C54 176 14 140 20 86 C25 42 60 26 120 18 Z", { fill: G }); break
      case "wave":    o = new fabric.Path("M0 30 Q 50 0 100 30 T 200 30 L 200 110 L 0 110 Z", { fill: G }); break
      default:        o = new fabric.Rect({ width: 200, height: 120, fill: G })
    }
    centerObj(o)
  }
  // Texte pre-style (titre / sous-titre / corps / impact / manuscrit)
  const addTextPreset = (p: { text: string; size: number; weight: string; font: string }) => {
    centerObj(new fabric.IText(p.text, { fontFamily: p.font, fontWeight: p.weight, fontSize: p.size, fill: INK }))
    try {
      const d = document as Document & { fonts?: { load: (f: string) => Promise<unknown> } }
      d.fonts?.load(`${p.weight} ${p.size}px '${p.font}'`).then(() => fcRef.current?.requestRenderAll()).catch(() => {})
    } catch { /* noop */ }
  }
  // Lignes & separateurs (variantes)
  const addLineVariant = (k: string) => {
    const L = 260
    switch (k) {
      case "thick":  centerObj(new fabric.Line([0, 0, L, 0], { stroke: G, strokeWidth: 10, strokeLineCap: "round" })); break
      case "thin":   centerObj(new fabric.Line([0, 0, L, 0], { stroke: G, strokeWidth: 1.5 })); break
      case "dashed": centerObj(new fabric.Line([0, 0, L, 0], { stroke: G, strokeWidth: 4, strokeDashArray: [14, 9] })); break
      case "dotted": centerObj(new fabric.Line([0, 0, L, 0], { stroke: G, strokeWidth: 6, strokeDashArray: [1, 14], strokeLineCap: "round" })); break
      case "double": {
        const a = new fabric.Line([0, 0, L, 0], { stroke: G, strokeWidth: 2 })
        const b = new fabric.Line([0, 10, L, 10], { stroke: G, strokeWidth: 2 })
        centerObj(new fabric.Group([a, b])); break
      }
      case "ornament": {
        const ln = new fabric.Line([0, 0, L, 0], { stroke: G, strokeWidth: 2, left: 0, top: 0 })
        const dot = new fabric.Polygon(starPts(4, 14, 5), { fill: G, left: L / 2 - 14, top: -14 })
        centerObj(new fabric.Group([ln, dot])); break
      }
      default: centerObj(new fabric.Line([0, 0, L, 0], { stroke: G, strokeWidth: 4 }))
    }
  }
  // Cadres / bordures autour du support (clic inside ignore via perPixelTargetFind)
  const addFrame = (k: string) => {
    const fc = fcRef.current; if (!fc) return
    const z = fc.getZoom() || 1, W = fc.getWidth() / z, H = fc.getHeight() / z
    const m = Math.round(W * 0.05)
    const base = { fill: "transparent", stroke: G, strokeUniform: true, perPixelTargetFind: true } as const
    let o: fabric.Object
    if (k === "double") {
      const r1 = new fabric.Rect({ left: 0, top: 0, width: W - 2 * m, height: H - 2 * m, ...base, strokeWidth: 2 })
      const r2 = new fabric.Rect({ left: 9, top: 9, width: W - 2 * m - 18, height: H - 2 * m - 18, ...base, strokeWidth: 1 })
      o = new fabric.Group([r1, r2], { left: m, top: m })
    } else {
      const sw = k === "thick" ? 8 : 2
      const rx = k === "rounded" ? 26 : 0
      o = new fabric.Rect({ left: m, top: m, width: W - 2 * m, height: H - 2 * m, ...base, strokeWidth: sw, rx, ry: rx })
    }
    ;(o as any).perPixelTargetFind = true
    fc.add(o); fc.setActiveObject(o); fc.requestRenderAll(); refreshSel()
  }
  // Decorations (formes decoratives construites en Fabric)
  const addDeco = (k: string) => {
    let o: fabric.Object
    switch (k) {
      case "sparkle": o = new fabric.Polygon(starPts(4, 80, 22), { fill: G }); break
      case "burst":   o = new fabric.Polygon(starPts(12, 85, 66), { fill: G }); break
      case "ring":    o = new fabric.Circle({ radius: 70, fill: "transparent", stroke: G, strokeWidth: 8, strokeUniform: true }); break
      case "dots": {
        const a: fabric.Object[] = []
        for (let i = 0; i < 5; i++) a.push(new fabric.Circle({ radius: 9, fill: G, left: i * 30, top: 0 }))
        o = new fabric.Group(a); break
      }
      case "wave":
        o = new fabric.Polyline([{ x: 0, y: 14 }, { x: 22, y: 0 }, { x: 44, y: 14 }, { x: 66, y: 0 }, { x: 88, y: 14 }, { x: 110, y: 0 }, { x: 132, y: 14 }],
          { fill: "", stroke: G, strokeWidth: 5, strokeLineCap: "round", strokeLineJoin: "round" }); break
      case "confetti": {
        const a: fabric.Object[] = []
        ;[[0, 0, 15], [40, 12, -20], [82, 2, 30], [22, 44, 40], [72, 48, -15], [114, 26, 10], [126, 64, -30]]
          .forEach(([x, y, ang]) => a.push(new fabric.Rect({ left: x, top: y, width: 10, height: 22, rx: 3, ry: 3, fill: G, angle: ang })))
        o = new fabric.Group(a); break
      }
      case "stars3": {
        const a: fabric.Object[] = []
        ;[[0, 22, 20], [44, 0, 28], [88, 26, 17]].forEach(([x, y, s]) => a.push(new fabric.Polygon(starPts(5, s, s * 0.42), { fill: G, left: x, top: y })))
        o = new fabric.Group(a); break
      }
      case "dotgrid": {
        const a: fabric.Object[] = []
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) a.push(new fabric.Circle({ radius: 6, fill: G, left: c * 28, top: r * 28 }))
        o = new fabric.Group(a); break
      }
      case "chevrons": {
        const a: fabric.Object[] = []
        for (let i = 0; i < 3; i++) a.push(new fabric.Polyline([{ x: 0, y: 0 }, { x: 18, y: 16 }, { x: 0, y: 32 }], { fill: "", stroke: G, strokeWidth: 5, strokeLineCap: "round", strokeLineJoin: "round", left: i * 20, top: 0 }))
        o = new fabric.Group(a); break
      }
      case "corners": {
        const W = 200, H = 140, t = 6, l = 38
        const r = (x: number, y: number, w: number, h: number) => new fabric.Rect({ left: x, top: y, width: w, height: h, fill: G })
        o = new fabric.Group([
          r(0, 0, l, t), r(0, 0, t, l),                 // haut gauche
          r(W - l, 0, l, t), r(W - t, 0, t, l),          // haut droite
          r(0, H - t, l, t), r(0, H - l, t, l),          // bas gauche
          r(W - l, H - t, l, t), r(W - t, H - l, t, l),  // bas droite
        ]); break
      }
      case "swoosh": o = new fabric.Path("M0 22 Q 75 -8 150 16", { fill: "", stroke: G, strokeWidth: 7, strokeLineCap: "round" }); break
      default: o = new fabric.Polygon(starPts(4, 80, 22), { fill: G })
    }
    centerObj(o)
  }
  // Ouvrir la bibliotheque sur un onglet donne (depuis le rail)
  const openLib = (c: typeof libCat) => {
    setLibCat(c); setLibOpen(true); setTplOpen(false); setSide(""); setCompOpen(false); setPhotoOpen(false)
    setTimeout(() => document.getElementById("lib-" + c)?.scrollIntoView({ behavior: "smooth", block: "start" }), 70)
  }
  // Ouvrir / fermer un panneau lateral (calques / fond)
  const openSide = (s: "layers" | "bg" | "styles") => { setSide(prev => prev === s ? "" : s); setLibOpen(false); setTplOpen(false); setCompOpen(false); setPhotoOpen(false) }
  // Ouvrir / fermer le flyout composants metier
  const openComp = () => { setCompOpen(v => !v); setTplOpen(false); setLibOpen(false); setSide(""); setPhotoOpen(false) }

  // Dock mobile (barre du bas) : chaque outil ouvre le panneau correspondant (un seul à la fois).
  const DOCK_TOOLS: DockTool[] = [
    { id: "tpl", icon: <LayoutTemplate size={23} />, label: "Modèles" },
    { id: "text", icon: <TypeIcon size={23} />, label: "Texte" },
    { id: "qr", icon: <QrCode size={23} />, label: "QR" },
    { id: "img", icon: <ImageIcon size={23} />, label: "Image" },
    { id: "photo", icon: <Search size={23} />, label: "Photos" },
    { id: "shape", icon: <Shapes size={23} />, label: "Formes" },
    { id: "color", icon: <Palette size={23} />, label: "Couleurs" },
    { id: "layers", icon: <Copy size={23} />, label: "Calques" },
  ]
  const dockActive =
    tplOpen ? "tpl"
    : libOpen && libCat === "text" ? "text"
    : libOpen && libCat === "shapes" ? "shape"
    : photoOpen ? "photo"
    : side === "styles" ? "color"
    : side === "layers" ? "layers"
    : null
  const onDock = (id: string) => {
    switch (id) {
      case "tpl": setTplOpen(v => !v); setLibOpen(false); setSide(""); setCompOpen(false); setPhotoOpen(false); break
      case "text": (libOpen && libCat === "text") ? setLibOpen(false) : openLib("text"); break
      case "shape": (libOpen && libCat === "shapes") ? setLibOpen(false) : openLib("shapes"); break
      case "qr": addQr(); break
      case "img": fileRef.current?.click(); break
      case "photo": openPhoto(); break
      case "color": openSide("styles"); break
      case "layers": openSide("layers"); break
    }
  }
  // Ouvrir / fermer le flyout recherche de photos
  const openPhoto = () => {
    const opening = !photoOpen
    setPhotoOpen(opening); setTplOpen(false); setLibOpen(false); setSide(""); setCompOpen(false)
    if (opening && !photoResults.length && !photoLoading) searchPhotos("ambiance lifestyle")
  }
  // Rechercher des photos (Unsplash, via notre route serveur)
  const searchPhotos = async (q: string) => {
    const term = q.trim(); if (!term) return
    setPhotoLoading(true); setPhotoErr("")
    try {
      const r = FORMATS[format]?.ratio ?? 0.7
      const orient = r < 0.9 ? "portrait" : r > 1.1 ? "landscape" : "squarish"
      const res = await fetch(`/api/unsplash?q=${encodeURIComponent(term)}&orientation=${orient}`)
      const data = await res.json().catch(() => ({ photos: [] }))
      if (res.status === 503) { setPhotoErr("Recherche d'images non configurée — ajoute la variable d'env UNSPLASH_ACCESS_KEY sur Vercel."); setPhotoResults([]) }
      else if (!res.ok) { setPhotoErr("Recherche indisponible pour le moment."); setPhotoResults([]) }
      else { setPhotoResults(data.photos || []); if (!data.photos?.length) setPhotoErr("Aucun résultat.") }
    } catch { setPhotoErr("Erreur réseau.") } finally { setPhotoLoading(false) }
  }
  // Ajouter une photo au canvas (crossOrigin pour permettre l'export)
  const addPhoto = (url: string) => {
    const fc = fcRef.current; if (!fc) return
    fabric.Image.fromURL(url, (img) => {
      const W = fc.getWidth() / (fc.getZoom() || 1)
      img.scaleToWidth(W * 0.6)
      centerObj(img)
    }, { crossOrigin: "anonymous" })
  }
  // Definir une photo comme fond plein cadre (cover), derriere tous les elements
  const setPhotoBg = (url: string) => {
    const fc = fcRef.current; if (!fc) return
    fabric.Image.fromURL(url, (img) => {
      const z = fc.getZoom() || 1, W = fc.getWidth() / z, H = fc.getHeight() / z
      const sc = Math.max(W / (img.width || W), H / (img.height || H))
      img.set({ scaleX: sc, scaleY: sc, left: W / 2, top: H / 2, originX: "center", originY: "center" })
      fc.add(img); fc.sendToBack(img)
      const vG = vGuideRef.current, hG = hGuideRef.current
      if (vG) fc.bringToFront(vG); if (hG) fc.bringToFront(hG)
      fc.requestRenderAll(); pushHistorySoon(); setLayersVer(v => v + 1)
    }, { crossOrigin: "anonymous" })
  }
  // Filtres photo (toggle) sur l'image selectionnee
  const toggleFilter = (key: string) => {
    const fc = fcRef.current; if (!fc) return
    const o = fc.getActiveObject() as fabric.Image | undefined
    if (!o || o.type !== "image") return
    const F = (fabric.Image as any).filters
    const ctor: Record<string, any> = { dark: F.Brightness, gray: F.Grayscale, blur: F.Blur, duo: F.BlendColor, vintage: F.Sepia, luxe: F.Contrast }
    // detection par TYPE de filtre (survit a la serialisation, contrairement a un marqueur custom)
    const filters = ((o.filters || []) as any[])
    const has = filters.some(f => f instanceof ctor[key])
    let next = filters.filter(f => !(f instanceof ctor[key]))
    if (!has) {
      let f: any
      if (key === "dark") f = new F.Brightness({ brightness: -0.3 })
      else if (key === "gray") f = new F.Grayscale()
      else if (key === "blur") f = new F.Blur({ blur: 0.18 })
      else if (key === "duo") f = new F.BlendColor({ color: G, mode: "tint", alpha: 0.5 })
      else if (key === "vintage") f = new F.Sepia()
      else if (key === "luxe") f = new F.Contrast({ contrast: 0.2 })
      if (f) next = [...next, f]
    }
    o.filters = next as any
    o.applyFilters(); fc.requestRenderAll(); pushHistorySoon()
  }
  // Ajustements image continus (luminosite / contraste / saturation / teinte) — un filtre par type
  const ADJ_MAP: Record<string, [string, string]> = {
    brightness: ["Brightness", "brightness"], contrast: ["Contrast", "contrast"],
    saturation: ["Saturation", "saturation"], hue: ["HueRotation", "rotation"],
  }
  const imgAdjustVal = (o: fabric.Object | undefined, kind: string): number => {
    if (!o || o.type !== "image") return 0
    const F = (fabric.Image as any).filters; const [ctor, prop] = ADJ_MAP[kind]
    const f = (((o as fabric.Image).filters || []) as any[]).find(x => x instanceof F[ctor])
    return f ? (f[prop] ?? 0) : 0
  }
  const setImageAdjust = (kind: string, value: number) => {
    const fc = fcRef.current; if (!fc) return
    const o = fc.getActiveObject() as fabric.Image | undefined
    if (!o || o.type !== "image") return
    const F = (fabric.Image as any).filters; const [ctor, prop] = ADJ_MAP[kind]
    let filters = ((o.filters || []) as any[]).filter(f => !(f instanceof F[ctor]))
    if (value !== 0) { const f = new F[ctor]({}); f[prop] = value; filters = [...filters, f] }
    o.filters = filters as any
    o.applyFilters(); fc.requestRenderAll(); setLayersVer(v => v + 1); pushHistorySoon()
  }
  // Bouton CTA (pilule dimensionnee au texte)
  const addCTA = (label: string) => {
    centerObj(buildPill(label, { rectFill: G, textFill: "#080808", height: 80, fontSize: 30 }))
  }
  // Badge rond (sceau cranté) ou ruban (fanion)
  const addBadge = (label: string, kind: "seal" | "ribbon") => {
    if (kind === "seal") {
      const burst = new fabric.Polygon(starPts(16, 95, 80), { fill: G })
      const txt   = new fabric.Text(label, { fontSize: 26, fontFamily: "DM Sans", fontWeight: "bold", fill: "#080808", originX: "center", originY: "center", left: 95, top: 95 })
      centerObj(new fabric.Group([burst, txt]))
    } else {
      const W = 300, H = 74, N = 30
      const ribbon = new fabric.Polygon([
        { x: 0, y: 0 }, { x: W, y: 0 }, { x: W - N, y: H / 2 }, { x: W, y: H }, { x: 0, y: H }, { x: N, y: H / 2 },
      ], { fill: G })
      const txt = new fabric.Text(label, { fontSize: 28, fontFamily: "DM Sans", fontWeight: "bold", fill: "#080808", originX: "center", originY: "center", left: W / 2, top: H / 2 })
      centerObj(new fabric.Group([ribbon, txt]))
    }
  }
  // Composants metier prets a l'emploi (1 clic) : pilule ou carte pre-composee
  const addComponent = (key: string) => {
    const pill = (text: string, bg: string, fg: string) => {
      const t = new fabric.Text(text, { fontSize: 24, fontWeight: "bold", fill: fg, fontFamily: "Arial", originX: "center", originY: "center" })
      const w = Math.round((t.width ?? 160) + 56), h = Math.round((t.height ?? 30) + 34)
      const r = new fabric.Rect({ width: w, height: h, rx: h / 2, ry: h / 2, fill: bg })
      t.set({ left: w / 2, top: h / 2 })
      return new fabric.Group([r, t])
    }
    const card = (title: string, lines: string[]) => {
      const w = 330, lh = 32, h = 64 + lines.length * lh
      const objs: fabric.Object[] = [new fabric.Rect({ width: w, height: h, rx: 16, ry: 16, fill: "#FFFFFF", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.14)", blur: 20, offsetX: 0, offsetY: 7 }) })]
      objs.push(new fabric.Text(title, { left: 26, top: 22, fontSize: 19, fontWeight: "bold", fill: "#1A1A1A", fontFamily: "Arial" }))
      lines.forEach((ln, i) => objs.push(new fabric.Text(ln, { left: 26, top: 56 + i * lh, fontSize: 15, fill: "#555555", fontFamily: "Arial" })))
      return new fabric.Group(objs)
    }
    let o: fabric.Object
    switch (key) {
      case "avis": {
        const bg = new fabric.Rect({ width: 320, height: 120, rx: 18, ry: 18, fill: "#FFFFFF", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.14)", blur: 20, offsetX: 0, offsetY: 7 }) })
        const stars = new fabric.Text("★★★★★", { fontSize: 34, fill: "#F4B400", left: 160, top: 22, originX: "center", fontFamily: "Arial" })
        const t = new fabric.Text("Laissez-nous un avis", { fontSize: 18, fontWeight: "bold", fill: "#1A1A1A", left: 160, top: 76, originX: "center", fontFamily: "Arial" })
        o = new fabric.Group([bg, stars, t]); break
      }
      case "insta":    o = pill("📷  @votrecompte", "#E1306C", "#FFFFFF"); break
      case "tiktok":   o = pill("🎵  TikTok", "#111111", "#FFFFFF"); break
      case "facebook": o = pill("👍  Facebook", "#1877F2", "#FFFFFF"); break
      case "youtube":  o = pill("▶  YouTube", "#FF0000", "#FFFFFF"); break
      case "site":     o = pill("🌐  monsite.fr", G, "#080808"); break
      case "maps":     o = pill("🗺️  Itinéraire", "#0E7A5F", "#FFFFFF"); break
      case "newsletter": o = pill("📨  S'inscrire à la newsletter", "#1F2937", "#FFFFFF"); break
      case "don":      o = pill("❤️  Faire un don", "#C0392B", "#FFFFFF"); break
      case "promo":    o = card("🎟️  Code promo", ["PROMO10", "−10% sur votre commande"]); break
      case "whatsapp": o = pill("💬  WhatsApp", "#25D366", "#FFFFFF"); break
      case "phone":    o = pill("📞  06 12 34 56 78", G, "#080808"); break
      case "email":    o = pill("✉️  contact@email.fr", "#1F2937", "#FFFFFF"); break
      case "menu":     o = pill("🍽️  Voir le menu", G, "#080808"); break
      case "reserver": o = pill("📅  Réserver", "#0E7A5F", "#FFFFFF"); break
      case "pay":      o = pill("💳  Payer en ligne", "#1D4ED8", "#FFFFFF"); break
      case "catalogue":o = pill("🛍️  Voir le catalogue", G, "#080808"); break
      case "portfolio":o = pill("🎨  Mon portfolio", "#1F2937", "#FFFFFF"); break
      case "wifi":     o = card("📶  Wifi", ["Réseau : MonReseau", "Mot de passe : ********"]); break
      case "horaires": o = card("🕐  Horaires", ["Lun–Ven : 9h – 19h", "Samedi : 10h – 18h", "Dimanche : fermé"]); break
      case "adresse":  o = card("📍  Adresse", ["12 rue de l'Exemple", "75001 Paris"]); break
      case "contact":  o = card("🪪  Prénom Nom", ["Votre métier", "📞 06 12 34 56 78", "🌐 monsite.fr"]); break
      default:         o = pill("Bouton", G, "#080808")
    }
    centerObj(o)
  }
  // Fleche (polygone), pointant vers la droite par defaut + rotation
  const addArrow = (angle: number) => {
    const w = 230, h = 130
    const pts = [
      { x: 0, y: h * 0.3 }, { x: w * 0.6, y: h * 0.3 }, { x: w * 0.6, y: 0 }, { x: w, y: h * 0.5 },
      { x: w * 0.6, y: h }, { x: w * 0.6, y: h * 0.7 }, { x: 0, y: h * 0.7 },
    ]
    centerObj(new fabric.Polygon(pts, { fill: G, angle }))
  }

  // ---- Mutation de l'objet actif -------------------------------------------
  const mutate = (fn: (o: fabric.Object) => void) => {
    const fc = fcRef.current; if (!fc) return
    const o = fc.getActiveObject(); if (!o) return
    fn(o)
    fc.requestRenderAll()
    refreshSel()
    pushHistorySoon()
  }

  // Changer le libelle d'un groupe CTA / badge (texte interne) + ajuster la pilule
  const setLabel = (value: string) => {
    const fc = fcRef.current; if (!fc) return
    const grp = fc.getActiveObject() as fabric.Group | undefined
    const txt = groupText(grp)
    if (!grp || !txt) return
    txt.set({ text: value })
    ;(txt as unknown as { initDimensions?: () => void }).initDimensions?.()
    // Pilule (rect arrondi + texte) : ajuster la largeur au texte, garder centre
    const kids = grp.getObjects()
    const rect = kids.find(o => o.type === "rect") as fabric.Rect | undefined
    if (rect && kids.length === 2) {
      const h = rect.height ?? 60
      const newW = Math.max(h * 2, (txt.width ?? 0) + h * 0.6 * 2)
      rect.set({ width: newW, left: -newW / 2 })
      txt.set({ left: 0 })
      grp.set({ width: newW })
    }
    grp.dirty = true
    grp.setCoords()
    fc.requestRenderAll()
    refreshSel()
    pushHistorySoon()
  }

  // Couleur : recolore les formes (non-texte) d'un groupe, ou l'objet simple
  const setFill = (color: string) => mutate(o => {
    if (o.type === "group") {
      ;(o as fabric.Group).getObjects().forEach(c => {
        if (c.type !== "text" && c.type !== "i-text" && c.type !== "textbox") c.set("fill", color)
      })
      o.dirty = true
    } else {
      o.set("fill", color)
    }
  })

  // Remplissage dégradé (forme ou texte) — coords en repere local de l'objet
  const gradOf = (el: fabric.Object, c1: string, c2: string) => {
    const w = (el.width ?? 100), h = (el.height ?? 100)
    return new fabric.Gradient({ type: "linear", gradientUnits: "pixels", coords: { x1: 0, y1: 0, x2: w, y2: h }, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] })
  }
  const setGradientFill = (c1: string, c2: string) => mutate(o => {
    if (o.type === "group") {
      ;(o as fabric.Group).getObjects().forEach(c => { if (c.type !== "text" && c.type !== "i-text" && c.type !== "textbox") c.set("fill", gradOf(c, c1, c2) as unknown as string) })
      o.dirty = true
    } else {
      o.set("fill", gradOf(o, c1, c2) as unknown as string)
    }
  })
  // Couleur de l'ombre (garde flou/decalage actuels)
  const setShadowColor = (color: string) => mutate(o => {
    const s = o.shadow as fabric.Shadow | null
    if (!s) { o.set("shadow", new fabric.Shadow({ color, blur: 22, offsetX: 0, offsetY: 10 })) }
    else { s.color = color }
    o.dirty = true
  })
  // Couleur du texte interne d'un groupe (CTA / badge)
  const setTextColor = (color: string) => mutate(o => {
    const txt = groupText(o); if (!txt) return
    txt.set("fill", color)
    o.dirty = true
  })

  // Effet : ombre portee
  const setShadow = (on: boolean) => mutate(o => {
    o.set("shadow", on ? new fabric.Shadow({ color: "rgba(0,0,0,0.35)", blur: 18, offsetX: 0, offsetY: 8 }) : null)
    o.dirty = true
  })
  const setShadowBlur = (v: number) => mutate(o => {
    const s = o.shadow as fabric.Shadow | null; if (!s) return
    s.blur = v
    o.dirty = true
  })
  const setShadowOffset = (axis: "x" | "y", v: number) => mutate(o => {
    const s = o.shadow as fabric.Shadow | null; if (!s) return
    if (axis === "x") s.offsetX = v; else s.offsetY = v
    o.dirty = true
  })
  // Presets d'ombre nommes (Canva-like)
  const setShadowPreset = (kind: "off" | "soft" | "medium" | "strong" | "floating" | "luxury") => mutate(o => {
    const P: Record<string, fabric.Shadow | null> = {
      off: null,
      soft:     new fabric.Shadow({ color: "rgba(0,0,0,0.18)", blur: 8,  offsetX: 0, offsetY: 3 }),
      medium:   new fabric.Shadow({ color: "rgba(0,0,0,0.28)", blur: 18, offsetX: 0, offsetY: 8 }),
      strong:   new fabric.Shadow({ color: "rgba(0,0,0,0.40)", blur: 28, offsetX: 0, offsetY: 14 }),
      floating: new fabric.Shadow({ color: "rgba(0,0,0,0.30)", blur: 44, offsetX: 0, offsetY: 30 }),
      luxury:   new fabric.Shadow({ color: "rgba(120,90,20,0.35)", blur: 26, offsetX: 0, offsetY: 12 }),
    }
    o.set("shadow", P[kind]); o.dirty = true
  })
  // Transformations : rotation par pas + inclinaison (skew)
  const rotateBy = (deg: number) => mutate(o => { o.set("angle", (((o.angle ?? 0) + deg) % 360 + 360) % 360); o.setCoords() })
  const skewBy = (axis: "x" | "y", d: number) => mutate(o => {
    const k = axis === "x" ? "skewX" : "skewY"
    o.set(k, Math.max(-60, Math.min(60, ((o as any)[k] ?? 0) + d))); o.setCoords()
  })
  const resetTransform = () => mutate(o => { o.set({ angle: 0, skewX: 0, skewY: 0 }); o.setCoords() })
  // Glow / Neon : halo colore (ombre sans decalage), base sur la couleur de l'element
  const setGlow = (kind: "soft" | "neon" | "off") => mutate(o => {
    if (kind === "off") { o.set("shadow", null); o.dirty = true; return }
    const base = typeof o.fill === "string" && /^#/.test(o.fill) ? o.fill : G
    o.set("shadow", new fabric.Shadow({ color: base, blur: kind === "neon" ? 30 : 16, offsetX: 0, offsetY: 0 }))
    o.dirty = true
  })

  // Effet : bordure / contour (strokeUniform => epaisseur constante)
  const isTextObj = (o: fabric.Object) => o.type === "i-text" || o.type === "text" || o.type === "textbox"
  const setBorder = (on: boolean) => mutate(o => {
    if (on) {
      o.set({ stroke: G, strokeWidth: (o.strokeWidth ?? 0) > 0 ? o.strokeWidth : 4, strokeUniform: true })
      if (isTextObj(o)) o.set("paintFirst", "stroke") // contour propre derriere le texte (pas en surimpression)
    } else o.set({ stroke: null, strokeWidth: 0 })
    o.dirty = true
  })
  // Degrade radial (depuis le centre) sur l'element
  const setRadialFill = (c1: string, c2: string) => mutate(o => {
    const w = (o.width ?? 100), h = (o.height ?? 100)
    o.set("fill", new fabric.Gradient({ type: "radial", gradientUnits: "pixels", coords: { x1: w / 2, y1: h / 2, r1: 0, x2: w / 2, y2: h / 2, r2: Math.max(w, h) / 2 }, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] }) as unknown as string)
    o.dirty = true
  })
  // Motif / texture de remplissage (points, rayures, grille) base sur la couleur courante
  const setPatternFill = (kind: "dots" | "stripes" | "grid") => mutate(o => {
    if (typeof document === "undefined") return
    const base = typeof o.fill === "string" && /^#/.test(o.fill) ? o.fill : G
    const motif = lum(base) > 0.6 ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.24)"
    const pc = document.createElement("canvas"); pc.width = 22; pc.height = 22
    const ctx = pc.getContext("2d"); if (!ctx) return
    ctx.fillStyle = base; ctx.fillRect(0, 0, 22, 22)
    ctx.fillStyle = motif; ctx.strokeStyle = motif; ctx.lineWidth = 3
    if (kind === "dots") { ctx.beginPath(); ctx.arc(11, 11, 3.2, 0, Math.PI * 2); ctx.fill() }
    else if (kind === "stripes") { ctx.beginPath(); ctx.moveTo(-4, 22); ctx.lineTo(22, -4); ctx.moveTo(6, 26); ctx.lineTo(26, 6); ctx.stroke() }
    else { ctx.strokeRect(0, 0, 22, 22) }
    o.set("fill", new fabric.Pattern({ source: pc as any, repeat: "repeat" }) as unknown as string); o.dirty = true
  })
  // Bordure degradee : le contour devient un degrade (Fabric accepte un Gradient sur stroke)
  const setBorderGradient = (c1: string, c2: string) => mutate(o => {
    o.set({ stroke: gradOf(o, c1, c2) as unknown as string, strokeWidth: (o.strokeWidth ?? 0) > 0 ? o.strokeWidth : 5, strokeUniform: true })
    o.dirty = true
  })
  // Taille : verrou du ratio (scale uniquement par les coins) + remplir / ajuster au support
  const toggleRatioLock = () => {
    const fc = fcRef.current; if (!fc) return
    const o = fc.getActiveObject(); if (!o) return
    const on = (o as any)._ratio !== true
    ;(o as any)._ratio = on
    o.setControlsVisibility({ ml: !on, mr: !on, mt: !on, mb: !on })
    fc.requestRenderAll(); setLayersVer(v => v + 1)
  }
  const sizeToCanvas = (mode: "fill" | "fit") => {
    const fc = fcRef.current; if (!fc) return
    const o = fc.getActiveObject(); if (!o) return
    const z = fc.getZoom() || 1
    const cw = fc.getWidth() / z, ch = fc.getHeight() / z
    const baseW = (o.width || 1), baseH = (o.height || 1)
    const s = mode === "fill" ? Math.max(cw / baseW, ch / baseH) : Math.min(cw / baseW, ch / baseH)
    o.set({ scaleX: s, scaleY: s, originX: "center", originY: "center", left: cw / 2, top: ch / 2 })
    o.setCoords(); fc.requestRenderAll(); refreshSel(); pushHistorySoon()
  }
  // Contour seul (forme "creuse") : remplissage transparent + bordure de la couleur courante
  const makeOutline = () => mutate(o => {
    const cur = typeof o.fill === "string" && /^#/.test(o.fill) ? o.fill : (typeof o.stroke === "string" ? o.stroke : G)
    o.set({ fill: "transparent", stroke: cur, strokeWidth: (o.strokeWidth ?? 0) > 0 ? o.strokeWidth : 5, strokeUniform: true })
    o.dirty = true
  })
  // Pinceau de format : copier/coller le style d'un element a l'autre
  const copyStyle = () => {
    const o = fcRef.current?.getActiveObject() as any; if (!o) return
    styleClipRef.current = {
      fill: o.fill, stroke: o.stroke, strokeWidth: o.strokeWidth, strokeDashArray: o.strokeDashArray, strokeLineCap: o.strokeLineCap, paintFirst: o.paintFirst,
      opacity: o.opacity, shadow: o.shadow ? (o.shadow.toObject ? o.shadow.toObject() : o.shadow) : null,
      fontFamily: o.fontFamily, fontWeight: o.fontWeight, fontStyle: o.fontStyle, textAlign: o.textAlign, charSpacing: o.charSpacing, lineHeight: o.lineHeight,
    }
    setHasStyleClip(true)
  }
  const pasteStyle = () => {
    const c = styleClipRef.current; if (!c) return
    mutate(o => {
      o.set({ fill: c.fill, stroke: c.stroke ?? null, strokeWidth: c.strokeWidth ?? 0, strokeDashArray: c.strokeDashArray ?? null, opacity: c.opacity ?? 1 })
      if (c.strokeLineCap) o.set("strokeLineCap", c.strokeLineCap)
      if (c.paintFirst) o.set("paintFirst", c.paintFirst)
      o.set("shadow", c.shadow ? new fabric.Shadow(c.shadow) : null)
      if (isTextObj(o)) o.set({ fontFamily: c.fontFamily, fontWeight: c.fontWeight, fontStyle: c.fontStyle, textAlign: c.textAlign, charSpacing: c.charSpacing, lineHeight: c.lineHeight } as any)
      o.dirty = true
    })
  }
  const setBorderColor = (color: string) => mutate(o => {
    o.set({ stroke: color, strokeUniform: true })
    if ((o.strokeWidth ?? 0) === 0) o.set("strokeWidth", 4)
    o.dirty = true
  })
  const setBorderWidth = (v: number) => mutate(o => {
    o.set({ strokeWidth: v, strokeUniform: true })
    if (v > 0 && !o.stroke) o.set("stroke", G)
    o.dirty = true
  })

  // Coins arrondis (rectangles)
  const setRadius = (v: number) => mutate(o => {
    if (o.type !== "rect") return
    ;(o as fabric.Rect).set({ rx: v, ry: v })
    o.dirty = true
  })

  // ---- Calques -------------------------------------------------------------
  const layer = (action: "front" | "back" | "fwd" | "bwd" | "dup" | "lock" | "del") => {
    const fc = fcRef.current; if (!fc) return
    const o = fc.getActiveObject(); if (!o) return
    try { (navigator as any).vibrate?.(8) } catch { /* pas de vibreur (desktop) */ } // feedback (#16)
    switch (action) {
      case "front": fc.bringToFront(o); break
      case "back":  fc.sendToBack(o);   break
      case "fwd":   fc.bringForward(o); break
      case "bwd":   fc.sendBackwards(o); break
      case "dup": {
        const actives = fc.getActiveObjects()
        if (actives.length > 1) {
          // Selection multiple : discard restaure les coords absolues, on clone chacun puis on re-selectionne.
          fc.discardActiveObject()
          const clones: fabric.Object[] = []
          let remaining = actives.length
          actives.forEach(src => src.clone((c: fabric.Object) => {
            c.set({ left: (src.left ?? 0) + 20, top: (src.top ?? 0) + 20 })
            ;(c as any).isQR = (src as any).isQR
            fc.add(c); clones.push(c)
            if (--remaining === 0) {
              const nsel = new fabric.ActiveSelection(clones, { canvas: fc })
              fc.setActiveObject(nsel); fc.requestRenderAll(); refreshSel()
            }
          }, TOJSON_PROPS))
          return
        }
        o.clone((c: fabric.Object) => {
          c.set({ left: (o.left ?? 0) + 20, top: (o.top ?? 0) + 20 })
          ;(c as any).isQR = (o as any).isQR
          fc.add(c); fc.setActiveObject(c); fc.requestRenderAll(); refreshSel()
        }, TOJSON_PROPS)
        return
      }
      case "lock": {
        const locked = !o.lockMovementX
        o.set({
          lockMovementX: locked, lockMovementY: locked,
          lockScalingX: locked, lockScalingY: locked, lockRotation: locked,
          hasControls: !locked,
        })
        break
      }
      case "del": {
        // getActiveObjects gere la selection MULTIPLE (getActiveObject renvoie le wrapper, non supprimable).
        const objs = fc.getActiveObjects()
        fc.discardActiveObject()
        objs.forEach(x => fc.remove(x))
        setSel(null); fc.requestRenderAll()
        showToast(objs.length > 1 ? `${objs.length} éléments supprimés` : "Élément supprimé") // toast avec Annuler
        return
      }
    }
    // garder les guides au sommet
    if (vGuideRef.current) fc.bringToFront(vGuideRef.current)
    if (hGuideRef.current) fc.bringToFront(hGuideRef.current)
    fc.requestRenderAll(); refreshSel()
    pushHistorySoon() // front/back/fwd/bwd/lock ne declenchent pas d'evenement
    setLayersVer(v => v + 1)
  }

  // ---- Liste des calques ---------------------------------------------------
  const layerName = (o: fabric.Object): string => {
    const custom = (o as any).name
    if (typeof custom === "string" && custom.trim()) return custom.trim().slice(0, 22)
    if ((o as any).isQR) return "QR Code"
    const t = groupText(o)
    if (t) return (t.text || "Bouton").slice(0, 18)
    switch (o.type) {
      case "i-text": case "text": case "textbox": return ((o as fabric.IText).text || "Texte").slice(0, 18)
      case "rect": return "Rectangle"
      case "circle": return "Cercle"
      case "triangle": return "Triangle"
      case "polygon": return "Forme"
      case "line": return "Ligne"
      case "image": return "Image"
      case "path": return "Icône"
      case "group": return "Groupe"
      default: return "Élément"
    }
  }
  // Objets du plus haut (devant) au plus bas (derriere), guides exclus
  const layerList = (): fabric.Object[] =>
    (fcRef.current?.getObjects() ?? []).filter(o => !(o as any).isGuide).slice().reverse()
  const selectLayer = (o: fabric.Object) => {
    const fc = fcRef.current; if (!fc) return
    fc.setActiveObject(o); fc.requestRenderAll(); refreshSel()
  }
  const toggleVisible = (o: fabric.Object) => {
    const fc = fcRef.current; if (!fc) return
    o.visible = !o.visible; o.dirty = true
    fc.requestRenderAll(); setLayersVer(v => v + 1); pushHistorySoon()
  }
  const moveLayer = (o: fabric.Object, dir: "up" | "down") => {
    const fc = fcRef.current; if (!fc) return
    fc.setActiveObject(o); layer(dir === "up" ? "fwd" : "bwd")
  }
  const removeLayer = (o: fabric.Object) => {
    const fc = fcRef.current; if (!fc) return
    fc.setActiveObject(o); layer("del")
  }
  const renameLayer = (o: fabric.Object, value: string) => {
    ;(o as any).name = value.trim() || undefined
    setEditLayer(null); setLayersVer(v => v + 1); pushHistorySoon()
  }
  const toggleLockLayer = (o: fabric.Object) => {
    const fc = fcRef.current; if (!fc) return
    fc.setActiveObject(o); layer("lock")
  }
  // Infos du support : textes marques par role (titre / sous-titre / tel / site)
  const roleObjects = (): fabric.Object[] => {
    const objs = fcRef.current?.getObjects() ?? []
    return ROLE_ORDER.map(r => objs.find(o => (o as any).role === r)).filter(Boolean) as fabric.Object[]
  }
  const roleValue = (o: fabric.Object): string => {
    const role = (o as any).role as string
    const txt = ((o as fabric.Textbox).text ?? "")
    const p = ROLE_PREFIX[role]
    return p && txt.startsWith(p) ? txt.slice(p.length) : txt
  }
  const updateRole = (role: string, value: string) => {
    const fc = fcRef.current; if (!fc) return
    const o = fc.getObjects().find(x => (x as any).role === role) as fabric.Textbox | undefined
    if (!o) return
    o.set({ text: (ROLE_PREFIX[role] ?? "") + value })
    fc.requestRenderAll(); setInfoVer(v => v + 1); pushHistorySoon()
  }
  // Reordonner par glisser-deposer (indices dans la liste affichee = front-first)
  const reorderLayers = (from: number, to: number) => {
    const fc = fcRef.current; if (!fc || from === to) return
    const disp = layerList()
    if (from < 0 || from >= disp.length || to < 0 || to >= disp.length) return
    const moved = disp.splice(from, 1)[0]
    disp.splice(to, 0, moved)
    // disp est front-first => l'ordre Fabric (arriere->avant) est l'inverse
    disp.slice().reverse().forEach((obj, i) => fc.moveTo(obj, i))
    if (vGuideRef.current) fc.bringToFront(vGuideRef.current)
    if (hGuideRef.current) fc.bringToFront(hGuideRef.current)
    fc.requestRenderAll(); setLayersVer(v => v + 1); pushHistorySoon()
  }

  // ---- Alignement sur le support -------------------------------------------
  const align = (action: "left" | "centerH" | "right" | "top" | "centerV" | "bottom") => {
    const fc = fcRef.current; if (!fc) return
    const o = fc.getActiveObject(); if (!o) return
    const z = fc.getZoom() || 1
    const W = fc.getWidth() / z, H = fc.getHeight() / z // dimensions en coords design
    const b = o.getBoundingRect(true) // boite englobante en coords canvas
    switch (action) {
      case "left":    o.set("left", (o.left ?? 0) - b.left); break
      case "centerH": o.set("left", (o.left ?? 0) + (W / 2 - (b.left + b.width / 2))); break
      case "right":   o.set("left", (o.left ?? 0) + (W - (b.left + b.width))); break
      case "top":     o.set("top",  (o.top ?? 0) - b.top); break
      case "centerV": o.set("top",  (o.top ?? 0) + (H / 2 - (b.top + b.height / 2))); break
      case "bottom":  o.set("top",  (o.top ?? 0) + (H - (b.top + b.height))); break
    }
    o.setCoords(); fc.requestRenderAll(); pushHistorySoon()
  }

  // Distribuer : espacement régulier des objets d'une multi-sélection (≥ 3)
  // Aligner les objets d'une multi-sélection les uns sur les autres (bord/centre de la boîte commune).
  const alignSelection = (mode: AlignMode) => {
    const fc = fcRef.current; if (!fc) return
    const sel = fc.getActiveObject()
    if (!sel || sel.type !== "activeSelection") return
    const objs = (sel as fabric.ActiveSelection).getObjects().slice()
    if (objs.length < 2) return
    // Boîtes absolues (dans l'activeSelection, left/top sont relatifs au centre — mais un delta reste un delta).
    const boxes: Box[] = objs.map(o => { const b = o.getBoundingRect(true); return { left: b.left, top: b.top, width: b.width, height: b.height } })
    const deltas = alignDeltas(boxes, mode)
    objs.forEach((o, i) => { o.set({ left: (o.left ?? 0) + deltas[i].dx, top: (o.top ?? 0) + deltas[i].dy }); o.setCoords() })
    ;(sel as fabric.ActiveSelection).setCoords()
    fc.requestRenderAll(); pushHistorySoon()
  }

  const distribute = (axis: "h" | "v") => {
    const fc = fcRef.current; if (!fc) return
    const sel = fc.getActiveObject()
    if (!sel || sel.type !== "activeSelection") return
    const objs = (sel as fabric.ActiveSelection).getObjects().slice()
    if (objs.length < 3) return
    // coords absolues (dans l'activeSelection, left/top sont relatifs au centre du groupe)
    const rect = (o: fabric.Object) => o.getBoundingRect(true)
    objs.sort((a, b) => axis === "h" ? rect(a).left - rect(b).left : rect(a).top - rect(b).top)
    const first = rect(objs[0]), last = rect(objs[objs.length - 1])
    const startC = axis === "h" ? first.left + first.width / 2 : first.top + first.height / 2
    const endC = axis === "h" ? last.left + last.width / 2 : last.top + last.height / 2
    const step = (endC - startC) / (objs.length - 1)
    objs.forEach((o, i) => {
      if (i === 0 || i === objs.length - 1) return
      const r = rect(o)
      const targetC = startC + step * i
      const curC = axis === "h" ? r.left + r.width / 2 : r.top + r.height / 2
      if (axis === "h") o.set("left", (o.left ?? 0) + (targetC - curC))
      else o.set("top", (o.top ?? 0) + (targetC - curC))
      o.setCoords()
    })
    fc.requestRenderAll(); pushHistorySoon()
  }

  // ---- Outils : miroir, grouper, degrouper, tout selectionner --------------
  const flip = (axis: "x" | "y") => mutate(o => o.set(axis === "x" ? "flipX" : "flipY", !(axis === "x" ? o.flipX : o.flipY)))
  const groupSel = () => {
    const fc = fcRef.current; if (!fc) return
    const a = fc.getActiveObject()
    if (!a || a.type !== "activeSelection") return
    ;(a as fabric.ActiveSelection).toGroup()
    fc.requestRenderAll(); refreshSel(); setLayersVer(v => v + 1); pushHistorySoon()
  }
  const ungroupSel = () => {
    const fc = fcRef.current; if (!fc) return
    const a = fc.getActiveObject()
    if (!a || a.type !== "group") return
    ;(a as fabric.Group).toActiveSelection()
    fc.requestRenderAll(); refreshSel(); setLayersVer(v => v + 1); pushHistorySoon()
  }

  // ---- Barre contextuelle mobile (facon Canva) : "que veux-tu faire ?" ------
  // Deselectionner referme le panneau Reglages + le selecteur d'empilement.
  const isShapeSel = !!sel && !sel.isQr && !sel.isText && !sel.isImage && sel.label === null && !sel.isGroupObj && !sel.multi
  useEffect(() => { if (!sel) { setRegOpen(false); setStackPick(null); setMoreSel(false) } if (!sel?.isQr) setQrSheet(""); if (!sel?.isText) setTxtSheet(""); if (!sel?.isImage) setImgSheet(""); if (!isShapeSel) setShapeSheet(""); if (sel?.label == null) setBtnSheet("") }, [sel, isShapeSel])
  mobileRef.current = landscapeMobile
  // Un bottom-sheet partiel est ouvert (couvre le bas) -> on remonte le canvas (P1 : objet visible).
  const anyBottomSheet = regOpen || !!qrSheet || !!txtSheet || !!imgSheet || !!shapeSheet || !!btnSheet || moreSel
  // Etat des overlays (pour l'interception du bouton Retour telephone).
  overlayOpenRef.current = !!(anyBottomSheet || stackPick || moreOpen || expWiz >= 0)
  closeOverlaysRef.current = () => { setQrSheet(""); setTxtSheet(""); setImgSheet(""); setShapeSheet(""); setBtnSheet(""); setRegOpen(false); setStackPick(null); setMoreOpen(false); setExpWiz(-1) }

  // Selecteur d'objets superposes (#10) : liste les elements sous le centre de la selection.
  const openStackPicker = () => {
    const fc = fcRef.current; if (!fc) return
    const active = fc.getActiveObject(); if (!active) return
    const objs = fc.getObjects().filter(o => !(o as any).isGuide)
    const boxes: LayerBox[] = objs.map((o, i) => {
      const r = o.getBoundingRect(true, true)
      return { id: String(i), left: r.left, top: r.top, width: r.width, height: r.height }
    })
    const ar = active.getBoundingRect(true, true)
    const c = boxCenter({ id: "sel", left: ar.left, top: ar.top, width: ar.width, height: ar.height })
    const ids = stackedAt(c.x, c.y, boxes)          // du plus haut au plus bas
    const map: Record<string, fabric.Object> = {}
    const list = ids.map(id => {
      const o = objs[Number(id)]; map[id] = o
      return { id, name: layerName(o), active: o === active }
    })
    stackRef.current = map
    setStackPick(list.length ? list : null)
  }
  const pickStack = (id: string) => {
    const fc = fcRef.current; const o = stackRef.current[id]; if (!fc || !o) return
    fc.setActiveObject(o); fc.requestRenderAll(); refreshSel(); setStackPick(null)
  }
  const KIND_LABEL: Record<string, string> = { qr: "QR Code", text: "Texte", image: "Image", button: "Bouton", group: "Groupe", shape: "Forme", multi: "Sélection" }
  const ctxIcon = (icon: string): React.ReactNode => {
    switch (icon) {
      case "copy":   return <Copy size={18} />
      case "rotate": return <RotateCw size={18} />
      case "trash":  return <Trash2 size={18} />
      case "up":     return <ChevronUp size={18} />
      case "down":   return <ChevronDown size={18} />
      case "sliders": return <span style={{ fontSize: 17, lineHeight: 1 }}>⚙</span>
      case "frame":  return <span style={{ fontSize: 15, lineHeight: 1 }}>🏷️</span>
      case "minus":  return <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>A−</span>
      case "plus":   return <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>A+</span>
      case "ungroup": return <span style={{ fontSize: 16, lineHeight: 1 }}>⊟</span>
      case "group":  return <span style={{ fontSize: 16, lineHeight: 1 }}>⊞</span>
      case "align":  return <span style={{ fontSize: 16, lineHeight: 1 }}>⊹</span>
      case "stack":  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="13" height="13" rx="2" /><path d="M8 8V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /></svg>
      case "colors": return <span style={{ fontSize: 16, lineHeight: 1 }}>🎨</span>
      case "modules": return <span style={{ fontSize: 15, lineHeight: 1, letterSpacing: -2 }}>▪▪</span>
      case "corners": return <span style={{ fontSize: 15, lineHeight: 1 }}>◱</span>
      case "ecc":    return <span style={{ fontSize: 15, lineHeight: 1 }}>🛡</span>
      case "font":   return <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1, fontFamily: "Georgia, serif" }}>Aa</span>
      case "size":   return <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>T↕</span>
      case "effects": return <span style={{ fontSize: 15, lineHeight: 1 }}>✦</span>
      case "filters": return <span style={{ fontSize: 16, lineHeight: 1 }}>◑</span>
      case "opacity": return <span style={{ fontSize: 16, lineHeight: 1 }}>◔</span>
      case "border": return <span style={{ fontSize: 16, lineHeight: 1 }}>▢</span>
      case "shadow": return <span style={{ fontSize: 16, lineHeight: 1 }}>◗</span>
      case "replace": return <span style={{ fontSize: 16, lineHeight: 1 }}>⇄</span>
      case "more":   return <MoreHorizontal size={19} />
      default:       return <span style={{ fontSize: 15, lineHeight: 1 }}>•</span>
    }
  }
  const onCtx = (id: string) => {
    try { (navigator as any).vibrate?.(8) } catch { /* pas de vibreur */ }
    switch (id) {
      case "settings": setRegOpen(true); break
      case "colors":   setQrSheet("colors"); break
      case "modules":  setQrSheet("modules"); break
      case "corners":  setQrSheet("corners"); break
      case "ecc":      setQrSheet("ecc"); break
      case "frame":    setQrSheet("frame"); break
      case "shapecolor": setShapeSheet("color"); break
      case "border":   setShapeSheet("border"); break
      case "shadow":   setShapeSheet("shadow"); break
      case "more":     setMoreSel(true); break
      case "filters":    setImgSheet("filters"); break
      case "opacity":    setImgSheet("opacity"); break
      case "replace":    replaceRef.current?.click(); break
      case "btntext":    setBtnSheet("text"); break
      case "btncolor":   setBtnSheet("color"); break
      case "font":       setTxtSheet("font"); break
      case "textcolor":  setTxtSheet("color"); break
      case "textsize":   setTxtSheet("size"); break
      case "effects":    setTxtSheet("effects"); break
      case "textalign":  setTxtSheet("align"); break
      case "stack":    openStackPicker(); break
      case "dress":    dressQr(); break
      case "sizeUp":   mutate(o => (o as fabric.IText).set("fontSize", (sel?.fontSize ?? 20) + 2)); break
      case "sizeDown": mutate(o => (o as fabric.IText).set("fontSize", Math.max(8, (sel?.fontSize ?? 20) - 2))); break
      case "front":    layer("front"); break
      case "back":     layer("back"); break
      case "ungroup":  ungroupSel(); break
      case "align":    setRegOpen(true); break   // le panneau Reglages contient Aligner/Distribuer
      case "group":    groupSel(); break
      case "dup":      layer("dup"); break
      case "rotate":   rotateBy(90); break
      case "delete":   layer("del"); break
    }
  }
  const onCanvasContext = (e: React.MouseEvent) => {
    const fc = fcRef.current; if (!fc) return
    e.preventDefault()
    const target = (fc as unknown as { findTarget: (ev: Event, skip?: boolean) => fabric.Object | undefined }).findTarget(e.nativeEvent, false)
    if (target && !(target as any).isGuide) { fc.setActiveObject(target); fc.requestRenderAll(); refreshSel() }
    if (fc.getActiveObject()) setCtx({ x: e.clientX, y: e.clientY })
    else setCtx(null)
  }
  const selectAll = () => {
    const fc = fcRef.current; if (!fc) return
    const objs = fc.getObjects().filter(o => !(o as any).isGuide && o.selectable !== false && o.visible !== false)
    if (!objs.length) return
    fc.discardActiveObject()
    if (objs.length === 1) fc.setActiveObject(objs[0])
    else fc.setActiveObject(new fabric.ActiveSelection(objs, { canvas: fc }))
    fc.requestRenderAll(); refreshSel()
  }

  // ---- Format --------------------------------------------------------------
  const applyFormat = (fmt: FormatId) => {
    const fc = fcRef.current; if (!fc) return
    const d = editDims(fmt)
    fc.setZoom(1); fc.setDimensions({ width: d.w, height: d.h }) // changer de format reinitialise le zoom
    if (bgGrad) applyGradient(bgColor, bgC2) // recalculer le degrade aux nouvelles dimensions
    fc.requestRenderAll()
    setFormat(fmt); setZoom(1)
  }

  // ---- Zoom ----------------------------------------------------------------
  // Zoom = setZoom + agrandissement de l'element (la zone autour scrolle).
  const applyZoom = (z: number) => {
    const fc = fcRef.current; if (!fc) return
    const z0 = fc.getZoom() || 1
    const baseW = fc.getWidth() / z0, baseH = fc.getHeight() / z0 // dims design courantes
    const nz = Math.min(3, Math.max(0.25, z))
    fc.setZoom(nz)
    fc.setDimensions({ width: Math.round(baseW * nz), height: Math.round(baseH * nz) })
    fc.requestRenderAll()
    setZoom(nz)
  }
  // Zoom auto : ajuste pour que tout le support tienne dans la zone visible (vue globale).
  const fitToScreen = (fmt?: FormatId) => {
    const fc = fcRef.current, sc = scrollRef.current; if (!fc || !sc) return
    const base = editDims(fmt ?? format)
    const cs = getComputedStyle(sc)
    const availW = sc.clientWidth - parseFloat(cs.paddingLeft || "24") - parseFloat(cs.paddingRight || "24")
    const availH = sc.clientHeight - parseFloat(cs.paddingTop || "24") - parseFloat(cs.paddingBottom || "24")
    if (availW <= 40 || availH <= 40) return
    const z = Math.min(availW / base.w, availH / base.h) * 0.99
    const nz = Math.max(0.3, Math.min(1, z))
    fc.setZoom(nz)
    fc.setDimensions({ width: Math.round(base.w * nz), height: Math.round(base.h * nz) })
    fc.requestRenderAll()
    setZoom(nz)
  }
  // Redimensionnement des zones (drag de la poignée).
  // "rail" = barre d'outils gauche | "left" = flyout | "right" = Réglages | "format" = panneau Format droit
  type ResizeZone = "rail" | "left" | "right" | "format"
  const RESIZE_CFG: Record<ResizeZone, { min: number; max: number; dir: 1 | -1 }> = {
    rail:   { min: 116, max: 280, dir: 1 },   // à gauche : glisser à droite agrandit
    left:   { min: 220, max: 480, dir: 1 },
    right:  { min: 240, max: 560, dir: -1 },  // à droite : glisser à gauche agrandit
    format: { min: 72,  max: 220, dir: -1 },
  }
  const startResize = (e: React.PointerEvent, zone: ResizeZone) => {
    e.preventDefault()
    const startX = e.clientX
    const cur = { rail: railW, left: leftW, right: rightW, format: formatW }[zone]
    const setter = { rail: setRailW, left: setLeftW, right: setRightW, format: setFormatW }[zone]
    const { min, max, dir } = RESIZE_CFG[zone]
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      setter(Math.max(min, Math.min(max, cur + dir * dx)))
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      setTimeout(() => fitToScreen(), 60) // re-cadre après changement de la zone visible
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }
  // poignée réutilisable (bord interne de la zone, pleine hauteur, saisissable partout)
  const ResizeHandle = ({ which }: { which: ResizeZone }) => {
    const edge = which === "right" || which === "format" ? "left" : "right"
    return (
      <div onPointerDown={e => startResize(e, which)} title="Glisser pour redimensionner"
        onMouseEnter={e => { (e.currentTarget.firstChild as HTMLElement).style.background = G }}
        onMouseLeave={e => { (e.currentTarget.firstChild as HTMLElement).style.background = "rgba(0,0,0,0.10)" }}
        style={{ position: "absolute", top: 0, bottom: 0, [edge]: -4, width: 9, cursor: "col-resize", zIndex: 30, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 2, height: "100%", background: "rgba(0,0,0,0.10)", transition: "background .15s" }} />
      </div>
    )
  }
  // Ajuste automatiquement le zoom au chargement et a chaque changement de format (vue globale).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (loading) return; const t = setTimeout(() => fitToScreen(), 90); return () => clearTimeout(t) }, [format, loading])

  // Repère « marge de sécurité » : rectangle pointillé en retrait de 5 mm des bords (zone où garder le contenu).
  // isGuide -> exclu partout (historique, calques, snapping, sélection, contrôle qualité) ; excludeFromExport -> hors export.
  useEffect(() => {
    const fc = fcRef.current; if (!fc || loading) return
    const h = histRef.current; const wasLock = h.lock; h.lock = true
    if (safeAreaRef.current) { fc.remove(safeAreaRef.current); safeAreaRef.current = null }
    if (showSafe) {
      const d = editDims(format)
      const mm = FORMAT_MM[format] || 0
      const inset = mm > 0 ? Math.round((5 / mm) * d.w) : Math.round(d.w * 0.04)  // 5 mm, ou 4 % en format écran
      const rect = new fabric.Rect({
        left: inset, top: inset, width: d.w - 2 * inset, height: d.h - 2 * inset,
        fill: "transparent", stroke: G, strokeWidth: 1, strokeDashArray: [6, 5],
        selectable: false, evented: false, excludeFromExport: true, hoverCursor: "default", objectCaching: false,
      })
      ;(rect as any).isGuide = true; (rect as any).isOverlay = true
      fc.add(rect); fc.bringToFront(rect)
      safeAreaRef.current = rect
    }
    h.lock = wasLock
    fc.requestRenderAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSafe, format, loading])

  // Pincer pour zoomer (2 doigts) — le réflexe d'un éditeur mobile. Au niveau du conteneur de scroll
  // (DOM natif) : n'altère pas Fabric ; Fabric ne déplace pas d'objet avec 2 doigts, donc pas de conflit.
  useEffect(() => {
    const sc = scrollRef.current; if (!sc) return
    let startDist = 0, startZoom = 1
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onStart = (e: TouchEvent) => { if (e.touches.length === 2) { startDist = dist(e.touches); startZoom = fcRef.current?.getZoom() || 1 } }
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault()
        applyZoom(startZoom * (dist(e.touches) / startDist))
      }
    }
    const onEnd = (e: TouchEvent) => { if (e.touches.length < 2) startDist = 0 }
    sc.addEventListener("touchstart", onStart, { passive: true })
    sc.addEventListener("touchmove", onMove, { passive: false })
    sc.addEventListener("touchend", onEnd)
    return () => { sc.removeEventListener("touchstart", onStart); sc.removeEventListener("touchmove", onMove); sc.removeEventListener("touchend", onEnd) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Desktop : les panneaux gauche flottent au-dessus du plan de travail -> fermeture au clic HORS panneau
  // (sur le canvas ou les panneaux de droite) + touche Échap. Fluide et simple, un seul panneau à la fois.
  useEffect(() => {
    if (landscapeMobile) return
    const leftOpen = tplOpen || compOpen || photoOpen || libOpen || side !== ""
    if (!leftOpen) return
    const close = () => { setTplOpen(false); setCompOpen(false); setPhotoOpen(false); setLibOpen(false); setSide("") }
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest?.(".ps-fly:not(.ps-fly-right)") || t?.closest?.(".ps-rail")) return // clic dans le panneau ou le rail
      close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
    const id = window.setTimeout(() => document.addEventListener("mousedown", onDown), 0) // ignore le clic d'ouverture
    document.addEventListener("keydown", onKey)
    return () => { clearTimeout(id); document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landscapeMobile, tplOpen, compOpen, photoOpen, libOpen, side])
  // Execute fn() avec le canvas ramene a zoom 1 (pour un export propre), puis restaure.
  const withBaseZoom = <T,>(fc: fabric.Canvas, fn: (base: { w: number; h: number }) => T): T => {
    const z = fc.getZoom() || 1
    const base = editDims(format)
    fc.setZoom(1); fc.setDimensions({ width: base.w, height: base.h }); fc.requestRenderAll()
    const out = fn(base)
    fc.setZoom(z); fc.setDimensions({ width: Math.round(base.w * z), height: Math.round(base.h * z) }); fc.requestRenderAll()
    return out
  }

  // ---- Couleur / degrade de fond -------------------------------------------
  // Degrade vertical en coordonnees design (getHeight/zoom), insensible au zoom.
  const applyGradient = (c1: string, c2: string) => {
    const fc = fcRef.current; if (!fc) return
    const h = fc.getHeight() / (fc.getZoom() || 1)
    const grad = new fabric.Gradient({
      type: "linear", gradientUnits: "pixels",
      coords: { x1: 0, y1: 0, x2: 0, y2: h },
      colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }],
    })
    fc.setBackgroundColor(grad as unknown as string, fc.renderAll.bind(fc))
    pushHistorySoon()
  }
  // Fond "mesh" : degrade radial 3 couleurs (look premium spotlight)
  const applyMesh = (c1: string, c2: string, c3: string) => {
    const fc = fcRef.current; if (!fc) return
    const z = fc.getZoom() || 1, w = fc.getWidth() / z, h = fc.getHeight() / z
    const grad = new fabric.Gradient({
      type: "radial", gradientUnits: "pixels",
      coords: { x1: w * 0.5, y1: h * 0.34, r1: 0, x2: w * 0.5, y2: h * 0.34, r2: Math.max(w, h) * 0.95 },
      colorStops: [{ offset: 0, color: c1 }, { offset: 0.55, color: c2 }, { offset: 1, color: c3 }],
    })
    fc.setBackgroundColor(grad as unknown as string, fc.renderAll.bind(fc))
    pushHistorySoon()
  }
  const applyBg = (color: string) => {
    const fc = fcRef.current; if (!fc) return
    setBgColor(color)
    if (bgGrad) { applyGradient(color, bgC2); return }
    fc.setBackgroundColor(color, fc.renderAll.bind(fc))
    pushHistorySoon()
  }
  const toggleGrad = (on: boolean) => {
    setBgGrad(on)
    const fc = fcRef.current; if (!fc) return
    if (on) applyGradient(bgColor, bgC2)
    else { fc.setBackgroundColor(bgColor, fc.renderAll.bind(fc)); pushHistorySoon() }
  }
  const applyBgC2 = (c2: string) => { setBgC2(c2); if (bgGrad) applyGradient(bgColor, c2) }
  const applyBgPreset = (p: typeof BG_PRESETS[number]) => {
    const fc = fcRef.current; if (!fc) return
    if (p.type === "mesh" && p.c2 && p.c3) { setBgGrad(false); setBgColor(p.c1); setBgC2(p.c3); applyMesh(p.c1, p.c2, p.c3) }
    else if (p.type === "grad" && p.c2) { setBgGrad(true); setBgColor(p.c1); setBgC2(p.c2); applyGradient(p.c1, p.c2) }
    else { setBgGrad(false); setBgColor(p.c1); fc.setBackgroundColor(p.c1, fc.renderAll.bind(fc)); pushHistorySoon() }
  }
  // Motif / texture de fond (sur la couleur de fond courante) — subtil, type papier premium
  const applyBgPattern = (kind: "dots" | "stripes" | "grid" | "cross") => {
    const fc = fcRef.current; if (!fc || typeof document === "undefined") return
    const base = /^#/.test(bgColor) ? bgColor : "#FFFFFF"
    const motif = lum(base) > 0.6 ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.11)"
    const pc = document.createElement("canvas"); pc.width = 26; pc.height = 26
    const ctx = pc.getContext("2d"); if (!ctx) return
    ctx.fillStyle = base; ctx.fillRect(0, 0, 26, 26)
    ctx.fillStyle = motif; ctx.strokeStyle = motif; ctx.lineWidth = 2
    if (kind === "dots") { ctx.beginPath(); ctx.arc(13, 13, 3, 0, Math.PI * 2); ctx.fill() }
    else if (kind === "stripes") { ctx.beginPath(); ctx.moveTo(-4, 26); ctx.lineTo(26, -4); ctx.moveTo(8, 30); ctx.lineTo(30, 8); ctx.stroke() }
    else if (kind === "grid") { ctx.strokeRect(0, 0, 26, 26) }
    else { ctx.beginPath(); ctx.moveTo(13, 8); ctx.lineTo(13, 18); ctx.moveTo(8, 13); ctx.lineTo(18, 13); ctx.stroke() }
    setBgGrad(false)
    fc.setBackgroundColor(new fabric.Pattern({ source: pc as any, repeat: "repeat" }) as unknown as string, fc.renderAll.bind(fc))
    pushHistorySoon()
  }
  // Synchronise les controles de fond avec l'etat reel du canvas (apres chargement / undo)
  const syncBgFromCanvas = (fc: fabric.Canvas) => {
    const bg = fc.backgroundColor as unknown as { colorStops?: { color: string }[] } | string
    if (bg && typeof bg === "object" && Array.isArray(bg.colorStops) && bg.colorStops.length) {
      setBgGrad(true)
      setBgColor(bg.colorStops[0]?.color ?? CANVAS_BG_DEFAULT)
      setBgC2(bg.colorStops[bg.colorStops.length - 1]?.color ?? "#0A0A0A")
    } else {
      setBgGrad(false)
      setBgColor(typeof bg === "string" ? bg : CANVAS_BG_DEFAULT)
    }
  }

  // ---- Appliquer un style global (couleurs + typo + accents) ---------------
  const applyStyle = (s: typeof GLOBAL_STYLES[number]) => {
    const fc = fcRef.current; if (!fc) return
    histRef.current.lock = true
    setBgGrad(false); fc.setBackgroundColor(s.bg, () => {}); setBgColor(s.bg)
    const isTxt = (t?: string) => t === "i-text" || t === "text" || t === "textbox"
    // une photo derriere ? -> on garde le texte clair ; sinon on garantit le contraste avec le fond du theme
    const hasPhoto = fc.getObjects().some(o => o.type === "image" && !(o as any).isQR)
    // garde-fou contraste : si l'encre du theme contraste mal avec son fond, on bascule sur du lisible
    const inkFill = Math.abs(lum(s.ink) - lum(s.bg)) < 0.35 ? readableOn(s.bg) : s.ink
    fc.getObjects().forEach(o => {
      if ((o as any).isGuide || (o as any).isQR || (o as any).isQrCard) return
      if (isTxt(o.type)) {
        ;(o as fabric.IText).set("fontFamily", (o as any).role === "title" ? s.titleFont : s.bodyFont)
        if ((o as any).keepColor) { if (!hasPhoto) (o as fabric.IText).set("fill", readableOn(s.bg)) } // texte "photo" sans photo -> lisible sur le theme
        else (o as fabric.IText).set("fill", inkFill)
      } else if (o.type === "group") {
        ;(o as fabric.Group).getObjects().forEach(c => {
          c.set("fill", isTxt(c.type) ? readableOn(s.accent) : s.accent)
        })
        o.dirty = true
      } else {
        if (typeof o.fill === "string" && o.fill && o.fill !== "transparent") o.set("fill", s.accent)
        if (typeof o.stroke === "string" && o.stroke) o.set("stroke", s.accent)
      }
    })
    histRef.current.lock = false
    fc.requestRenderAll(); pushHistory(); setLayersVer(v => v + 1); setInfoVer(v => v + 1)
    try {
      const d = document as Document & { fonts?: { load: (f: string) => Promise<unknown> } }
      Promise.all([d.fonts?.load(`700 40px '${s.titleFont}'`), d.fonts?.load(`400 24px '${s.bodyFont}'`)]).then(() => fc.requestRenderAll()).catch(() => {})
    } catch { /* noop */ }
  }

  // Changer le libelle du 1er bouton CTA (pilule) du design
  const setCtaLabel = (value: string) => {
    const fc = fcRef.current; if (!fc) return
    const grp = fc.getObjects().find(o => o.type === "group" && !!groupText(o) && (o as fabric.Group).getObjects().some(c => c.type === "rect")) as fabric.Group | undefined
    const txt = grp ? groupText(grp) : null
    if (!grp || !txt) return
    txt.set({ text: value }); (txt as unknown as { initDimensions?: () => void }).initDimensions?.()
    const rect = grp.getObjects().find(o => o.type === "rect") as fabric.Rect | undefined
    if (rect) { const h = rect.height ?? 60; const nw = Math.max(h * 2, (txt.width ?? 0) + h * 0.6 * 2); rect.set({ width: nw, left: -nw / 2 }); txt.set({ left: 0 }); grp.set({ width: nw }) }
    grp.dirty = true; grp.setCoords(); fc.requestRenderAll()
  }

  // ---- Generateur : metier + objectif -> design complet auto ---------------
  const generate = async (metier: typeof METIERS[number], o: MObj) => {
    await applyTemplate(o.tpl, true)
    const st = GLOBAL_STYLES.find(s => s.id === metier.style); if (st) applyStyle(st)
    updateRole("title", o.title); updateRole("subtitle", o.subtitle)
    setCtaLabel(o.cta)
    setWizard(3)
  }

  // ---- Appliquer un modele oriente objectif --------------------------------
  // Vide le canvas (hors guides), pose un design complet et editable, place le vrai QR.
  const applyTemplate = async (id: string, skipConfirm = false) => {
    if (applyingRef.current) return // anti-reentrance : un modele photo charge en async, on ignore les appels concurrents
    const fc = fcRef.current; if (!fc) return
    const meta = PRINT_TEMPLATES.find(t => t.id === id); if (!meta) return
    const vG = vGuideRef.current, hG = hGuideRef.current
    const hasContent = fc.getObjects().some(o => o !== vG && o !== hG && !(o as any).isQR && !(o as any).isQrCard)
    if (!skipConfirm && hasContent && !window.confirm("Remplacer le contenu actuel par ce modèle ?")) return

    setRecentTpl(r => pushRecentTpl(r, id)) // memorise le modele applique (#13)
    if (landscapeMobile) setTplOpen(false) // mobile : fermer la galerie pour voir le modele applique
    applyingRef.current = true
    histRef.current.lock = true // tout le modele = une seule etape d'historique
    fc.getObjects().slice().forEach(o => { if (o !== vG && o !== hG) fc.remove(o) })
    const z = fc.getZoom() || 1
    const W = fc.getWidth() / z, H = fc.getHeight() / z // coords design
    const { bg, ink, accent } = meta
    fc.setBackgroundColor(bg, () => {}); setBgColor(bg)

    const addText = (s: string, top: number, size: number, o: { weight?: string; fill?: string; font?: string; width?: number; role?: string; keepColor?: boolean; shadow?: boolean } = {}) => {
      const t = new fabric.Textbox(s, {
        width: o.width ?? W * 0.82, left: W / 2, top, originX: "center", textAlign: "center",
        fontFamily: o.font ?? "Georgia", fontWeight: o.weight ?? "normal", fontSize: size, fill: o.fill ?? ink,
      })
      if (o.role) (t as any).role = o.role
      if (o.keepColor) (t as any).keepColor = true // un theme global ne doit pas ecraser cette couleur (texte sur photo)
      if (o.shadow) t.set("shadow", new fabric.Shadow({ color: "rgba(0,0,0,0.55)", blur: 9, offsetX: 0, offsetY: 1 })) // lisibilite sur photo
      fc.add(t); return t
    }
    const addStars = (n: number, cy: number, s: number, color: string) => {
      const objs: fabric.Object[] = []
      for (let i = 0; i < n; i++) objs.push(new fabric.Polygon(starPts(5, s / 2, s / 5), { fill: color, left: i * (s * 1.25), top: 0 }))
      fc.add(new fabric.Group(objs, { originX: "center", left: W / 2, top: cy }))
    }
    const addCTA = (label: string, top: number) => {
      const rh = Math.round(Math.min(W * 0.7, 360) * 0.2)
      const g = buildPill(label, { rectFill: accent, textFill: readableOn(accent), height: rh, fontSize: Math.round(rh * 0.42) })
      g.set({ originX: "center", left: W / 2, top })
      fc.add(g)
    }
    const addIconT = (d: string, size: number, top: number, color: string) => new Promise<void>(res => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}" fill="${color}"/></svg>`
      fabric.loadSVGFromString(svg, (objs, opt) => {
        const o = fabric.util.groupSVGElements(objs, opt) as fabric.Object
        o.scaleToWidth(size); o.set({ originX: "center", originY: "top", left: W / 2, top }); fc.add(o); res()
      })
    })
    const placeQrT = (top: number, wFrac: number, cx: number = W / 2) => new Promise<void>(res => {
      fabric.Image.fromURL(qrUrlRef.current, (img) => {
        // Taille bornee par la plus petite dimension utile : garde le A4 identique
        // et empeche le QR de deborder verticalement (Carre / paysage) sur les textes.
        const w = wFrac * Math.min(W, H * 0.707)
        img.scaleToWidth(w); (img as any).isQR = true
        img.set({ originX: "center", originY: "top", left: cx, top })
        // carte blanche derriere le QR (look premium + zone de silence pour le scan)
        const pad = Math.round(w * 0.07)
        const card = new fabric.Rect({
          width: w + pad * 2, height: w + pad * 2, rx: Math.round(w * 0.06), ry: Math.round(w * 0.06),
          fill: "#FFFFFF", originX: "center", originY: "top", left: cx, top: top - pad,
          shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.20)", blur: 26, offsetX: 0, offsetY: 10 }),
        })
        ;(card as any).isQrCard = true
        fc.add(card); fc.add(img); res()
      })
    })
    const ICON = (k: string) => LIB_ICONS.find(i => i.key === k)!.d
    // Filet d'accent (divider) centre, sous un titre
    const rule = (top: number) => fc.add(new fabric.Rect({ width: Math.round(W * 0.13), height: Math.max(3, Math.round(W * 0.007)), rx: 2, ry: 2, fill: accent, originX: "center", left: W / 2, top }))
    // Mise en page "bandeau" : grand en-tete colore + QR + CTA
    const bandLayout = async (title: string, subtitle: string, cta: string) => {
      fc.add(new fabric.Rect({ left: 0, top: 0, width: W, height: Math.round(H * 0.30), fill: accent }))
      addText(title, H * 0.085, W * 0.08, { weight: "bold", fill: readableOn(accent), role: "title" })
      addText(subtitle, H * 0.205, W * 0.032, { font: "Arial", fill: readableOn(accent), role: "subtitle" })
      await placeQrT(H * 0.40, 0.46)
      addCTA(cta, H * 0.86)
    }
    // Mise en page "cadre premium" : filet insere + divider + QR + CTA
    const frameLayout = async (title: string, subtitle: string, cta: string) => {
      const f = new fabric.Rect({ left: W * 0.05, top: H * 0.05, width: W * 0.90, height: H * 0.90, fill: "transparent", stroke: accent, strokeWidth: Math.max(2, Math.round(W * 0.006)), strokeUniform: true, rx: 8, ry: 8 })
      ;(f as any).perPixelTargetFind = true
      fc.add(f)
      addText(title, H * 0.12, W * 0.072, { weight: "bold", role: "title" })
      fc.add(new fabric.Rect({ width: Math.round(W * 0.14), height: Math.max(3, Math.round(W * 0.007)), rx: 2, ry: 2, fill: accent, originX: "center", left: W / 2, top: H * 0.205 }))
      addText(subtitle, H * 0.25, W * 0.032, { font: "Arial", role: "subtitle" })
      await placeQrT(H * 0.36, 0.44)
      addCTA(cta, H * 0.82)
    }
    // Mise en page "footer" : titre + QR en haut, barre coloree en bas avec le CTA
    const footerLayout = async (title: string, subtitle: string, cta: string) => {
      addText(title, H * 0.075, W * 0.078, { weight: "bold", role: "title" })
      addText(subtitle, H * 0.175, W * 0.032, { font: "Arial", role: "subtitle" })
      await placeQrT(H * 0.30, 0.46)
      fc.add(new fabric.Rect({ left: 0, top: Math.round(H * 0.82), width: W, height: Math.round(H * 0.18), fill: accent }))
      addText(cta, H * 0.875, W * 0.05, { weight: "bold", fill: readableOn(accent) })
    }
    // Mise en page "QR geant" : minimal, QR dominant
    const heroLayout = async (title: string, subtitle: string, cta: string) => {
      addText(title, H * 0.10, W * 0.062, { weight: "bold", role: "title" })
      await placeQrT(H * 0.24, 0.60)
      addText(subtitle, H * 0.80, W * 0.034, { font: "Arial", role: "subtitle" })
      addText(cta, H * 0.87, W * 0.04, { weight: "bold", fill: accent })
    }
    // --- Helpers photo (Unsplash) -------------------------------------------
    const fetchPhoto = async (query: string): Promise<string | null> => {
      try {
        const ratio = FORMATS[format]?.ratio ?? 0.7
        const orient = ratio < 0.9 ? "portrait" : ratio > 1.1 ? "landscape" : "squarish"
        const res = await fetch(`/api/unsplash?q=${encodeURIComponent(query)}&orientation=${orient}`)
        if (res.ok) { const d = await res.json(); return d.photos?.[0]?.regular ?? null }
      } catch { /* degradation gracieuse */ }
      return null
    }
    // Place une image en "cover" sur une region (rx,ry,rw,rh), clippee a cette region
    const addCover = (url: string, rx: number, ry: number, rw: number, rh: number) => new Promise<void>(r => {
      fabric.Image.fromURL(url, (im) => {
        const sc = Math.max(rw / (im.width || rw), rh / (im.height || rh))
        im.set({ scaleX: sc, scaleY: sc, left: rx + rw / 2, top: ry + rh / 2, originX: "center", originY: "center" })
        im.clipPath = new fabric.Rect({ left: rx, top: ry, width: rw, height: rh, originX: "left", originY: "top", absolutePositioned: true })
        fc.add(im); r()
      }, { crossOrigin: "anonymous" })
    })
    // Fond dégradé riche (fallback quand pas de photo) sur une region
    const gradBg = (rx: number, ry: number, rw: number, rh: number) => {
      const r = new fabric.Rect({ left: rx, top: ry, width: rw, height: rh })
      r.set("fill", new fabric.Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: rw, y2: rh }, colorStops: [{ offset: 0, color: accent }, { offset: 1, color: bg }] }))
      fc.add(r)
    }
    // Mise en page "photo" : image plein cadre + voile + titre haut + QR en coin (editorial)
    const photoLayout = async (title: string, subtitle: string, query: string) => {
      const url = await fetchPhoto(query); if (url) await addCover(url, 0, 0, W, H); else gradBg(0, 0, W, H)
      const scrim = new fabric.Rect({ left: 0, top: 0, width: W, height: H })
      scrim.set("fill", new fabric.Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: H }, colorStops: [{ offset: 0, color: "rgba(0,0,0,0.58)" }, { offset: 0.38, color: "rgba(0,0,0,0.12)" }, { offset: 1, color: "rgba(0,0,0,0.45)" }] }))
      fc.add(scrim)
      addText(title, H * 0.10, W * 0.078, { weight: "bold", fill: "#FFFFFF", role: "title", keepColor: true, shadow: true })
      addText(subtitle, H * 0.205, W * 0.034, { font: "Arial", fill: "#F0EDE6", role: "subtitle", keepColor: true, shadow: true })
      await placeQrT(H * 0.64, 0.32, W * 0.73)
    }
    // Mise en page "photo bandeau" : image en haut, panneau couleur en bas (texte + QR)
    const photoSplitLayout = async (title: string, subtitle: string, query: string) => {
      const splitY = Math.round(H * 0.50)
      const url = await fetchPhoto(query)
      if (url) await addCover(url, 0, 0, W, splitY)
      else gradBg(0, 0, W, splitY)
      fc.add(new fabric.Rect({ left: 0, top: splitY, width: W, height: H - splitY, fill: bg }))
      addText(title, H * 0.565, W * 0.072, { weight: "bold", role: "title" })
      addText(subtitle, H * 0.66, W * 0.032, { font: "Arial", role: "subtitle" })
      await placeQrT(H * 0.73, 0.34)
    }
    // Mise en page "carte sur photo" : image plein cadre + carte blanche centrale (titre + QR)
    const photoCardLayout = async (title: string, subtitle: string, query: string) => {
      const url = await fetchPhoto(query); if (url) await addCover(url, 0, 0, W, H); else gradBg(0, 0, W, H)
      const scrim = new fabric.Rect({ left: 0, top: 0, width: W, height: H, fill: "rgba(0,0,0,0.28)" })
      fc.add(scrim)
      const cw = Math.round(W * 0.76), ch = Math.round(H * 0.56)
      fc.add(new fabric.Rect({ width: cw, height: ch, rx: 20, ry: 20, fill: "#FFFFFF", originX: "center", originY: "center", left: W / 2, top: H / 2, shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.35)", blur: 34, offsetX: 0, offsetY: 14 }) }))
      addText(title, H * 0.27, W * 0.07, { weight: "bold", fill: "#1A1A1A", role: "title" })
      addText(subtitle, H * 0.355, W * 0.03, { font: "Arial", fill: "#666666", role: "subtitle" })
      await placeQrT(H * 0.43, 0.34)
    }
    // Mise en page "premium" : en-tete colore + badge rond + hierarchie + QR + CTA
    const premiumLayout = async (title: string, subtitle: string, cta: string, badge?: string) => {
      const headH = Math.round(H * 0.17)
      fc.add(new fabric.Rect({ left: 0, top: 0, width: W, height: headH, fill: accent }))
      addText(title, H * 0.052, W * 0.07, { weight: "bold", fill: readableOn(accent), role: "title" })
      addText(subtitle, H * 0.215, W * 0.034, { font: "Arial", role: "subtitle" })
      rule(H * 0.265)
      await placeQrT(H * 0.33, 0.46)
      addCTA(cta, H * 0.82)
      if (badge) {
        const r = Math.round(W * 0.082)
        const circ = new fabric.Circle({ radius: r, fill: ink, originX: "center", originY: "center" })
        const txt = new fabric.Textbox(badge, { width: r * 1.9, fontSize: Math.round(r * 0.42), fontWeight: "bold", fill: readableOn(ink), textAlign: "center", originX: "center", originY: "center" })
        fc.add(new fabric.Group([circ, txt], { originX: "center", originY: "center", left: W * 0.80, top: H * 0.135, angle: 12 }))
      }
    }
    // Mise en page "studio" : photo + pastille icone metier + badge + titre fort + filet + QR + CTA (designer)
    const studioLayout = async (title: string, subtitle: string, cta: string, opts: { query: string; emoji: string; badge?: string }) => {
      const url = await fetchPhoto(opts.query); if (url) await addCover(url, 0, 0, W, H); else gradBg(0, 0, W, H)
      const scrim = new fabric.Rect({ left: 0, top: 0, width: W, height: H })
      scrim.set("fill", new fabric.Gradient({ type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: H }, colorStops: [{ offset: 0, color: "rgba(0,0,0,0.55)" }, { offset: 0.5, color: "rgba(0,0,0,0.32)" }, { offset: 1, color: "rgba(0,0,0,0.62)" }] }))
      fc.add(scrim)
      // pastille icone metier (cercle accent + emoji) centree en haut
      const r = Math.round(W * 0.085)
      const circ = new fabric.Circle({ radius: r, fill: accent, originX: "center", originY: "center" })
      const ico = new fabric.Text(opts.emoji, { fontSize: Math.round(r * 1.05), originX: "center", originY: "center", left: 0, top: 0 })
      fc.add(new fabric.Group([circ, ico], { originX: "center", originY: "center", left: W / 2, top: H * 0.115 }))
      addText(title, H * 0.20, W * 0.082, { weight: "bold", fill: "#FFFFFF", role: "title", keepColor: true, shadow: true })
      rule(H * 0.285)
      addText(subtitle, H * 0.31, W * 0.032, { font: "Arial", fill: "#F0EDE6", role: "subtitle", keepColor: true, shadow: true })
      await placeQrT(H * 0.41, 0.42)
      addCTA(cta, H * 0.80)
      if (opts.badge) {
        const br = Math.round(W * 0.072)
        const bc = new fabric.Circle({ radius: br, fill: "#FFFFFF", originX: "center", originY: "center" })
        const bt = new fabric.Textbox(opts.badge, { width: br * 1.9, fontSize: Math.round(br * 0.4), fontWeight: "bold", fill: "#1A1A1A", textAlign: "center", originX: "center", originY: "center" })
        fc.add(new fabric.Group([bc, bt], { originX: "center", originY: "center", left: W * 0.83, top: H * 0.065, angle: 12 }))
      }
    }
    // Mise en page "orne" : stack centre + etoiles decoratives en coins
    const ornateLayout = async (title: string, subtitle: string, cta: string) => {
      fc.add(new fabric.Polygon(starPts(4, W * 0.05, W * 0.016), { fill: accent, originX: "center", originY: "center", left: W * 0.16, top: H * 0.11 }))
      fc.add(new fabric.Polygon(starPts(4, W * 0.04, W * 0.013), { fill: accent, originX: "center", originY: "center", left: W * 0.85, top: H * 0.88 }))
      addText(title, H * 0.105, W * 0.075, { weight: "bold", role: "title" })
      rule(H * 0.18)
      addText(subtitle, H * 0.21, W * 0.032, { font: "Arial", role: "subtitle" })
      await placeQrT(H * 0.30, 0.46)
      addCTA(cta, H * 0.84)
    }
    // Mise en page "diagonale" : bandeau d'accent en biais en haut
    const diagLayout = async (title: string, subtitle: string, cta: string) => {
      fc.add(new fabric.Polygon([{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H * 0.22 }, { x: 0, y: H * 0.34 }], { fill: accent }))
      addText(title, H * 0.085, W * 0.072, { weight: "bold", fill: readableOn(accent), role: "title" })
      addText(subtitle, H * 0.42, W * 0.032, { font: "Arial", role: "subtitle" })
      await placeQrT(H * 0.48, 0.44)
      addCTA(cta, H * 0.86)
    }

    // Donnees reelles (deja saisies cote QRStudio) ; sinon placeholders
    const name    = (prefill?.name ?? "").trim()
    const phone   = (prefill?.phone ?? "").trim()
    const website = (prefill?.website ?? "").trim()
    // Ligne de marque (nom de l'etablissement) ajoutee si dispo
    const brand = (top: number) => { if (name) addText(name, top, W * 0.038, { font: "Arial", weight: "bold", fill: accent }) }

    // Mise en page "Wifi" : bandeau + carte reseau/mot de passe + QR + invite
    const wifiLayout = async () => {
      fc.add(new fabric.Rect({ left: 0, top: 0, width: W, height: Math.round(H * 0.16), fill: accent }))
      addText("📶  Wifi gratuit", H * 0.045, W * 0.072, { weight: "bold", fill: readableOn(accent), role: "title" })
      const cw = Math.round(W * 0.82), ch = Math.round(H * 0.215)
      fc.add(new fabric.Rect({ width: cw, height: ch, rx: 16, ry: 16, fill: "#FFFFFF", originX: "center", originY: "top", left: W / 2, top: H * 0.225, shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.16)", blur: 20, offsetX: 0, offsetY: 8 }) }))
      addText("RÉSEAU", H * 0.255, W * 0.028, { font: "Arial", fill: "#A8A190" })
      addText("MonReseau", H * 0.29, W * 0.052, { weight: "bold", fill: "#1A1A1A" })
      addText("MOT DE PASSE", H * 0.355, W * 0.028, { font: "Arial", fill: "#A8A190" })
      addText("••••••••", H * 0.39, W * 0.052, { weight: "bold", fill: "#1A1A1A" })
      await placeQrT(H * 0.50, 0.40)
      addText("Scannez pour vous connecter", H * 0.88, W * 0.032, { font: "Arial", role: "subtitle" })
    }

    // Mise en page "fidelite" : bandeau + tampons (10) + offre + QR
    const loyaltyLayout = async () => {
      fc.add(new fabric.Rect({ left: 0, top: 0, width: W, height: Math.round(H * 0.15), fill: accent }))
      addText("Carte de fidélité", H * 0.04, W * 0.068, { weight: "bold", fill: readableOn(accent), role: "title" })
      addText(name || "Votre enseigne", H * 0.18, W * 0.034, { font: "Arial", role: "subtitle" })
      const r = Math.round(W * 0.04), gapX = W * 0.155, startX = W / 2 - gapX * 2
      for (let i = 0; i < 10; i++) {
        const row = Math.floor(i / 5), col = i % 5
        fc.add(new fabric.Circle({ radius: r, fill: "transparent", stroke: accent, strokeWidth: Math.max(2, Math.round(W * 0.006)), originX: "center", originY: "center", left: startX + col * gapX, top: row === 0 ? H * 0.30 : H * 0.40 }))
      }
      addText("10 visites = 1 offert 🎁", H * 0.475, W * 0.04, { weight: "bold", role: "subtitle" })
      await placeQrT(H * 0.55, 0.34)
      addText("Scannez à chaque passage", H * 0.90, W * 0.03, { font: "Arial", role: "subtitle" })
    }

    // ===== Templates BESPOKE premium (compositions distinctes, calibrage qualité) =====
    // A) Avis — Prestige : éditorial sombre/or, cercles décoratifs + 5 étoiles
    const avisHero = async () => {
      fc.add(new fabric.Circle({ radius: W * 0.46, fill: accent, opacity: 0.13, originX: "center", originY: "center", left: W * 0.96, top: H * 0.05 }))
      fc.add(new fabric.Circle({ radius: W * 0.22, fill: accent, opacity: 0.10, originX: "center", originY: "center", left: W * 0.06, top: H * 0.92 }))
      addText("★  AVIS GOOGLE  ★", H * 0.095, W * 0.034, { font: "Arial", weight: "bold", fill: accent, role: "subtitle" })
      addStars(5, H * 0.17, W * 0.072, accent)
      addText(name ? `Votre avis sur\n${name}` : "Votre avis\ncompte vraiment", H * 0.225, W * 0.092, { weight: "bold", role: "title" })
      addText("Partagez votre expérience en 30 secondes", H * 0.41, W * 0.032, { font: "Arial", role: "subtitle" })
      await placeQrT(H * 0.48, 0.40)
      addCTA("Laisser un avis", H * 0.87)
    }
    // B) Menu — Ornement : crème/bronze, double cadre ornemental + emoji + filet
    const restoOrnate = async () => {
      fc.add(new fabric.Rect({ left: W * 0.045, top: H * 0.045, width: W * 0.91, height: H * 0.91, fill: "transparent", stroke: accent, strokeWidth: Math.max(2, Math.round(W * 0.004)), strokeUniform: true }))
      fc.add(new fabric.Rect({ left: W * 0.07, top: H * 0.07, width: W * 0.86, height: H * 0.86, fill: "transparent", stroke: accent, strokeWidth: 1, strokeUniform: true, opacity: 0.55 }))
      addText("🍽", H * 0.115, W * 0.08, { keepColor: true })
      addText("L A   C A R T E", H * 0.235, W * 0.03, { font: "Arial", weight: "bold", fill: accent, role: "subtitle" })
      addText(name || "Notre Menu", H * 0.275, W * 0.082, { weight: "bold", role: "title" })
      rule(H * 0.40)
      addText("Découvrez nos plats & suggestions du jour", H * 0.43, W * 0.03, { font: "Arial", role: "subtitle" })
      await placeQrT(H * 0.50, 0.38)
      addCTA("Voir le menu", H * 0.85)
    }
    // C) Instagram — Color-block : bloc couleur haut + QR chevauchant la limite
    const instaBlock = async () => {
      fc.add(new fabric.Rect({ left: 0, top: 0, width: W, height: Math.round(H * 0.47), fill: accent }))
      addText("📸", H * 0.06, W * 0.07, { keepColor: true })
      addText(name ? `@${name.toLowerCase().replace(/\s+/g, "")}` : "@votre_compte", H * 0.17, W * 0.062, { weight: "bold", fill: readableOn(accent), keepColor: true, role: "title" })
      addText("Suivez-nous sur Instagram", H * 0.265, W * 0.034, { font: "Arial", fill: readableOn(accent), keepColor: true, role: "subtitle" })
      await placeQrT(H * 0.36, 0.40)
      addCTA("S'abonner", H * 0.88)
    }

    // D) Bar — Cocktails Noir : filets or haut/bas, emoji, serif (ambiance lounge)
    const cocktailNoir = async () => {
      fc.add(new fabric.Rect({ left: 0, top: H * 0.045, width: W, height: Math.max(2, Math.round(W * 0.006)), fill: accent }))
      fc.add(new fabric.Rect({ left: 0, top: H * 0.95, width: W, height: Math.max(2, Math.round(W * 0.006)), fill: accent }))
      addText("🍸", H * 0.10, W * 0.085, { keepColor: true })
      addText("B A R   ·   C O C K T A I L S", H * 0.225, W * 0.028, { font: "Arial", weight: "bold", fill: accent, role: "subtitle" })
      addText(name || "Carte des\nCocktails", H * 0.265, W * 0.082, { weight: "bold", role: "title" })
      rule(H * 0.45)
      addText("Nos signatures & créations maison", H * 0.48, W * 0.03, { font: "Arial", role: "subtitle" })
      await placeQrT(H * 0.55, 0.36)
      addCTA("Découvrir la carte", H * 0.87)
    }
    // E) Commerce — Offre : grand badge éclaté (starburst) + CTA punchy
    const promoBurst = async () => {
      const burst = new fabric.Polygon(starPts(16, W * 0.165, W * 0.125), { fill: accent, originX: "center", originY: "center", left: W / 2, top: H * 0.17 })
      fc.add(burst)
      addText("OFFRE", H * 0.142, W * 0.046, { weight: "bold", fill: readableOn(accent), keepColor: true })
      addText(name || "Offre spéciale", H * 0.37, W * 0.085, { weight: "bold", role: "title" })
      addText("Profitez d'un avantage exclusif en scannant", H * 0.475, W * 0.03, { font: "Arial", role: "subtitle" })
      await placeQrT(H * 0.54, 0.36)
      addCTA("J'en profite", H * 0.87)
    }
    // F) Carte de visite : panneau couleur en haut + QR + CTA contact (corporate)
    const contactCard = async () => {
      fc.add(new fabric.Rect({ left: 0, top: 0, width: W, height: Math.round(H * 0.32), fill: accent }))
      addText("💼", H * 0.05, W * 0.06, { keepColor: true })
      addText(name || "Votre Nom", H * 0.135, W * 0.072, { weight: "bold", fill: readableOn(accent), keepColor: true, role: "title" })
      addText("Votre métier / entreprise", H * 0.235, W * 0.032, { font: "Arial", fill: readableOn(accent), keepColor: true, role: "subtitle" })
      await placeQrT(H * 0.42, 0.40)
      addText("Scannez pour enregistrer mes coordonnées", H * 0.815, W * 0.028, { font: "Arial", role: "subtitle" })
      addCTA("Ajouter à mes contacts", H * 0.875)
    }
    // G) Immobilier — Fiche : bandeau + strip de specs (m²/pièces/quartier) + QR
    const immoFiche = async () => {
      fc.add(new fabric.Rect({ left: 0, top: 0, width: W, height: Math.round(H * 0.14), fill: accent }))
      addText("🏠  À VISITER", H * 0.042, W * 0.044, { weight: "bold", fill: readableOn(accent), keepColor: true, role: "subtitle" })
      addText(name || "Votre bien\nd'exception", H * 0.185, W * 0.076, { weight: "bold", role: "title" })
      const chips = ["📐 Surface", "🛏 Pièces", "📍 Quartier"]
      const cw = W * 0.27, gap = W * 0.02, total = cw * 3 + gap * 2, startX = (W - total) / 2
      chips.forEach((c, i) => {
        const x = startX + i * (cw + gap)
        fc.add(new fabric.Rect({ left: x, top: H * 0.37, width: cw, height: Math.round(H * 0.058), rx: 8, ry: 8, fill: "transparent", stroke: accent, strokeWidth: 1, strokeUniform: true }))
        fc.add(new fabric.Textbox(c, { left: x + cw / 2, top: H * 0.385, width: cw, fontSize: W * 0.025, fontFamily: "Arial", fill: ink, textAlign: "center", originX: "center" }))
      })
      await placeQrT(H * 0.47, 0.36)
      addCTA("Réserver une visite", H * 0.86)
    }
    // H) Airbnb — Bienvenue : carte blanche arrondie centrale sur fond chaleureux
    const airbnbWelcome = async () => {
      fc.add(new fabric.Rect({ left: W * 0.10, top: H * 0.12, width: W * 0.80, height: H * 0.76, rx: 18, ry: 18, fill: "#FFFFFF", shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.12)", blur: 24, offsetX: 0, offsetY: 10 }) }))
      addText("🏡", H * 0.17, W * 0.085, { keepColor: true })
      addText("B I E N V E N U E", H * 0.30, W * 0.03, { font: "Arial", weight: "bold", fill: accent, keepColor: true, role: "subtitle" })
      addText(name || "Votre séjour\ncommence ici", H * 0.34, W * 0.07, { weight: "bold", fill: "#2A2419", keepColor: true, role: "title" })
      await placeQrT(H * 0.50, 0.32)
      addCTA("Ouvrir le guide", H * 0.79)
    }
    // I) Événement — Ticket : panneau invite + ligne de perforation + QR
    const eventTicket = async () => {
      fc.add(new fabric.Rect({ left: 0, top: 0, width: W, height: Math.round(H * 0.30), fill: accent }))
      addText("🎉  VOUS ÊTES INVITÉ", H * 0.055, W * 0.04, { weight: "bold", fill: readableOn(accent), keepColor: true, role: "subtitle" })
      addText(name || "Notre\nÉvénement", H * 0.115, W * 0.085, { weight: "bold", fill: readableOn(accent), keepColor: true, role: "title" })
      fc.add(new fabric.Line([W * 0.06, H * 0.40, W * 0.94, H * 0.40], { stroke: accent, strokeWidth: 2, strokeDashArray: [8, 7] }))
      addText("Date · Lieu · Horaire", H * 0.43, W * 0.032, { font: "Arial", role: "subtitle" })
      await placeQrT(H * 0.50, 0.36)
      addCTA("Voir l'événement", H * 0.87)
    }
    // J) Réserver — Bande latérale : bande d'accent pleine hauteur à gauche + RDV
    const reserveStripe = async () => {
      fc.add(new fabric.Rect({ left: 0, top: 0, width: Math.round(W * 0.10), height: H, fill: accent }))
      addText("📅", H * 0.08, W * 0.07, { keepColor: true })
      addText("S U R   R É S E R V A T I O N", H * 0.21, W * 0.028, { font: "Arial", weight: "bold", fill: accent, role: "subtitle" })
      addText(name || "Réservez\nvotre moment", H * 0.25, W * 0.08, { weight: "bold", role: "title" })
      rule(H * 0.43)
      addText("Choisissez votre créneau en ligne", H * 0.46, W * 0.03, { font: "Arial", role: "subtitle" })
      await placeQrT(H * 0.53, 0.36)
      addCTA("Réserver maintenant", H * 0.87)
    }
    // K) Créateur — Link in bio : avatar rond + chips réseaux + QR
    const creatorBio = async () => {
      fc.add(new fabric.Circle({ radius: W * 0.11, fill: accent, originX: "center", originY: "center", left: W / 2, top: H * 0.15 }))
      addText("✦", H * 0.115, W * 0.06, { keepColor: true, fill: readableOn(accent) })
      addText(name ? `@${name.toLowerCase().replace(/\s+/g, "")}` : "@createur", H * 0.255, W * 0.06, { weight: "bold", role: "title" })
      addText("Tout mon univers en un scan", H * 0.34, W * 0.03, { font: "Arial", role: "subtitle" })
      const chips = ["▶ YouTube", "♪ TikTok", "◎ Insta"]
      const cw = W * 0.26, gap = W * 0.02, total = cw * 3 + gap * 2, sx = (W - total) / 2
      chips.forEach((c, i) => {
        const x = sx + i * (cw + gap)
        fc.add(new fabric.Rect({ left: x, top: H * 0.40, width: cw, height: Math.round(H * 0.05), rx: 14, ry: 14, fill: "transparent", stroke: accent, strokeWidth: 1, strokeUniform: true }))
        fc.add(new fabric.Textbox(c, { left: x + cw / 2, top: H * 0.412, width: cw, fontSize: W * 0.024, fontFamily: "Arial", fill: ink, textAlign: "center", originX: "center" }))
      })
      await placeQrT(H * 0.49, 0.34)
      addCTA("Tout voir", H * 0.86)
    }
    // L) Portfolio — Mini-grille décorative 2×2 + titre + QR
    const portfolioGrid = async () => {
      const cell = W * 0.24, gp = W * 0.02, gy = H * 0.06, gx = W / 2 - (cell * 2 + gp) / 2
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
        fc.add(new fabric.Rect({ left: gx + c * (cell + gp), top: gy + r * (cell + gp), width: cell, height: cell, rx: 6, ry: 6, fill: accent, opacity: 0.20 + (r * 2 + c) * 0.06 }))
      }
      addText("P O R T F O L I O", H * 0.44, W * 0.03, { font: "Arial", weight: "bold", fill: accent, role: "subtitle" })
      addText(name || "Mon travail", H * 0.48, W * 0.078, { weight: "bold", role: "title" })
      await placeQrT(H * 0.56, 0.34)
      addCTA("Voir mon portfolio", H * 0.88)
    }
    // M) Soldes — Gros % : chiffre géant en hero (offre), punchy
    const soldesMega = async () => {
      addText("S O L D E S", H * 0.095, W * 0.05, { weight: "bold", fill: accent, keepColor: true, role: "subtitle" })
      addText("-50%", H * 0.16, W * 0.26, { weight: "bold", role: "title" })
      addText(name || "Profitez-en maintenant", H * 0.46, W * 0.04, { weight: "bold", role: "subtitle" })
      await placeQrT(H * 0.53, 0.36)
      addCTA("J'en profite", H * 0.87)
    }
    // N) Happy Hour — Split diagonal : bande inclinée colorée + horaire + QR
    const happyDiag = async () => {
      fc.add(new fabric.Polygon([{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H * 0.30 }, { x: 0, y: H * 0.46 }], { fill: accent }))
      addText("🍹  HAPPY HOUR", H * 0.075, W * 0.052, { weight: "bold", fill: readableOn(accent), keepColor: true, role: "title" })
      addText("Tous les jours · 18h – 20h", H * 0.195, W * 0.034, { font: "Arial", fill: readableOn(accent), keepColor: true, role: "subtitle" })
      addText(name || "−30% sur les cocktails", H * 0.52, W * 0.048, { weight: "bold", role: "subtitle" })
      await placeQrT(H * 0.59, 0.34)
      addCTA("Voir la carte", H * 0.88)
    }
    // O) Guide — Étapes 1·2·3 : pastilles numérotées + QR (check-in / how-to)
    const guideSteps = async () => {
      fc.add(new fabric.Rect({ left: 0, top: 0, width: W, height: Math.round(H * 0.13), fill: accent }))
      addText("📖  GUIDE", H * 0.04, W * 0.044, { weight: "bold", fill: readableOn(accent), keepColor: true, role: "subtitle" })
      addText(name || "Bienvenue chez nous", H * 0.165, W * 0.068, { weight: "bold", role: "title" })
      const steps = ["Scannez le QR ci-dessous", "Accédez au guide complet", "Profitez de votre séjour"]
      steps.forEach((s, i) => {
        const y = H * (0.30 + i * 0.085)
        fc.add(new fabric.Circle({ radius: W * 0.035, fill: accent, originX: "center", originY: "center", left: W * 0.17, top: y }))
        fc.add(new fabric.Textbox(String(i + 1), { left: W * 0.17, top: y - W * 0.026, width: W * 0.07, fontSize: W * 0.04, fontWeight: "bold", fill: readableOn(accent), textAlign: "center", originX: "center" }))
        fc.add(new fabric.Textbox(s, { left: W * 0.25, top: y - W * 0.028, width: W * 0.58, fontSize: W * 0.03, fontFamily: "Arial", fill: ink, textAlign: "left" }))
      })
      await placeQrT(H * 0.59, 0.32)
      addCTA("Ouvrir le guide", H * 0.88)
    }

    switch (id) {
      case "avis-prestige": await avisHero(); break
      case "resto-ornate": await restoOrnate(); break
      case "insta-block": await instaBlock(); break
      case "cocktail-noir": await cocktailNoir(); break
      case "promo-burst": await promoBurst(); break
      case "contact-card": await contactCard(); break
      case "immo-fiche": await immoFiche(); break
      case "airbnb-welcome": await airbnbWelcome(); break
      case "event-ticket": await eventTicket(); break
      case "reserve-stripe": await reserveStripe(); break
      case "creator-bio": await creatorBio(); break
      case "portfolio-grid": await portfolioGrid(); break
      case "soldes-mega": await soldesMega(); break
      case "happyhour-diag": await happyDiag(); break
      case "guide-steps": await guideSteps(); break
      case "wifi-or": case "wifi-vert": case "wifi-bleu": await wifiLayout(); break
      case "fidelite-or": case "fidelite-rouge": await loyaltyLayout(); break
      case "avis-or":
      case "avis-clair":
        brand(H * 0.02)
        addText("Vous avez aimé ?", H * 0.06, W * 0.075, { weight: "bold", role: "title" })
        addStars(5, H * 0.19, W * 0.07, accent)
        addText("Laissez-nous un avis en 30 secondes", H * 0.27, W * 0.034, { font: "Arial", width: W * 0.72, role: "subtitle" })
        await placeQrT(H * 0.37, 0.46)
        addCTA("Scannez-moi", H * 0.85)
        break
      case "menu":
      case "menu-clair":
        fc.add(new fabric.Rect({ left: 0, top: 0, width: W, height: Math.round(H * 0.16), fill: accent }))
        addText(name || "Notre Carte", H * 0.045, W * 0.085, { weight: "bold", fill: readableOn(accent), role: "title" })
        addText("Scannez pour découvrir nos plats", H * 0.24, W * 0.034, { font: "Arial", role: "subtitle" })
        await placeQrT(H * 0.34, 0.5)
        addCTA("Voir le menu", H * 0.85)
        break
      case "reserver":
      case "reserver-clair":
        brand(H * 0.015)
        await addIconT(ICON("cal"), W * 0.14, H * 0.07, accent)
        addText("Réservez votre table", H * 0.2, W * 0.07, { weight: "bold", role: "title" })
        rule(H * 0.255)
        addText("En quelques secondes, où que vous soyez", H * 0.285, W * 0.032, { font: "Arial", width: W * 0.72, role: "subtitle" })
        await placeQrT(H * 0.38, 0.44)
        addCTA("Réservez", H * 0.85)
        break
      case "insta":
      case "insta-clair":
        brand(H * 0.015)
        await addIconT(ICON("cam"), W * 0.14, H * 0.07, accent)
        addText("Suivez-nous", H * 0.2, W * 0.085, { weight: "bold", role: "title" })
        addText("@votrecompte", H * 0.29, W * 0.04, { font: "Arial", fill: accent, role: "subtitle" })
        await placeQrT(H * 0.38, 0.44)
        addCTA("Suivez-nous", H * 0.85)
        break
      case "contact":
      case "contact-clair":
        addText(name || "Prénom Nom", H * 0.09, W * 0.08, { weight: "bold", role: "title" })
        rule(H * 0.16)
        addText("Votre métier", H * 0.185, W * 0.036, { font: "Arial", fill: accent, role: "subtitle" })
        await placeQrT(H * 0.28, 0.5)
        addText(`📞  ${phone || "06 12 34 56 78"}`, H * 0.76, W * 0.034, { font: "Arial", role: "phone" })
        addText(`🌐  ${website || "monsite.fr"}`, H * 0.83, W * 0.034, { font: "Arial", role: "website" })
        break
      case "decouvrir":
      case "decouvrir-or":
        brand(H * 0.035)
        addText("Découvrez-nous", H * 0.1, W * 0.08, { weight: "bold", role: "title" })
        rule(H * 0.165)
        addText("Scannez pour en savoir plus", H * 0.195, W * 0.034, { font: "Arial", role: "subtitle" })
        await placeQrT(H * 0.3, 0.5)
        addCTA("En savoir plus", H * 0.85)
        break
      case "avis-band":      await bandLayout("Votre avis ?", "Aidez-nous en 30 secondes", "Donner mon avis"); break
      case "reserver-band":  await bandLayout("Réservez", "Votre table en 1 clic", "Réserver"); break
      case "insta-band":     await bandLayout("Suivez-nous", "@votrecompte", "Nous suivre"); break
      case "contact-band":   await bandLayout("Mes coordonnées", "Scannez pour me contacter", "Enregistrer"); break
      case "decouvrir-band": await bandLayout("Découvrez-nous", "Tout est ici", "En savoir plus"); break
      case "avis-frame":      await frameLayout("Vous avez aimé ?", "Laissez-nous un avis", "Donner mon avis"); break
      case "menu-frame":      await frameLayout(name || "Notre Carte", "Scannez pour la carte", "Voir le menu"); break
      case "reserver-frame":  await frameLayout("Réservez votre table", "En quelques secondes", "Réserver"); break
      case "insta-frame":     await frameLayout("Suivez-nous", "@votrecompte", "Nous suivre"); break
      case "contact-frame":   await frameLayout(name || "Mes coordonnées", "Scannez pour me contacter", "Enregistrer"); break
      case "decouvrir-frame": await frameLayout("Découvrez-nous", "Scannez pour en savoir plus", "En savoir plus"); break
      case "avis-footer":      await footerLayout("Vous avez aimé ?", "Votre avis compte", "Donner mon avis →"); break
      case "menu-footer":      await footerLayout(name || "Notre Carte", "Tous nos plats", "Voir le menu →"); break
      case "reserver-footer":  await footerLayout("Réservez votre table", "En quelques secondes", "Réserver →"); break
      case "insta-footer":     await footerLayout("Suivez-nous", "@votrecompte", "Nous suivre →"); break
      case "contact-footer":   await footerLayout(name || "Mes coordonnées", "Restons en contact", "Me contacter →"); break
      case "decouvrir-footer": await footerLayout("Découvrez-nous", "Scannez pour explorer", "En savoir plus →"); break
      case "avis-hero":      await heroLayout("Vous avez aimé ?", "Scannez pour laisser un avis", "MERCI 🙏"); break
      case "menu-hero":      await heroLayout(name || "Notre Carte", "Scannez pour voir le menu", "BON APPÉTIT"); break
      case "reserver-hero":  await heroLayout("Réservez", "Scannez pour réserver", "À BIENTÔT"); break
      case "insta-hero":     await heroLayout("Suivez-nous", "Scannez pour nous suivre", "@votrecompte"); break
      case "contact-hero":   await heroLayout(name || "Mon contact", "Scannez ma carte", ""); break
      case "decouvrir-hero": await heroLayout("Scannez-moi", "Pour tout découvrir", ""); break
      case "avis-diag":      await diagLayout("Vous avez aimé ?", "Laissez-nous un avis", "Donner mon avis"); break
      case "menu-diag":      await diagLayout(name || "Notre Carte", "Scannez pour la carte", "Voir le menu"); break
      case "reserver-diag":  await diagLayout("Réservez votre table", "En quelques secondes", "Réserver"); break
      case "insta-diag":     await diagLayout("Suivez-nous", "@votrecompte", "Nous suivre"); break
      case "contact-diag":   await diagLayout(name || "Mes coordonnées", "Scannez pour me contacter", "Enregistrer"); break
      case "decouvrir-diag": await diagLayout("Découvrez-nous", "Scannez pour en savoir plus", "En savoir plus"); break
      case "avis-ornate":      await ornateLayout("Vous avez aimé ?", "Laissez-nous un avis", "Donner mon avis"); break
      case "menu-ornate":      await ornateLayout(name || "Notre Carte", "Scannez pour la carte", "Voir le menu"); break
      case "reserver-ornate":  await ornateLayout("Réservez votre table", "En quelques secondes", "Réserver"); break
      case "insta-ornate":     await ornateLayout("Suivez-nous", "@votrecompte", "Nous suivre"); break
      case "contact-ornate":   await ornateLayout(name || "Mes coordonnées", "Restons en contact", "Me contacter"); break
      case "decouvrir-ornate": await ornateLayout("Découvrez-nous", "Scannez pour explorer", "En savoir plus"); break
      case "resto-footer":   await footerLayout(name || "Notre Carte", "Scannez pour la carte du jour", "Voir le menu"); break
      case "immo-frame":     await frameLayout(name || "Votre agent", "Scannez ma carte de visite", "Me contacter"); break
      case "event-ornate":   await ornateLayout("L'événement", "Scannez pour le programme", "J'y vais"); break
      case "avis-premium":   await premiumLayout("Votre avis compte", "Scannez pour nous noter", "Donner mon avis", "AVIS"); break
      case "menu-premium":   await premiumLayout(name || "Notre Carte", "Scannez pour découvrir", "Voir le menu", "MENU"); break
      case "promo-premium":  await premiumLayout("Offre spéciale", "Scannez pour en profiter", "J'en profite", "-20%"); break
      case "reserver-premium": await premiumLayout("Réservez votre table", "Scannez pour réserver", "Réserver", "RÉSA"); break
      case "insta-premium":  await premiumLayout("Suivez-nous", "Scannez pour nous suivre", "S'abonner", "@"); break
      case "contact-premium": await premiumLayout(name || "Mes coordonnées", "Scannez ma carte", "Enregistrer", "VIP"); break
      case "avis-photo":     await photoLayout("Vous avez aimé ?", "Scannez pour laisser un avis", "happy customer restaurant smiling"); break
      case "menu-photo":     await photoLayout(name || "Notre Carte", "Scannez pour découvrir le menu", "gourmet food plate restaurant"); break
      case "reserver-photo": await photoLayout("Réservez votre table", "Scannez pour réserver", "elegant restaurant interior ambiance"); break
      case "insta-photo":    await photoLayout("Suivez-nous", "@votrecompte", "lifestyle aesthetic flatlay"); break
      case "contact-photo":  await photoLayout(name || "Mes coordonnées", "Scannez ma carte de visite", "modern minimal office desk"); break
      case "decouvrir-photo":await photoLayout("Découvrez-nous", "Scannez pour explorer", "boutique shop interior cozy"); break
      case "menu-split":     await photoSplitLayout(name || "Notre Carte", "Scannez pour le menu", "restaurant food table gourmet"); break
      case "reserver-split": await photoSplitLayout("Réservez votre table", "Scannez pour réserver", "cozy restaurant interior"); break
      case "decouvrir-split":await photoSplitLayout("Découvrez-nous", "Scannez pour explorer", "boutique lifestyle shop"); break
      case "avis-card":      await photoCardLayout("Vous avez aimé ?", "Laissez-nous un avis", "happy people cafe friends"); break
      case "insta-card":     await photoCardLayout("Suivez-nous", "@votrecompte", "aesthetic lifestyle flatlay"); break
      case "contact-card":   await photoCardLayout(name || "Mes coordonnées", "Scannez ma carte", "modern workspace desk"); break
      case "avis-studio":     await studioLayout("Vous avez aimé ?", "Scannez pour laisser un avis", "Donner mon avis", { query: "happy customers restaurant smiling", emoji: "⭐", badge: "AVIS" }); break
      case "menu-studio":     await studioLayout(name || "Notre Carte", "Scannez pour découvrir le menu", "Voir le menu", { query: "gourmet plate gastronomy", emoji: "🍽️", badge: "MENU" }); break
      case "reserver-studio": await studioLayout("Réservez votre table", "Scannez pour réserver", "Réserver", { query: "elegant restaurant table setting", emoji: "📅", badge: "RÉSA" }); break
      case "insta-studio":    await studioLayout("Suivez-nous", "Notre univers en images", "S'abonner", { query: "lifestyle aesthetic influencer", emoji: "📷", badge: "@" }); break
      case "contact-studio":  await studioLayout(name || "Mes coordonnées", "Scannez ma carte de visite", "Enregistrer", { query: "modern professional office portrait", emoji: "💼", badge: "PRO" }); break
      case "decouvrir-studio":await studioLayout("Découvrez-nous", "Scannez pour explorer", "En savoir plus", { query: "premium boutique shop interior", emoji: "✨", badge: "NEW" }); break
      case "coach-studio":    await studioLayout("Première séance offerte", "Scannez pour réserver", "Prendre RDV", { query: "wellness yoga coach calm meditation", emoji: "🧘", badge: "COACH" }); break
      case "beaute-studio":   await studioLayout("Sublimez-vous", "Scannez pour prendre RDV", "Réserver", { query: "beauty salon hair spa elegant", emoji: "💇", badge: "BEAUTÉ" }); break
      case "immo-studio":     await studioLayout("Votre futur chez-vous", "Scannez pour visiter", "Visiter", { query: "modern luxury house architecture interior", emoji: "🏠", badge: "IMMO" }); break
      case "event-studio":    await studioLayout("L'événement", "Scannez pour le programme", "J'y vais", { query: "concert party event crowd lights", emoji: "🎉", badge: "EVENT" }); break
      case "cafe-studio":     await studioLayout(name || "Notre Carte", "Scannez pour la carte du jour", "Voir le menu", { query: "cozy coffee shop latte cup", emoji: "☕", badge: "CAFÉ" }); break
      case "boutique-studio": await studioLayout("Nouvelle collection", "Scannez pour découvrir", "Découvrir", { query: "fashion boutique clothing store", emoji: "🛍️", badge: "SHOP" }); break
    }

    if (vG) fc.bringToFront(vG)
    if (hG) fc.bringToFront(hG)
    fc.discardActiveObject(); setSel(null); fc.requestRenderAll()
    histRef.current.lock = false
    pushHistory() // modele applique = une etape
    setTplOpen(false)
    applyingRef.current = false
    setDropFx(n => n + 1) // animation de dépôt (overlay, ne touche pas le canvas)
  }

  // ---- Sauvegarde ----------------------------------------------------------
  const save = async (silent = false) => {
    const fc = fcRef.current; if (!fc) return
    if (!silent) { setSaving(true); setSaved(false) }
    try {
      // ne pas serialiser les guides (excludeFromExport ne suffit pas pour toJSON)
      const vG = vGuideRef.current, hG = hGuideRef.current
      if (vG) fc.remove(vG)
      if (hG) fc.remove(hG)
      const design = fc.toJSON(TOJSON_PROPS)
      if (vG) fc.add(vG)
      if (hG) fc.add(hG)

      const res = await fetch("/api/print-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_id: qrId, design, format }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Echec")
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (e) {
      if (!silent) showToast("Sauvegarde impossible : " + (e as Error).message)
    } finally {
      if (!silent) setSaving(false)
    }
  }
  saveRef.current = save // tenir la ref a jour a chaque render (Ctrl+S utilise toujours le save courant)

  // Auto-sauvegarde : 2,5 s apres la derniere modification (silencieuse)
  useEffect(() => {
    if (loading || histRef.current.i < 1) return
    const t = setTimeout(() => { save(true) }, 2500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histVer, loading])

  // ---- Export --------------------------------------------------------------
  const prepExport = (fc: fabric.Canvas) => {
    fc.discardActiveObject()
    const vG = vGuideRef.current, hG = hGuideRef.current
    if (vG) vG.set({ visible: false })
    if (hG) hG.set({ visible: false })
    fc.requestRenderAll()
  }

  const exportPng = async () => {
    const fc = fcRef.current; if (!fc) return
    setExporting(true)
    try {
      prepExport(fc)
      const url = withBaseZoom(fc, base => fc.toDataURL({ format: "png", multiplier: FORMATS[format].exportW / base.w }))
      const a = document.createElement("a")
      a.href = url; a.download = `qrfolio-${format}.png`; a.click()
    } finally { setExporting(false) }
  }

  const exportPdf = async () => {
    if (!isPro) { onUpsell?.("l'export PDF prêt à imprimer", "pro"); return }
    const fc = fcRef.current; if (!fc) return
    setExporting(true)
    try {
      prepExport(fc)
      const url = withBaseZoom(fc, base => fc.toDataURL({ format: "png", multiplier: FORMATS[format].exportW / base.w }))
      const w = FORMATS[format].exportW
      const h = Math.round(w / FORMATS[format].ratio)
      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF({ orientation: w > h ? "l" : "p", unit: "px", format: [w, h] })
      pdf.addImage(url, "PNG", 0, 0, w, h)
      pdf.save(`qrfolio-${format}.pdf`)
    } finally { setExporting(false) }
  }

  // ---- Apercu en situation (mockup CSS) ------------------------------------
  // Régénérer : proposer le modèle suivant du dernier objectif choisi
  const regenerate = async () => {
    if (!lastPool || !lastPool.length) return
    const id = lastPool[genIdxRef.current++ % lastPool.length]
    await applyTemplate(id, true)
  }
  // Générateur guidé : objectif choisi -> meilleur modèle + style optionnel
  const guidedGenerate = async (styleId: string | null) => {
    const meta = OBJ_META[guideObj]; if (!meta) return
    setStarting(true)
    setLastPool(meta.pool)
    const id = meta.pool[genIdxRef.current++ % meta.pool.length]
    await applyTemplate(id, true)
    if (styleId) { const st = GLOBAL_STYLES.find(s => s.id === styleId); if (st) applyStyle(st) }
    setStarting(false); setShowStart(false); setStartStep("metier")
    setTplOpen(true) // ouvrir la galerie : panneau interactif qui remplit le cote gauche + permet d'explorer d'autres modeles
  }
  // Choix d'un design precis dans l'etape guidee (+ style metier applique pour la coherence)
  const guidedPick = async (id: string) => {
    setStarting(true)
    setLastPool(OBJ_META[guideObj]?.pool ?? [id])
    await applyTemplate(id, true)
    if (guideMetier) { const st = GLOBAL_STYLES.find(s => s.id === guideMetier.style); if (st) applyStyle(st) }
    setStarting(false); setShowStart(false); setStartStep("metier"); setTplOpen(true)
  }
  const openMock = () => {
    const fc = fcRef.current; if (!fc) return
    prepExport(fc)
    const url = withBaseZoom(fc, base => fc.toDataURL({ format: "png", multiplier: Math.min(2, 1000 / base.w) }))
    setMockUrl(url); setMockOpen(true)
  }
  // Decor reel (Unsplash) pour le mockup, selon l'environnement choisi
  const SCENE_Q: Record<string, string> = {
    wall: "white brick wall interior", table: "wooden cafe table top",
    window: "shop storefront window glass", desk: "modern wood office desk",
    cadre: "living room wall interior cozy", counter: "cafe bar counter wood",
    main: "hand holding paper blurred background", carte: "wooden desk minimal flatlay",
  }
  // Precharge une photo representative par objectif pour les vignettes (galerie + etape "Choisir un design")
  useEffect(() => {
    if (!tplOpen && startStep !== "design") return
    let cancelled = false
    Object.keys(OBJ_PHOTO_Q).forEach(obj => {
      if (thumbCache[obj]) return
      fetch(`/api/unsplash?q=${encodeURIComponent(OBJ_PHOTO_Q[obj])}&orientation=portrait`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => { const u = d?.photos?.[0]?.regular; if (u && !cancelled) setThumbCache(c => ({ ...c, [obj]: u })) })
        .catch(() => {})
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tplOpen, startStep])
  useEffect(() => {
    if (!mockOpen) return
    let cancelled = false
    setMockBg("")
    fetch(`/api/unsplash?q=${encodeURIComponent(SCENE_Q[mockEnv] || "interior")}&orientation=landscape`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled) setMockBg(d?.photos?.[0]?.regular || "") })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockOpen, mockEnv])

  // ---- Contrôle qualité impression (Print Center) ---------------------------
  // Mesure le design réel puis délègue la notation au moteur pur printPreflight (testé).
  // v1 : contraste QR↔fond + taille physique du QR + résolution. Zone silencieuse / marges : à venir (na).
  const openPreflight = () => {
    const fc = fcRef.current
    const isScreen = format === "story"
    const widthMm = FORMAT_MM[format] || 0
    const fgHex = /^#[0-9a-fA-F]{6}$/.test(qrFg) ? qrFg : "#0A0A0A"
    let contrastBg = /^#[0-9a-fA-F]{6}$/.test(bgColor) ? bgColor : "#FFFFFF"
    let qrSizeMm: number | null = null
    let quietZoneMm: number | null = null
    let edgeMarginMm: number | null = null
    if (fc) {
      const objs = fc.getObjects()
      const qr = objs.find((o: any) => o.isQR)
      const card = objs.find((o: any) => o.isQrCard)
      const cw = fc.getWidth() || 1
      const ch = fc.getHeight() || cw
      // Le QR est souvent posé sur une carte blanche : le vrai contraste se joue QR ↔ carte.
      const cf = (card as any)?.fill
      if (typeof cf === "string" && /^#[0-9a-fA-F]{6}$/.test(cf)) contrastBg = cf
      if (qr && widthMm > 0) {
        const qpx = ((qr as any).width || 0) * ((qr as any).scaleX || 1)  // espace-canvas (indépendant du zoom d'édition)
        if (qpx > 0) qrSizeMm = (qpx / cw) * widthMm
        // Zone silencieuse & marges de sécurité (géométrie pure, testée). Best-effort : na si mesure impossible.
        try {
          const rectOf = (o: any): Rect => { const b = o.getBoundingRect(true, true); return { left: b.left, top: b.top, width: b.width, height: b.height } }
          // Ne mesurer QUE le contenu réel : exclure les repères (guides, marge) et les objets masqués.
          const isContent = (o: any) => !o.isGuide && !o.isOverlay && o.visible !== false
          const content = objs.filter(isContent)
          const qb = rectOf(qr)
          const others = content.filter((o: any) => o !== qr && o !== card).map(rectOf)
          quietZoneMm = (quietZonePx(qb, others, cw, ch) / cw) * widthMm
          edgeMarginMm = (edgeMarginPx(content.map(rectOf), cw, ch) / cw) * widthMm
        } catch { /* mesure indisponible -> na */ }
      }
    }
    const metrics: PreflightMetrics = {
      qrSizeMm, contrastRatio: hexContrastRatio(fgHex, contrastBg),
      quietZoneMm, logoPct: 0, dpi: expDpi, edgeMarginMm, isScreen,
    }
    setPreflight(printPreflight(metrics))
  }

  // ---- Export pro (DPI + format + traits de coupe / fond perdu) -------------
  const targetWidth = () => Math.round(FORMATS[format].exportW * (expDpi / 300))
  const exportImage = (type: "png" | "jpeg") => {
    const fc = fcRef.current; if (!fc) return
    setExporting(true)
    try {
      prepExport(fc)
      const tw = targetWidth()
      const url = withBaseZoom(fc, base => fc.toDataURL({ format: type, quality: type === "jpeg" ? 0.92 : 1, multiplier: tw / base.w }))
      const a = document.createElement("a")
      a.href = url; a.download = `qrfolio-${format}-${expDpi}dpi.${type === "jpeg" ? "jpg" : "png"}`; a.click()
    } finally { setExporting(false); setExpOpen(false) }
  }
  const exportPdfPro = async () => {
    if (!isPro) { onUpsell?.("l'export PDF pro (traits de coupe, fond perdu)", "pro"); return }
    const fc = fcRef.current; if (!fc) return
    setExporting(true)
    try {
      prepExport(fc)
      const w = targetWidth(), h = Math.round(w / FORMATS[format].ratio)
      const url = withBaseZoom(fc, base => fc.toDataURL({ format: "png", multiplier: w / base.w }))
      const { jsPDF } = await import("jspdf")
      const bleed = expMarks ? Math.round(w * 0.03) : 0
      const pageW = w + bleed * 2, pageH = h + bleed * 2
      const pdf = new jsPDF({ orientation: pageW > pageH ? "l" : "p", unit: "px", format: [pageW, pageH] })
      pdf.addImage(url, "PNG", bleed, bleed, w, h)
      if (expMarks) {
        const m = bleed, L = Math.round(bleed * 0.6)
        pdf.setDrawColor(0); pdf.setLineWidth(Math.max(1, Math.round(w / 800)))
        // 4 coins du trait de coupe (lignes a l'exterieur de la zone de rognage)
        pdf.line(0, m, L, m);           pdf.line(m, 0, m, L)                       // haut-gauche
        pdf.line(pageW, m, pageW - L, m); pdf.line(m + w, 0, m + w, L)             // haut-droite
        pdf.line(0, m + h, L, m + h);   pdf.line(m, pageH, m, pageH - L)           // bas-gauche
        pdf.line(pageW, m + h, pageW - L, m + h); pdf.line(m + w, pageH, m + w, pageH - L) // bas-droite
      }
      pdf.save(`qrfolio-${format}-${expDpi}dpi.pdf`)
    } finally { setExporting(false); setExpOpen(false) }
  }
  // Lance l'export choisi dans l'assistant (etape 3) puis referme l'assistant.
  const runExport = () => {
    if (wizType === "pdf") { void exportPdfPro() } else { exportImage(wizType) }
    setExpWiz(-1)
  }

  // ==========================================================================
  // UI
  // ==========================================================================
  const btnTool = {
    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 5,
    width: "100%", padding: "11px 2px", background: "#FFFFFF",
    border: "1px solid rgba(31,36,48,0.09)", borderRadius: 11, color: INK,
    fontSize: 10, fontWeight: 600, cursor: "pointer",
    boxShadow: "0 1px 2px rgba(31,36,48,0.04)", transition: "all .14s ease",
  }
  const topBtn = (primary = false) => ({
    display: "flex", alignItems: "center", gap: 6, height: 36, padding: primary ? "0 18px" : "0 14px",
    background: primary ? "linear-gradient(135deg,#D9BC6A,#B8923A)" : "rgba(0,0,0,0.045)",
    border: primary ? "none" : "1px solid rgba(0,0,0,0.1)",
    borderRadius: 10, color: primary ? "#1A1405" : INK, fontSize: 12.5,
    fontWeight: primary ? 800 : 600, cursor: "pointer",
    boxShadow: primary ? "0 5px 16px rgba(201,168,76,0.4)" : "none",
    letterSpacing: primary ? 0.2 : 0,
  })
  const layerBtn = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    padding: "9px 8px", background: "#FFFFFF",
    border: "1px solid rgba(31,36,48,0.1)", borderRadius: 9, color: INK,
    fontSize: 10, fontWeight: 600, cursor: "pointer",
    boxShadow: "0 1px 2px rgba(31,36,48,0.05)", transition: "all .14s ease",
  }
  // Variante SOMBRE de layerBtn, reservee au panneau Reglages sur mobile (#22).
  const panelBtn = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    padding: "9px 8px", background: pCard,
    border: `1px solid ${darkPanel ? "rgba(255,255,255,0.12)" : "rgba(31,36,48,0.1)"}`, borderRadius: 9, color: pInk,
    fontSize: 10, fontWeight: 600, cursor: "pointer",
    boxShadow: darkPanel ? "none" : "0 1px 2px rgba(31,36,48,0.05)", transition: "all .14s ease",
  }
  const iconMini = {
    display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22,
    background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 0, flexShrink: 0,
  } as const
  const tb = {
    display: "flex", alignItems: "center", justifyContent: "center", minWidth: 26, height: 26, padding: "0 7px",
    background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 7, color: INK, fontSize: 12, cursor: "pointer",
  } as const
  const swatch = {
    width: 28, height: 24, borderRadius: 6, border: "1px solid rgba(0,0,0,0.15)", background: "transparent", cursor: "pointer", padding: 0, flexShrink: 0,
  } as const

  const canUndo = histVer >= 0 && histRef.current.i > 0
  const canRedo = histVer >= 0 && histRef.current.i < histRef.current.stack.length - 1

  // Garde-fou scannabilite du QR (recalcule a chaque rendu ; histVer/layersVer declenchent)
  const qrIssues = (() => {
    void histVer; void layersVer
    const fc = fcRef.current; if (!fc) return null
    const objs = fc.getObjects()
    const qr = objs.find(o => (o as any).isQR); if (!qr) return null
    const z = fc.getZoom() || 1
    const W = fc.getWidth() / z
    const qb = qr.getBoundingRect(true)
    const small = qb.width < W * 0.16
    let covered = false
    const qi = objs.indexOf(qr)
    const qArea = qb.width * qb.height
    for (let i = qi + 1; i < objs.length; i++) {
      const o = objs[i]
      if ((o as any).isGuide || o.visible === false || (o as any).isQrCard || o.type === "line") continue
      const b = o.getBoundingRect(true)
      const ix = Math.max(0, Math.min(b.left + b.width, qb.left + qb.width) - Math.max(b.left, qb.left))
      const iy = Math.max(0, Math.min(b.top + b.height, qb.top + qb.height) - Math.max(b.top, qb.top))
      // alerte seulement si l'element recouvre vraiment une grande part du QR (un filet fin ne compte pas)
      if (ix * iy > qArea * 0.22) { covered = true; break }
    }
    return small || covered ? { small, covered } : null
  })()
  const histBtn = (enabled: boolean) => ({
    display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36,
    background: "rgba(0,0,0,0.045)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10,
    color: enabled ? INK : MUTED, cursor: enabled ? "pointer" : "not-allowed", opacity: enabled ? 1 : 0.4,
  })
  const ghostBtn = {
    display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 13px",
    background: "rgba(0,0,0,0.045)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10,
    color: INK, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  } as const
  const topDivider = <span style={{ width: 1, height: 24, background: "rgba(31,36,48,0.1)", margin: "0 4px" }} />

  // Print Studio = éditeur canvas rendu dans toutes les tailles d'écran.
  // Sur téléphone (landscapeMobile, toute orientation) : rail masqué, remplacé par
  // le MobileDock en bas + le menu ⋯ pour l'overflow. Sur desktop : rail + panneaux flottants.

  // Carte de modele (galerie #13) : grande vignette + libelle + etoile favori.
  const tplCard = (t: typeof PRINT_TEMPLATES[number]) => (
    <div key={t.id} style={{ position: "relative" }}>
      <button type="button" onClick={() => applyTemplate(t.id)} title={t.desc}
        style={{ display: "flex", flexDirection: "column", gap: 5, padding: 6, width: "100%", background: darkPanel ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", border: `1px solid ${darkPanel ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"}`, borderRadius: 10, cursor: "pointer" }}>
        {tplThumb(t, thumbCache[t.obj])}
        <span style={{ color: pInk, fontSize: 10, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{t.label}</span>
      </button>
      <span role="button" tabIndex={0} aria-label={isFav(favsTpl, t.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
        onClick={e => { e.stopPropagation(); setFavsTpl(f => toggleFav(f, t.id)) }}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setFavsTpl(f => toggleFav(f, t.id)) } }}
        style={{ position: "absolute", top: 9, right: 9, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(0,0,0,0.45)", color: isFav(favsTpl, t.id) ? "#FFD65A" : "#fff", fontSize: 13, cursor: "pointer", userSelect: "none" }}>
        {isFav(favsTpl, t.id) ? "★" : "☆"}
      </span>
    </div>
  )

  const root = (
    <div className={"ps-root" + (landscapeMobile ? " ps-landscape" : "")} style={{
      position: "fixed", inset: 0, zIndex: 3000, background: BG,
      display: "flex", flexDirection: "column", fontFamily: "DM Sans, sans-serif",
    }}>
      <style>{`
        /* Coupe le chainage de scroll : le geste ne "fuit" jamais vers la page du dashboard derriere. */
        .ps-root { overscroll-behavior: contain; }
        .ps-root .qr-scroll, .ps-root .ps-fly, .ps-root .ps-msheet, .ps-root .ps-sheet { overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
        .ps-root button { transition: background .14s ease, border-color .14s ease, color .14s ease, transform .07s ease, filter .14s ease; }
        .ps-root button:hover:not(:disabled) { filter: brightness(0.96); }
        .ps-root button:active:not(:disabled) { transform: scale(0.96); }
        .ps-root input, .ps-root select { transition: border-color .14s ease, box-shadow .14s ease; }
        .ps-root input:focus, .ps-root select:focus { border-color: ${G} !important; box-shadow: 0 0 0 2px rgba(201,168,76,0.18); }
        .ps-fly { animation: psSlide .18s cubic-bezier(.2,.8,.2,1); box-shadow: 8px 0 28px rgba(0,0,0,0.06); }
        .ps-fly-right { box-shadow: -8px 0 28px rgba(0,0,0,0.07) !important; }
        .ps-fly-right button:hover:not(:disabled) { filter: none; border-color: rgba(201,168,76,0.6) !important; box-shadow: 0 3px 10px rgba(31,36,48,0.1) !important; transform: translateY(-1px); }
        .ps-fly-right button:active:not(:disabled) { transform: translateY(0) scale(0.97); }
        /* Desktop : les panneaux gauche (Modèles/Bibliothèque/Photos/Styles/Calques/Fond) FLOTTENT au-dessus
           du plan de travail au lieu de rétrécir l'aperçu -> le canvas garde toute sa largeur, le design reste grand. */
        .ps-root:not(.ps-landscape) .ps-fly:not(.ps-fly-right) { position: absolute !important; left: var(--ps-rail-w, 150px) !important; top: 0 !important; bottom: 0 !important; z-index: 22 !important; box-shadow: 12px 0 44px rgba(0,0,0,0.22) !important; }
        .ps-sec-label { display: flex; align-items: center; gap: 7px; color: ${MUTED}; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.3px; margin: 0 0 9px; }
        /* Menu ... mobile en sombre premium : etiquettes de section eclaircies pour le contraste */
        .ps-msheet .ps-sec-label { color: #BCB4A6; }
        /* Panneaux sombres (mobile #22) : etiquettes de section eclaircies */
        .ps-root.ps-landscape .ps-fly .ps-sec-label { color: #BCB4A6; }
        .ps-sec-label::before { content: ""; width: 3px; height: 11px; border-radius: 3px; background: ${G}; flex-shrink: 0; }
        .ps-rail button:hover:not(:disabled) { filter: none; border-color: rgba(201,168,76,0.55) !important; box-shadow: 0 4px 12px rgba(31,36,48,0.1) !important; transform: translateY(-1px); }
        .ps-rail button:active:not(:disabled) { transform: translateY(0) scale(0.96); }
        .ps-rail button svg { color: ${G}; }
        .ps-pop { animation: psPop .18s cubic-bezier(.2,.8,.2,1); }
        .ps-goal { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; animation: psRise .34s cubic-bezier(.2,.8,.2,1) both; }
        .ps-goal:hover { transform: translateY(-4px); box-shadow: 0 14px 30px rgba(0,0,0,0.12); border-color: ${G} !important; }
        @keyframes psRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes psSlide { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes psPop { from { opacity: 0; transform: translate(-50%, -8px) scale(.97); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        .ps-root .qr-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .ps-root .qr-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 8px; }
        .ps-root .qr-scroll::-webkit-scrollbar-thumb:hover { background: rgba(201,168,76,0.4); }
        .ps-root .qr-scroll::-webkit-scrollbar-track { background: transparent; }
        /* Phase 1 — paysage mobile : rail compact icônes + top bar resserrée (canvas héros) */
        .ps-rail.ps-compact { padding: 12px 4px !important; gap: 12px !important; align-items: center; }
        .ps-rail.ps-compact p { display: none !important; }
        .ps-rail.ps-compact > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; gap: 8px !important; width: 100%; }
        .ps-rail.ps-compact button { font-size: 0 !important; letter-spacing: 0 !important; padding: 0 !important; gap: 0 !important; justify-content: center !important; width: 100% !important; min-height: 48px !important; }
        .ps-rail.ps-compact button svg { width: 22px !important; height: 22px !important; flex-shrink: 0; }
        /* Barre du haut mobile : chrome sombre premium (l'export doré est masqué en compact -> pas de conflit) */
        .ps-topbar-compact { padding: 6px 10px !important; background: #141417 !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; box-shadow: none !important; }
        /* Cibles tactiles ≥ 42px + texte/icônes clairs sur fond sombre (priorité UX #6) */
        .ps-topbar-compact button { padding-top: 7px !important; padding-bottom: 7px !important; min-height: 42px !important; min-width: 42px !important; color: #F4F1EA !important; }
        .ps-topbar-compact button svg { color: #F4F1EA !important; }
        /* Phase 2 — paysage mobile : panneau Réglages en bottom sheet, Format masqué */
        .ps-hide-mobile { display: none !important; }
        .ps-fly-right.ps-sheet {
          position: fixed !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
          width: auto !important; max-height: 58vh !important;
          border-left: none !important; border-top: 1px solid rgba(0,0,0,0.1) !important;
          border-radius: 18px 18px 0 0 !important;
          box-shadow: 0 -14px 44px rgba(0,0,0,0.28) !important;
          z-index: 60 !important; animation: psSheetUp .26s cubic-bezier(.2,.8,.2,1);
          padding-bottom: env(safe-area-inset-bottom) !important;
        }
        @keyframes psSheetUp { from { transform: translateY(100%); opacity: .6 } to { transform: translateY(0); opacity: 1 } }
        /* Feedback (#16 / #23) : entree "ressort" (leger depassement) de la barre contextuelle du bas */
        @keyframes psBar { 0% { transform: translateY(100%); opacity: .3 } 68% { transform: translateY(-3px) } 100% { transform: translateY(0); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .ps-ctxbar { animation: none !important; } }
        /* Effet de dépôt d'un modèle : anneau accent qui se pose avec rebond, puis disparaît */
        .ps-drop-ring { width: 44vmin; height: 44vmin; max-width: 360px; max-height: 360px; border-radius: 22px;
          border: 2px solid color-mix(in srgb, var(--accent) 70%, transparent);
          box-shadow: 0 0 60px color-mix(in srgb, var(--accent) 45%, transparent), inset 0 0 44px color-mix(in srgb, var(--accent) 20%, transparent);
          animation: psDropRing .62s cubic-bezier(.2,.9,.25,1.2) forwards; }
        @keyframes psDropRing {
          0%   { transform: scale(1.18); opacity: 0; }
          35%  { opacity: 1; }
          70%  { transform: scale(0.97); opacity: .9; }
          85%  { transform: scale(1.02); }
          100% { transform: scale(1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) { .ps-drop-ring { animation-duration: .01s; } }
        /* Phase 3 — paysage mobile : tous les flyouts gauche (Modèles, Photos, Bibliothèque…) en bottom sheets */
        .ps-root.ps-landscape .ps-fly:not(.ps-fly-right) {
          position: fixed !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
          width: auto !important; max-height: 62vh !important;
          border-right: none !important; border-top: 1px solid rgba(0,0,0,0.1) !important;
          border-radius: 18px 18px 0 0 !important;
          box-shadow: 0 -14px 44px rgba(0,0,0,0.28) !important;
          z-index: 58 !important; animation: psSheetUp .26s cubic-bezier(.2,.8,.2,1) !important;
          padding-bottom: env(safe-area-inset-bottom) !important;
        }
        /* Bottom-sheets gauche (Modeles/Bibliotheque/Photos/Composants) : la zone de contenu
           DOIT defiler. Bug flexbox classique : un enfant flex:1 avec overflow ne defile
           pas tant qu'il n'a pas min-height:0 (sinon il deborde sous la hauteur bornee 62vh). */
        /* SCROLL DES BOTTOM-SHEETS GAUCHE (Modeles/Bibliotheque/Photos/Composants) :
           iOS Safari refuse souvent de scroller un enfant flex:1 (meme avec min-height:0).
           -> on fait du SHEET ENTIER l'unique conteneur scrollable, et on neutralise le
           scroll de l'enfant. Header devient sticky pour rester visible. */
        .ps-root.ps-landscape .ps-fly:not(.ps-fly-right) { display: block !important; overflow-y: auto !important; overflow-x: hidden !important; -webkit-overflow-scrolling: touch !important; touch-action: pan-y !important; overscroll-behavior: contain !important; }
        .ps-root.ps-landscape .ps-fly:not(.ps-fly-right) > .qr-scroll { overflow: visible !important; min-height: 0 !important; display: block !important; }
        /* En-tete (titre + croix) COLLANT en haut du sheet -> toujours accessible pendant le scroll. */
        .ps-root.ps-landscape .ps-fly:not(.ps-fly-right) .ps-fly-head { position: sticky; top: 0; z-index: 4; background: #17171B; }
        /* Sheets focalises + Reglages + menu ... : contenu scrollable au doigt (pan-y), sans fuite vers le fond */
        .ps-root.ps-landscape .ps-fly-right.ps-sheet, .ps-msheet { touch-action: pan-y; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch; }
        /* MEME CORRECTIF QUE LES FLYOUTS GAUCHE pour le panneau Reglages (ps-fly-right) :
           il etait en display:flex -> iOS refusait de scroller. On en fait un conteneur
           block scrollable ; l'en-tete contextuel (position:sticky inline) reste colle. */
        .ps-root.ps-landscape .ps-fly-right.ps-sheet { display: block !important; overflow-y: auto !important; overflow-x: hidden !important; -webkit-overflow-scrolling: touch !important; touch-action: pan-y !important; overscroll-behavior: contain !important; }
        /* Marge basse : le dernier reglage (opacite, taille...) se degage bien au-dessus du bord/nav. */
        .ps-root.ps-landscape .ps-fly-right.ps-sheet > div:last-child { padding-bottom: calc(28px + env(safe-area-inset-bottom)) !important; }
      `}</style>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
      <input ref={replaceRef} type="file" accept="image/*" onChange={onReplaceImage} style={{ display: "none" }} />
      {/* Effet « posé sur la feuille » au dépôt d'un modèle (overlay pur, n'altère pas le canvas) */}
      {dropFx > 0 && (
        <div key={dropFx} aria-hidden style={{ position: "fixed", inset: 0, zIndex: 55, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="ps-drop-ring" />
        </div>
      )}
      {/* Assistant d'export (#15) : Format -> Qualite -> Telecharger. Coeur pur `exportPlan`. */}
      {expWiz >= 0 && (() => {
        const plan = exportPlan({ format, exportW: FORMATS[format].exportW, ratio: FORMATS[format].ratio, widthMm: FORMAT_MM[format] || 0, dpi: expDpi, type: wizType, isPro })
        const steps = ["Format", "Qualité", "Télécharger"]
        const chip = (active: boolean) => ({ padding: "9px 13px", borderRadius: 10, border: `1px solid ${active ? G : "rgba(255,255,255,0.16)"}`, background: active ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.05)", color: active ? G : "#ECE8E0", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 44 }) as const
        const recap: [string, string][] = [["Format", FORMATS[format].label], ["Fichier", plan.filename], ["Dimensions", `${plan.widthPx} × ${plan.heightPx} px`], ...(plan.widthMm ? [["Taille imprimée", `${plan.widthMm} × ${plan.heightMm} mm`] as [string, string]] : []), ["Qualité", plan.quality]]
        return (
          <div onClick={() => setExpWiz(-1)} style={{ position: "fixed", inset: 0, zIndex: 72, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: landscapeMobile ? "flex-end" : "center", justifyContent: "center", padding: landscapeMobile ? 0 : 24 }}>
            <div onClick={e => e.stopPropagation()} className="ps-msheet" style={{ width: "100%", maxWidth: landscapeMobile ? "none" : 460, maxHeight: "88vh", overflowY: "auto", background: "#17171B", border: "1px solid rgba(255,255,255,0.08)", borderRadius: landscapeMobile ? "22px 22px 0 0" : 20, padding: "16px 16px calc(16px + env(safe-area-inset-bottom))", boxShadow: "0 -14px 44px rgba(0,0,0,0.5)", animation: "psSheetUp .26s cubic-bezier(.2,.8,.2,1)" }}>
              {/* Stepper */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                {steps.map((s, i) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, flex: i < steps.length - 1 ? 1 : "0 0 auto" }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: i <= expWiz ? "linear-gradient(180deg,#D9BC6A,#B8923A)" : "rgba(255,255,255,0.08)", color: i <= expWiz ? "#141417" : "rgba(244,241,234,0.5)" }}>{i + 1}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: i === expWiz ? "#F4F1EA" : "rgba(244,241,234,0.5)", whiteSpace: "nowrap" }}>{s}</span>
                    {i < steps.length - 1 && <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)", marginLeft: 4 }} />}
                  </div>
                ))}
              </div>

              {expWiz === 0 && (
                <div>
                  <p className="ps-sec-label">Choisis le format</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(Object.keys(FORMATS) as FormatId[]).map(f => (
                      <button key={f} type="button" onClick={() => applyFormat(f)} style={chip(format === f)}>{FORMATS[f].label}</button>
                    ))}
                  </div>
                  <p style={{ color: "#9A9384", fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>Le format redimensionne la feuille — ton design s'y adapte.</p>
                </div>
              )}
              {expWiz === 1 && (
                <div>
                  <p className="ps-sec-label">Type de fichier</p>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    {([["png", "PNG"], ["jpeg", "JPG"], ["pdf", isPro ? "PDF" : "PDF 🔒"]] as [ExportType, string][]).map(([t, l]) => (
                      <button key={t} type="button" onClick={() => setWizType(t)} style={{ ...chip(wizType === t), flex: 1 }}>{l}</button>
                    ))}
                  </div>
                  <p className="ps-sec-label">Qualité (DPI)</p>
                  <div style={{ display: "flex", gap: 8, marginBottom: wizType === "pdf" ? 12 : 4 }}>
                    {[72, 150, 300].map(d => (
                      <button key={d} type="button" onClick={() => setExpDpi(d)} style={{ ...chip(expDpi === d), flex: 1 }}>{d}</button>
                    ))}
                  </div>
                  {wizType === "pdf" && (
                    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px", color: "#ECE8E0", fontSize: 13, cursor: "pointer" }}>
                      <input type="checkbox" checked={expMarks} onChange={e => setExpMarks(e.target.checked)} style={{ accentColor: G, width: 18, height: 18, flexShrink: 0 }} />
                      Traits de coupe + fond perdu
                    </label>
                  )}
                  <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ color: "#C9A84C", fontSize: 12, fontWeight: 800 }}>{plan.quality}</span>
                    <span style={{ color: "#ECE8E0", fontSize: 12 }}> · {plan.widthPx} × {plan.heightPx} px{plan.widthMm ? ` · ${plan.widthMm} × ${plan.heightMm} mm` : ""}</span>
                  </div>
                </div>
              )}
              {expWiz === 2 && (
                <div>
                  <p className="ps-sec-label">Récapitulatif</p>
                  {recap.map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ color: "#9A9384", fontSize: 12 }}>{k}</span>
                      <span style={{ color: "#ECE8E0", fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>{v}</span>
                    </div>
                  ))}
                  {plan.blockedReason && <p style={{ color: "#E8A33D", fontSize: 11.5, marginTop: 10, lineHeight: 1.5 }}>{plan.blockedReason}</p>}
                </div>
              )}

              {/* Navigation */}
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button type="button" onClick={() => (expWiz === 0 ? setExpWiz(-1) : setExpWiz(expWiz - 1))}
                  style={{ flexShrink: 0, padding: "12px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)", color: "#ECE8E0", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                  {expWiz === 0 ? "Annuler" : "Retour"}
                </button>
                {expWiz < 2 ? (
                  <button type="button" onClick={() => setExpWiz(expWiz + 1)}
                    style={{ flex: 1, padding: "12px 18px", borderRadius: 12, border: "none", background: "linear-gradient(180deg,#D9BC6A,#B8923A)", color: "#141417", fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}>
                    Suivant
                  </button>
                ) : plan.allowed ? (
                  <button type="button" onClick={runExport}
                    style={{ flex: 1, padding: "12px 18px", borderRadius: 12, border: "none", background: "linear-gradient(180deg,#D9BC6A,#B8923A)", color: "#141417", fontSize: 13.5, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Download size={16} /> Télécharger
                  </button>
                ) : (
                  <button type="button" onClick={() => { setExpWiz(-1); onUpsell?.("l'export PDF pro (traits de coupe, fond perdu)", "pro") }}
                    style={{ flex: 1, padding: "12px 18px", borderRadius: 12, border: "none", background: "linear-gradient(90deg,#C9A84C,#b8953f)", color: "#141417", fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}>
                    Passer au Pro
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Dock mobile (creation) — visible quand RIEN n'est selectionne. Sinon -> barre contextuelle. */}
      {landscapeMobile && !sel && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 29 }}>
          <MobileDock tools={DOCK_TOOLS} active={dockActive} onSelect={onDock} />
        </div>
      )}

      {/* Selecteur d'objets superposes (#10) : popover au-dessus de la barre contextuelle */}
      {landscapeMobile && stackPick && stackPick.length > 0 && (
        <>
          <div onClick={() => setStackPick(null)} style={{ position: "fixed", inset: 0, zIndex: 42, background: "transparent" }} />
          <div style={{ position: "fixed", left: 12, right: 12, bottom: 80, zIndex: 43, background: "#17171B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, boxShadow: "0 -14px 44px rgba(0,0,0,0.5)", overflow: "hidden", maxHeight: "46vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              <span style={{ color: "#C9A84C", fontSize: 12, fontWeight: 800 }}>Objets superposés ici · {stackPick.length}</span>
              <button type="button" onClick={() => setStackPick(null)} aria-label="Fermer" style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 7, color: "#F4F1EA", cursor: "pointer" }}><X size={13} /></button>
            </div>
            <div style={{ overflowY: "auto" }}>
              {stackPick.map((it, i) => (
                <button key={it.id} type="button" onClick={() => pickStack(it.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", background: it.active ? "rgba(201,168,76,0.14)" : "none", border: "none", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none", color: it.active ? "#C9A84C" : "#F4F1EA", fontSize: 13.5, fontWeight: 600, textAlign: "left" as const, cursor: "pointer" }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#C9A84C", flexShrink: 0 }}>{i + 1}</span>
                  {it.name}
                  {it.active && <span style={{ marginLeft: "auto", fontSize: 10, color: "#C9A84C", flexShrink: 0 }}>sélectionné</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Sheets QR focalises (#4/#5) : un seul aspect, gros controles, jauge live. */}
      {landscapeMobile && sel?.isQr && qrSheet && (() => {
        const title = qrSheet === "colors" ? "Couleurs du QR" : qrSheet === "modules" ? "Modules" : qrSheet === "corners" ? "Coins & yeux" : qrSheet === "frame" ? "Cadre & habillage" : "Correction d'erreur"
        const bigSwatch = (c: string, active: boolean, on: () => void) => (
          <button key={c} type="button" disabled={qrBusy} onClick={on} title={c}
            style={{ width: 34, height: 34, borderRadius: "50%", cursor: "pointer", background: c, border: active ? `3px solid ${G}` : "1px solid rgba(255,255,255,0.25)", padding: 0, opacity: qrBusy ? 0.5 : 1, flexShrink: 0 }} />
        )
        const bigChip = (label: React.ReactNode, active: boolean, on: () => void, key: string) => (
          <button key={key} type="button" disabled={qrBusy} onClick={on}
            style={{ flex: "1 0 28%", minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 12, cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "8px 6px",
              background: active ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${active ? G : "rgba(255,255,255,0.14)"}`, color: active ? G : "#ECE8E0", opacity: qrBusy ? 0.5 : 1 }}>{label}</button>
        )
        return (
          <div className="ps-msheet" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 59, background: "#17171B", borderTop: "1px solid rgba(255,255,255,0.09)", borderRadius: "18px 18px 0 0", boxShadow: "0 -14px 44px rgba(0,0,0,0.55)", padding: "10px 14px calc(14px + env(safe-area-inset-bottom))", maxHeight: "64vh", overflowY: "auto", animation: "psSheetUp .26s cubic-bezier(.2,.8,.2,1)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.2)", margin: "0 auto 10px" }} />
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <span style={{ color: "#F4F1EA", fontSize: 14, fontWeight: 800 }}>{title}</span>
              <button type="button" onClick={() => setQrSheet("")} aria-label="Fermer" style={{ marginLeft: "auto", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 9, color: "#F4F1EA", cursor: "pointer" }}><X size={15} /></button>
            </div>
            {/* Jauge de scannabilite (toujours visible) */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 11px", marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: scanLevelColor(qrScan.level) }}>{qrScan.label}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#9B9385" }}>{qrScan.contrast != null ? `${qrScan.contrast}:1` : "n/d"} · {qrScan.score}/100</span>
                </div>
                <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                  <div style={{ width: `${qrScan.score}%`, height: "100%", background: scanLevelColor(qrScan.level), transition: "width .2s" }} />
                </div>
              </div>
            </div>

            {qrSheet === "colors" && (<>
              <p className="ps-sec-label">Modules</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {QR_FG.map(c => bigSwatch(c, (qrFg || "#0A0A0A").toUpperCase() === c.toUpperCase(), () => applyQrRender({ fg: c })))}
                <label style={{ width: 34, height: 34, borderRadius: "50%", border: "1px dashed rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#ECE8E0", fontSize: 16, flexShrink: 0, position: "relative" }}>+
                  <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(qrFg) ? qrFg : "#0A0A0A"} disabled={qrBusy} onChange={e => applyQrRender({ fg: e.target.value })} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                </label>
              </div>
              <p className="ps-sec-label">Fond</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {QR_BG.map(c => bigSwatch(c, (qrBg || "#FFFFFF").toUpperCase() === c.toUpperCase(), () => applyQrRender({ bg: c })))}
                <label style={{ width: 34, height: 34, borderRadius: "50%", border: "1px dashed rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#ECE8E0", fontSize: 16, flexShrink: 0, position: "relative" }}>+
                  <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(qrBg) ? qrBg : "#FFFFFF"} disabled={qrBusy} onChange={e => applyQrRender({ bg: e.target.value })} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                </label>
              </div>
            </>)}

            {qrSheet === "modules" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {QR_DOTS.map(d => bigChip(<><span style={{ fontSize: 16 }}>{d.icon}</span>{d.label}</>, qrDot === d.k, () => applyQrRender({ dotStyle: d.k }), d.k))}
              </div>
            )}

            {qrSheet === "corners" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {([["square", "Carré"], ["rounded", "Arrondi"], ["circle", "Rond"], ["diamond", "Losange"]] as const).map(([k, l]) => bigChip(l, qrCorner === k, () => applyQrRender({ cornerStyle: k }), k))}
              </div>
            )}

            {qrSheet === "ecc" && (<>
              <div style={{ display: "flex", gap: 8 }}>
                {(["L", "M", "Q", "H"] as const).map(e => bigChip(e, qrEcc === e, () => applyQrRender({ ecc: e }), e))}
              </div>
              <p style={{ color: "#9B9385", fontSize: 11, margin: "10px 2px 0", lineHeight: 1.5 }}>Plus haut = plus robuste (recommandé H si un logo couvre le centre), mais QR un peu plus dense.</p>
            </>)}

            {qrSheet === "frame" && (<>
              <button type="button" onClick={dressQr} style={{ width: "100%", minHeight: 48, borderRadius: 12, border: "none", background: "linear-gradient(180deg,#D9BC6A,#B8923A)", color: "#141417", fontSize: 13.5, fontWeight: 800, cursor: "pointer", marginBottom: 14 }}>🏷️ Habiller en un tap (cadre + « Scannez-moi »)</button>
              <p className="ps-sec-label">Étiquette</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {["SCANNEZ-MOI", "★ AVIS GOOGLE", "VOIR LE MENU", "INSTAGRAM", "RÉSERVER", "WIFI GRATUIT"].map(l => (
                  <button key={l} type="button" onClick={() => addQrLabel(l)} style={{ flex: "1 0 30%", minHeight: 44, borderRadius: 10, cursor: "pointer", fontSize: 10.5, fontWeight: 700, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#ECE8E0" }}>{l}</button>
                ))}
              </div>
              <p className="ps-sec-label">Cadre</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {([["luxury", "Luxe"], ["corporate", "Corporate"], ["modern", "Moderne"], ["neon", "Néon"]] as const).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setQrFrame(k)} style={{ flex: "1 0 22%", minHeight: 46, borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#ECE8E0" }}>{l}</button>
                ))}
              </div>
              <p className="ps-sec-label">Sticker</p>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {([["round", "● Rond"], ["badge", "✸ Badge"], ["square", "▢ Carré"]] as const).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setQrSticker(k)} style={{ flex: 1, minHeight: 46, borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#ECE8E0" }}>{l}</button>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {([["Retirer étiquette", removeQrLabel], ["Retirer cadre", removeQrFrame], ["Retirer sticker", removeQrSticker]] as const).map(([l, fn]) => (
                  <button key={l} type="button" onClick={fn} style={{ flex: "1 0 30%", minHeight: 40, borderRadius: 10, cursor: "pointer", fontSize: 10, fontWeight: 600, background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "#9B9385" }}>{l}</button>
                ))}
              </div>
            </>)}

            {qrBusy && <p style={{ color: "#9B9385", fontSize: 11, margin: "10px 0 0" }}>Régénération du QR…</p>}
          </div>
        )
      })()}

      {/* Sheets Texte focalises : police / couleur / taille / effets / alignement. */}
      {landscapeMobile && sel?.isText && txtSheet && (() => {
        const title = txtSheet === "font" ? "Police" : txtSheet === "color" ? "Couleur du texte" : txtSheet === "size" ? "Taille" : txtSheet === "effects" ? "Effets" : "Alignement"
        const tChip = (label: React.ReactNode, active: boolean, on: () => void, key: string, style: React.CSSProperties = {}) => (
          <button key={key} type="button" onClick={on}
            style={{ flex: "1 0 22%", minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700,
              background: active ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${active ? G : "rgba(255,255,255,0.14)"}`, color: active ? G : "#ECE8E0", ...style }}>{label}</button>
        )
        return (
          <div className="ps-msheet" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 59, background: "#17171B", borderTop: "1px solid rgba(255,255,255,0.09)", borderRadius: "18px 18px 0 0", boxShadow: "0 -14px 44px rgba(0,0,0,0.55)", padding: "10px 14px calc(14px + env(safe-area-inset-bottom))", maxHeight: "64vh", overflowY: "auto", animation: "psSheetUp .26s cubic-bezier(.2,.8,.2,1)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.2)", margin: "0 auto 10px" }} />
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: "#F4F1EA", fontSize: 14, fontWeight: 800 }}>{title}</span>
              <button type="button" onClick={() => setTxtSheet("")} aria-label="Fermer" style={{ marginLeft: "auto", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 9, color: "#F4F1EA", cursor: "pointer" }}><X size={15} /></button>
            </div>

            {txtSheet === "font" && FONT_GROUPS.map(grp => (
              <div key={grp.label} style={{ marginBottom: 12 }}>
                <p className="ps-sec-label">{grp.label}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {grp.fonts.map(f => (
                    <button key={f} type="button" onClick={() => setFont(f)}
                      style={{ padding: "10px 12px", minHeight: 46, borderRadius: 10, cursor: "pointer", fontSize: 15, fontFamily: `'${f}', sans-serif`,
                        background: sel.fontFamily === f ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${sel.fontFamily === f ? G : "rgba(255,255,255,0.14)"}`, color: sel.fontFamily === f ? G : "#ECE8E0" }}>{f}</button>
                  ))}
                </div>
              </div>
            ))}

            {txtSheet === "color" && (<>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {SWATCHES.map(c => (
                  <button key={c} type="button" onClick={() => setFill(c)} title={c}
                    style={{ width: 34, height: 34, borderRadius: "50%", cursor: "pointer", background: c, border: (sel.fill || "").toUpperCase() === c.toUpperCase() ? `3px solid ${G}` : "1px solid rgba(255,255,255,0.25)", padding: 0, flexShrink: 0 }} />
                ))}
              </div>
              <ColorPicker value={/^#/.test(sel.fill) ? sel.fill : "#C9A84C"} onChange={setFill} onUseColor={c => setRecentColors(r => pushRecent(r, c))} recent={recentColors} brand={SWATCHES} dark />
            </>)}

            {txtSheet === "size" && (
              <BigSlider label="Taille du texte" value={sel.fontSize} min={8} max={200} step={2} resetTo={38} format={v => `${Math.round(v)} px`} dark
                onChange={v => mutate(o => (o as fabric.IText).set("fontSize", v))} />
            )}

            {txtSheet === "effects" && (<>
              <p className="ps-sec-label">Style</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {tChip(<b>B</b>, sel.bold, () => mutate(o => (o as fabric.IText).set("fontWeight", sel.bold ? "normal" : "bold")), "b")}
                {tChip(<i>I</i>, sel.italic, () => mutate(o => (o as fabric.IText).set("fontStyle", sel.italic ? "normal" : "italic")), "i")}
                {tChip(<span style={{ textDecoration: "underline" }}>U</span>, sel.underline, () => mutate(o => (o as fabric.IText).set("underline", !sel.underline)), "u")}
                {tChip(<span style={{ textDecoration: "line-through" }}>S</span>, sel.strike, () => mutate(o => (o as fabric.IText).set("linethrough", !sel.strike)), "s")}
              </div>
              <p className="ps-sec-label">Ombre</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {([["off", "Aucune"], ["soft", "Douce"], ["medium", "Moyenne"], ["strong", "Forte"], ["floating", "Flottante"], ["luxury", "Diffuse"]] as const).map(([k, l]) => tChip(l, false, () => setShadowPreset(k), k, { fontSize: 12 }))}
              </div>
            </>)}

            {txtSheet === "align" && (<>
              <p className="ps-sec-label">Alignement</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {([["left", "⯇"], ["center", "≡"], ["right", "⯈"]] as const).map(([k, l]) => tChip(l, sel.textAlign === k, () => mutate(o => (o as fabric.IText).set("textAlign", k)), k, { fontSize: 18 }))}
              </div>
              <BigSlider label="Espacement des lettres" value={sel.charSpacing} min={0} max={800} step={10} resetTo={0} dark
                onChange={v => mutate(o => (o as fabric.IText).set("charSpacing", v))} />
              <BigSlider label="Interligne" value={sel.lineHeight} min={0.8} max={2} step={0.05} resetTo={1.16} format={v => v.toFixed(2)} dark
                onChange={v => mutate(o => (o as fabric.IText).set("lineHeight", v))} />
            </>)}
          </div>
        )
      })()}

      {/* Barre contextuelle mobile (facon Canva) : un objet selectionne -> ses actions, gros, en bas.
          Le canvas reste visible ; le panneau complet ne s'ouvre que via "Modifier". */}
      {/* Sheets Image focalises : filtres / opacite. */}
      {landscapeMobile && sel?.isImage && imgSheet && (
        <div className="ps-msheet" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 59, background: "#17171B", borderTop: "1px solid rgba(255,255,255,0.09)", borderRadius: "18px 18px 0 0", boxShadow: "0 -14px 44px rgba(0,0,0,0.55)", padding: "10px 14px calc(14px + env(safe-area-inset-bottom))", maxHeight: "64vh", overflowY: "auto", animation: "psSheetUp .26s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.2)", margin: "0 auto 10px" }} />
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: "#F4F1EA", fontSize: 14, fontWeight: 800 }}>{imgSheet === "filters" ? "Filtres" : "Opacité"}</span>
            <button type="button" onClick={() => setImgSheet("")} aria-label="Fermer" style={{ marginLeft: "auto", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 9, color: "#F4F1EA", cursor: "pointer" }}><X size={15} /></button>
          </div>
          {imgSheet === "filters" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {([["none", "Aucun"], ["dark", "Foncé"], ["gray", "N&B"], ["vintage", "Vintage"], ["luxe", "Luxe"], ["blur", "Flou"], ["duo", "Teinte"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => toggleFilter(k)}
                  style={{ flex: "1 0 28%", minHeight: 52, borderRadius: 12, cursor: "pointer", fontSize: 12.5, fontWeight: 700, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#ECE8E0" }}>{l}</button>
              ))}
            </div>
          )}
          {imgSheet === "opacity" && (
            <BigSlider label="Opacité" value={sel.opacity} min={0} max={1} step={0.05} resetTo={1} format={v => `${Math.round(v * 100)} %`} dark
              onChange={v => mutate(o => o.set("opacity", v))} />
          )}
        </div>
      )}

      {/* Sheets Forme focalises : couleur / bordure / ombre. */}
      {landscapeMobile && sel && isShapeSel && shapeSheet && (
        <div className="ps-msheet" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 59, background: "#17171B", borderTop: "1px solid rgba(255,255,255,0.09)", borderRadius: "18px 18px 0 0", boxShadow: "0 -14px 44px rgba(0,0,0,0.55)", padding: "10px 14px calc(14px + env(safe-area-inset-bottom))", maxHeight: "64vh", overflowY: "auto", animation: "psSheetUp .26s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.2)", margin: "0 auto 10px" }} />
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: "#F4F1EA", fontSize: 14, fontWeight: 800 }}>{shapeSheet === "color" ? "Couleur" : shapeSheet === "border" ? "Bordure" : "Ombre"}</span>
            <button type="button" onClick={() => setShapeSheet("")} aria-label="Fermer" style={{ marginLeft: "auto", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 9, color: "#F4F1EA", cursor: "pointer" }}><X size={15} /></button>
          </div>

          {shapeSheet === "color" && (<>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {SWATCHES.map(c => (
                <button key={c} type="button" onClick={() => setFill(c)} title={c}
                  style={{ width: 34, height: 34, borderRadius: "50%", cursor: "pointer", background: c, border: (sel.fill || "").toUpperCase() === c.toUpperCase() ? `3px solid ${G}` : "1px solid rgba(255,255,255,0.25)", padding: 0, flexShrink: 0 }} />
              ))}
            </div>
            <ColorPicker value={/^#/.test(sel.fill) ? sel.fill : "#C9A84C"} onChange={setFill} onUseColor={c => setRecentColors(r => pushRecent(r, c))} recent={recentColors} brand={SWATCHES} dark />
            {sel.radius !== null && (
              <BigSlider label="Coins arrondis" value={sel.radius} min={0} max={120} step={2} resetTo={0} format={v => `${Math.round(v)} px`} dark onChange={setRadius} />
            )}
          </>)}

          {shapeSheet === "border" && (<>
            <button type="button" onClick={() => setBorder(!sel.border)} style={{ width: "100%", minHeight: 48, borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 700, marginBottom: 12, background: sel.border ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${sel.border ? G : "rgba(255,255,255,0.14)"}`, color: sel.border ? G : "#ECE8E0" }}>{sel.border ? "Bordure activée ✓" : "Activer la bordure"}</button>
            {sel.border && (<>
              <p className="ps-sec-label">Couleur du contour</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {SWATCHES.map(c => (
                  <button key={c} type="button" onClick={() => setBorderColor(c)} title={c}
                    style={{ width: 32, height: 32, borderRadius: "50%", cursor: "pointer", background: c, border: (sel.strokeColor || "").toUpperCase() === c.toUpperCase() ? `3px solid ${G}` : "1px solid rgba(255,255,255,0.25)", padding: 0, flexShrink: 0 }} />
                ))}
              </div>
              <BigSlider label="Épaisseur" value={sel.strokeWidth} min={1} max={40} step={1} resetTo={4} format={v => `${Math.round(v)} px`} dark onChange={setBorderWidth} />
            </>)}
          </>)}

          {shapeSheet === "shadow" && (<>
            <p className="ps-sec-label">Style</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {([["off", "Aucune"], ["soft", "Douce"], ["medium", "Moyenne"], ["strong", "Forte"], ["floating", "Flottante"], ["luxury", "Diffuse"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setShadowPreset(k)} style={{ flex: "1 0 28%", minHeight: 48, borderRadius: 12, cursor: "pointer", fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#ECE8E0" }}>{l}</button>
              ))}
            </div>
            {sel.shadow && (<>
              {/* Reglages fins caches derriere "Avance" (#20) : le mode simple reste simple */}
              <button type="button" onClick={() => setShadowAdv(v => !v)}
                style={{ width: "100%", minHeight: 44, marginTop: 4, borderRadius: 12, cursor: "pointer", fontSize: 12.5, fontWeight: 700, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: shadowAdv ? G : "#ECE8E0" }}>
                Réglages avancés {shadowAdv ? "▲" : "▾"}
              </button>
              {shadowAdv && (<>
                <BigSlider label="Flou" value={sel.shadowBlur} min={0} max={60} step={1} resetTo={12} format={v => `${Math.round(v)} px`} dark onChange={setShadowBlur} />
                <BigSlider label="Décalage X" value={sel.shadowX} min={-30} max={30} step={1} resetTo={0} format={v => `${Math.round(v)} px`} dark onChange={v => setShadowOffset("x", v)} />
                <BigSlider label="Décalage Y" value={sel.shadowY} min={-30} max={30} step={1} resetTo={6} format={v => `${Math.round(v)} px`} dark onChange={v => setShadowOffset("y", v)} />
              </>)}
            </>)}
          </>)}
        </div>
      )}

      {/* Sheet Bouton (CTA/badge) focalise : texte / couleur du fond. */}
      {landscapeMobile && sel?.label != null && btnSheet && (
        <div className="ps-msheet" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 59, background: "#17171B", borderTop: "1px solid rgba(255,255,255,0.09)", borderRadius: "18px 18px 0 0", boxShadow: "0 -14px 44px rgba(0,0,0,0.55)", padding: "10px 14px calc(14px + env(safe-area-inset-bottom))", maxHeight: "64vh", overflowY: "auto", animation: "psSheetUp .26s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.2)", margin: "0 auto 10px" }} />
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: "#F4F1EA", fontSize: 14, fontWeight: 800 }}>{btnSheet === "text" ? "Texte du bouton" : "Couleur du fond"}</span>
            <button type="button" onClick={() => setBtnSheet("")} aria-label="Fermer" style={{ marginLeft: "auto", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 9, color: "#F4F1EA", cursor: "pointer" }}><X size={15} /></button>
          </div>

          {btnSheet === "text" && (<>
            <input value={sel.label} onChange={e => setLabel(e.target.value)} placeholder="Texte du bouton"
              style={{ width: "100%", minHeight: 48, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "12px 14px", color: "#ECE8E0", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
            {sel.textFill !== null && (<>
              <p className="ps-sec-label">Couleur du texte</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SWATCHES.map(c => (
                  <button key={c} type="button" onClick={() => setTextColor(c)} title={c}
                    style={{ width: 34, height: 34, borderRadius: "50%", cursor: "pointer", background: c, border: (sel.textFill ?? "").toUpperCase() === c.toUpperCase() ? `3px solid ${G}` : "1px solid rgba(255,255,255,0.25)", padding: 0, flexShrink: 0 }} />
                ))}
              </div>
            </>)}
          </>)}

          {btnSheet === "color" && (<>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {SWATCHES.map(c => (
                <button key={c} type="button" onClick={() => setFill(c)} title={c}
                  style={{ width: 34, height: 34, borderRadius: "50%", cursor: "pointer", background: c, border: (sel.fill || "").toUpperCase() === c.toUpperCase() ? `3px solid ${G}` : "1px solid rgba(255,255,255,0.25)", padding: 0, flexShrink: 0 }} />
              ))}
            </div>
            <ColorPicker value={/^#/.test(sel.fill) ? sel.fill : "#C9A84C"} onChange={setFill} onUseColor={c => setRecentColors(r => pushRecent(r, c))} recent={recentColors} brand={SWATCHES} dark />
          </>)}
        </div>
      )}

      {/* Barre contextuelle mobile (facon Canva) : un objet selectionne -> ses actions, gros, en bas.
          Le canvas reste visible ; le panneau complet ne s'ouvre que via "Modifier". */}
      {/* Toast avec Annuler (feedback destructif) */}
      {toast && (
        <div style={{ position: "fixed", left: 16, right: 16, zIndex: 80,
          bottom: landscapeMobile ? "calc(90px + env(safe-area-inset-bottom))" : 24,
          display: "flex", alignItems: "center", gap: 12, padding: "11px 12px 11px 15px",
          background: "#26262B", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 13,
          boxShadow: "0 12px 34px rgba(0,0,0,0.55)", color: "#F4F1EA", fontSize: 13.5, fontWeight: 600,
          maxWidth: 460, margin: "0 auto", animation: "psBar .26s cubic-bezier(.2,.8,.2,1)" }}>
          <span style={{ flex: 1 }}>{toast}</span>
          <button type="button" onClick={() => { undo(); setToast(null) }}
            style={{ minHeight: 40, padding: "0 16px", borderRadius: 10, border: "none", background: "linear-gradient(180deg,#D9BC6A,#B8923A)", color: "#141417", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Annuler</button>
          <button type="button" onClick={() => setToast(null)} aria-label="Fermer"
            style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 9, color: "#F4F1EA", cursor: "pointer" }}><X size={15} /></button>
        </div>
      )}

      {/* Sheet "Plus" : actions secondaires de l'objet selectionne (barre courte -> le reste ici). */}
      {landscapeMobile && sel && moreSel && (() => {
        const act = (fn: () => void) => () => { fn(); setMoreSel(false) }
        const row = (label: string, icon: React.ReactNode, onClick: () => void, danger = false, i = 0) => (
          <button key={label} type="button" onClick={onClick}
            style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", minHeight: 52, padding: "0 12px", background: "none", border: "none", borderTop: i ? "1px solid rgba(255,255,255,0.06)" : "none", color: danger ? "#FF8B8B" : "#ECE8E0", fontSize: 15, fontWeight: 600, cursor: "pointer", textAlign: "left" as const }}>
            <span style={{ display: "flex", width: 22, justifyContent: "center", color: danger ? "#FF8B8B" : "#C9A84C" }}>{icon}</span>{label}
          </button>
        )
        return (
          <div className="ps-msheet" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 59, background: "#17171B", borderTop: "1px solid rgba(255,255,255,0.09)", borderRadius: "18px 18px 0 0", boxShadow: "0 -14px 44px rgba(0,0,0,0.55)", padding: "10px 14px calc(14px + env(safe-area-inset-bottom))", maxHeight: "64vh", overflowY: "auto", animation: "psSheetUp .26s cubic-bezier(.2,.8,.2,1)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.2)", margin: "0 auto 10px" }} />
            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
              <span style={{ color: "#F4F1EA", fontSize: 14, fontWeight: 800 }}>Plus d'actions</span>
              <button type="button" onClick={() => setMoreSel(false)} aria-label="Fermer" style={{ marginLeft: "auto", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 9, color: "#F4F1EA", cursor: "pointer" }}><X size={15} /></button>
            </div>
            {[
              !sel.multi && row("Empilement (objets superposés)", ctxIcon("stack"), act(openStackPicker), false, 0),
              row("Dupliquer", <Copy size={17} />, act(() => layer("dup")), false, 1),
              row("Pivoter +90°", <RotateCw size={17} />, act(() => rotateBy(90)), false, 1),
              row("Mettre devant", <ChevronUp size={17} />, act(() => layer("front")), false, 1),
              row("Mettre derrière", <ChevronDown size={17} />, act(() => layer("back")), false, 1),
              row(sel.locked ? "Déverrouiller" : "Verrouiller", sel.locked ? <Unlock size={17} /> : <Lock size={17} />, act(() => layer("lock")), false, 1),
              row("Réglages complets", <span style={{ fontSize: 16 }}>⚙</span>, act(() => setRegOpen(true)), false, 1),
            ].filter(Boolean)}
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "8px 0" }} />
            {row("Supprimer", <Trash2 size={17} />, act(() => layer("del")), true, 0)}
          </div>
        )
      })()}

      {landscapeMobile && sel && !regOpen && !qrSheet && !txtSheet && !imgSheet && !shapeSheet && !btnSheet && !moreSel && (() => {
        const kind = selKind(sel)
        const tools = mobileContextTools(kind)
        return (
          <div className="ps-ctxbar" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 41,
            padding: "10px 0 calc(10px + env(safe-area-inset-bottom))", background: "#141417", borderTop: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "0 -12px 34px rgba(0,0,0,0.45)", animation: "psBar .3s cubic-bezier(.2,.8,.2,1)" }}>
            {/* Rangee scrollante (scroll horizontal natif) */}
            <div style={{ display: "flex", alignItems: "stretch", gap: 6, padding: "0 10px", overflowX: "auto", overflowY: "hidden",
              WebkitOverflowScrolling: "touch", touchAction: "pan-x", overscrollBehaviorX: "contain", scrollbarWidth: "none" as any }}>
              <span style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: 9, marginRight: 1, borderRight: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
                <span style={{ color: "#C9A84C", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>{KIND_LABEL[kind]}</span>
                <span style={{ color: "rgba(244,241,234,0.45)", fontSize: 8.5, letterSpacing: 0.4 }}>SÉLECTION</span>
              </span>
              {tools.map(t => {
                const primary = t.id === "settings"
                const danger = t.id === "delete"
                return (
                  <button key={t.id} type="button" onClick={() => onCtx(t.id)}
                    style={{ flexShrink: 0, minWidth: 58, minHeight: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "6px 10px",
                      background: primary ? "linear-gradient(180deg,#D9BC6A,#B8923A)" : "rgba(255,255,255,0.06)",
                      border: primary ? "none" : "1px solid rgba(255,255,255,0.1)", borderRadius: 13,
                      color: primary ? "#141417" : danger ? "#FF8B8B" : "#F4F1EA", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 20 }}>{ctxIcon(t.icon)}</span>
                    {t.label}
                  </button>
                )
              })}
              {/* Espace final : le dernier outil ne colle pas au bord (zone de geste systeme). */}
              <span aria-hidden style={{ flex: "0 0 20px" }} />
            </div>
            {/* Degrade droit : indique qu'il reste des outils a droite (defilement). */}
            {tools.length > 4 && <span aria-hidden style={{ position: "absolute", right: 0, top: 1, bottom: "calc(env(safe-area-inset-bottom))", width: 30, background: "linear-gradient(90deg, rgba(20,20,23,0), #141417 72%)", pointerEvents: "none" }} />}
          </div>
        )
      })()}

      {/* Menu ⋯ (paysage mobile) : actions secondaires en bottom sheet */}
      {moreOpen && (
        <div onClick={() => setMoreOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.42)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-end" }}>
          <div className="ps-msheet" onClick={e => e.stopPropagation()} style={{ width: "100%", maxHeight: "84vh", overflowY: "auto", background: "#17171B", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: "10px 14px calc(16px + env(safe-area-inset-bottom))", animation: "psSheetUp .26s cubic-bezier(.2,.8,.2,1)", boxShadow: "0 -14px 44px rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.07)", borderBottom: "none" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.2)", margin: "0 auto 12px" }} />

            {/* Format (masqué ailleurs en mobile -> seul point d'entrée au doigt) */}
            <p className="ps-sec-label" style={{ marginTop: 0 }}>Format</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {(Object.keys(FORMATS) as FormatId[]).map(f => (
                <button key={f} type="button" onClick={() => applyFormat(f)}
                  style={{ padding: "9px 13px", borderRadius: 9, border: `1px solid ${format === f ? G : "rgba(255,255,255,0.16)"}`, background: format === f ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.05)", color: format === f ? G : "#ECE8E0", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 40 }}>
                  {FORMATS[f].label}
                </button>
              ))}
            </div>

            {/* Qualité d'export (DPI + fond perdu) — sinon inaccessible au doigt */}
            <p className="ps-sec-label">Qualité d'export</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              {[72, 150, 300].map(d => (
                <button key={d} type="button" onClick={() => setExpDpi(d)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: `1px solid ${expDpi === d ? G : "rgba(255,255,255,0.16)"}`, background: expDpi === d ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.05)", color: expDpi === d ? G : "#ECE8E0", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 42 }}>
                  {d} DPI
                </button>
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 2px 14px", color: "#ECE8E0", fontSize: 13.5, cursor: "pointer" }}>
              <input type="checkbox" checked={expMarks} onChange={e => setExpMarks(e.target.checked)} style={{ accentColor: G, width: 18, height: 18, flexShrink: 0 }} />
              Traits de coupe + fond perdu <span style={{ color: "#9A9384" }}>(PDF)</span>
            </label>

            {/* Actions */}
            <p className="ps-sec-label">Actions</p>
            {([
              { icon: <Sparkles size={18} />, label: "Ajouter un composant", on: openComp, disabled: false },
              { icon: <Square size={18} />, label: "Fond de la feuille", on: () => openSide("bg"), disabled: false },
              { icon: <ShieldCheck size={18} />, label: "Contrôle qualité", on: openPreflight, disabled: false },
              { icon: <Download size={18} />, label: "Assistant d'export", on: () => { setMoreOpen(false); setExpWiz(0) }, disabled: false },
              { icon: <Eye size={18} />, label: "Aperçu en situation", on: openMock, disabled: false },
              { icon: <Square size={18} />, label: showSafe ? "Masquer les marges" : "Marges de sécurité", on: () => setShowSafe(v => !v), disabled: false },
              { icon: <Sparkles size={18} />, label: "Régénérer une proposition", on: regenerate, disabled: !lastPool },
              { icon: <Undo2 size={18} />, label: "Annuler", on: undo, disabled: !canUndo },
              { icon: <Redo2 size={18} />, label: "Rétablir", on: redo, disabled: !canRedo },
              { icon: <Save size={18} />, label: saved ? "Enregistré ✓" : "Enregistrer", on: () => save(), disabled: false },
              { icon: <HelpCircle size={18} />, label: "Aide & raccourcis", on: () => setShowHelp(true), disabled: false },
            ] as { icon: React.ReactNode; label: string; on: () => void; disabled: boolean }[]).map((a, i) => (
              <button key={i} type="button" disabled={a.disabled} onClick={() => { a.on(); setMoreOpen(false) }}
                style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "14px 12px", background: "none", border: "none", borderTop: i ? "1px solid rgba(255,255,255,0.07)" : "none", color: a.disabled ? "rgba(255,255,255,0.28)" : "#ECE8E0", fontSize: 15, fontWeight: 600, cursor: a.disabled ? "default" : "pointer", textAlign: "left" as const }}>
                <span style={{ color: a.disabled ? "rgba(255,255,255,0.28)" : G, display: "flex" }}>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- Barre du haut ---- */}
      <div className={landscapeMobile ? "ps-topbar-compact" : ""} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", borderBottom: "1px solid rgba(31,36,48,0.06)",
        background: SURFACE, flexShrink: 0, boxShadow: "0 1px 8px rgba(31,36,48,0.04)", zIndex: 5,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: landscapeMobile ? 8 : 10, minWidth: 0 }}>
          {landscapeMobile ? (
            /* Mobile : bouton "Quitter" clair a gauche ; titre/logo/BETA masques -> barre bien plus courte */
            <button type="button" onClick={onClose} aria-label="Quitter l'éditeur" title="Quitter l'éditeur"
              style={{ display: "flex", alignItems: "center", gap: 5, height: 38, padding: "0 13px 0 10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 10, color: "#F4F1EA", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
              <ArrowLeft size={18} /> Quitter
            </button>
          ) : (<>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#D9BC6A,#B8923A)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 9px rgba(201,168,76,0.45)", flexShrink: 0 }}>
              <QrCode size={17} color="#fff" />
            </span>
            <span style={{ color: INK, fontWeight: 800, fontSize: 15, letterSpacing: 0.2 }}>QR Print <span style={{ color: G }}>Studio</span></span>
            <span style={{ color: "#8A6D14", fontSize: 9.5, background: "rgba(201,168,76,0.16)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 6, padding: "2px 7px", fontWeight: 700, letterSpacing: 0.5 }}>BÊTA</span>
          </>)}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Zoom */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, background: landscapeMobile ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", borderRadius: 9, padding: 3 }}>
            <button type="button" onClick={() => applyZoom(zoom / 1.25)} title="Zoom arrière" aria-label="Zoom arrière"
              style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: 6, color: INK, fontSize: 16, cursor: "pointer" }}>−</button>
            <button type="button" onClick={() => applyZoom(1)} title="Zoom 100 %" aria-label="Zoom 100 pour cent"
              style={{ minWidth: 42, height: 26, background: "none", border: "none", color: Math.round(zoom * 100) === 100 ? G : MUTED, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{Math.round(zoom * 100)}%</button>
            <button type="button" onClick={() => applyZoom(zoom * 1.25)} title="Zoom avant" aria-label="Zoom avant"
              style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: 6, color: INK, fontSize: 15, cursor: "pointer" }}>+</button>
            <button type="button" onClick={() => fitToScreen()} title="Ajuster à l'écran" aria-label="Ajuster à l'écran"
              style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: 6, color: INK, cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
            </button>
          </div>

          {/* Actions secondaires : visibles desktop (display:contents), masquées en paysage mobile (-> menu ⋯) */}
          <div style={{ display: landscapeMobile ? "none" : "contents" }}>
          {lastPool && (
            <button type="button" onClick={regenerate} title="Régénérer — une autre proposition"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "linear-gradient(90deg,rgba(201,168,76,0.16),rgba(201,168,76,0.06))", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 9, color: "#8A6D14", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <Sparkles size={14} /> Régénérer
            </button>
          )}
          <button type="button" onClick={() => setShowHelp(true)} title="Aide & raccourcis" aria-label="Aide et raccourcis" style={ghostBtn}>
            <HelpCircle size={14} /> Aide
          </button>

          <button type="button" onClick={() => setShowSafe(v => !v)} title="Afficher la marge de sécurité d'impression"
            aria-pressed={showSafe} style={{ ...ghostBtn, ...(showSafe ? { background: "rgba(201,168,76,0.16)", border: `1px solid ${G}`, color: G } : {}) }}>
            <Square size={14} /> Marges
          </button>

          <button type="button" onClick={openMock} title="Aperçu en situation" style={ghostBtn}>
            <Eye size={14} /> Aperçu
          </button>

          {topDivider}

          <button type="button" onClick={undo} disabled={!canUndo} aria-label="Annuler" title="Annuler (Ctrl/⌘+Z)" style={histBtn(canUndo)}>
            <Undo2 size={15} />
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} aria-label="Rétablir" title="Rétablir (Ctrl/⌘+Maj+Z)" style={histBtn(canRedo)}>
            <Redo2 size={15} />
          </button>

          <button type="button" onClick={() => save()} disabled={saving} style={topBtn(false)}>
            {saving ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} />
              : saved ? <Check size={13} color="#39FF8F" /> : <Save size={13} />}
            {saved ? "Enregistré" : "Enregistrer"}
          </button>
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => setExpOpen(v => !v)} disabled={exporting} style={topBtn(true)}>
              {exporting ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Download size={13} />} Exporter
            </button>
            {expOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 232, background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.16)", zIndex: 60 }}>
                <p style={{ color: MUTED, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 6px" }}>Qualité</p>
                <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                  {[72, 150, 300].map(d => (
                    <button key={d} type="button" onClick={() => setExpDpi(d)}
                      style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: `1px solid ${expDpi === d ? G : "rgba(0,0,0,0.1)"}`, background: expDpi === d ? "rgba(201,168,76,0.15)" : "transparent", color: expDpi === d ? G : INK, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>{d}<span style={{ fontSize: 7, opacity: 0.7 }}> DPI</span></button>
                  ))}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer", color: INK, fontSize: 10.5, lineHeight: 1.3 }}>
                  <input type="checkbox" checked={expMarks} onChange={e => setExpMarks(e.target.checked)} style={{ accentColor: G, flexShrink: 0 }} />
                  Traits de coupe + fond perdu <span style={{ color: MUTED }}>(PDF)</span>
                </label>
                <button type="button" onClick={openPreflight} title="Vérifier la qualité avant d'imprimer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", marginBottom: 8, padding: "9px 11px", background: "rgba(201,168,76,0.12)", border: `1px solid ${G}`, borderRadius: 9, color: G, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  <ShieldCheck size={14} /> Contrôle qualité
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button type="button" onClick={() => exportImage("png")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 9, color: INK, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><Download size={13} /> PNG</button>
                  <button type="button" onClick={() => exportImage("jpeg")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 9, color: INK, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><Download size={13} /> JPG</button>
                  <button type="button" onClick={exportPdfPro} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", background: "linear-gradient(90deg,#C9A84C,#b8953f)", border: "none", borderRadius: 9, color: "#080808", fontSize: 12, fontWeight: 800, cursor: "pointer" }}><Printer size={13} /> PDF{!isPro ? " 🔒" : ""}</button>
                </div>
              </div>
            )}
          </div>
          </div>
          {landscapeMobile && (
            <button type="button" onClick={() => setMoreOpen(true)} aria-label="Plus d'actions" title="Plus d'actions" style={ghostBtn}>
              <MoreHorizontal size={18} />
            </button>
          )}
          {/* X de fermeture (desktop) : sur mobile le bouton "Quitter" a gauche s'en charge */}
          {!landscapeMobile && (
            <button type="button" onClick={onClose} aria-label="Fermer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 9, color: MUTED, cursor: "pointer" }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ---- Corps : rail outils | canvas | proprietes ---- */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", ["--ps-rail-w" as any]: `${effRailW}px` }}>

        {/* Assistant debutant (colonne guidee) */}
        {wizard > 0 && (() => {
          const metier = METIERS.find(m => m.id === wizMetier)
          return (
            <div className="qr-scroll ps-fly" style={{ width: leftW, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.07)", background: SURFACE, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <ResizeHandle which="left" />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
                <span style={{ color: G, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><Sparkles size={14} /> Création guidée</span>
                <button type="button" onClick={() => setWizard(0)} aria-label="Fermer l'assistant"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 7, color: MUTED, cursor: "pointer" }}>
                  <X size={13} />
                </button>
              </div>

              {/* Fil d'etapes */}
              <div style={{ display: "flex", gap: 6, padding: "10px 14px", flexShrink: 0 }}>
                {[1, 2, 3].map(s => (
                  <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: wizard >= s ? G : "rgba(0,0,0,0.1)" }} />
                ))}
              </div>

              <div className="qr-scroll" style={{ flex: 1, overflowY: "auto", padding: "6px 14px 18px" }}>
                {/* Etape 1 : metier */}
                {wizard === 1 && (
                  <>
                    <p style={{ color: INK, fontSize: 14, fontWeight: 700, margin: "4px 0 3px" }}>Quel est ton métier ?</p>
                    <p style={{ color: MUTED, fontSize: 11, margin: "0 0 12px", lineHeight: 1.4 }}>On adapte les designs à ton activité.</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                      {METIERS.map(m => (
                        <button key={m.id} type="button" onClick={() => { setWizMetier(m.id); setWizard(2) }}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "12px 6px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, cursor: "pointer" }}>
                          <span style={{ fontSize: 22 }}>{m.emoji}</span>
                          <span style={{ color: INK, fontSize: 11, fontWeight: 600, textAlign: "center" }}>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Etape 2 : objectif -> generation auto */}
                {wizard === 2 && metier && (
                  <>
                    <button type="button" onClick={() => setWizard(1)} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer", padding: 0, marginBottom: 8 }}>← Métier</button>
                    <p style={{ color: INK, fontSize: 14, fontWeight: 700, margin: "0 0 3px" }}>{metier.emoji} Ton objectif ?</p>
                    <p style={{ color: MUTED, fontSize: 11, margin: "0 0 12px", lineHeight: 1.4 }}>Clique : on génère tout (design, couleurs, textes, QR).</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {metier.objs.map((o, i) => (
                        <button key={i} type="button" onClick={() => generate(metier, o)}
                          style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 12px", background: "linear-gradient(90deg,rgba(201,168,76,0.14),rgba(201,168,76,0.05))", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 10, cursor: "pointer", textAlign: "left" }}>
                          <Sparkles size={14} color={G} style={{ flexShrink: 0 }} />
                          <span style={{ color: INK, fontSize: 12.5, fontWeight: 600 }}>{o.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Etape 3 : pret */}
                {wizard === 3 && (
                  <>
                    <button type="button" onClick={() => setWizard(2)} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer", padding: 0, marginBottom: 8 }}>← Objectif</button>
                    <p style={{ color: INK, fontSize: 14, fontWeight: 700, margin: "0 0 3px" }}>C&apos;est prêt ! 🎉</p>
                    <p style={{ color: MUTED, fontSize: 11, margin: "0 0 12px", lineHeight: 1.4 }}>Régénère un autre objectif, exporte, ou personnalise tout en mode avancé.</p>
                    {metier && (
                      <>
                        <p style={{ color: MUTED, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 6px" }}>Autre objectif</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                          {metier.objs.map((o, i) => (
                            <button key={i} type="button" onClick={() => generate(metier, o)}
                              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 9, cursor: "pointer", textAlign: "left" }}>
                              <Sparkles size={12} color={G} style={{ flexShrink: 0 }} />
                              <span style={{ color: INK, fontSize: 11, fontWeight: 600 }}>{o.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <button type="button" onClick={() => save()} disabled={saving}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", marginBottom: 8, background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10, color: INK, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      <Save size={14} /> {saved ? "Enregistré ✓" : "Enregistrer"}
                    </button>
                    <button type="button" onClick={exportPng} disabled={exporting}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", marginBottom: 8, background: "linear-gradient(90deg,#C9A84C,#b8953f)", border: "none", borderRadius: 10, color: "#080808", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                      <Download size={14} /> Télécharger en PNG
                    </button>
                    <button type="button" onClick={() => setWizard(0)}
                      style={{ width: "100%", padding: "10px", background: "none", border: "1px dashed rgba(0,0,0,0.15)", borderRadius: 10, color: MUTED, fontSize: 11.5, cursor: "pointer" }}>
                      Tout personnaliser (mode avancé) →
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })()}

        {/* Rail outils */}
        {wizard === 0 && (
        <div className={"qr-scroll ps-rail" + (landscapeMobile ? " ps-compact" : "")} style={{ width: effRailW, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.07)", padding: "12px 10px", display: landscapeMobile ? "none" : "flex", flexDirection: "column", gap: 6, background: "#FBFBFD", overflowY: "auto", position: "relative" }}>
          {!landscapeMobile && <ResizeHandle which="rail" />}
          <p style={{ color: MUTED, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 2px" }}>Créer</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <button type="button" onClick={() => { setTplOpen(v => !v); setLibOpen(false); setSide(""); setCompOpen(false); setPhotoOpen(false); setWizard(0) }}
            style={{ ...btnTool, background: tplOpen ? "rgba(201,168,76,0.16)" : "linear-gradient(180deg,rgba(201,168,76,0.14),rgba(201,168,76,0.05))", border: `1px solid ${tplOpen ? G : "rgba(201,168,76,0.3)"}`, color: tplOpen ? G : INK, fontWeight: 700 }}>
            <LayoutTemplate size={16} /> Modèles
          </button>
          <button type="button" onClick={openComp}
            style={{ ...btnTool, background: compOpen ? "rgba(201,168,76,0.16)" : "linear-gradient(180deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04))", border: `1px solid ${compOpen ? G : "rgba(201,168,76,0.3)"}`, color: compOpen ? G : INK, fontWeight: 700 }}>
            <Sparkles size={16} /> Ajouter
          </button>
          </div>
          <p style={{ color: MUTED, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "6px 0 2px" }}>Éléments</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {([
            ["text", "Texte", <TypeIcon size={16} key="i" />],
            ["shapes", "Formes", <Shapes size={16} key="i" />],
          ] as const).map(([cat, label, icon]) => {
            const on = libOpen && libCat === cat
            return (
              <button key={cat} type="button" onClick={() => openLib(cat)}
                style={{ ...btnTool, background: on ? "rgba(201,168,76,0.16)" : btnTool.background, border: `1px solid ${on ? G : "rgba(0,0,0,0.07)"}`, color: on ? G : INK }}>
                {icon} {label}
              </button>
            )
          })}
          <button type="button" onClick={addQr} style={btnTool}><QrCode size={16} /> QR</button>
          <button type="button" onClick={() => fileRef.current?.click()} style={btnTool} title="Importer une image ou un logo"><ImageIcon size={16} /> Image</button>
          <button type="button" onClick={openPhoto} title="Rechercher une photo"
            style={{ ...btnTool, background: photoOpen ? "rgba(201,168,76,0.16)" : btnTool.background, border: `1px solid ${photoOpen ? G : "rgba(0,0,0,0.07)"}`, color: photoOpen ? G : INK }}><Search size={16} /> Photos</button>
          {([
            ["icons", "Icône", <Star size={16} key="i" />],
            ["cta", "CTA", <MousePointerClick size={16} key="i" />],
            ["badges", "Badge", <Award size={16} key="i" />],
          ] as const).map(([cat, label, icon]) => {
            const on = libOpen && libCat === cat
            return (
              <button key={cat} type="button" onClick={() => openLib(cat)}
                style={{ ...btnTool, background: on ? "rgba(201,168,76,0.16)" : btnTool.background, border: `1px solid ${on ? G : "rgba(0,0,0,0.07)"}`, color: on ? G : INK }}>
                {icon} {label}
              </button>
            )
          })}
          </div>
          <div style={{ flex: 1 }} />
          <p style={{ color: MUTED, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "2px 0" }}>Modifier</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <button type="button" onClick={() => openSide("styles")}
            style={{ ...btnTool, background: side === "styles" ? "rgba(201,168,76,0.16)" : btnTool.background, border: `1px solid ${side === "styles" ? G : "rgba(0,0,0,0.07)"}`, color: side === "styles" ? G : INK }}>
            <Palette size={16} /> Styles
          </button>
          <button type="button" onClick={() => openSide("layers")}
            style={{ ...btnTool, background: side === "layers" ? "rgba(201,168,76,0.16)" : btnTool.background, border: `1px solid ${side === "layers" ? G : "rgba(0,0,0,0.07)"}`, color: side === "layers" ? G : INK }}>
            <Copy size={16} /> Calques
          </button>
          <button type="button" onClick={() => openSide("bg")}
            style={{ ...btnTool, background: side === "bg" ? "rgba(201,168,76,0.16)" : btnTool.background, border: `1px solid ${side === "bg" ? G : "rgba(0,0,0,0.07)"}`, color: side === "bg" ? G : INK }}>
            <Square size={16} /> Fond
          </button>
          </div>
        </div>
        )}

        {/* Modeles orientes objectif (flyout) */}
        {tplOpen && (
          <div className="qr-scroll ps-fly" style={{ width: leftW, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.07)", background: pSurf, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <ResizeHandle which="left" />
            <div className="ps-fly-head" style={{ padding: "11px 12px 10px", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                <span style={{ color: pInk, fontWeight: 800, fontSize: 12.5 }}>Modèles</span>
                <button type="button" onClick={() => setTplOpen(false)} aria-label="Fermer les modèles"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 7, color: pMuted, cursor: "pointer" }}>
                  <X size={13} />
                </button>
              </div>
              <input value={tplSearch} onChange={e => setTplSearch(e.target.value)} placeholder="Rechercher un modèle…"
                style={{ width: "100%", background: pField, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: "8px 10px", color: pInk, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ padding: "10px 12px 0", flexShrink: 0 }}>

              {/* Filtre par collection (style) */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "11px 0 6px" }}>
                <p style={{ color: pMuted, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: 0 }}>Collection · style</p>
                {tplColl && <button type="button" onClick={() => setTplColl("")} style={{ background: "none", border: "none", color: G, fontSize: 9.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>Tout voir ✕</button>}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {COLLECTIONS.map(col => {
                  const on = tplColl === col.id
                  return (
                    <button key={col.id} type="button" onClick={() => setTplColl(on ? "" : col.id)} title={`Collection ${col.label}`}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 10.5, fontWeight: on ? 700 : 500, background: on ? `${G}` : "rgba(0,0,0,0.03)", border: `1px solid ${on ? G : "rgba(0,0,0,0.08)"}`, color: on ? "#fff" : pInk }}>
                      <span>{col.emoji}</span>{col.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="qr-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 10px 16px" }}>
              {/* Favoris / Recents (#13) : acces rapide, hors recherche/collection */}
              {!tplColl && !tplSearch.trim() && (() => {
                const byId = (id: string) => PRINT_TEMPLATES.find(t => t.id === id)
                const favItems = favsTpl.map(byId).filter(Boolean) as typeof PRINT_TEMPLATES
                const recItems = recentTpl.map(byId).filter(Boolean).filter(t => t && !favsTpl.includes(t.id)) as typeof PRINT_TEMPLATES
                const secTitle = (txt: string) => <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 6px" }}>{txt}</p>
                return (<>
                  {favItems.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      {secTitle("★ Favoris")}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{favItems.map(tplCard)}</div>
                    </div>
                  )}
                  {recItems.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      {secTitle("Récents")}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{recItems.map(tplCard)}</div>
                    </div>
                  )}
                </>)
              })()}
              {/* Vue par COLLECTION (si une collection est sélectionnée) */}
              {tplColl ? (() => {
                const col = COLLECTIONS.find(c => c.id === tplColl)
                const items = (col?.ids ?? []).map(id => PRINT_TEMPLATES.find(t => t.id === id)).filter(Boolean) as typeof PRINT_TEMPLATES
                return (
                  <div>
                    <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>{col?.emoji} Collection {col?.label}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {items.map(tplCard)}
                    </div>
                  </div>
                )
              })() : (() => {
                const sectorObjs = SECTORS.find(s => s.id === tplSector)?.objs ?? null
                const visibleObjs = ["Avis", "Menu", "Réserver", "Abonnés", "Contact", "Wifi", "Fidélité", "Page"].filter(o => !sectorObjs || sectorObjs.includes(o))
                return visibleObjs.map(obj => {
                const q = tplSearch.trim().toLowerCase()
                const rank = (id: string) => id.endsWith("-studio") ? 0 : id.endsWith("-photo") ? 1 : id.endsWith("-card") ? 2 : id.endsWith("-split") ? 3 : id.endsWith("-premium") ? 4 : id.endsWith("-ornate") ? 5 : 6
                const items = PRINT_TEMPLATES.filter(t => t.obj === obj && (!q || t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || obj.toLowerCase().includes(q))).slice().sort((a, b) => rank(a.id) - rank(b.id))
                if (!items.length) return null
                return (
                  <div key={obj} style={{ marginBottom: 12 }}>
                    <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 6px" }}>{obj}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {items.map(tplCard)}
                    </div>
                  </div>
                )
              })
              })()}
              <button type="button" onClick={resetCanvas}
                style={{ width: "100%", marginTop: 8, padding: "9px 10px", background: "rgba(0,0,0,0.04)", border: "1px dashed rgba(0,0,0,0.18)", borderRadius: 9, color: pInk, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                ＋ Page vierge (repartir de zéro)
              </button>
              <p style={{ color: pMuted, fontSize: 9, margin: "8px 2px 0", lineHeight: 1.4 }}>
                Un modèle remplace le contenu actuel. Tout reste ensuite modifiable (textes, couleurs, position…).
              </p>
            </div>
          </div>
        )}

        {/* Ajouter : composants metier 1-clic, ranges par objectif (flyout) */}
        {compOpen && (
          <div className="qr-scroll ps-fly" style={{ width: leftW, flexShrink: 0, background: pSurf, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <ResizeHandle which="left" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 14px", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
              <span style={{ color: pInk, fontWeight: 800, fontSize: 14 }}>➕ Ajouter</span>
              <button type="button" onClick={() => setCompOpen(false)} aria-label="Fermer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 7, color: pMuted, cursor: "pointer" }}><X size={14} /></button>
            </div>
            <div className="qr-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 12px 18px" }}>
              {COMP_CATS.map(cat => (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <p style={{ color: pMuted, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>{cat}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {COMPONENTS.filter(c => c.cat === cat).map(c => (
                      <button key={c.key} className="ps-goal" type="button" onClick={() => addComponent(c.key)}
                        style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px", background: pCard, border: `1px solid ${pLine}`, borderRadius: 13, cursor: "pointer", textAlign: "left" }}>
                        <span style={{ fontSize: 26, flexShrink: 0, lineHeight: 1 }}>{c.emoji}</span>
                        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ color: pInk, fontSize: 14, fontWeight: 700 }}>{c.label}</span>
                          <span style={{ color: pMuted, fontSize: 11, lineHeight: 1.3 }}>{c.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recherche de photos (Unsplash) (flyout) */}
        {photoOpen && (
          <div className="qr-scroll ps-fly" style={{ width: leftW, flexShrink: 0, background: pSurf, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <ResizeHandle which="left" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
              <span style={{ color: pInk, fontWeight: 800, fontSize: 12.5 }}>Photos</span>
              <button type="button" onClick={() => setPhotoOpen(false)} aria-label="Fermer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 7, color: pMuted, cursor: "pointer" }}><X size={13} /></button>
            </div>
            <div style={{ padding: "10px 12px 6px", flexShrink: 0 }}>
              <form onSubmit={e => { e.preventDefault(); searchPhotos(photoQuery) }} style={{ display: "flex", gap: 6 }}>
                <input value={photoQuery} onChange={e => setPhotoQuery(e.target.value)} placeholder="Restaurant, café, fleurs…"
                  style={{ flex: 1, background: pField, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, padding: "8px 10px", color: pInk, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                <button type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, background: G, border: "none", borderRadius: 8, color: "#080808", cursor: "pointer", flexShrink: 0 }}><Search size={14} /></button>
              </form>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                {["café", "restaurant", "boutique", "fleurs", "texture", "marbre", "food", "nature"].map(s => (
                  <button key={s} type="button" onClick={() => { setPhotoQuery(s); searchPhotos(s) }}
                    style={{ padding: "4px 9px", borderRadius: 999, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.1)", color: pMuted, fontSize: 10, cursor: "pointer" }}>{s}</button>
                ))}
              </div>
            </div>
            <div className="qr-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 10px 16px" }}>
              {photoLoading && <div style={{ display: "flex", alignItems: "center", gap: 8, color: pMuted, fontSize: 12, padding: "12px 2px" }}><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Recherche…</div>}
              {!photoLoading && photoErr && <p style={{ color: pMuted, fontSize: 11, lineHeight: 1.5, padding: "8px 2px" }}>{photoErr}</p>}
              {!photoLoading && !photoErr && !photoResults.length && <p style={{ color: pMuted, fontSize: 11, lineHeight: 1.5, padding: "8px 2px" }}>Cherchez une ambiance (métier, matière, lieu…) et cliquez une photo pour l'ajouter.</p>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {photoResults.map(p => (
                  <div key={p.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(0,0,0,0.1)", background: pField }}>
                    <img src={p.thumb} alt="" role="button" tabIndex={0} aria-label={`Ajouter l'image de ${p.author}`} onKeyDown={onEnterSpace(() => addPhoto(p.regular))} onClick={() => addPhoto(p.regular)} title={`Ajouter l'image — ${p.author}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "pointer" }} />
                    <button type="button" onClick={() => setPhotoBg(p.regular)} title="Définir comme fond plein cadre"
                      style={{ position: "absolute", bottom: 5, right: 5, padding: "3px 8px", background: "rgba(0,0,0,0.62)", color: "#fff", border: "none", borderRadius: 999, fontSize: 9, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(2px)" }}>Fond</button>
                  </div>
                ))}
              </div>
              {photoResults.length > 0 && <p style={{ color: pMuted, fontSize: 8.5, margin: "10px 2px 0", lineHeight: 1.4 }}>Photos via Unsplash.</p>}
            </div>
          </div>
        )}

        {/* Bibliotheque d'elements (flyout) */}
        {libOpen && (
          <div className="qr-scroll ps-fly" style={{ width: leftW, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.07)", background: pSurf, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <ResizeHandle which="left" />
            <div className="ps-fly-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
              <span style={{ color: pInk, fontWeight: 800, fontSize: 12.5 }}>Bibliothèque</span>
              <button type="button" onClick={() => setLibOpen(false)} aria-label="Fermer la bibliothèque"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 7, color: pMuted, cursor: "pointer" }}>
                <X size={13} />
              </button>
            </div>

            <div className="qr-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 10px 16px" }}>
              {/* Texte */}
              <div id="lib-text" style={{ marginBottom: 16 }}>
                <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>Texte</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {([
                    { text: "Titre", size: 54, weight: "bold", font: "Fraunces", label: "Titre", pv: 22 },
                    { text: "Sous-titre", size: 30, weight: "normal", font: "Montserrat", label: "Sous-titre", pv: 15 },
                    { text: "Votre texte ici", size: 20, weight: "normal", font: "Arial", label: "Corps de texte", pv: 12 },
                    { text: "TITRE", size: 62, weight: "bold", font: "Bebas Neue", label: "Titre impact", pv: 20 },
                    { text: "Merci", size: 46, weight: "normal", font: "Pacifico", label: "Manuscrit", pv: 20 },
                    { text: "Élégance", size: 50, weight: "bold", font: "Playfair Display", label: "Titre chic", pv: 21 },
                    { text: "Nouveauté", size: 34, weight: "bold", font: "Oswald", label: "Accroche condensée", pv: 17 },
                    { text: "« Citation »", size: 28, weight: "normal", font: "Fraunces", label: "Citation", pv: 16 },
                    { text: "Bienvenue", size: 40, weight: "normal", font: "Dancing Script", label: "Script élégant", pv: 20 },
                  ] as const).map((p, i) => (
                    <button key={i} type="button" onClick={() => addTextPreset(p)}
                      style={{ width: "100%", textAlign: "left", padding: "11px 12px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 9, cursor: "pointer", color: pInk, fontFamily: p.font, fontSize: p.pv, fontWeight: p.weight as any }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Lignes & separateurs */}
              <div id="lib-lines" style={{ marginBottom: 16 }}>
                <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>Lignes</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {([
                    ["solid", "Pleine", { sw: 2 }], ["thick", "Épaisse", { sw: 5 }], ["thin", "Fine", { sw: 1 }],
                    ["dashed", "Pointillés", { sw: 2, dash: "7,5" }], ["dotted", "Points", { sw: 3, dash: "0.5,6", round: true }],
                    ["double", "Double", { double: true }], ["ornament", "Ornement", { orn: true }],
                  ] as const).map(([k, label, o]) => (
                    <button key={k} type="button" onClick={() => addLineVariant(k)} title={label}
                      style={{ display: "flex", flexDirection: "column", gap: 5, padding: "9px 10px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 9, cursor: "pointer" }}>
                      <svg width="100%" height="14" viewBox="0 0 100 14" preserveAspectRatio="none">
                        {"double" in o && (o as any).double ? (
                          <>
                            <line x1="2" y1="5" x2="98" y2="5" stroke={G} strokeWidth="2" />
                            <line x1="2" y1="9" x2="98" y2="9" stroke={G} strokeWidth="2" />
                          </>
                        ) : "orn" in o && (o as any).orn ? (
                          <>
                            <line x1="2" y1="7" x2="98" y2="7" stroke={G} strokeWidth="2" />
                            <rect x="46" y="3" width="8" height="8" fill={G} transform="rotate(45 50 7)" />
                          </>
                        ) : (
                          <line x1="2" y1="7" x2="98" y2="7" stroke={G} strokeWidth={(o as any).sw} strokeDasharray={(o as any).dash} strokeLinecap={(o as any).round ? "round" : "butt"} />
                        )}
                      </svg>
                      <span style={{ color: pMuted, fontSize: 9 }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Cadres */}
              <div id="lib-frames" style={{ marginBottom: 16 }}>
                <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>Cadres</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {([
                    ["filet", "Filet", 1, 0], ["thick", "Épais", 3, 0], ["double", "Double", 1, 0], ["rounded", "Arrondi", 2, 6],
                  ] as const).map(([k, label, sw, rx]) => (
                    <button key={k} type="button" onClick={() => addFrame(k)} title={label}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 2px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 9, cursor: "pointer" }}>
                      <svg width="36" height="46" viewBox="0 0 36 46">
                        <rect x="3" y="3" width="30" height="40" rx={rx} fill="none" stroke={G} strokeWidth={sw} />
                        {k === "double" && <rect x="6" y="6" width="24" height="34" fill="none" stroke={G} strokeWidth="0.7" />}
                      </svg>
                      <span style={{ color: pMuted, fontSize: 9 }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* CTA */}
              <div id="lib-cta" style={{ marginBottom: 16 }}>
                <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>Boutons CTA</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {["Scannez-moi", "Réservez", "Voir le menu", "Suivez-nous", "Commandez", "En savoir plus", "Laisser un avis", "Télécharger", "S'inscrire", "Nous trouver", "Profiter de l'offre", "Prendre RDV", "Rejoignez-nous", "Contactez-nous", "Voir plus", "Profitez-en"].map(l => (
                    <button key={l} type="button" onClick={() => addCTA(l)}
                      style={{ width: "100%", padding: "11px 0", borderRadius: 22, border: "none", cursor: "pointer", background: "linear-gradient(90deg,#C9A84C,#b8953f)", color: "#080808", fontSize: 11.5, fontWeight: 800 }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {/* Icones */}
              <div id="lib-icons" style={{ marginBottom: 16 }}>
                <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>Icônes</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {LIB_ICONS.map(ic => (
                    <button key={ic.key} type="button" onClick={() => addIcon(ic.d)} title={ic.label}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "9px 2px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 9, cursor: "pointer" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24"><path d={ic.d} fill={pInk} /></svg>
                      <span style={{ color: pMuted, fontSize: 8 }}>{ic.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Badges & rubans */}
              <div id="lib-badges" style={{ marginBottom: 16 }}>
                <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>Badges & rubans</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {([
                    ["NOUVEAU", "ribbon"], ["-20%", "ribbon"], ["-30%", "ribbon"], ["-50%", "ribbon"], ["PROMO", "seal"], ["TOP", "seal"], ["VIP", "seal"], ["GRATUIT", "ribbon"], ["OFFERT", "ribbon"], ["LIMITÉ", "ribbon"], ["EXCLU", "seal"], ["★★★★★", "ribbon"],
                  ] as const).map(([l, k]) => (
                    <button key={l} type="button" onClick={() => addBadge(l, k)}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 9, cursor: "pointer" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 54, padding: "4px 8px", background: G, color: "#080808", fontSize: 10, fontWeight: 800, borderRadius: k === "seal" ? "50%" : 4, width: k === "seal" ? 32 : "auto", height: k === "seal" ? 32 : "auto" }}>{l}</span>
                      <span style={{ color: pInk, fontSize: 10.5 }}>{k === "seal" ? "Sceau rond" : "Ruban"}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Formes */}
              <div id="lib-shapes" style={{ marginBottom: 16 }}>
                <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>Formes</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {([
                    ["rect", "Rectangle",  <svg width="30" height="22" key="s"><rect x="2" y="3" width="26" height="16" fill={G} /></svg>],
                    ["square", "Carré",    <svg width="24" height="24" key="s"><rect x="3" y="3" width="18" height="18" fill={G} /></svg>],
                    ["rrect", "Arrondi",   <svg width="30" height="22" key="s"><rect x="2" y="3" width="26" height="16" rx="6" fill={G} /></svg>],
                    ["circle", "Cercle",   <svg width="24" height="24" key="s"><circle cx="12" cy="12" r="10" fill={G} /></svg>],
                    ["tri", "Triangle",    <svg width="26" height="24" key="s"><polygon points="13,2 24,22 2,22" fill={G} /></svg>],
                    ["star", "Étoile",     <svg width="24" height="24" viewBox="0 0 24 24" key="s"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={G} /></svg>],
                    ["hexa", "Hexagone",   <svg width="24" height="24" viewBox="0 0 24 24" key="s"><path d="M12 2l8.66 5v10L12 22 3.34 17V7z" fill={G} /></svg>],
                    ["diamond", "Losange", <svg width="24" height="24" viewBox="0 0 24 24" key="s"><polygon points="12,1 23,12 12,23 1,12" fill={G} /></svg>],
                    ["penta", "Pentagone", <svg width="24" height="24" viewBox="0 0 24 24" key="s"><polygon points="12,1 23,9.5 18.5,23 5.5,23 1,9.5" fill={G} /></svg>],
                    ["pill", "Pilule",     <svg width="30" height="18" key="s"><rect x="1" y="2" width="28" height="14" rx="7" fill={G} /></svg>],
                    ["banner", "Bandeau",  <svg width="30" height="16" key="s"><rect x="1" y="3" width="28" height="10" fill={G} /></svg>],
                    ["octo", "Octogone",   <svg width="24" height="24" viewBox="0 0 24 24" key="s"><path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" fill={G} /></svg>],
                    ["heart", "Cœur",      <svg width="24" height="24" viewBox="0 0 24 24" key="s"><path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21z" fill={G} /></svg>],
                    ["cross", "Croix",     <svg width="24" height="24" viewBox="0 0 24 24" key="s"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill={G} /></svg>],
                    ["tag", "Étiquette",   <svg width="30" height="20" viewBox="0 0 30 20" key="s"><polygon points="9,1 29,1 29,19 9,19 1,10" fill={G} /></svg>],
                    ["bubble", "Bulle",    <svg width="26" height="24" viewBox="0 0 26 24" key="s"><rect x="2" y="2" width="22" height="15" rx="4" fill={G} /><polygon points="6,16 14,16 6,23" fill={G} /></svg>],
                    ["capsule", "Capsule", <svg width="30" height="16" viewBox="0 0 30 16" key="s"><rect x="1" y="1" width="28" height="14" rx="7" fill={G} /></svg>],
                    ["blob", "Blob",       <svg width="24" height="24" viewBox="0 0 220 200" key="s"><path d="M120 18 C168 8 210 44 205 96 C200 150 158 188 104 182 C54 176 14 140 20 86 C25 42 60 26 120 18 Z" fill={G} /></svg>],
                    ["wave", "Vague",      <svg width="28" height="18" viewBox="0 0 200 110" key="s"><path d="M0 30 Q 50 0 100 30 T 200 30 L 200 110 L 0 110 Z" fill={G} /></svg>],
                    ["ticket", "Ticket",   <svg width="30" height="18" viewBox="0 0 30 18" key="s"><rect x="1" y="2" width="28" height="14" rx="3" fill={G} /><line x1="21" y1="3" x2="21" y2="15" stroke="#fff" strokeWidth="1.4" strokeDasharray="2 2" /></svg>],
                    ["ribbon", "Ruban",    <svg width="30" height="16" viewBox="0 0 30 16" key="s"><polygon points="0,1 30,1 26,8 30,15 0,15 4,8" fill={G} /></svg>],
                  ] as const).map(([k, label, prev]) => (
                    <button key={k} type="button" onClick={() => addShape(k)} title={label}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 2px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 9, cursor: "pointer" }}>
                      {prev}
                      <span style={{ color: pMuted, fontSize: 8 }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Fleches */}
              <div id="lib-arrows" style={{ marginBottom: 16 }}>
                <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>Flèches</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {([["→", 0], ["↓", 90], ["←", 180], ["↑", 270]] as const).map(([sym, ang]) => (
                    <button key={ang} type="button" onClick={() => addArrow(ang)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "16px 0", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 9, cursor: "pointer", color: G, fontSize: 22, fontWeight: 800 }}>
                      {sym}
                    </button>
                  ))}
                  <p style={{ gridColumn: "1 / 3", color: pMuted, fontSize: 9, margin: "2px 0 0", lineHeight: 1.4 }}>Astuce : fais pointer une flèche vers ton QR pour guider le scan.</p>
                </div>
              </div>
              {/* Decorations */}
              <div id="lib-deco" style={{ marginBottom: 4 }}>
                <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>Décorations</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {([
                    ["sparkle", "Étincelle", <svg width="24" height="24" viewBox="0 0 24 24" key="d"><path d="M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z" fill={G} /></svg>],
                    ["burst", "Éclat",       <svg width="24" height="24" viewBox="0 0 24 24" key="d"><path d="M12 2l1.8 4.5 4.7-1.6-1.6 4.7L21.4 12l-4.5 1.4 1.6 4.7-4.7-1.6L12 21l-1.8-4.5-4.7 1.6 1.6-4.7L2.6 12l4.5-1.4-1.6-4.7 4.7 1.6z" fill={G} /></svg>],
                    ["ring", "Anneau",       <svg width="24" height="24" key="d"><circle cx="12" cy="12" r="9" fill="none" stroke={G} strokeWidth="3" /></svg>],
                    ["dots", "Points",       <svg width="34" height="14" key="d">{[3, 11, 19, 27].map(x => <circle key={x} cx={x} cy="7" r="3" fill={G} />)}</svg>],
                    ["wave", "Vague",        <svg width="34" height="14" viewBox="0 0 34 14" key="d"><polyline points="1,11 7,3 13,11 19,3 25,11 31,3" fill="none" stroke={G} strokeWidth="2" /></svg>],
                    ["confetti", "Confettis", <svg width="26" height="24" viewBox="0 0 26 24" key="d">{[[2, 2, 12], [12, 8, -20], [20, 3, 25], [7, 15, 35], [18, 16, -15]].map(([x, y, a], i) => <rect key={i} x={x} y={y} width="4" height="8" rx="1" fill={G} transform={`rotate(${a} ${x + 2} ${y + 4})`} />)}</svg>],
                    ["stars3", "Étoiles",  <svg width="26" height="22" viewBox="0 0 26 22" key="d">{[[5, 11, 4.5], [14, 5, 6], [21, 13, 4]].map(([cx, cy, r], i) => <path key={i} d="M0 -1L0.3 -0.3L1 -0.3L0.4 0.2L0.6 1L0 0.5L-0.6 1L-0.4 0.2L-1 -0.3L-0.3 -0.3Z" fill={G} transform={`translate(${cx} ${cy}) scale(${r})`} />)}</svg>],
                    ["dotgrid", "Grille",  <svg width="24" height="24" key="d">{[4, 11, 18].map(y => [4, 11, 18].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill={G} />))}</svg>],
                    ["chevrons", "Chevrons", <svg width="26" height="20" viewBox="0 0 26 20" key="d">{[2, 10, 18].map((x, i) => <polyline key={i} points={`${x},3 ${x + 7},10 ${x},17`} fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" />)}</svg>],
                    ["corners", "Angles",  <svg width="26" height="20" viewBox="0 0 26 20" key="d"><path d="M2 7V2h5M19 2h5v5M24 13v5h-5M7 18H2v-5" fill="none" stroke={G} strokeWidth="2.2" /></svg>],
                    ["swoosh", "Trait",    <svg width="26" height="14" viewBox="0 0 26 14" key="d"><path d="M2 9 Q13 1 24 7" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" /></svg>],
                  ] as const).map(([k, label, prev]) => (
                    <button key={k} type="button" onClick={() => addDeco(k)} title={label}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 2px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 9, cursor: "pointer" }}>
                      {prev}
                      <span style={{ color: pMuted, fontSize: 8 }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panneau Styles globaux (gauche) */}
        {side === "styles" && (
          <div className="qr-scroll ps-fly" style={{ width: leftW, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.07)", background: pSurf, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <ResizeHandle which="left" />
            <div className="ps-fly-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
              <span style={{ color: pInk, fontWeight: 800, fontSize: 12.5 }}>Styles</span>
              <button type="button" onClick={() => setSide("")} aria-label="Fermer" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 7, color: pMuted, cursor: "pointer" }}><X size={13} /></button>
            </div>
            <div className="qr-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 12px 16px" }}>
              <p style={{ color: pMuted, fontSize: 10, margin: "0 0 10px", lineHeight: 1.4 }}>Un clic restyle tout le design (couleurs, polices, accents).</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {GLOBAL_STYLES.map(s => (
                  <button key={s.id} type="button" onClick={() => applyStyle(s)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, cursor: "pointer", textAlign: "left" }}>
                    <span style={{ display: "flex", flexShrink: 0, width: 44, height: 34, borderRadius: 7, overflow: "hidden", border: "1px solid rgba(0,0,0,0.25)" }}>
                      <span style={{ flex: 1, background: s.bg }} />
                      <span style={{ width: 14, background: s.accent }} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", color: pInk, fontSize: 12, fontWeight: 700, fontFamily: s.titleFont }}>{s.label}</span>
                      <span style={{ display: "block", color: pMuted, fontSize: 9 }}>{s.titleFont}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Panneau Calques (gauche) */}
        {side === "layers" && (
          <div className="qr-scroll ps-fly" style={{ width: leftW, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.07)", background: pSurf, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <ResizeHandle which="left" />
            <div className="ps-fly-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
              <span style={{ color: pInk, fontWeight: 800, fontSize: 12.5 }}>Calques</span>
              <button type="button" onClick={() => setSide("")} aria-label="Fermer" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 7, color: pMuted, cursor: "pointer" }}><X size={13} /></button>
            </div>
            <div style={{ padding: "10px 12px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: pField, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "6px 9px" }}>
                <Search size={12} color={pMuted} />
                <input value={layerSearch} onChange={e => setLayerSearch(e.target.value)} placeholder="Rechercher un calque..."
                  style={{ flex: 1, minWidth: 0, background: "none", border: "none", color: pInk, fontSize: 11, outline: "none" }} />
                {layerSearch && <button type="button" onClick={() => setLayerSearch("")} aria-label="Effacer" style={{ ...iconMini, width: 16, height: 16 }}><X size={11} /></button>}
              </div>
            </div>
            <div className="qr-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 12px 16px" }}>
              {(() => {
                const q = layerSearch.trim().toLowerCase()
                const items = layerList().filter(o => !q || layerName(o).toLowerCase().includes(q))
                const active = fcRef.current?.getActiveObject()
                if (!layerList().length) return <p style={{ color: pMuted, fontSize: 11 }}>Aucun élément. Ajoute du texte, une forme ou un modèle.</p>
                if (!items.length) return <p style={{ color: pMuted, fontSize: 11 }}>Aucun calque ne correspond à « {layerSearch} ».</p>
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {items.map((o, idx) => {
                      const on = active === o
                      return (
                        <div key={idx} draggable
                          onDragStart={() => { dragIdxRef.current = idx }}
                          onDragOver={e => { e.preventDefault(); if (dragOver !== idx) setDragOver(idx) }}
                          onDragLeave={() => { if (dragOver === idx) setDragOver(null) }}
                          onDrop={() => { if (dragIdxRef.current !== null) reorderLayers(dragIdxRef.current, idx); dragIdxRef.current = null; setDragOver(null) }}
                          onDragEnd={() => { dragIdxRef.current = null; setDragOver(null) }}
                          style={{ display: "flex", alignItems: "center", gap: 2, padding: "5px 7px", borderRadius: 7, background: on ? "rgba(201,168,76,0.14)" : "rgba(0,0,0,0.03)", border: `1px solid ${on ? G : "rgba(0,0,0,0.06)"}`, boxShadow: dragOver === idx ? `inset 0 2px 0 ${G}` : "none" }}>
                          <svg width="9" height="14" viewBox="0 0 9 14" style={{ cursor: "grab", flexShrink: 0, marginRight: 2 }}>
                            {[2.5, 7, 11.5].map((cy, r) => [2.5, 6.5].map((cx, c) => <circle key={`${r}-${c}`} cx={cx} cy={cy} r="1" fill={pMuted} />))}
                          </svg>
                          {editLayer === idx ? (
                            <input autoFocus defaultValue={layerName(o)}
                              onBlur={e => renameLayer(o, e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") renameLayer(o, (e.target as HTMLInputElement).value); else if (e.key === "Escape") setEditLayer(null) }}
                              style={{ flex: 1, minWidth: 0, background: pField, border: `1px solid ${G}`, borderRadius: 5, padding: "2px 5px", color: pInk, fontSize: 10.5, outline: "none" }} />
                          ) : (
                            <button type="button" onClick={() => selectLayer(o)} onDoubleClick={() => setEditLayer(idx)} title="Double-clic pour renommer"
                              style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", color: on ? G : pInk, fontSize: 10.5, cursor: "pointer", padding: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: o.visible ? 1 : 0.4 }}>
                              {layerName(o)}
                            </button>
                          )}
                          <button type="button" onClick={() => toggleVisible(o)} title="Afficher / masquer" style={iconMini}>
                            <svg width="13" height="13" viewBox="0 0 24 24"><path d="M12 5C5 5 1 12 1 12s4 7 11 7 11-7 11-7-4-7-11-7zm0 11.5A4.5 4.5 0 1112 7a4.5 4.5 0 010 9.5z" fill={o.visible ? G : pMuted} /></svg>
                          </button>
                          <button type="button" onClick={() => toggleLockLayer(o)} title={o.lockMovementX ? "Déverrouiller" : "Verrouiller"} style={{ ...iconMini, color: o.lockMovementX ? G : pMuted }}>
                            {o.lockMovementX ? <Lock size={12} /> : <Unlock size={12} />}
                          </button>
                          <button type="button" onClick={() => moveLayer(o, "up")} title="Monter" style={iconMini}><ChevronUp size={13} /></button>
                          <button type="button" onClick={() => moveLayer(o, "down")} title="Descendre" style={iconMini}><ChevronDown size={13} /></button>
                          <button type="button" onClick={() => removeLayer(o)} title="Supprimer" style={{ ...iconMini, color: "#FF6B6B" }}><Trash2 size={12} /></button>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Panneau Fond + infos (gauche) */}
        {side === "bg" && (
          <div className="qr-scroll ps-fly" style={{ width: leftW, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.07)", background: pSurf, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <ResizeHandle which="left" />
            <div className="ps-fly-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
              <span style={{ color: pInk, fontWeight: 800, fontSize: 12.5 }}>Fond &amp; infos</span>
              <button type="button" onClick={() => setSide("")} aria-label="Fermer" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 7, color: pMuted, cursor: "pointer" }}><X size={13} /></button>
            </div>
            <div className="qr-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 12px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>Fonds</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
                  {BG_PRESETS.map(p => {
                    const active = bgGrad ? (p.type === "grad" && bgColor === p.c1 && bgC2 === p.c2) : (p.type === "solid" && bgColor === p.c1)
                    return (
                      <button key={p.id} type="button" onClick={() => applyBgPreset(p)} title={p.id}
                        style={{ width: "100%", aspectRatio: "1.3", borderRadius: 8, cursor: "pointer", border: `2px solid ${active ? G : "rgba(0,0,0,0.14)"}`, background: p.type === "mesh" ? `radial-gradient(circle at 50% 34%, ${p.c1}, ${p.c2} 55%, ${p.c3})` : p.type === "grad" ? `linear-gradient(180deg, ${p.c1}, ${p.c2})` : p.c1, padding: 0 }} />
                    )
                  })}
                </div>
                <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 6px" }}>Texture / motif</p>
                <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
                  {([["dots", "Points"], ["stripes", "Rayures"], ["grid", "Grille"], ["cross", "Croix"]] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => applyBgPattern(k)} style={{ ...panelBtn, flex: 1, fontSize: 9 }}>{label}</button>
                  ))}
                </div>
                <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 6px" }}>Couleur personnalisée</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="color" value={/^#/.test(bgColor) ? bgColor : "#FFFFFF"} onChange={e => applyBg(e.target.value)}
                    style={{ width: 34, height: 30, borderRadius: 7, border: "1px solid rgba(0,0,0,0.15)", background: "transparent", cursor: "pointer", padding: 0 }} />
                  <input value={bgColor} onChange={e => applyBg(e.target.value)}
                    style={{ flex: 1, background: pField, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 7, padding: "7px 9px", color: pInk, fontSize: 11, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
                </div>
                <button type="button" onClick={() => toggleGrad(!bgGrad)}
                  style={{ ...panelBtn, width: "100%", marginTop: 8, background: bgGrad ? "rgba(201,168,76,0.15)" : "rgba(0,0,0,0.03)", color: bgGrad ? G : pInk, fontWeight: 700 }}>
                  Dégradé {bgGrad ? "✓" : ""}
                </button>
                {bgGrad && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <input type="color" value={/^#/.test(bgC2) ? bgC2 : "#0A0A0A"} onChange={e => applyBgC2(e.target.value)}
                      style={{ width: 34, height: 30, borderRadius: 7, border: "1px solid rgba(0,0,0,0.15)", background: "transparent", cursor: "pointer", padding: 0 }} />
                    <span style={{ color: pMuted, fontSize: 10 }}>2ᵉ couleur</span>
                  </div>
                )}
              </div>
              {infoVer >= 0 && (() => {
                const ros = roleObjects()
                if (!ros.length) return null
                return (
                  <div>
                    <p style={{ color: pMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 8px" }}>Infos du support</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ros.map(o => {
                        const role = (o as any).role as string
                        return (
                          <div key={role}>
                            <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 3 }}>{ROLE_LABEL[role] ?? role}</label>
                            <input value={roleValue(o)} onChange={e => updateRole(role, e.target.value)}
                              style={{ width: "100%", background: pField, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 7, padding: "7px 9px", color: pInk, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Zone canvas (heros) : panneaux flottants -> on recadre pour garder l'artboard centre dans le visible */}
        <div ref={scrollRef} onContextMenu={onCanvasContext} style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "safe center", justifyContent: "safe center", padding: landscapeMobile ? `16px 16px ${anyBottomSheet ? (regOpen ? "60vh" : "54vh") : "92px"}` : 16, background: landscapeMobile ? "#0C0C0E" : "#E5E8ED", position: "relative", transition: "padding .22s cubic-bezier(.2,.8,.2,1)" }}>
          {loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: pMuted, zIndex: 5, pointerEvents: "none" }}>
              <Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} /> Chargement…
            </div>
          )}
          <div style={{ margin: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.10), 0 12px 32px rgba(0,0,0,0.12)", borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
            <canvas ref={elRef} />
          </div>
        </div>

        {/* Rail droit : formats avec mini-apercu (masqué en paysage mobile -> canvas héros ; repliable sur desktop) */}
        <div className={"qr-scroll" + (landscapeMobile ? " ps-hide-mobile" : "")} style={{ width: fmtW, flexShrink: 0, borderLeft: "1px solid rgba(0,0,0,0.07)", padding: (formatCollapsed && !landscapeMobile) ? "8px 2px" : "10px 7px", display: "flex", flexDirection: "column", gap: 5, background: SURFACE, overflowY: "auto", position: "relative" }}>
          {!landscapeMobile && !formatCollapsed && <ResizeHandle which="format" />}
          {!landscapeMobile && (
            <button type="button" onClick={() => setFormatCollapsed(v => !v)} title={formatCollapsed ? "Afficher les formats" : "Réduire le panneau"}
              style={{ alignSelf: formatCollapsed ? "center" : "flex-end", width: 24, height: 24, borderRadius: 7, border: "1px solid rgba(0,0,0,0.1)", background: "rgba(0,0,0,0.03)", color: MUTED, cursor: "pointer", fontSize: 14, fontWeight: 700, lineHeight: 1, flexShrink: 0, marginBottom: 2 }}>
              {formatCollapsed ? "‹" : "›"}
            </button>
          )}
          {(formatCollapsed && !landscapeMobile) ? null : <>
          <p style={{ color: MUTED, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 1px", textAlign: "center" }}>Format</p>
          {(Object.keys(FORMATS) as FormatId[]).map(f => {
            const r = FORMATS[f].ratio
            const bw = r >= 1 ? 28 : Math.round(28 * r)
            const bh = r >= 1 ? Math.round(28 / r) : 28
            const on = format === f
            return (
              <button key={f} type="button" onClick={() => applyFormat(f)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 3px", background: on ? "rgba(201,168,76,0.16)" : "transparent", border: `1px solid ${on ? G : "rgba(0,0,0,0.08)"}`, borderRadius: 9, cursor: "pointer" }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30 }}>
                  <span style={{ width: bw, height: bh, background: on ? G : "#FFFFFF", border: `1px solid ${on ? G : "rgba(0,0,0,0.22)"}`, borderRadius: 2.5, boxShadow: "0 1px 2px rgba(0,0,0,0.12)" }} />
                </span>
                <span style={{ color: on ? G : INK, fontSize: 9.5, fontWeight: on ? 700 : 600 }}>{FORMATS[f].label}</span>
              </button>
            )
          })}
          </>}
        </div>

        {/* Zoom flottant (DESKTOP) — sur mobile la barre du haut porte deja le zoom, on evite le doublon + l'encombrement */}
        {!landscapeMobile && (
        <div style={{ position: "absolute", zIndex: 38, display: "flex", alignItems: "center", gap: 2, background: SURFACE, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 999, padding: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          bottom: 16, right: (fmtW + (sel ? rightW : 0) + 16) }}>
          <button type="button" onClick={() => applyZoom(zoom / 1.2)} title="Dézoomer" aria-label="Dézoomer"
            style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: 999, color: INK, fontSize: 18, cursor: "pointer" }}>−</button>
          <button type="button" onClick={() => fitToScreen()} title="Ajuster à l'écran"
            style={{ minWidth: 46, height: 30, background: "none", border: "none", color: MUTED, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{Math.round(zoom * 100)}%</button>
          <button type="button" onClick={() => applyZoom(zoom * 1.2)} title="Zoomer" aria-label="Zoomer"
            style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: 999, color: INK, fontSize: 17, cursor: "pointer" }}>+</button>
        </div>
        )}

        {/* Panneau de reglages : desktop -> visible a la selection ; mobile -> a la demande (barre contextuelle) */}
        {sel && (!landscapeMobile || regOpen) && (
        <div className={"qr-scroll ps-fly ps-fly-right" + (landscapeMobile ? " ps-sheet" : "")} style={{ width: rightW, flexShrink: 0, borderLeft: "1px solid rgba(0,0,0,0.07)", padding: 0, overflowY: "auto", background: pSurf, display: "flex", flexDirection: "column", position: "relative" }}>
          {!landscapeMobile && <ResizeHandle which="right" />}
              {/* En-tete contextuel */}
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", position: "sticky", top: 0, background: pSurf, zIndex: 2 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{sel.isQr ? "▦" : sel.isImage ? "🖼️" : sel.isText ? "T" : sel.label !== null ? "◉" : sel.isGroupObj ? "▣" : "◆"}</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: pInk, fontSize: 13.5, fontWeight: 800 }}>{sel.isQr ? "QR Code" : sel.isImage ? "Image" : sel.isText ? "Texte" : sel.label !== null ? "Bouton" : sel.isGroupObj ? "Groupe" : "Forme"}</span>
                  <span style={{ color: pMuted, fontSize: 10 }}>Réglages</span>
                </div>
                {/* Mode Simple / Expert (#3) : masque les reglages avances quand Simple */}
                <div style={{ marginLeft: "auto", display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 2, gap: 2 }}>
                  {(["simple", "expert"] as UiMode[]).map(m => (
                    <button key={m} type="button" onClick={() => setUiMode(m)} title={m === "simple" ? "Réglages essentiels" : "Tous les réglages"}
                      style={{ padding: "5px 9px", borderRadius: 6, border: "none", background: uiMode === m ? (darkPanel ? "rgba(255,255,255,0.14)" : "#fff") : "transparent", color: uiMode === m ? G : pMuted, fontSize: 10.5, fontWeight: 700, cursor: "pointer", boxShadow: uiMode === m && !darkPanel ? "0 1px 3px rgba(0,0,0,0.12)" : "none" }}>
                      {m === "simple" ? "Simple" : "Expert"}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => { if (landscapeMobile) { setRegOpen(false) } else { fcRef.current?.discardActiveObject(); fcRef.current?.requestRenderAll(); setSel(null) } }} aria-label="Fermer" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 7, color: pMuted, cursor: "pointer" }}><X size={13} /></button>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>

                {/* Editeur QR : apparence + jauge de scannabilite en direct */}
                {sel.isQr && (
                  <div style={{ marginBottom: 14 }}>
                    <p className="ps-sec-label">Éditeur QR</p>

                    {/* Jauge de scannabilite (moteur pur : contraste + correction + logo) */}
                    <div style={{ background: pField, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "9px 10px", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: scanLevelColor(qrScan.level) }}>{qrScan.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: pMuted, whiteSpace: "nowrap" }}>
                          {qrScan.contrast != null ? `Contraste ${qrScan.contrast}:1` : "Contraste n/d"} · {qrScan.score}/100
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 4, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                        <div style={{ width: `${qrScan.score}%`, height: "100%", background: scanLevelColor(qrScan.level), transition: "width .2s ease" }} />
                      </div>
                      {qrScan.advices[0] && (
                        <p style={{ margin: "7px 0 0", fontSize: 10.5, color: pInk, lineHeight: 1.45 }}>💡 {qrScan.advices[0]}</p>
                      )}
                    </div>

                    {regenQr ? (
                      <>
                        <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>Couleur du QR</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                          {QR_FG.map(c => (
                            <button key={c} type="button" disabled={qrBusy} onClick={() => applyQrRender({ fg: c })} title={c}
                              style={{ width: landscapeMobile ? 30 : 22, height: landscapeMobile ? 30 : 22, borderRadius: "50%", cursor: "pointer", background: c, border: (qrFg || "#0A0A0A").toUpperCase() === c.toUpperCase() ? `2px solid ${G}` : "1px solid rgba(0,0,0,0.2)", padding: 0, opacity: qrBusy ? 0.5 : 1 }} />
                          ))}
                          <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(qrFg) ? qrFg : "#0A0A0A"} disabled={qrBusy}
                            onChange={e => applyQrRender({ fg: e.target.value })}
                            style={{ width: 30, height: 22, borderRadius: 6, border: "1px solid rgba(0,0,0,0.15)", background: "transparent", cursor: "pointer", padding: 0 }} />
                        </div>

                        <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>Fond</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                          {QR_BG.map(c => (
                            <button key={c} type="button" disabled={qrBusy} onClick={() => applyQrRender({ bg: c })} title={c}
                              style={{ width: landscapeMobile ? 30 : 22, height: landscapeMobile ? 30 : 22, borderRadius: "50%", cursor: "pointer", background: c, border: (qrBg || "#FFFFFF").toUpperCase() === c.toUpperCase() ? `2px solid ${G}` : "1px solid rgba(0,0,0,0.2)", padding: 0, opacity: qrBusy ? 0.5 : 1 }} />
                          ))}
                          <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(qrBg) ? qrBg : "#FFFFFF"} disabled={qrBusy}
                            onChange={e => applyQrRender({ bg: e.target.value })}
                            style={{ width: 30, height: 22, borderRadius: 6, border: "1px solid rgba(0,0,0,0.15)", background: "transparent", cursor: "pointer", padding: 0 }} />
                        </div>

                        <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>Modules</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                          {QR_DOTS.map(d => (
                            <button key={d.k} type="button" disabled={qrBusy} onClick={() => applyQrRender({ dotStyle: d.k })} title={d.label}
                              style={{ ...panelBtn, flex: "1 0 22%", fontSize: 14, color: qrDot === d.k ? G : pInk, borderColor: qrDot === d.k ? G : "rgba(0,0,0,0.1)", opacity: qrBusy ? 0.5 : 1 }}>{d.icon}</button>
                          ))}
                        </div>

                        {showSection("qr-corners", uiMode) && (<>
                        <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>Coins</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                          {([["square", "Carré"], ["rounded", "Arrondi"], ["circle", "Rond"], ["diamond", "Losange"]] as const).map(([k, l]) => (
                            <button key={k} type="button" disabled={qrBusy} onClick={() => applyQrRender({ cornerStyle: k })}
                              style={{ ...panelBtn, flex: "1 0 22%", fontSize: 9.5, color: qrCorner === k ? G : pInk, borderColor: qrCorner === k ? G : "rgba(0,0,0,0.1)", opacity: qrBusy ? 0.5 : 1 }}>{l}</button>
                          ))}
                        </div>
                        </>)}

                        {showSection("qr-ecc", uiMode) && (<>
                        <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>
                          Correction d'erreur{qrHasLogo ? <span style={{ color: pMuted }}> · logo → H conseillé</span> : null}
                        </label>
                        <div style={{ display: "flex", gap: 5 }}>
                          {(["L", "M", "Q", "H"] as const).map(e => (
                            <button key={e} type="button" disabled={qrBusy} onClick={() => applyQrRender({ ecc: e })} title={`Correction ${e}`}
                              style={{ ...panelBtn, flex: 1, fontWeight: 700, color: qrEcc === e ? G : pInk, borderColor: qrEcc === e ? G : "rgba(0,0,0,0.1)", opacity: qrBusy ? 0.5 : 1 }}>{e}</button>
                          ))}
                        </div>
                        </>)}
                        {qrBusy && <p style={{ margin: "6px 0 0", fontSize: 10, color: pMuted }}>Régénération du QR…</p>}
                      </>
                    ) : (
                      <p style={{ fontSize: 10.5, color: pMuted, margin: "0 0 4px" }}>Personnalisation du QR indisponible ici.</p>
                    )}
                  </div>
                )}

                {/* Etiquette QR (quand le QR est selectionne) */}
                {sel.isQr && (
                  <div style={{ marginBottom: 14 }}>
                    <p className="ps-sec-label">Étiquette QR</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
                      {["SCANNEZ-MOI", "★ AVIS GOOGLE", "VOIR LE MENU", "INSTAGRAM", "RÉSERVER", "WIFI GRATUIT", "SUIVEZ-NOUS"].map(l => (
                        <button key={l} type="button" onClick={() => addQrLabel(l)} style={{ ...panelBtn, fontSize: 9.5, padding: "7px 9px", flex: "1 0 auto" }}>{l}</button>
                      ))}
                    </div>
                    <p className="ps-sec-label" style={{ marginTop: 4 }}>Cadre</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
                      {([["luxury", "Luxury"], ["corporate", "Corporate"], ["modern", "Modern"], ["neon", "Néon"]] as const).map(([k, l]) => (
                        <button key={k} type="button" onClick={() => setQrFrame(k)} style={{ ...panelBtn, fontSize: 9.5, flex: "1 0 40%" }}>{l}</button>
                      ))}
                    </div>
                    <p className="ps-sec-label" style={{ marginTop: 4 }}>Sticker</p>
                    <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                      {([["round", "● Rond"], ["badge", "✸ Badge"], ["square", "▢ Carré"]] as const).map(([k, l]) => (
                        <button key={k} type="button" onClick={() => setQrSticker(k)} style={{ ...panelBtn, flex: 1, fontSize: 9.5 }}>{l}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      <button type="button" onClick={removeQrLabel} style={{ ...panelBtn, flex: "1 0 30%", fontSize: 9 }}>Retirer étiquette</button>
                      <button type="button" onClick={removeQrFrame} style={{ ...panelBtn, flex: "1 0 30%", fontSize: 9 }}>Retirer cadre</button>
                      <button type="button" onClick={removeQrSticker} style={{ ...panelBtn, flex: "1 0 30%", fontSize: 9 }}>Retirer sticker</button>
                    </div>
                  </div>
                )}

                {/* Texte du bouton / badge (groupe avec texte) */}
                {sel.label !== null && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>Texte du bouton</label>
                    <input value={sel.label} onChange={e => setLabel(e.target.value)} placeholder="Votre texte"
                      style={{ width: "100%", background: pField, border: "1px solid rgba(201,168,76,0.25)", borderRadius: 7, padding: "7px 9px", color: pInk, fontSize: 11, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
                    {sel.textFill !== null && (
                      <>
                        <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>Couleur du texte</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                          {SWATCHES.map(c => (
                            <button key={c} type="button" onClick={() => setTextColor(c)} title={c}
                              style={{ width: landscapeMobile ? 30 : 22, height: landscapeMobile ? 30 : 22, borderRadius: "50%", cursor: "pointer", background: c, border: (sel.textFill ?? "").toUpperCase() === c.toUpperCase() ? `2px solid ${G}` : "1px solid rgba(0,0,0,0.2)", padding: 0 }} />
                          ))}
                        </div>
                        <input type="color" value={/^#/.test(sel.textFill) ? sel.textFill : "#080808"}
                          onChange={e => setTextColor(e.target.value)}
                          style={{ width: 34, height: 30, borderRadius: 7, border: "1px solid rgba(0,0,0,0.15)", background: "transparent", cursor: "pointer", padding: 0 }} />
                      </>
                    )}
                  </div>
                )}

                {/* Couleur (fond du groupe ou objet simple) */}
                <p className="ps-sec-label">{sel.isGroup ? "Couleur du fond" : "Couleur"}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                  {SWATCHES.map(c => (
                    <button key={c} type="button" onClick={() => setFill(c)} title={c}
                      style={{ width: landscapeMobile ? 30 : 22, height: landscapeMobile ? 30 : 22, borderRadius: "50%", cursor: "pointer", background: c, border: sel.fill.toUpperCase() === c.toUpperCase() ? `2px solid ${G}` : "1px solid rgba(0,0,0,0.2)", padding: 0 }} />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <input type="color" value={/^#/.test(sel.fill) ? sel.fill : "#C9A84C"}
                    onChange={e => setFill(e.target.value)}
                    style={{ width: 34, height: 30, borderRadius: 7, border: "1px solid rgba(0,0,0,0.15)", background: "transparent", cursor: "pointer", padding: 0 }} />
                  <input value={sel.fill} onChange={e => setFill(e.target.value)}
                    style={{ flex: 1, background: pField, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 7, padding: "7px 9px", color: pInk, fontSize: 11, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
                </div>
                {/* Couleurs recentes : utiles aussi en mode Simple */}
                {recentColors.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>Récentes</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {recentColors.map(c => (
                        <button key={"rc" + c} type="button" onClick={() => setFill(c)} title={c}
                          style={{ width: landscapeMobile ? 30 : 22, height: landscapeMobile ? 30 : 22, borderRadius: "50%", cursor: "pointer", background: c, border: sel.fill.toUpperCase() === c.toUpperCase() ? `2px solid ${G}` : "1px solid rgba(0,0,0,0.2)", padding: 0 }} />
                      ))}
                    </div>
                  </div>
                )}
                {/* Reglages couleur avances (HSL, pipette, harmonies) -> mode Expert uniquement (#3, #13) */}
                {uiMode === "expert" && (<>
                <button type="button" onClick={() => setPickerOpen(v => !v)}
                  style={{ ...panelBtn, width: "100%", fontSize: 10, marginBottom: pickerOpen ? 8 : 12, color: pickerOpen ? G : pInk, borderColor: pickerOpen ? G : "rgba(0,0,0,0.1)" }}>
                  🎨 Palette avancée {pickerOpen ? "▲" : "▾"}
                </button>
                {pickerOpen && (
                  <ColorPicker
                    value={/^#/.test(sel.fill) ? sel.fill : "#C9A84C"}
                    onChange={setFill}
                    onUseColor={c => setRecentColors(r => pushRecent(r, c))}
                    recent={recentColors}
                    brand={SWATCHES}
                    dark={darkPanel}
                  />
                )}
                </>)}

                {/* Opacite */}
                <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>
                  Opacité — {Math.round(sel.opacity * 100)}%
                </label>
                <input type="range" min={0} max={1} step={0.05} value={sel.opacity}
                  onChange={e => mutate(o => o.set("opacity", parseFloat(e.target.value)))}
                  style={{ width: "100%", accentColor: G, marginBottom: 12 }} />

                {/* Ajustements image (luminosite / contraste / saturation / teinte) */}
                {sel.isImage && (() => {
                  const ao = fcRef.current?.getActiveObject()
                  return (
                    <div style={{ marginBottom: 12 }}>
                      <p className="ps-sec-label">Ajustements</p>
                      {([
                        ["brightness", "Luminosité"], ["contrast", "Contraste"], ["saturation", "Saturation"], ["hue", "Teinte"],
                      ] as const).map(([k, label]) => {
                        const v = imgAdjustVal(ao, k)
                        return (
                          <div key={k} style={{ marginBottom: 8 }}>
                            <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 3 }}>{label} — {Math.round(v * 100)}</label>
                            <input type="range" min={-1} max={1} step={0.05} value={v}
                              onChange={e => setImageAdjust(k, parseFloat(e.target.value))}
                              style={{ width: "100%", accentColor: G }} />
                          </div>
                        )
                      })}
                      <button type="button" onClick={() => { setImageAdjust("brightness", 0); setImageAdjust("contrast", 0); setImageAdjust("saturation", 0); setImageAdjust("hue", 0) }}
                        style={{ ...panelBtn, width: "100%", fontSize: 9.5 }}>Réinitialiser les ajustements</button>
                    </div>
                  )
                })()}

                {/* Degrade / Motif / Contour : reglages avances -> mode Expert uniquement (#3, #13) */}
                {uiMode === "expert" && (<>
                <p className="ps-sec-label">Dégradé</p>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {GRADIENT_PRESETS.map(([a, b]) => (
                    <button key={a + b} type="button" onClick={() => setGradientFill(a, b)} title="Dégradé prêt à l'emploi"
                      style={{ flex: 1, height: 24, borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer", background: `linear-gradient(135deg, ${a}, ${b})`, padding: 0 }} />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <input type="color" value={/^#/.test(sel.fill) ? sel.fill : "#C9A84C"} onChange={e => setFill(e.target.value)} title="Couleur 1" style={{ width: 30, height: 28, borderRadius: 6, border: "1px solid rgba(0,0,0,0.15)", cursor: "pointer", padding: 0 }} />
                  <span style={{ color: pMuted, fontSize: 14 }}>→</span>
                  <input type="color" value={gradC2} onChange={e => setGradC2(e.target.value)} title="Couleur 2" style={{ width: 30, height: 28, borderRadius: 6, border: "1px solid rgba(0,0,0,0.15)", cursor: "pointer", padding: 0 }} />
                  <button type="button" onClick={() => setGradientFill(/^#/.test(sel.fill) ? sel.fill : "#C9A84C", gradC2)} style={{ ...panelBtn, flex: 1, fontSize: 9.5 }}>Linéaire</button>
                  <button type="button" onClick={() => setRadialFill(/^#/.test(sel.fill) ? sel.fill : "#C9A84C", gradC2)} style={{ ...panelBtn, flex: 1, fontSize: 9.5 }}>Radial</button>
                </div>
                <p className="ps-sec-label">Motif</p>
                <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
                  <button type="button" onClick={() => setPatternFill("dots")} style={{ ...panelBtn, flex: 1, fontSize: 9.5 }}>Points</button>
                  <button type="button" onClick={() => setPatternFill("stripes")} style={{ ...panelBtn, flex: 1, fontSize: 9.5 }}>Rayures</button>
                  <button type="button" onClick={() => setPatternFill("grid")} style={{ ...panelBtn, flex: 1, fontSize: 9.5 }}>Grille</button>
                </div>
                <button type="button" onClick={makeOutline} style={{ ...panelBtn, width: "100%", fontSize: 9.5, marginBottom: 12 }} title="Forme creuse : contour seul, remplissage transparent">◯ Contour seul (creuse)</button>
                </>)}

                {/* Bordure / contour */}
                <button type="button" onClick={() => setBorder(!sel.border)}
                  style={{ ...panelBtn, width: "100%", background: sel.border ? "rgba(201,168,76,0.15)" : "rgba(0,0,0,0.03)", color: sel.border ? G : pInk, fontWeight: 700, marginBottom: sel.border ? 8 : 12 }}>
                  Bordure {sel.border ? "✓" : ""}
                </button>
                {sel.border && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <input type="color" value={/^#/.test(sel.strokeColor) ? sel.strokeColor : "#C9A84C"}
                        onChange={e => setBorderColor(e.target.value)}
                        style={{ width: 34, height: 30, borderRadius: 7, border: "1px solid rgba(0,0,0,0.15)", background: "transparent", cursor: "pointer", padding: 0 }} />
                      <span style={{ color: pMuted, fontSize: 10 }}>Épaisseur — {Math.round(sel.strokeWidth)}px</span>
                    </div>
                    <input type="range" min={1} max={30} step={1} value={sel.strokeWidth || 4}
                      onChange={e => setBorderWidth(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: G }} />
                    {/* Style de trait + bordure degradee = avance -> Expert seulement (#20) */}
                    {uiMode === "expert" && (<>
                    <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                      {([["solid", "Pleine", null], ["dashed", "Tirets", [12, 8]], ["dotted", "Pointillée", [2, 8]]] as const).map(([k, label, dash]) => (
                        <button key={k} type="button" onClick={() => mutate(o => { o.set({ strokeDashArray: dash as number[] | null, strokeLineCap: k === "dotted" ? "round" : "butt" }); o.dirty = true })} style={{ ...panelBtn, flex: 1, fontSize: 9.5 }}>{label}</button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setBorderGradient(/^#/.test(sel.strokeColor) ? sel.strokeColor : "#C9A84C", gradC2)} style={{ ...panelBtn, width: "100%", marginTop: 5, fontSize: 9.5 }} title="Contour en dégradé (utilise la 2e couleur du dégradé)">Bordure dégradée</button>
                    </>)}
                  </div>
                )}

                {/* Coins arrondis (rectangles) */}
                {sel.radius !== null && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>Coins arrondis — {Math.round(sel.radius)}px</label>
                    <input type="range" min={0} max={80} step={1} value={sel.radius}
                      onChange={e => setRadius(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: G }} />
                  </div>
                )}

                {/* Taille */}
                {!sel.isQr && (() => {
                  const ao = fcRef.current?.getActiveObject()
                  const ratioOn = !!(ao && (ao as any)._ratio)
                  return (
                    <div style={{ marginBottom: 12 }}>
                      <p className="ps-sec-label">Taille</p>
                      <button type="button" onClick={toggleRatioLock} style={{ ...panelBtn, width: "100%", fontSize: 9.5, marginBottom: 5, color: ratioOn ? G : pInk, borderColor: ratioOn ? G : "rgba(31,36,48,0.1)" }}>
                        {ratioOn ? "🔒 Ratio verrouillé" : "🔓 Verrouiller le ratio"}
                      </button>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button type="button" onClick={() => sizeToCanvas("fit")} style={{ ...panelBtn, flex: 1, fontSize: 9.5 }} title="Ajuster entièrement dans le support">Ajuster</button>
                        <button type="button" onClick={() => sizeToCanvas("fill")} style={{ ...panelBtn, flex: 1, fontSize: 9.5 }} title="Remplir tout le support">Remplir</button>
                      </div>
                    </div>
                  )
                })()}

                {/* Texte uniquement */}
                {sel.isText && (
                  <>
                    <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>Police</label>
                    <select value={sel.fontFamily}
                      onChange={e => setFont(e.target.value)}
                      style={{ width: "100%", background: pField, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 7, padding: "7px 9px", color: pInk, fontSize: 11, outline: "none", cursor: "pointer", marginBottom: 10, boxSizing: "border-box" }}>
                      {FONT_GROUPS.map(g => (
                        <optgroup key={g.label} label={g.label}>
                          {g.fonts.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                        </optgroup>
                      ))}
                    </select>

                    <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>
                      Taille — {sel.fontSize}px
                    </label>
                    <input type="range" min={10} max={140} step={1} value={sel.fontSize}
                      onChange={e => mutate(o => (o as fabric.IText).set("fontSize", parseInt(e.target.value)))}
                      style={{ width: "100%", accentColor: G, marginBottom: 10 }} />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                      <button type="button" title="Gras"
                        onClick={() => mutate(o => (o as fabric.IText).set("fontWeight", sel.bold ? "normal" : "bold"))}
                        style={{ ...panelBtn, background: sel.bold ? "rgba(201,168,76,0.15)" : "rgba(0,0,0,0.03)", color: sel.bold ? G : pInk, fontWeight: 800 }}>
                        B
                      </button>
                      <button type="button" title="Italique"
                        onClick={() => mutate(o => (o as fabric.IText).set("fontStyle", sel.italic ? "normal" : "italic"))}
                        style={{ ...panelBtn, background: sel.italic ? "rgba(201,168,76,0.15)" : "rgba(0,0,0,0.03)", color: sel.italic ? G : pInk, fontStyle: "italic", fontWeight: 700 }}>
                        I
                      </button>
                      <button type="button" title="Souligné"
                        onClick={() => mutate(o => (o as fabric.IText).set("underline", !sel.underline))}
                        style={{ ...panelBtn, background: sel.underline ? "rgba(201,168,76,0.15)" : "rgba(0,0,0,0.03)", color: sel.underline ? G : pInk, textDecoration: "underline", fontWeight: 700 }}>
                        U
                      </button>
                    </div>

                    {/* Barré + Casse (majuscules / minuscules) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                      <button type="button" title="Barré"
                        onClick={() => mutate(o => (o as fabric.IText).set("linethrough", !sel.strike))}
                        style={{ ...panelBtn, background: sel.strike ? "rgba(201,168,76,0.15)" : "rgba(0,0,0,0.03)", color: sel.strike ? G : pInk, textDecoration: "line-through", fontWeight: 700 }}>
                        S
                      </button>
                      <button type="button" title="MAJUSCULES"
                        onClick={() => mutate(o => { const t = o as fabric.IText; t.set("text", (t.text || "").toUpperCase()); (t as unknown as { initDimensions?: () => void }).initDimensions?.() })}
                        style={{ ...panelBtn, fontWeight: 800, letterSpacing: 0.5 }}>
                        AA
                      </button>
                      <button type="button" title="minuscules"
                        onClick={() => mutate(o => { const t = o as fabric.IText; t.set("text", (t.text || "").toLowerCase()); (t as unknown as { initDimensions?: () => void }).initDimensions?.() })}
                        style={{ ...panelBtn, fontWeight: 700, textTransform: "lowercase" }}>
                        aa
                      </button>
                    </div>

                    {/* Alignement du texte */}
                    <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>Alignement</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                      {(["left", "center", "right"] as const).map(a => {
                        const on = sel.textAlign === a
                        const bars = a === "left" ? [[1, 14], [1, 9], [1, 12]] : a === "center" ? [[1, 14], [4, 8], [2.5, 11]] : [[1, 14], [6, 9], [3, 12]]
                        return (
                          <button key={a} type="button" onClick={() => mutate(o => (o as fabric.IText).set("textAlign", a))} title={a}
                            style={{ ...panelBtn, padding: "7px", background: on ? "rgba(201,168,76,0.15)" : "rgba(0,0,0,0.03)" }}>
                            <svg width="16" height="16" viewBox="0 0 16 16">
                              {bars.map(([x, w], i) => <rect key={i} x={x} y={3 + i * 4} width={w} height="2" rx="1" fill={on ? G : pMuted} />)}
                            </svg>
                          </button>
                        )
                      })}
                    </div>

                    {showSection("text-spacing", uiMode) && (<>
                    {/* Espacement des lettres */}
                    <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>Espacement — {Math.round(sel.charSpacing)}</label>
                    <input type="range" min={0} max={800} step={10} value={sel.charSpacing}
                      onChange={e => mutate(o => (o as fabric.IText).set("charSpacing", parseInt(e.target.value)))}
                      style={{ width: "100%", accentColor: G, marginBottom: 10 }} />

                    {/* Interligne */}
                    <label style={{ color: pMuted, fontSize: 10, display: "block", marginBottom: 4 }}>Interligne — {sel.lineHeight.toFixed(2)}</label>
                    <input type="range" min={0.8} max={2} step={0.05} value={sel.lineHeight}
                      onChange={e => mutate(o => (o as fabric.IText).set("lineHeight", parseFloat(e.target.value)))}
                      style={{ width: "100%", accentColor: G }} />
                    </>)}
                  </>
                )}
              </div>

              {/* Effets (avances -> masques en mode Simple) */}
              {showSection("text-effects", uiMode) && (
              <div>
                <p className="ps-sec-label">Ombre</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 6 }}>
                  {([["off", "Aucune"], ["soft", "Soft"], ["medium", "Medium"], ["strong", "Strong"], ["floating", "Floating"], ["luxury", "Diffuse"]] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setShadowPreset(k)} style={{ ...panelBtn, padding: "7px 2px", fontSize: 9.5 }}>{label}</button>
                  ))}
                </div>
                {sel.shadow && (
                  <>
                    <label style={{ color: pMuted, fontSize: 10, display: "block", margin: "4px 0 4px" }}>Flou — {Math.round(sel.shadowBlur)}px</label>
                    <input type="range" min={0} max={60} step={1} value={sel.shadowBlur}
                      onChange={e => setShadowBlur(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: G }} />
                    <label style={{ color: pMuted, fontSize: 10, display: "block", margin: "6px 0 4px" }}>Décalage X — {Math.round(sel.shadowX)}px</label>
                    <input type="range" min={-30} max={30} step={1} value={sel.shadowX}
                      onChange={e => setShadowOffset("x", parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: G }} />
                    <label style={{ color: pMuted, fontSize: 10, display: "block", margin: "6px 0 4px" }}>Décalage Y — {Math.round(sel.shadowY)}px</label>
                    <input type="range" min={-30} max={30} step={1} value={sel.shadowY}
                      onChange={e => setShadowOffset("y", parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: G }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                      <span style={{ color: pMuted, fontSize: 10 }}>Couleur :</span>
                      {["rgba(0,0,0,0.4)", G, "#C0392B", "#1D4ED8", "#0E7A5F", "#E1306C"].map(c => (
                        <button key={c} type="button" onClick={() => setShadowColor(c)} title="Couleur de l'ombre"
                          style={{ width: 18, height: 18, borderRadius: "50%", background: c, border: "1px solid rgba(0,0,0,0.2)", cursor: "pointer", padding: 0, flexShrink: 0 }} />
                      ))}
                      <input type="color" onChange={e => setShadowColor(e.target.value)} title="Couleur personnalisée" style={{ width: 22, height: 18, borderRadius: 4, border: "1px solid rgba(0,0,0,0.2)", cursor: "pointer", padding: 0 }} />
                    </div>
                  </>
                )}
                <p className="ps-sec-label">Halo</p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => setGlow("soft")} style={{ ...panelBtn, flex: 1 }}>✨ Glow</button>
                  <button type="button" onClick={() => setGlow("neon")} style={{ ...panelBtn, flex: 1 }}>💡 Néon</button>
                </div>
              </div>
              )}

              {/* Transformer : rotation + inclinaison */}
              <div>
                <p className="ps-sec-label">Transformer</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 5 }}>
                  <button type="button" title="Rotation −45°" onClick={() => rotateBy(-45)} style={{ ...panelBtn, fontSize: 9.5 }}>−45°</button>
                  <button type="button" title="Rotation −90°" onClick={() => rotateBy(-90)} style={{ ...panelBtn, fontSize: 9.5 }}>−90°</button>
                  <button type="button" title="Rotation 180°" onClick={() => rotateBy(180)} style={{ ...panelBtn, fontSize: 9.5 }}>180°</button>
                  <button type="button" title="Rotation +45°" onClick={() => rotateBy(45)} style={{ ...panelBtn, fontSize: 9.5 }}>+45°</button>
                  <button type="button" title="Rotation +90°" onClick={() => rotateBy(90)} style={{ ...panelBtn, fontSize: 9.5 }}>+90°</button>
                  <button type="button" title="Réinitialiser rotation/inclinaison" onClick={resetTransform} style={{ ...panelBtn, fontSize: 9.5 }}>Reset</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 6 }}>
                  <button type="button" title="Miroir horizontal" onClick={() => flip("x")} style={{ ...panelBtn, fontSize: 10 }}>⇆ Miroir H</button>
                  <button type="button" title="Miroir vertical" onClick={() => flip("y")} style={{ ...panelBtn, fontSize: 10 }}>⇅ Miroir V</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5 }}>
                  <button type="button" title="Incliner ← (H)" onClick={() => skewBy("x", -8)} style={{ ...panelBtn, fontSize: 11 }}>⇤</button>
                  <button type="button" title="Incliner → (H)" onClick={() => skewBy("x", 8)} style={{ ...panelBtn, fontSize: 11 }}>⇥</button>
                  <button type="button" title="Incliner ↑ (V)" onClick={() => skewBy("y", -8)} style={{ ...panelBtn, fontSize: 11 }}>⤒</button>
                  <button type="button" title="Incliner ↓ (V)" onClick={() => skewBy("y", 8)} style={{ ...panelBtn, fontSize: 11 }}>⤓</button>
                </div>
              </div>

              {/* Alignement sur le support */}
              <div>
                <p className="ps-sec-label">Aligner sur le support</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {([
                    ["left", "Gauche", "v", 1.5], ["centerH", "Centre H", "v", 7], ["right", "Droite", "v", 12.5],
                    ["top", "Haut", "h", 1.5], ["centerV", "Centre V", "h", 7], ["bottom", "Bas", "h", 12.5],
                  ] as const).map(([action, label, axis, pos]) => (
                    <button key={action} type="button" onClick={() => align(action)} title={label}
                      style={{ ...panelBtn, padding: "7px" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16">
                        <rect x="0.5" y="0.5" width="15" height="15" rx="2" fill="none" stroke={pMuted} strokeWidth="1" />
                        {axis === "v"
                          ? <rect x={pos} y="3" width="2" height="10" rx="1" fill={G} />
                          : <rect x="3" y={pos} width="10" height="2" rx="1" fill={G} />}
                      </svg>
                    </button>
                  ))}
                </div>
                {sel.multi && (
                  <div style={{ marginTop: 6 }}>
                    <p className="ps-sec-label" style={{ marginTop: 4 }}>Aligner la sélection</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5 }}>
                      {([
                        ["left", "Bords gauches", "⇤"], ["centerH", "Centres (H)", "⇔"], ["right", "Bords droits", "⇥"],
                        ["top", "Bords hauts", "⤒"], ["middleV", "Centres (V)", "⇕"], ["bottom", "Bords bas", "⤓"],
                      ] as [AlignMode, string, string][]).map(([m, t, g]) => (
                        <button key={m} type="button" onClick={() => alignSelection(m)} title={t}
                          style={{ ...panelBtn, padding: "7px 0", fontSize: 13, justifyContent: "center" }}>{g}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button type="button" onClick={() => distribute("h")} style={{ ...panelBtn, flex: 1, fontSize: 9.5 }} title="Espacer régulièrement à l'horizontale (≥ 3 objets)">⇄ Distribuer H</button>
                      <button type="button" onClick={() => distribute("v")} style={{ ...panelBtn, flex: 1, fontSize: 9.5 }} title="Espacer régulièrement à la verticale (≥ 3 objets)">⇅ Distribuer V</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions rapides */}
              <div>
                <p className="ps-sec-label">Actions</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <button type="button" onClick={() => layer("dup")}   style={panelBtn}><Copy size={12} /> Dupliquer</button>
                  <button type="button" onClick={() => layer("lock")}  style={{ ...panelBtn, color: sel.locked ? G : pInk }}>
                    {sel.locked ? <Lock size={12} /> : <Unlock size={12} />} {sel.locked ? "Verr." : "Libre"}
                  </button>
                  <button type="button" onClick={() => flip("x")} style={panelBtn} title="Miroir horizontal">⇆ Miroir H</button>
                  <button type="button" onClick={() => flip("y")} style={panelBtn} title="Miroir vertical">⇅ Miroir V</button>
                  <button type="button" onClick={copyStyle} style={{ ...panelBtn, gridColumn: hasStyleClip ? "auto" : "1 / 3" }} title="Copier l'apparence">🎨 Copier le style</button>
                  {hasStyleClip && <button type="button" onClick={pasteStyle} style={{ ...panelBtn, color: G }} title="Appliquer le style copié">Coller le style</button>}
                  {sel.multi && <button type="button" onClick={groupSel} style={{ ...panelBtn, gridColumn: "1 / 3", color: G }}>⊞ Grouper</button>}
                  {sel.isGroupObj && <button type="button" onClick={ungroupSel} style={{ ...panelBtn, gridColumn: "1 / 3" }}>⊟ Dégrouper</button>}
                </div>
                <button type="button" onClick={() => layer("del")}
                  style={{ ...panelBtn, width: "100%", marginTop: 6, background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", color: "#FF6B6B" }}>
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>
              </div>
            </div>
        )}

        {/* Garde-fou scannabilite du QR */}
        {qrIssues && (
          <div style={landscapeMobile
            ? { position: "absolute", left: 12, right: 12, bottom: sel && !regOpen ? 84 : 16, zIndex: 39, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "#2A2410", border: "1px solid rgba(217,160,40,0.55)", borderRadius: 12, color: "#F0D89A", fontSize: 11.5, fontWeight: 600, boxShadow: "0 8px 26px rgba(0,0,0,0.5)" }
            : { position: "absolute", bottom: 62, right: 108, zIndex: 39, display: "flex", alignItems: "center", gap: 7, padding: "7px 11px", background: "#FEF3E2", border: "1px solid rgba(217,160,40,0.5)", borderRadius: 10, color: "#92520E", fontSize: 11, fontWeight: 600, maxWidth: 240, boxShadow: "0 8px 22px rgba(0,0,0,0.14)" }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
            <span>{qrIssues.covered ? "Un élément couvre le QR — il risque de ne pas se scanner." : "QR un peu petit : agrandis-le pour un scan fiable."}</span>
          </div>
        )}

        {/* Barre contextuelle flottante DESKTOP (mobile -> barre contextuelle du bas dediee) */}
        {sel && !landscapeMobile && (
          <div className="ps-pop" style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 40, display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", maxWidth: "92%", flexWrap: "wrap" }}>
            {sel.isQr ? (
              regenQr ? (
                <>
                  <span style={{ color: MUTED, fontSize: 10, fontWeight: 700, marginRight: 1 }}>QR</span>
                  {QR_FG.map(c => (
                    <button key={c} type="button" disabled={qrBusy} onClick={() => applyQrRender({ fg: c })} title="Couleur du QR (scannable)"
                      style={{ width: 18, height: 18, borderRadius: "50%", cursor: "pointer", background: c, border: qrFg.toUpperCase() === c.toUpperCase() ? `2px solid ${G}` : "1px solid rgba(0,0,0,0.25)", padding: 0, flexShrink: 0, opacity: qrBusy ? 0.5 : 1 }} />
                  ))}
                  <span style={{ width: 1, height: 20, background: "rgba(0,0,0,0.12)" }} />
                  {QR_DOTS.map(d => (
                    <button key={d.k} type="button" disabled={qrBusy} onClick={() => applyQrRender({ dotStyle: d.k })} title={`Style : ${d.label}`}
                      style={{ ...tb, fontSize: 13, color: qrDot === d.k ? G : INK, opacity: qrBusy ? 0.5 : 1 }}>{d.icon}</button>
                  ))}
                  {qrBusy && <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite", color: G }} />}
                  <span style={{ width: 1, height: 20, background: "rgba(0,0,0,0.12)" }} />
                  <button type="button" style={tb} title="Réduire le QR" onClick={() => scaleQrBy(0.9)}>QR−</button>
                  <button type="button" style={tb} title="Agrandir le QR" onClick={() => scaleQrBy(1.1)}>QR+</button>
                  <button type="button" style={tb} title="Moins de marge blanche" onClick={() => adjustQrMargin(0.94)}>▫−</button>
                  <button type="button" style={tb} title="Plus de marge blanche" onClick={() => adjustQrMargin(1.06)}>▫+</button>
                  <span style={{ width: 1, height: 20, background: "rgba(0,0,0,0.12)" }} />
                  <button type="button" style={{ ...tb, width: "auto", padding: "0 10px", fontWeight: 700 }} title="Cadre + « Scannez-moi »" onClick={dressQr}>🏷️ Habiller</button>
                </>
              ) : (
                <span style={{ color: MUTED, fontSize: 10.5 }}>QR — glisse les poignées pour redimensionner</span>
              )
            ) : sel.isImage ? (
              <>
                <span style={{ color: MUTED, fontSize: 10, fontWeight: 700, marginRight: 1 }}>Photo</span>
                {([["dark", "Foncé"], ["gray", "N&B"], ["vintage", "Vintage"], ["luxe", "Luxe"], ["blur", "Flou"], ["duo", "Teinte"]] as const).map(([k, label]) => (
                  <button key={k} type="button" style={{ ...tb, fontSize: 11 }} title={`Filtre : ${label}`} onClick={() => toggleFilter(k)}>{label}</button>
                ))}
              </>
            ) : (<>
            {sel.isText ? (
              <>
                <input type="color" value={/^#/.test(sel.fill) ? sel.fill : "#C9A84C"} onChange={e => setFill(e.target.value)} style={swatch} />
                <button type="button" style={tb} title="Réduire" onClick={() => mutate(o => (o as fabric.IText).set("fontSize", Math.max(8, sel.fontSize - 2)))}>A−</button>
                <span style={{ color: MUTED, fontSize: 11, minWidth: 22, textAlign: "center" }}>{Math.round(sel.fontSize)}</span>
                <button type="button" style={tb} title="Agrandir" onClick={() => mutate(o => (o as fabric.IText).set("fontSize", sel.fontSize + 2))}>A+</button>
                <button type="button" style={{ ...tb, color: sel.bold ? G : INK, fontWeight: 800 }} onClick={() => mutate(o => (o as fabric.IText).set("fontWeight", sel.bold ? "normal" : "bold"))}>B</button>
                <button type="button" style={{ ...tb, color: sel.italic ? G : INK, fontStyle: "italic" }} onClick={() => mutate(o => (o as fabric.IText).set("fontStyle", sel.italic ? "normal" : "italic"))}>I</button>
                <button type="button" style={{ ...tb, color: sel.underline ? G : INK, textDecoration: "underline" }} onClick={() => mutate(o => (o as fabric.IText).set("underline", !sel.underline))}>U</button>
                <button type="button" style={{ ...tb, color: sel.strike ? G : INK, textDecoration: "line-through" }} title="Barré" onClick={() => mutate(o => (o as fabric.IText).set("linethrough", !sel.strike))}>S</button>
              </>
            ) : sel.label !== null ? (
              <>
                <input value={sel.label} onChange={e => setLabel(e.target.value)} placeholder="Texte"
                  style={{ background: BG, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 7, padding: "5px 8px", color: INK, fontSize: 11, width: 130, outline: "none" }} />
                <input type="color" value={/^#/.test(sel.fill) ? sel.fill : "#C9A84C"} onChange={e => setFill(e.target.value)} style={swatch} title="Couleur du fond" />
              </>
            ) : (
              <input type="color" value={/^#/.test(sel.fill) ? sel.fill : "#C9A84C"} onChange={e => setFill(e.target.value)} style={swatch} title="Couleur" />
            )}
            </>)}
            <span style={{ width: 1, height: 20, background: "rgba(0,0,0,0.12)" }} />
            <button type="button" style={tb} title="Dupliquer" onClick={() => layer("dup")}><Copy size={14} /></button>
            <button type="button" style={tb} title="Pivoter +90°" onClick={() => rotateBy(90)}><RotateCw size={14} /></button>
            <button type="button" style={tb} title="Centrer sur le support" onClick={() => { align("centerH"); align("centerV") }}><AlignCenterHorizontal size={14} /></button>
            <button type="button" style={tb} title="Mettre devant" onClick={() => layer("front")}><ChevronUp size={14} /></button>
            <button type="button" style={tb} title="Mettre derrière" onClick={() => layer("back")}><ChevronDown size={14} /></button>
            <button type="button" style={{ ...tb, color: sel.locked ? G : INK }} title={sel.locked ? "Déverrouiller" : "Verrouiller"} onClick={() => layer("lock")}>{sel.locked ? <Unlock size={14} /> : <Lock size={14} />}</button>
            <button type="button" style={{ ...tb, color: "#FF6B6B" }} title="Supprimer" onClick={() => layer("del")}><Trash2 size={14} /></button>
          </div>
        )}

        {/* Astuce d'accueil (masquable, une seule fois) : guide le debutant quand rien
            n'est selectionne. Positionnee AU-DESSUS de la barre mobile pour ne pas
            masquer le canvas (#16), croix a cible tactile 30px, fermeture persistee. */}
        {!sel && !hintOff && (
          <div style={{ position: "absolute", bottom: landscapeMobile ? "calc(104px + env(safe-area-inset-bottom))" : 14, left: "50%", transform: "translateX(-50%)", zIndex: 35, display: "flex", alignItems: "center", gap: 8, padding: "7px 8px 7px 13px", background: "#FFFFFF", border: "1px solid rgba(201,168,76,0.45)", borderRadius: 999, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", maxWidth: "92%" }}>
            <Sparkles size={13} color={G} style={{ flexShrink: 0 }} />
            <span style={{ color: INK, fontSize: 11.5 }}>Choisis un <b>modèle</b>, ou <b>double-clique</b> pour ajouter du texte.</span>
            <button type="button" onClick={dismissHint} aria-label="Masquer l'astuce"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 999, color: MUTED, cursor: "pointer", flexShrink: 0 }}><X size={14} /></button>
          </div>
        )}
      </div>

      {/* Ecran d'accueil guide : Metier -> Objectif -> Style -> design pret */}
      {showStart && (
        <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "linear-gradient(180deg,#FFFFFF,#F1F4F8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "DM Sans, sans-serif", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: G }} />
            <span style={{ color: MUTED, fontSize: 11.5, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>QR Print Studio</span>
          </div>
          {/* progression */}
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {["metier", "objectif", "design"].map((s, i) => (
              <span key={s} style={{ width: startStep === s ? 22 : 8, height: 8, borderRadius: 999, background: ["metier", "objectif", "design"].indexOf(startStep) >= i ? G : "rgba(0,0,0,0.12)", transition: "all .2s" }} />
            ))}
          </div>

          {startStep === "metier" && (
            <>
              <h2 style={{ color: INK, fontSize: 26, fontWeight: 800, margin: "0 0 6px", textAlign: "center" }}>Vous êtes…</h2>
              <p style={{ color: MUTED, fontSize: 13.5, margin: "0 0 24px", textAlign: "center", maxWidth: 440, lineHeight: 1.5 }}>On vous prépare un design pro en 3 choix, sans réglage technique.</p>
              <div style={{ display: "grid", gridTemplateColumns: orMobile ? "repeat(2, 1fr)" : "repeat(4, minmax(120px, 150px))", gap: 12, width: "100%", maxWidth: orMobile ? 420 : "100%" }}>
                {GUIDE_METIERS.map(m => (
                  <button key={m.id} className="ps-goal" type="button" onClick={() => { setGuideMetier(m); setStartStep("objectif") }}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: orMobile ? "22px 12px" : "20px 12px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 16, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                    <span style={{ fontSize: orMobile ? 36 : 32 }}>{m.emoji}</span>
                    <span style={{ color: INK, fontSize: orMobile ? 14 : 13, fontWeight: 700, textAlign: "center" }}>{m.label}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 24, alignItems: "center" }}>
                <button type="button" onClick={() => { setShowStart(false); setTplOpen(true) }} style={{ background: "none", border: "none", color: INK, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Parcourir tous les modèles</button>
                <button type="button" onClick={() => { setShowStart(false); setTplOpen(true) }} style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer" }}>Page vierge</button>
              </div>
            </>
          )}

          {startStep === "objectif" && guideMetier && (
            <>
              <button type="button" onClick={() => setStartStep("metier")} style={{ background: "none", border: "none", color: MUTED, fontSize: 12.5, cursor: "pointer", marginBottom: 8 }}>← {guideMetier.emoji} {guideMetier.label}</button>
              <h2 style={{ color: INK, fontSize: 26, fontWeight: 800, margin: "0 0 6px", textAlign: "center" }}>Votre objectif ?</h2>
              <p style={{ color: MUTED, fontSize: 13.5, margin: "0 0 24px", textAlign: "center" }}>Que doit faire votre support ?</p>
              <div style={{ display: "grid", gridTemplateColumns: orMobile ? "repeat(2, 1fr)" : "repeat(2, minmax(180px, 220px))", gap: 12, width: "100%", maxWidth: orMobile ? 440 : "100%" }}>
                {guideMetier.objs.map(obj => OBJ_META[obj] && (
                  <button key={obj} className="ps-goal" type="button" onClick={() => { setGuideObj(obj); setStartStep("design") }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 14, cursor: "pointer", textAlign: "left", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                    <span style={{ fontSize: 26 }}>{OBJ_META[obj].emoji}</span>
                    <span style={{ color: INK, fontSize: 13.5, fontWeight: 700 }}>{OBJ_META[obj].label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {startStep === "design" && (
            <>
              <button type="button" onClick={() => setStartStep("objectif")} style={{ background: "none", border: "none", color: MUTED, fontSize: 12.5, cursor: "pointer", marginBottom: 8 }}>← Objectif</button>
              <h2 style={{ color: INK, fontSize: 26, fontWeight: 800, margin: "0 0 6px", textAlign: "center" }}>Choisissez un design</h2>
              <p style={{ color: MUTED, fontSize: 13.5, margin: "0 0 22px", textAlign: "center" }}>Cliquez — c'est prêt à exporter. Tout reste modifiable.</p>
              <div style={{ display: "grid", gridTemplateColumns: orMobile ? "repeat(2, 1fr)" : "repeat(4, minmax(120px, 150px))", gap: 14, width: "100%", maxWidth: orMobile ? 440 : "100%" }}>
                {(OBJ_META[guideObj]?.pool ?? []).map(id => {
                  const t = PRINT_TEMPLATES.find(x => x.id === id); if (!t) return null
                  return (
                    <button key={id} className="ps-goal" type="button" disabled={starting} onClick={() => guidedPick(id)}
                      style={{ display: "flex", flexDirection: "column", gap: 7, padding: 8, background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 13, cursor: starting ? "wait" : "pointer", opacity: starting ? 0.5 : 1 }}>
                      {tplThumb(t, thumbCache[guideObj])}
                      <span style={{ color: INK, fontSize: 10.5, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{t.label.split(" — ")[1] ?? t.label}</span>
                    </button>
                  )
                })}
              </div>
              <button type="button" onClick={() => { setShowStart(false); setTplOpen(true) }} style={{ marginTop: 20, background: "none", border: "none", color: INK, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Voir tous les modèles</button>
            </>
          )}

          {starting && <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8, color: G, fontSize: 13, fontWeight: 600 }}><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Création de votre design…</div>}
        </div>
      )}

      {/* Contrôle qualité avant impression (Print Center) */}
      {preflight && (
        <PrintCenterPanel result={preflight} onClose={() => setPreflight(null)} onExport={() => exportImage("png")} />
      )}

      {/* Aide & raccourcis */}
      {showHelp && (
        <div onClick={() => setShowHelp(false)} style={{ position: "fixed", inset: 0, zIndex: 4200, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "DM Sans, sans-serif" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(560px,100%)", maxHeight: "86vh", overflowY: "auto", background: SURFACE, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ color: INK, fontWeight: 800, fontSize: 16 }}>Aide & raccourcis</span>
              <button type="button" onClick={() => setShowHelp(false)} aria-label="Fermer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 8, color: MUTED, cursor: "pointer" }}><X size={14} /></button>
            </div>
            <p style={{ color: G, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Astuces</p>
            <ul style={{ color: INK, fontSize: 12.5, lineHeight: 1.7, margin: "0 0 16px", paddingLeft: 18 }}>
              <li>Choisis un <b>modèle</b> dans la galerie, puis personnalise tout.</li>
              <li><b>Double-clic</b> sur une zone vide = ajouter un texte.</li>
              <li><b>Double-clic</b> sur un texte = l'éditer.</li>
              <li>Sélectionne un élément pour voir la <b>barre d'outils flottante</b> (couleur, calques, réglages).</li>
              <li>Le <b>guide doré</b> apparaît quand un élément est centré.</li>
              <li>Ton QR reste net : ne le déforme pas (garde-fou intégré).</li>
            </ul>
            <p style={{ color: G, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Raccourcis clavier</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
              {([
                ["Suppr", "Supprimer la sélection"], ["Ctrl + C / V", "Copier / Coller"],
                ["Ctrl + D", "Dupliquer"], ["Ctrl + Z / Y", "Annuler / Rétablir"],
                ["Ctrl + S", "Enregistrer"], ["Ctrl + A", "Tout sélectionner"], ["Ctrl + G", "Grouper"],
                ["Ctrl + Maj + G", "Dégrouper"], ["Ctrl + + / − / 0", "Zoom"],
                ["Flèches", "Déplacer (Maj = plus vite)"], ["Échap", "Désélectionner"],
              ] as const).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <kbd style={{ flexShrink: 0, background: "rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 6, padding: "2px 7px", color: INK, fontSize: 10.5, fontWeight: 600, fontFamily: "monospace" }}>{k}</kbd>
                  <span style={{ color: MUTED }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Apercu en situation (mockup) */}
      {mockOpen && (() => {
        const scenes: Record<string, { bg: string; transform: string; maxH: string; glass?: boolean; frame?: boolean }> = {
          wall:   { bg: "linear-gradient(180deg,#ece7dd 0%,#ddd6ca 62%,#c7bfb0 62%,#b4ac9c 100%)", transform: "none", maxH: "74%" },
          table:  { bg: "linear-gradient(180deg,#3a2a1c,#5a4330)", transform: "perspective(1300px) rotateX(50deg)", maxH: "62%" },
          window: { bg: "linear-gradient(135deg,#d3e6ed,#a9c6d2 55%,#8aacba)", transform: "rotate(-2deg)", maxH: "62%", glass: true },
          desk:   { bg: "linear-gradient(180deg,#2c2c31,#191920)", transform: "perspective(1500px) rotateX(44deg) rotateZ(-3deg)", maxH: "56%" },
          cadre:  { bg: "linear-gradient(180deg,#e6ded2,#cdc4b4)", transform: "none", maxH: "70%", frame: true },
          counter:{ bg: "linear-gradient(180deg,#d9d2c6 0%,#cfc7b8 54%,#8d7f6a 54%,#6f6353 100%)", transform: "perspective(1400px) rotateX(38deg)", maxH: "58%" },
          main:   { bg: "linear-gradient(180deg,#cdb3a0,#a98a73)", transform: "perspective(1500px) rotateX(14deg) rotateZ(-4deg)", maxH: "60%" },
          carte:  { bg: "linear-gradient(160deg,#e8e2d6,#c9c0ad)", transform: "perspective(1500px) rotateX(50deg) rotateZ(2deg)", maxH: "40%" },
        }
        const s = scenes[mockEnv]
        const ORDER = ["wall", "table", "window", "desk", "cadre", "counter", "main", "carte"] as const
        const goScene = (d: number) => { const i = ORDER.indexOf(mockEnv); setMockEnv(ORDER[(i + d + ORDER.length) % ORDER.length]) }
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", fontFamily: "DM Sans, sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
              <span style={{ color: "#F5F0E8", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}><Eye size={15} /> Aperçu en situation</span>
              <button type="button" onClick={() => setMockOpen(false)} aria-label="Fermer" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 9, color: "#F5F0E8", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div className="qr-scroll" style={{ display: "flex", gap: 8, justifyContent: "flex-start", padding: "0 16px 12px", overflowX: "auto", scrollbarWidth: "none" as const, WebkitOverflowScrolling: "touch" }}>
              {([["wall", "Mur"], ["table", "Table"], ["window", "Vitrine"], ["desk", "Bureau"], ["cadre", "Cadre"], ["counter", "Comptoir"], ["main", "En main"], ["carte", "Carte de visite"]] as const).map(([id, l]) => (
                <button key={id} type="button" onClick={() => setMockEnv(id)}
                  style={{ flexShrink: 0, padding: "7px 16px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: mockEnv === id ? 700 : 500, whiteSpace: "nowrap" as const, background: mockEnv === id ? "rgba(201,168,76,0.22)" : "rgba(255,255,255,0.08)", border: `1px solid ${mockEnv === id ? G : "rgba(255,255,255,0.16)"}`, color: mockEnv === id ? G : "#E8E6E0" }}>{l}</button>
              ))}
            </div>
            <div
              onTouchStart={e => { mockTouchX.current = e.touches[0].clientX }}
              onTouchEnd={e => { if (mockTouchX.current == null) return; const dx = e.changedTouches[0].clientX - mockTouchX.current; if (dx < -50) goScene(1); else if (dx > 50) goScene(-1); mockTouchX.current = null }}
              style={{ flex: 1, margin: "0 16px 16px", borderRadius: 16, overflow: "hidden", position: "relative", background: mockBg ? `#222 url(${mockBg}) center/cover no-repeat` : s.bg, display: "flex", alignItems: "center", justifyContent: "center", perspective: "1400px" }}>
              {/* vignette : profondeur photo (bords assombris) */}
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(120% 95% at 50% 38%, transparent 52%, rgba(0,0,0,0.32) 100%)" }} />
              {mockUrl && (s.frame
                ? <div style={{ maxHeight: s.maxH, maxWidth: "62%", padding: "3% 3% 3%", background: "linear-gradient(145deg,#3a2c18,#1c140a)", borderRadius: 4, boxShadow: "0 40px 70px rgba(0,0,0,0.5), 0 6px 14px rgba(0,0,0,0.35)", display: "flex" }}>
                    <div style={{ padding: "5%", background: "#fff" }}><img src={mockUrl} alt="aperçu" style={{ maxHeight: "100%", maxWidth: "100%", display: "block" }} /></div>
                  </div>
                : <img src={mockUrl} alt="aperçu" style={{ maxHeight: s.maxH, maxWidth: "62%", transform: s.transform, transformOrigin: "center", boxShadow: "0 40px 70px rgba(0,0,0,0.45), 0 6px 14px rgba(0,0,0,0.3)", borderRadius: 3 }} />)}
              {s.glass && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg,rgba(255,255,255,0.28) 0%,transparent 28%,transparent 70%,rgba(255,255,255,0.18) 100%)", pointerEvents: "none" }} />}
              {/* Points + indice de swipe */}
              <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, pointerEvents: "none" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {ORDER.map(id => <span key={id} style={{ width: id === mockEnv ? 18 : 6, height: 6, borderRadius: 6, background: id === mockEnv ? G : "rgba(255,255,255,0.4)", transition: "width .2s" }} />)}
                </div>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 10.5, fontWeight: 600, background: "rgba(0,0,0,0.35)", padding: "3px 10px", borderRadius: 999, backdropFilter: "blur(4px)" }}>‹ glissez pour changer de décor ›</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Menu clic-droit */}
      {ctx && (
        <>
          <div onClick={() => setCtx(null)} onContextMenu={e => { e.preventDefault(); setCtx(null) }} style={{ position: "fixed", inset: 0, zIndex: 3500 }} />
          <div style={{ position: "fixed", left: Math.min(ctx.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 180), top: ctx.y, zIndex: 3600, background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10, padding: 6, minWidth: 168, boxShadow: "0 12px 36px rgba(0,0,0,0.18)" }}>
            {([
              ["Dupliquer", () => layer("dup")],
              ["Mettre devant", () => layer("front")],
              ["Mettre derrière", () => layer("back")],
              [sel?.locked ? "Déverrouiller" : "Verrouiller", () => layer("lock")],
              ["__del__", () => layer("del")],
            ] as const).map(([label, fn], i) => (
              <button key={i} type="button" onClick={() => { fn(); setCtx(null) }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: "none", borderRadius: 7, color: label === "__del__" ? "#FF6B6B" : INK, fontSize: 12, cursor: "pointer" }}>
                {label === "__del__" ? "Supprimer" : label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
  // Immersion (#18) : porte le studio directement dans <body> pour garantir un plein
  // ecran reel (insensible a un ancetre transforme qui donnerait un effet "popup").
  return typeof document !== "undefined" ? createPortal(root, document.body) : root
}
