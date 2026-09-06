"use client"

// « Créer un QR » — Lien / Wifi / Texte / Contact / Appel / Email.
// Rendu 100% local (qr-code-styling via qrRender), sans API. Deux sorties :
//  · TÉLÉCHARGEMENT PNG/SVG : fichier, contenu encodé directement, rien à gérer.
//  · COMPTE : QR MODIFIABLE après impression (lien/texte/appel/email → redirigé
//    /q/<code>, destination changeable, suivi des scans, sans expiration) ou
//    STATIQUE (Wi-Fi/Contact → doivent fonctionner hors ligne).
//
// La page s'appelait « QR Dynamique », du nom de l'abonnement qu'elle vendait —
// alors qu'elle fabrique surtout des QR ordinaires, et que la page voisine
// s'annonçait aussi comme celle qui « crée des QR codes ». Elle porte maintenant
// le nom de ce qu'elle fait.
import { useCallback, useMemo, useRef, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Check, QrCode as QrIcon, ShieldCheck, AlertTriangle, Upload, X, Link2, Wifi, Type, Contact, Phone, Mail, Save, Trash2, ChevronDown, Zap, BarChart3, Clock, Calendar, TrendingUp, Activity, Pencil, Lock, Pause, Play } from "lucide-react"
import Particles from "@/components/Particles"
import { countryFlag, DEVICE_LABEL } from "@/lib/scanStats"
import { canDynSecurite, canDynMasse } from "@/lib/plans"
import { etatQuota } from "./quotaQr"
import { parseBulkCsv } from "@/lib/bulkCsv"
import QRCanvas from "../qr-codes/QRCanvas"
import QrWatermark from "@/components/QrWatermark"
import { getQRBlob, type QROptions, type QRStyleConfig } from "../qr-codes/qrRender"
import { normalizeUrl, buildWifi, buildVCard, buildTel, buildEmail, type VCardFields } from "./qrLinkUtils"
import { rapportContraste, estInverse, CONTRASTE_INSUFFISANT } from "@/lib/contrasteQr"
import { STYLES_QR, formeQr, ENCRES_QR, FONDS_QR, NIVEAUX_ECC, typesQr, presetQr, nommerCouleur, estTypeDynamique, libelleTypeQr, STYLE_QR_DEFAUT, ENCRE_QR_DEFAUT, FOND_QR_DEFAUT, ECC_DEFAUT, type TypeQr, type NiveauEcc } from "@/lib/stylesQr"
import PostCheckoutBanner from "@/components/PostCheckoutBanner"
import Dialogue from "@/components/Dialogue"
import ImportEnMasse from "./ImportEnMasse"
import StatistiquesQr from "./StatistiquesQr"
import { useFermetureModale, carteCliquable } from "@/lib/useFermetureModale"
import { etatLien, styleSur, type InstantQr, type StatsLien } from "./instantQr"
import { Button } from "@/components/ui/Button"
import { useSessionShell } from "../sessionShell"

const G = "#C9A84C"
const MUTED = "#A8A190"

// Styles, pastilles, noms de couleurs et niveaux de correction viennent tous de
// @/lib/stylesQr : cet écran et le générateur public fabriquent le même objet et
// ne doivent plus pouvoir en donner deux descriptions différentes. Ne restent ici
// que l'icône et l'ordre des types offerts SUR CET ÉCRAN.
const ICONES: Partial<Record<TypeQr, any>> = { link: Link2, wifi: Wifi, text: Type, contact: Contact, phone: Phone, email: Mail }
const TYPES = typesQr(["link", "wifi", "text", "contact", "phone", "email"])

type WifiEnc = "WPA" | "WEP" | "nopass"
type EmailFields = { to?: string; subject?: string; body?: string }

const EMPTY_VC: VCardFields = { firstName: "", lastName: "", phone: "", email: "", org: "", title: "", url: "" }
const EMPTY_EM: EmailFields = { to: "", subject: "", body: "" }

// Ce que la boîte de dialogue demande. Une seule à la fois, jamais deux invites
// empilées comme le permettaient les prompt natifs enchaînés.
type Demande =
  | { type: "destination"; qr: InstantQr; valeur: string }
  | { type: "motDePasse"; qr: InstantQr; valeur: string }
  | { type: "retirerMotDePasse"; qr: InstantQr }
  | { type: "expiration"; qr: InstantQr; valeur: string }
  | { type: "supprimer"; qr: InstantQr }
  | { type: "message"; titre: string; texte: string }
  | null

// Types éligibles au QR DYNAMIQUE (redirigé + expirable). Wi-Fi/Contact restent statiques.


// Champs qui determinent la charge utile du QR (partages entre l'etat live et l'historique).
type QrSource = {
  type: TypeQr; url: string; ssid: string; wifiPass: string; wifiEnc: WifiEnc; text: string
  vc: VCardFields; phone: string; em: EmailFields
}
type QrHistEntry = QrSource & {
  fg: string; bg: string; ecc: NiveauEcc; styleKey: string
}

// Charge utile encodee dans le QR selon le type.
function payload(s: QrSource): string {
  if (s.type === "wifi") return buildWifi(s.ssid, s.wifiPass, s.wifiEnc)
  if (s.type === "text") return s.text.trim()
  if (s.type === "contact") return buildVCard(s.vc)
  if (s.type === "phone") return buildTel(s.phone)
  if (s.type === "email") return buildEmail(s.em.to ?? "", s.em.subject, s.em.body)
  return normalizeUrl(s.url)
}

export default function QrLinkPage() {
  const [qrType, setQrType] = useState<TypeQr>("link")
  const [url, setUrl] = useState("")
  const [ssid, setSsid] = useState("")
  const [wifiPass, setWifiPass] = useState("")
  const [wifiEnc, setWifiEnc] = useState<WifiEnc>("WPA")
  const [text, setText] = useState("")
  const [vc, setVc] = useState<VCardFields>(EMPTY_VC)
  const [phone, setPhone] = useState("")
  const [em, setEm] = useState<EmailFields>(EMPTY_EM)
  const [fg, setFg] = useState<string>(ENCRE_QR_DEFAUT)
  const [bg, setBg] = useState<string>(FOND_QR_DEFAUT)
  const [ecc, setEcc] = useState<NiveauEcc>(ECC_DEFAUT)
  const [styleKey, setStyleKey] = useState<string>(STYLE_QR_DEFAUT)
  const [logo, setLogo] = useState<string | null>(null)
  const [showStyle, setShowStyle] = useState(false) // « Apparence » repliée par défaut (montrer moins)
  const [busy, setBusy] = useState<null | "png" | "svg">(null)
  const [done, setDone] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)
  // QR instantanés ENREGISTRÉS (persistants, comptent dans le quota du plan limits.qr)
  const [saved, setSaved] = useState<InstantQr[]>([])
  const [plan, setPlan] = useState("free")
  const [dlSig, setDlSig] = useState<string | null>(null) // design déjà consommé au téléchargement (évite de reconsommer PNG→SVG du même design)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)
  // Un seul minuteur pour le bandeau volant : deux enregistrements rapprochés
  // faisaient effacer le message du second par le minuteur du premier.
  const minuteurMsg = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [demande, setDemande] = useState<Demande>(null)
  const [detail, setDetail] = useState<InstantQr | null>(null) // aperçu détaillé d'un QR enregistré (clic)
  const [detailCopied, setDetailCopied] = useState(false)
  const [stats, setStats] = useState<InstantQr | null>(null) // pop-up statistiques d'un lien dynamique
  const [bulkOpen, setBulkOpen] = useState(false) // fenêtre d'import en masse (Business)
  const bulkFileInput = useRef<HTMLInputElement>(null)

  // Sur desktop (2 colonnes), on déplie « Apparence » par défaut pour remplir la colonne
  // de gauche et équilibrer avec l'aperçu à droite. Sur mobile, elle reste repliée.
  // Déplié dès qu'il y a deux colonnes. Évalué au montage ET au redimensionnement :
  // ouvrir la page en petit puis élargir laissait le panneau replié, l'inverse
  // exact de ce que la mise en page à deux colonnes attend.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 920px)")
    const suivre = () => { if (mq.matches) setShowStyle(true) }
    suivre()
    mq.addEventListener("change", suivre)
    return () => mq.removeEventListener("change", suivre)
  }, [])


  // Affiche un message éphémère, en annulant celui d'avant. Nettoyé au démontage.
  const annoncer = (text: string, ok: boolean, ms = 3500) => {
    if (minuteurMsg.current) clearTimeout(minuteurMsg.current)
    setSaveMsg({ text, ok })
    minuteurMsg.current = setTimeout(() => setSaveMsg(null), ms)
  }
  useEffect(() => () => { if (minuteurMsg.current) clearTimeout(minuteurMsg.current) }, [])

  const data = useMemo(() => payload({ type: qrType, url, ssid, wifiPass, wifiEnc, text, vc, phone, em }), [qrType, url, ssid, wifiPass, wifiEnc, text, vc, phone, em])
  const ready = data.length > 0
  const ratio = rapportContraste(fg, bg) ?? 0
  const inverted = estInverse(fg, bg)
  const dynamic = estTypeDynamique(qrType)
  // Quota atteint — MÊME règle que le serveur (lib/quota). Neutralise l'aperçu + désactive
  // les actions qui donneraient un QR fonctionnel du design courant (fermeture de la fuite
  // par screenshot, cf. générateur). Un design DÉJÀ téléchargé (dlSig) reste re-téléchargeable.
  const curSig = `${qrType}|${data}`
  // UNE seule source pour « peut-on, et sinon pourquoi » (voir quotaQr.ts). Trois
  // compteurs indépendants vivaient ici, tous appelés « QR », et leurs messages
  // s'affichaient ensemble en se contredisant.
  const quota = etatQuota(plan, saved)
  const staticBlocked = !quota.peutEnregistrer && dlSig !== curSig
  const dynBlocked = dynamic && !quota.peutCreerModifiable
  // Aperçu neutralisé si AUCUNE action possible ne produit un QR fonctionnel : statique →
  // download statique bloqué ; dynamique → download statique ET création dynamique bloqués.
  const previewBlocked = dynamic ? (staticBlocked && dynBlocked) : staticBlocked

  // Échap, gel du défilement et restitution du focus pour les trois fenêtres.
  const fermerDetail = useCallback(() => setDetail(null), [])
  const fermerStats = useCallback(() => setStats(null), [])
  const fermerBulk = useCallback(() => setBulkOpen(false), [])
  useFermetureModale(detail !== null, fermerDetail)
  useFermetureModale(stats !== null, fermerStats)
  useFermetureModale(bulkOpen, fermerBulk)

  const [history, setHistory] = useState<QrHistEntry[]>([])
  useEffect(() => { try { const h = JSON.parse(localStorage.getItem("qrfolio_qr_history") || "[]"); if (Array.isArray(h)) setHistory(h.slice(0, 8)) } catch {} }, [])
  // Charge les QR instantanés enregistrés (serveur) — seulement avec une session :
  // un visiteur sans compte n'a rien à charger, et l'appel finissait en 401.
  const { signedIn } = useSessionShell()
  useEffect(() => {
    if (!signedIn) return
    fetch("/api/qr-instant").then(r => r.json()).then(d => { if (Array.isArray(d.items)) setSaved(d.items); if (d.plan) setPlan(d.plan) }).catch(() => {})
  }, [signedIn])
  const saveToHistory = () => setHistory(prev => {
    // Le mot de passe Wifi était écrit en clair dans localStorage à chaque
    // téléchargement — alors que le même fichier refuse explicitement de l'envoyer
    // au serveur. Le brouillon garde tout sauf lui ; on le retape, c'est tout.
    const entry: QrHistEntry = { type: qrType, url: url.trim(), ssid, wifiPass: "", wifiEnc, text: text.trim(), vc, phone, em, fg, bg, ecc, styleKey }
    const next = [entry, ...prev.filter(e => payload(e) !== data)].slice(0, 8)
    try { localStorage.setItem("qrfolio_qr_history", JSON.stringify(next)) } catch {}
    return next
  })
  const loadEntry = (h: QrHistEntry) => {
    setQrType(h.type); setUrl(h.url); setSsid(h.ssid); setWifiPass(h.wifiPass); setWifiEnc(h.wifiEnc); setText(h.text)
    setVc({ ...EMPTY_VC, ...(h.vc || {}) }); setPhone(h.phone || ""); setEm({ ...EMPTY_EM, ...(h.em || {}) })
    setFg(h.fg); setBg(h.bg); setEcc(h.ecc); setStyleKey(h.styleKey); setLogo(null)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const vcName = (v: VCardFields) => [v.firstName, v.lastName].filter(Boolean).join(" ").trim()
  const histLabel = (h: QrHistEntry) =>
    h.type === "wifi" ? `📶 ${h.ssid}`
    : h.type === "text" ? h.text
    : h.type === "contact" ? `👤 ${vcName(h.vc || {})}`
    : h.type === "phone" ? `📞 ${h.phone}`
    : h.type === "email" ? `✉️ ${h.em?.to || ""}`
    : normalizeUrl(h.url).replace(/^https?:\/\//, "")

  const preset = presetQr(styleKey)
  const effectiveEcc: NiveauEcc = logo ? "H" : ecc
  const qrStyle: QRStyleConfig = {
    dotStyle: preset.dotStyle, cornerStyle: preset.cornerStyle,
    ...(logo ? { logoUrl: logo, logoSize: 22, logoShape: "rounded" as const, logoBg: "white" as const, logoPadding: 5 } : {}),
  }

  function onLogoFile(file: File) {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => setLogo(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function download(ext: "png" | "svg") {
    if (!ready) return
    if (staticBlocked) { annoncer(quota.raison ?? "Limite atteinte sur votre plan.", false, 4500); return }
    setBusy(ext)
    try {
      // Le QR statique téléchargé est enregistré via l'API, qui applique le quota du plan
      // (gratuit 1, Starter 7, Pro 35, Business illimité). Au-delà → 403 : PAS de fichier,
      // message + upsell (aucun QR propre hors quota, tous plans confondus). Re-télécharger
      // le MÊME design (PNG puis SVG) ne reconsomme rien (mémo dlSig).
      const sig = `${qrType}|${data}`
      if (dlSig !== sig) {
        const inputs = { type: qrType, url, ssid, wifiEnc, text, vc, phone, em }
        const res = await fetch("/api/qr-instant", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: qrType, label: previewLabel || null, payload: data, inputs, style: { fg, bg, ecc: effectiveEcc, styleKey } }),
        })
        if (res.status === 401) { window.location.href = "/auth/login"; return }
        const d = await res.json().catch(() => ({}))
        if (!res.ok) { annoncer(d.error || quota.raison || "Limite atteinte sur votre plan.", false, 4500); return }
        if (d.item) setSaved(prev => [d.item, ...prev])
        setDlSig(sig)
      }
      const opts: QROptions = { data, fg, bg, ecc: effectiveEcc, style: qrStyle, size: 1024 }
      const blob = await getQRBlob(opts, ext)
      if (blob) {
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob); a.download = `qrcode.${ext}`; a.click(); URL.revokeObjectURL(a.href)
        saveToHistory(); setDone(true); setTimeout(() => setDone(false), 1800)
      }
    } finally { setBusy(null) }
  }

  // Enregistre le QR courant côté serveur (STATIQUE : contenu encodé, hors ligne). Wi-Fi/Contact.
  async function saveInstant() {
    if (!ready || saveBusy) return
    // Le contrôle manquait ici : le bouton restait cliquable au quota, partait en
    // 403, et la limite se découvrait APRÈS le clic — pendant que le bouton de
    // téléchargement, lui, était déjà verrouillé juste au-dessus.
    if (!quota.peutEnregistrer) { annoncer(quota.raison ?? "Limite atteinte sur votre plan.", false, 4500); return }
    setSaveBusy(true); setSaveMsg(null)
    try {
      // On ne stocke pas le mot de passe Wifi en clair dans `inputs` (il figure de
      // toute façon dans `payload`, inhérent au QR Wifi, protégé par la RLS proprio).
      const inputs = { type: qrType, url, ssid, wifiEnc, text, vc, phone, em }
      const res = await fetch("/api/qr-instant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: qrType, label: previewLabel || null, payload: data, inputs, style: { fg, bg, ecc: effectiveEcc, styleKey } }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.item) { setSaved(prev => [d.item, ...prev]); annoncer("Enregistré ✓", true) }
      else annoncer(d.error || "Enregistrement impossible", false)
    } catch { annoncer("Erreur réseau", false) }
    finally { setSaveBusy(false) }
  }
  async function deleteInstant(id: string) {
    try {
      const res = await fetch("/api/qr-instant", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      if (res.ok) setSaved(prev => prev.filter(s => s.id !== id))
    } catch {}
  }

  // QR DYNAMIQUE (lien/texte/appel/email) : le QR encode qrowg.com/q/<code>, expirable (essai 30 j).
  async function createDynamic() {
    if (!ready || saveBusy) return
    if (dynBlocked) { annoncer(quota.raisonModifiable ?? "Limite atteinte sur votre plan.", false, 4500); return }
    setSaveBusy(true); setSaveMsg(null)
    try {
      const inputs = { type: qrType, url, ssid, wifiEnc, text, vc, phone, em }
      const res = await fetch("/api/qr-instant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: qrType, dynamic: true, payload: data, dest: qrType === "link" ? url : data, label: previewLabel || null, inputs, style: { fg, bg, ecc: effectiveEcc, styleKey } }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.item) { setSaved(prev => [d.item, ...prev]); setDetail(d.item); annoncer("QR modifiable créé ✓", true, 4000) }
      else annoncer(d.error || "Création impossible", false, 4000)
    } catch { annoncer("Erreur réseau", false, 4000) }
    finally { setSaveBusy(false) }
  }
  // Applique un item mis à jour (PATCH) à la liste, à la fiche ouverte ET à la
  // fenêtre de statistiques. `editDest` n'écrivait que dans la liste : on modifiait
  // la destination depuis la fiche, l'API répondait OK, et la fiche continuait
  // d'afficher l'ancienne URL. Les trois copies bougent maintenant ensemble.
  function applyItem(item: InstantQr) {
    setSaved(prev => prev.map(x => x.id === item.id ? item : x))
    setDetail(d => (d && d.id === item.id ? item : d))
    setStats(st => (st && st.id === item.id ? item : st))
  }
  async function patchLink(id: string, body: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch("/api/qr-instant", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.item) { applyItem(d.item as InstantQr); return true }
      erreur(d.error || "Modification impossible"); return false
    } catch { erreur("Erreur réseau"); return false }
  }

  // ── Dialogues ─────────────────────────────────────────────────────────────
  // Huit invites natives vivaient ici : window.prompt pour la destination, pour un
  // MOT DE PASSE saisi en clair, pour une date à taper au format AAAA-MM-JJ, plus
  // cinq alert. Elles bloquent l'onglet, n'offrent aucun champ adapté, et une date
  // refusée renvoyait à zéro sans garder la saisie. Une seule boîte les remplace.
  const fermerDialogue = () => setDemande(null)
  const erreur = (texte: string) => setDemande({ type: "message", titre: "Impossible", texte })

  const demanderDestination = (s: InstantQr) => setDemande({ type: "destination", qr: s, valeur: s.dest_url || "" })
  const demanderMotDePasse = (s: InstantQr) => setDemande({ type: "motDePasse", qr: s, valeur: "" })
  const demanderRetraitMotDePasse = (s: InstantQr) => setDemande({ type: "retirerMotDePasse", qr: s })
  const demanderExpiration = (s: InstantQr) =>
    setDemande({ type: "expiration", qr: s, valeur: s.expires_at ? new Date(s.expires_at).toISOString().slice(0, 10) : "" })
  const demanderSuppression = (s: InstantQr) => setDemande({ type: "supprimer", qr: s })

  async function toggleManualPause(s: InstantQr) {
    await patchLink(s.id, { action: s.status === "active" ? "pause" : "resume" })
  }

  async function validerDialogue() {
    const d = demande
    if (!d || d.type === "message") { setDemande(null); return }
    setDemande(null)
    switch (d.type) {
      case "destination":
        if (d.valeur.trim()) await patchLink(d.qr.id, { dest: d.valeur.trim() })
        return
      case "motDePasse":
        if (d.valeur.trim()) await patchLink(d.qr.id, { password: d.valeur })
        return
      case "retirerMotDePasse":
        await patchLink(d.qr.id, { password: "" })
        return
      case "expiration": {
        if (!d.valeur) { await patchLink(d.qr.id, { expires_at: null }); return }
        const t = Date.parse(`${d.valeur}T23:59:59`)
        if (Number.isNaN(t)) { erreur("Cette date n'est pas lisible. Choisissez-la dans le calendrier."); return }
        if (t <= Date.now()) { erreur("Choisissez une date dans le futur : une date passée couperait le QR tout de suite."); return }
        await patchLink(d.qr.id, { expires_at: new Date(t).toISOString() })
        return
      }
      case "supprimer":
        await deleteInstant(d.qr.id)
        return
    }
  }

  async function copyDetail() {
    try { await navigator.clipboard.writeText(detail?.payload || ""); setDetailCopied(true); setTimeout(() => setDetailCopied(false), 1600) } catch {}
  }
  async function downloadDetail() {
    if (!detail) return
    const st = styleSur(detail)
    const opts: QROptions = { data: detail.payload, fg: st.fg, bg: st.bg, ecc: st.ecc, style: formeQr(st.styleKey), size: 1024 }
    const blob = await getQRBlob(opts, "png")
    if (blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${detail.label || libelleTypeQr(detail.kind)}.png`; a.click(); URL.revokeObjectURL(a.href) }
  }

  const dynamicLinks = saved.filter(s => s.dynamic)
  const staticQrs = saved.filter(s => !s.dynamic)
  const hasSaved = dynamicLinks.length > 0 || staticQrs.length > 0

  const secTitle: React.CSSProperties = { color: MUTED, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, marginBottom: 11, textTransform: "uppercase", letterSpacing: 1.4 }
  const subLabel: React.CSSProperties = { color: "#6E685E", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 9px 2px" }
  const accentBar = <span style={{ width: 3, height: 13, borderRadius: 2, background: G, flexShrink: 0 }} />
  const card: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 18 }
  const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 50, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "#F5F0E8", fontSize: 16, padding: "0 15px", outline: "none" }
  const dot = (c: string): React.CSSProperties => ({ width: 15, height: 15, borderRadius: 5, background: c, border: "1px solid rgba(255,255,255,0.22)", flexShrink: 0 })
  // Couleur d'avant-plan sûre pour les MINI-vignettes (toujours sur fond blanc) : si le QR enregistré
  // est trop clair/peu contrasté (ex. blanc sur fond sombre), on retombe sur du noir pour rester net.
  const safeFg = (c?: string) => ((rapportContraste(c || "#080808", "#FFFFFF") ?? 0) >= CONTRASTE_INSUFFISANT ? (c || "#080808") : "#080808")
  // Lignes de la section « Sécurité » (fiche détaillée d'un lien dynamique, Pro+).
  const secRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 }
  const secRowLabel: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, color: "#D8D2C6", fontSize: 12.5, width: 110, flexShrink: 0 }
  const secBtn: React.CSSProperties = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, color: "#F5F0E8", fontSize: 11.5, fontWeight: 600, cursor: "pointer", padding: "6px 10px", flexShrink: 0 }
  const swatch = (c: string, on: boolean, onClick: () => void, aria: string) => (
    <button key={c} onClick={onClick} aria-label={aria} aria-pressed={on} title={aria} className={`da-swatch${on ? " on" : ""}`}
      style={{ width: 44, height: 44, background: c, flexShrink: 0 }} />
  )

  const previewLabel =
    qrType === "wifi" ? (ssid ? `📶 ${ssid}` : "")
    : qrType === "text" ? text.trim()
    : qrType === "contact" ? (vcName(vc) ? `👤 ${vcName(vc)}` : "")
    : qrType === "phone" ? (phone.trim() ? `📞 ${phone.trim()}` : "")
    : qrType === "email" ? (em.to?.trim() ? `✉️ ${em.to.trim()}` : "")
    : normalizeUrl(url).replace(/^https?:\/\//, "")

  // Boutons de téléchargement PNG/SVG (fichier statique). `primary` = mis en avant.
  const spin = (size = 16) => <span aria-hidden style={{ width: size, height: size, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "mo-spin .8s linear infinite" }} />
  const downloadRow = (primary: boolean) => (
    <div style={{ display: "flex", gap: 10 }}>
      {staticBlocked ? (
        <button disabled className="da-btn-locked" style={{ flex: 1 }}><Lock size={17} /> <span>Limite atteinte</span></button>
      ) : primary ? (
        <span className="da-halo-wrap" style={{ flex: 1, display: "flex" }}>
          <button onClick={() => download("png")} disabled={!ready || busy !== null} className="da-btn-primary" style={{ flex: 1, justifyContent: "center" }}>
            {busy === "png" ? spin(18) : done ? <Check size={18} /> : <Download className="da-ic da-ic-dl" size={18} />}<span>{done ? "Téléchargé" : "Télécharger PNG"}</span>
          </button>
        </span>
      ) : (
        <button onClick={() => download("png")} disabled={!ready || busy !== null} className="da-btn-ghost" style={{ flex: 1, justifyContent: "center", padding: "15px 16px", fontSize: 14 }}>
          {busy === "png" ? spin() : done ? <Check size={16} /> : <Download size={16} />}<span>{done ? "Téléchargé" : "Télécharger PNG"}</span>
        </button>
      )}
      <button onClick={() => download("svg")} disabled={!ready || busy !== null || staticBlocked} className="da-btn-ghost" style={{ justifyContent: "center", padding: "15px 22px", fontSize: 14 }}>
        {busy === "svg" ? spin() : <span>SVG</span>}
      </button>
    </div>
  )

  return (
    <div className="rpad" style={{ position: "relative", minHeight: "100dvh", maxWidth: 1000, margin: "0 auto", padding: "18px 18px calc(40px + env(safe-area-inset-bottom))" }}>
      <PostCheckoutBanner param="upgraded" message="Paiement confirmé — votre nouveau plan est actif. 🎉" />
      <Particles behind />
      {/* 16 px de haut mesurés : c'est le chemin de retour de la page. */}
      <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, textDecoration: "none", fontSize: 13, marginBottom: 16, minHeight: 44, padding: "0 6px", marginLeft: -6 }}>
        <ArrowLeft size={16} /> Retour
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, flexShrink: 0, background: "linear-gradient(145deg,rgba(201,168,76,0.24),rgba(201,168,76,0.06))", border: "1px solid rgba(201,168,76,0.32)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <QrIcon size={24} color={G} />
        </div>
        <div>
          <h1 style={{ color: "#F5F0E8", fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.4 }}>Créer un QR code</h1>
          <p style={{ color: MUTED, fontSize: 13, margin: "2px 0 0", lineHeight: 1.4 }}>Vers un lien, votre Wi-Fi, un contact, un numéro. Modifiable après impression si vous voulez.</p>
        </div>
      </div>


      {/* Mise en page : saisie (gauche) · panneau résultat collant (droite) sur desktop. */}
      <div className="qrdyn-layout">
        <div className="qrdyn-main">

      {/* 1 · Type de QR */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {TYPES.map(t => {
          const on = qrType === t.k
          const Icon = ICONES[t.k]
          return (
            <button key={t.k} onClick={() => setQrType(t.k)} aria-pressed={on} className={`da-tile${on ? " on" : ""}`} style={{ minHeight: 60 }}>
              <Icon size={19} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* 2 · Saisie selon le type */}
      <div style={{ ...card, marginBottom: 14 }}>
        {qrType === "link" && (<>
          <p style={secTitle}>{accentBar} Lien à encoder</p>
          <input value={url} onChange={e => setUrl(e.target.value)} inputMode="url" autoComplete="url"
            placeholder="ex : monsite.fr  ou  instagram.com/moncompte" style={{ ...field, borderColor: ready ? G + "80" : "rgba(255,255,255,0.14)" }} />
          {url.trim() && normalizeUrl(url) !== url.trim() && (
            <p style={{ color: MUTED, fontSize: 11.5, margin: "9px 2px 0" }}>Encodé comme : <span style={{ color: G, fontWeight: 600 }}>{normalizeUrl(url)}</span></p>
          )}
        </>)}

        {qrType === "wifi" && (<>
          <p style={secTitle}>{accentBar} Réseau Wi-Fi</p>
          <input value={ssid} onChange={e => setSsid(e.target.value)} placeholder="Nom du réseau (SSID)" style={{ ...field, marginBottom: 10, borderColor: ssid.trim() ? G + "80" : "rgba(255,255,255,0.14)" }} />
          {wifiEnc !== "nopass" && (
            <input value={wifiPass} onChange={e => setWifiPass(e.target.value)} placeholder="Mot de passe" style={{ ...field, marginBottom: 10 }} />
          )}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 11, padding: 3 }}>
            {([["WPA", "WPA/WPA2"], ["WEP", "WEP"], ["nopass", "Ouvert"]] as [WifiEnc, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setWifiEnc(k)} aria-pressed={wifiEnc === k}
                style={{ flex: 1, minHeight: 42, borderRadius: 8, border: "none", cursor: "pointer", background: wifiEnc === k ? G : "transparent", color: wifiEnc === k ? "#080808" : MUTED, fontSize: 12, fontWeight: wifiEnc === k ? 800 : 600 }}>{l}</button>
            ))}
          </div>
          <p style={{ color: MUTED, fontSize: 11, margin: "9px 2px 0", lineHeight: 1.45 }}>Scanné, ce QR propose de rejoindre le réseau — idéal sur une table ou une affiche.</p>
        </>)}

        {qrType === "text" && (<>
          <p style={secTitle}>{accentBar} Texte</p>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="N'importe quel texte à encoder…"
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 76, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "#F5F0E8", fontSize: 15, padding: "12px 14px", lineHeight: 1.45, fontFamily: "inherit", outline: "none" }} />
        </>)}

        {qrType === "contact" && (<>
          <p style={secTitle}>{accentBar} Carte de visite</p>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input value={vc.firstName} onChange={e => setVc(v => ({ ...v, firstName: e.target.value }))} placeholder="Prénom" autoComplete="given-name"
              style={{ ...field, borderColor: vcName(vc) ? G + "80" : "rgba(255,255,255,0.14)" }} />
            <input value={vc.lastName} onChange={e => setVc(v => ({ ...v, lastName: e.target.value }))} placeholder="Nom" autoComplete="family-name" style={field} />
          </div>
          <input value={vc.phone} onChange={e => setVc(v => ({ ...v, phone: e.target.value }))} inputMode="tel" autoComplete="tel" placeholder="Téléphone" style={{ ...field, marginBottom: 10 }} />
          <input value={vc.email} onChange={e => setVc(v => ({ ...v, email: e.target.value }))} inputMode="email" autoComplete="email" placeholder="Email" style={{ ...field, marginBottom: 10 }} />
          <input value={vc.org} onChange={e => setVc(v => ({ ...v, org: e.target.value }))} autoComplete="organization" placeholder="Entreprise" style={{ ...field, marginBottom: 10 }} />
          <input value={vc.title} onChange={e => setVc(v => ({ ...v, title: e.target.value }))} autoComplete="organization-title" placeholder="Fonction (ex : Gérant)" style={{ ...field, marginBottom: 10 }} />
          <input value={vc.url} onChange={e => setVc(v => ({ ...v, url: e.target.value }))} inputMode="url" autoComplete="url" placeholder="Site web" style={field} />
          <p style={{ color: MUTED, fontSize: 11, margin: "9px 2px 0", lineHeight: 1.45 }}>Scanné, ce QR propose d&apos;enregistrer le contact. Seul un nom (ou prénom) est requis.</p>
        </>)}

        {qrType === "phone" && (<>
          <p style={secTitle}>{accentBar} Numéro à appeler</p>
          <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" type="tel"
            placeholder="ex : +33 6 12 34 56 78" style={{ ...field, borderColor: phone.trim() ? G + "80" : "rgba(255,255,255,0.14)" }} />
          <p style={{ color: MUTED, fontSize: 11, margin: "9px 2px 0", lineHeight: 1.45 }}>Scanné, ce QR propose de composer le numéro directement.</p>
        </>)}

        {qrType === "email" && (<>
          <p style={secTitle}>{accentBar} Email à contacter</p>
          <input value={em.to} onChange={e => setEm(v => ({ ...v, to: e.target.value }))} inputMode="email" autoComplete="email" type="email"
            placeholder="contact@monentreprise.fr" style={{ ...field, marginBottom: 10, borderColor: (em.to ?? "").trim() ? G + "80" : "rgba(255,255,255,0.14)" }} />
          <input value={em.subject} onChange={e => setEm(v => ({ ...v, subject: e.target.value }))} placeholder="Objet (optionnel)" style={{ ...field, marginBottom: 10 }} />
          <textarea value={em.body} onChange={e => setEm(v => ({ ...v, body: e.target.value }))} rows={2} placeholder="Message pré-rempli (optionnel)"
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 60, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "#F5F0E8", fontSize: 15, padding: "12px 14px", lineHeight: 1.45, fontFamily: "inherit", outline: "none" }} />
          <p style={{ color: MUTED, fontSize: 11, margin: "9px 2px 0", lineHeight: 1.45 }}>Scanné, ce QR ouvre un brouillon d&apos;email pré-rempli vers cette adresse.</p>
        </>)}
      </div>

      {/* 4 · Apparence (repliée par défaut : style, couleurs, correction, logo) */}
      <div style={{ ...card, padding: 0, marginBottom: 14, overflow: "hidden" }}>
        <button onClick={() => setShowStyle(v => !v)} aria-expanded={showStyle}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "15px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
          <span style={{ ...secTitle, marginBottom: 0 }}>{accentBar} Apparence</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
            {!showStyle && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 11.5 }}>
                <span style={dot(fg)} /><span style={dot(bg)} />
                <span>{preset.label}{logo ? " · logo" : ""}</span>
              </span>
            )}
            <ChevronDown size={18} color={MUTED} style={{ transform: showStyle ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
          </span>
        </button>

        {showStyle && (
          <div style={{ padding: "0 18px 18px" }}>
            <p style={secTitle}>{accentBar} Style</p>
            <div style={{ display: "flex", gap: 7, marginBottom: 4 }}>
              {STYLES_QR.map(p => {
                const on = styleKey === p.k
                return (
                  <button key={p.k} onClick={() => setStyleKey(p.k)} aria-pressed={on}
                    style={{ flex: "1 1 0", minWidth: 0, minHeight: 42, borderRadius: 10, cursor: "pointer", background: on ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? G + "66" : "rgba(255,255,255,0.1)"}`, color: on ? G : MUTED, fontSize: 11.5, fontWeight: on ? 800 : 600, transition: "all .15s" }}>{p.label}</button>
                )
              })}
            </div>

            <p style={{ ...secTitle, marginTop: 20 }}>{accentBar} Couleur du QR</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 4 }}>
              {ENCRES_QR.map(c => swatch(c, fg === c, () => setFg(c), `QR en ${nommerCouleur(c)}`))}
              <label style={{ width: 38, height: 38, borderRadius: 11, border: "2px solid rgba(255,255,255,0.14)", cursor: "pointer", overflow: "hidden", position: "relative", flexShrink: 0, background: "conic-gradient(from 0deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}>
                <input type="color" aria-label="Couleur du QR, choix libre" title="Couleur du QR" value={fg} onChange={e => setFg(e.target.value)} style={{ position: "absolute", inset: -4, opacity: 0, cursor: "pointer" }} />
              </label>
            </div>

            <p style={{ ...secTitle, marginTop: 20 }}>{accentBar} Couleur du fond</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
              {FONDS_QR.map(c => swatch(c, bg === c, () => setBg(c), `Fond ${nommerCouleur(c)}`))}
              <label style={{ width: 38, height: 38, borderRadius: 11, border: "2px solid rgba(255,255,255,0.14)", cursor: "pointer", overflow: "hidden", position: "relative", flexShrink: 0, background: "conic-gradient(from 0deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}>
                <input type="color" aria-label="Couleur du fond, choix libre" title="Couleur du fond" value={bg} onChange={e => setBg(e.target.value)} style={{ position: "absolute", inset: -4, opacity: 0, cursor: "pointer" }} />
              </label>
            </div>

            <p style={{ ...secTitle, marginTop: 20 }}>{accentBar} Correction d&apos;erreur</p>
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 11, padding: 3 }}>
              {NIVEAUX_ECC.map(o => (
                <button key={o.k} onClick={() => setEcc(o.k)} aria-pressed={ecc === o.k}
                  style={{ flex: 1, minHeight: 42, borderRadius: 8, border: "none", cursor: "pointer", background: ecc === o.k ? G : "transparent", color: ecc === o.k ? "#080808" : MUTED, fontSize: 12.5, fontWeight: ecc === o.k ? 800 : 600, transition: "all .15s" }}>{o.label}</button>
              ))}
            </div>
            <p style={{ color: MUTED, fontSize: 11, margin: "9px 2px 0", lineHeight: 1.45 }}>Plus la correction est élevée, plus le QR reste lisible s&apos;il est abîmé (utile pour l&apos;impression).</p>

            <p style={{ ...secTitle, marginTop: 20 }}>{accentBar} Logo au centre <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#6E685E" }}>· optionnel</span></p>
            {logo ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 10, background: "#fff", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.12)" }}>
                  <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <span style={{ flex: 1, color: MUTED, fontSize: 11.5, lineHeight: 1.4 }}>Logo ajouté — correction d&apos;erreur portée au maximum pour rester scannable.</span>
                <button onClick={() => setLogo(null)} aria-label="Retirer le logo" className="da-btn-icon da-btn-icon--danger" style={{ width: 38, height: 38, flexShrink: 0 }}><X className="da-ic da-ic-trash" size={16} /></button>
              </div>
            ) : (
              <button onClick={() => logoInput.current?.click()} className="da-btn-dashed" style={{ minHeight: 46, padding: 14 }}>
                <Upload size={16} /> <span>Ajouter un logo</span>
              </button>
            )}
            <input ref={logoInput} type="file" aria-label="Importer un logo" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) onLogoFile(f); e.target.value = "" }} />
          </div>
        )}
      </div>

        </div>{/* fin qrdyn-main */}

        <div className="qrdyn-aside">

      {/* 3 · Aperçu — poster QR */}
      <div style={{ position: "relative", borderRadius: 20, padding: "26px 18px", marginBottom: 14, overflow: "hidden", background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.12), transparent 60%), rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.16)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ background: bg, borderRadius: 20, padding: 20, boxShadow: "0 14px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transition: "background .2s", maxWidth: "100%" }}>
          <div style={{ position: "relative", lineHeight: 0, borderRadius: 8, overflow: "hidden" }}>
            {/* Tant qu'il n'y a rien à encoder, on n'affiche PAS de QR. La page en
                montrait un, net et scannable, qui menait à qrowg.com — et sans le
                filigrane, donc plus propre que celui du client. Un commerçant
                pouvait l'imprimer en croyant que c'était le sien. */}
            {ready
              ? <QRCanvas value={previewBlocked ? "https://qrowg.com" : data} size={210} fg={fg} bg={bg} style={qrStyle} ecc={effectiveEcc} />
              : <div aria-hidden style={{ width: 210, height: 210, borderRadius: 8, background: "rgba(127,127,127,0.09)", border: "1px dashed rgba(127,127,127,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><QrIcon size={40} color="rgba(127,127,127,0.45)" /></div>}
            {ready && (previewBlocked
              ? <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(8,8,8,0.82)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", color: "#F5F0E8", textAlign: "center", padding: 10 }}><Lock size={22} color={G} /><span style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.3 }}>Limite atteinte</span></div>
              : <QrWatermark />)}
          </div>
          {ready && previewLabel && (
            <p style={{ margin: 0, maxWidth: 210, color: fg, opacity: 0.85, fontSize: 10.5, fontWeight: 600, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: 0.2 }}>{previewLabel}</p>
          )}
        </div>

        {!ready
          ? <p style={{ color: MUTED, fontSize: 12.5, margin: 0, textAlign: "center" }}>{qrType === "wifi" ? "Entrez le nom du réseau pour générer le QR." : qrType === "contact" ? "Entrez au moins un nom pour générer la carte." : qrType === "phone" ? "Entrez un numéro pour générer le QR." : qrType === "email" ? "Entrez une adresse email pour générer le QR." : "Renseignez le contenu ci-dessus pour générer votre QR code."}</p>
          : ratio < 3
            ? <button onClick={() => { setFg("#080808"); setBg("#FFFFFF") }} title="Rétablir noir sur blanc"
                style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--danger)", fontSize: 12, fontWeight: 600, background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}>
                <AlertTriangle size={14} /> Risque de non-scan — <span style={{ textDecoration: "underline" }}>corriger</span>
              </button>
            : inverted
              ? <button onClick={() => { const f = fg; setFg(bg); setBg(f) }} title="Inverser les couleurs (modules sombres sur fond clair)"
                  style={{ display: "flex", alignItems: "center", gap: 7, color: "#FBBF24", fontSize: 12, fontWeight: 600, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}>
                  <AlertTriangle size={14} /> Clair sur fond sombre — <span style={{ textDecoration: "underline" }}>inverser</span>
                </button>
            : ratio < 4.5
              ? <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#FBBF24", fontSize: 12, fontWeight: 600, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 999, padding: "6px 14px" }}>
                  <AlertTriangle size={14} /> Contraste limite — testez avant d&apos;imprimer
                </div>
              : <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--success)", fontSize: 12, fontWeight: 600, background: "rgba(57,255,143,0.09)", border: "1px solid rgba(57,255,143,0.28)", borderRadius: 999, padding: "6px 14px" }}>
                  <ShieldCheck size={14} /> Scannable
                </div>}
      </div>

      {/* 5 · Actions — hiérarchie selon le type. Dynamique (lien/texte/appel/email) : créer en avant,
          téléchargement en repli. Statique (Wi-Fi/Contact) : téléchargement en avant, enregistrement en repli. */}
      <div style={{ ...card, marginBottom: hasSaved || history.length > 0 ? 4 : 14 }}>
        {dynamic ? (<>
          {dynBlocked ? (
            <button disabled className="da-btn-locked" style={{ width: "100%" }}><Lock size={17} /> <span>Limite de QR modifiables atteinte</span></button>
          ) : (
            <span className="da-halo-wrap" style={{ display: "flex" }}>
              <button onClick={createDynamic} disabled={!ready || saveBusy} className="da-btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                {saveBusy ? spin(17) : <Zap size={17} />}<span>{saveBusy ? "Création…" : "Créer un QR modifiable"}</span>
              </button>
            </span>
          )}
          <p style={{ color: MUTED, fontSize: 11.5, margin: "9px 2px 0", lineHeight: 1.5 }}>
            {dynBlocked
              ? <>{quota.raisonModifiable} <Link href="/upgrade" style={{ color: G, fontWeight: 700, textDecoration: "none" }}>Voir les plans →</Link></>
              : <>Vous changerez la destination après l&apos;impression, et vous verrez les scans. Sans expiration.{quota.restantsModifiables !== null && <> Il vous en reste <strong style={{ color: "#F5F0E8" }}>{quota.restantsModifiables}</strong> sur ce plan.</>}</>}
            {qrType === "text" && <span style={{ display: "block", color: "#6E685E", fontSize: 11, marginTop: 3 }}>Ouvre une page au scan (Internet requis).</span>}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "15px 0 13px" }}>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.09)" }} />
            <span style={{ color: "#6E685E", fontSize: 11, fontWeight: 600 }}>ou télécharger un fichier statique</span>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.09)" }} />
          </div>
          {downloadRow(false)}
          <p style={{ color: "#6E685E", fontSize: 11, margin: "8px 2px 0", lineHeight: 1.45 }}>Image imprimable, non modifiable et sans suivi.</p>
        </>) : (<>
          {downloadRow(true)}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "15px 0 13px" }}>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.09)" }} />
            <span style={{ color: "#6E685E", fontSize: 11, fontWeight: 600 }}>ou enregistrer dans mon compte</span>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.09)" }} />
          </div>
          <button onClick={saveInstant} disabled={!ready || saveBusy} className="da-btn-ghost" style={{ width: "100%", justifyContent: "center", padding: "15px", fontSize: 14 }}>
            {saveBusy ? spin() : <Save size={16} />}<span>Enregistrer ce QR</span>
          </button>
          <p style={{ color: "#6E685E", fontSize: 11, margin: "8px 2px 0", lineHeight: 1.45 }}>
            QR statique — fonctionne hors ligne, sans expiration ({qrType === "wifi" ? "auto-connexion Wi-Fi" : "ajout du contact"} au scan).
          </p>
        </>)}
        {saveMsg && <p style={{ color: saveMsg.ok ? "var(--success)" : "#FBBF24", fontSize: 12.5, textAlign: "center", margin: "11px 0 0" }}>{saveMsg.text}</p>}
      </div>

        </div>{/* fin qrdyn-aside */}
      </div>{/* fin qrdyn-layout */}

      {/* Génération en masse (Business) : créer plusieurs liens dynamiques depuis un CSV. */}
      {canDynMasse(plan) && (
        <button onClick={() => setBulkOpen(true)}
          style={{ marginTop: 22, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, borderRadius: 12, border: "1.5px dashed rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.05)", color: G, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
          <Upload size={16} /> Importer des liens en masse (CSV)
        </button>
      )}

      {/* 6 · Mes QR codes — liens dynamiques + QR enregistrés, regroupés sous un seul titre. */}
      {hasSaved && (
        <div style={{ marginTop: 22 }}>
          <p style={secTitle}>{accentBar} Mes QR codes</p>

          {dynamicLinks.length > 0 && (<>
            <p style={subLabel}>Liens dynamiques</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: staticQrs.length > 0 ? 18 : 0 }}>
              {dynamicLinks.map(s => { const st = etatLien(s); return (
                <div key={s.id} {...carteCliquable(() => setDetail(s))} title="Voir le détail" aria-label={`Voir le détail de ${s.label || s.dest_url || "ce QR"}`} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 12, cursor: "pointer" }}>
                  <div style={{ background: "#fff", borderRadius: 12, padding: 8, lineHeight: 0, flexShrink: 0, boxShadow: "0 3px 14px rgba(0,0,0,0.32)" }}>
                    <QRCanvas value={s.payload || "https://qrowg.com"} size={92} fg={safeFg(s.style?.fg)} bg="#FFFFFF" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#F5F0E8", fontSize: 13.5, fontWeight: 700, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label || (s.dest_url || "").replace(/^https?:\/\//, "")}</p>
                    <p style={{ color: MUTED, fontSize: 11, margin: "0 0 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>→ {s.dest_url}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: st.couleur, fontSize: 10.5, fontWeight: 700, background: `${st.couleur}18`, borderRadius: 999, padding: "3px 8px" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: st.couleur }} />{st.badge}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#6E685E", fontSize: 10.5, fontWeight: 600 }}><BarChart3 size={11} />{s.total_scans ?? 0} scan{(s.total_scans ?? 0) > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); demanderDestination(s) }} title="Modifier la destination" aria-label="Modifier la destination" className="da-btn-icon" style={{ width: 44, height: 44 }}><Pencil className="da-ic da-ic-edit" size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); demanderSuppression(s) }} aria-label="Supprimer ce QR" title="Supprimer ce QR" className="da-btn-icon da-btn-icon--danger" style={{ width: 44, height: 44 }}><Trash2 className="da-ic da-ic-trash" size={14} /></button>
                  </div>
                </div>
              ) })}
            </div>
          </>)}

          {staticQrs.length > 0 && (<>
            <p style={subLabel}>Enregistrés (statiques)</p>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
              {staticQrs.map(s => (
                <div key={s.id} {...carteCliquable(() => setDetail(s))} title="Voir le détail" aria-label={`Voir le détail de ${s.label || libelleTypeQr(s.kind)}`}
                  style={{ position: "relative", flexShrink: 0, width: 124, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 11, cursor: "pointer" }}>
                  <div style={{ background: "#fff", borderRadius: 10, padding: 7, lineHeight: 0, boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
                    <QRCanvas value={s.payload || "https://qrowg.com"} size={82} fg={safeFg(s.style?.fg)} bg="#FFFFFF" />
                  </div>
                  <span style={{ color: MUTED, fontSize: 10, maxWidth: 108, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{s.label || libelleTypeQr(s.kind)}</span>
                  <button onClick={e => { e.stopPropagation(); demanderSuppression(s) }} aria-label="Supprimer ce QR" className="da-btn-icon da-btn-icon--danger"
                    style={{ position: "absolute", top: 5, right: 5, width: 26, height: 26, borderRadius: 8 }}><Trash2 className="da-ic da-ic-trash" size={13} /></button>
                </div>
              ))}
            </div>
          </>)}
        </div>
      )}

      {/* Brouillons récents (locaux, non enregistrés — cliquer pour réutiliser le design) */}
      {history.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <p style={secTitle}>{accentBar} Brouillons récents</p>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {history.map((h, i) => (
              <button key={i} title={`Réutiliser : ${histLabel(h)}`} onClick={() => loadEntry(h)}
                style={{ flexShrink: 0, width: 98, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: 9, cursor: "pointer" }}>
                <div style={{ background: "#fff", borderRadius: 9, padding: 6, lineHeight: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
                  <div style={{ position: "relative", lineHeight: 0, borderRadius: 4, overflow: "hidden" }}>
                    <QRCanvas value={payload(h) || "https://qrowg.com"} size={58} fg={safeFg(h.fg)} bg="#FFFFFF" />
                    <QrWatermark size={58} />
                  </div>
                </div>
                <span style={{ color: MUTED, fontSize: 9.5, maxWidth: 86, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{histLabel(h)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Aperçu détaillé d'un QR enregistré (clic) : grand QR + infos + décompte d'expiration */}
      {detail && (() => { const ex = etatLien(detail); return (
        <div onClick={fermerDetail} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto", background: "#141210", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 20, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <p style={{ flex: 1, color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail.label || (detail.dynamic ? "Lien dynamique" : libelleTypeQr(detail.kind))}</p>
              <button onClick={fermerDetail} aria-label="Fermer la fiche" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", width: 30, height: 30 }}><X size={15} /></button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ background: detail.style?.bg || "#fff", borderRadius: 14, padding: 12, lineHeight: 0 }}>
                {(() => { const st = styleSur(detail); return (
                  // La fiche montrait un QR CARRÉ quel que soit le style enregistré, alors que
                  // le bouton « Télécharger » juste en dessous produisait le vrai style : le
                  // fichier ne ressemblait pas à l'aperçu qui l'annonçait.
                  <QRCanvas value={detail.payload || "https://qrowg.com"} size={196} fg={st.fg} bg={st.bg} ecc={st.ecc} style={formeQr(st.styleKey)} />
                ) })()}
              </div>
            </div>

            {/* État du QR (au premier plan) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 13px", borderRadius: 12, background: `${ex.couleur}14`, border: `1px solid ${ex.couleur}44`, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: ex.couleur, flexShrink: 0 }} />
              <span style={{ color: ex.couleur, fontSize: 12.5, fontWeight: 700 }}>{ex.phrase}</span>
            </div>

            {detail.dynamic ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Lien court (le QR pointe ici)</p>
                  <p style={{ color: "#F5F0E8", fontSize: 12.5, margin: 0, wordBreak: "break-all", fontFamily: "monospace" }}>{detail.payload}</p>
                </div>
                <div>
                  <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Destination (modifiable)</p>
                  <p style={{ color: "#F5F0E8", fontSize: 12.5, margin: "0 0 6px", wordBreak: "break-all" }}>{detail.dest_url}</p>
                  <button onClick={() => demanderDestination(detail)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#F5F0E8", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 12px" }}>Modifier la destination</button>
                </div>
                <button onClick={() => setStats(detail)}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "flex-start", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 10, color: G, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "9px 14px" }}>
                  <BarChart3 size={15} /> Statistiques
                </button>

                {/* Sécurité du lien (Pro+) : mot de passe, expiration programmée, pause manuelle. */}
                {canDynSecurite(plan) ? (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 13, display: "flex", flexDirection: "column", gap: 11 }}>
                    <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: 0, display: "flex", alignItems: "center", gap: 6 }}><ShieldCheck size={13} /> Sécurité</p>
                    <div style={secRow}>
                      <span style={secRowLabel}><Lock size={14} /> Mot de passe</span>
                      <span style={{ flex: 1, fontSize: 12, color: detail.has_password ? "var(--success)" : MUTED }}>{detail.has_password ? "Activé" : "Aucun"}</span>
                      <button style={secBtn} onClick={() => detail.has_password ? demanderRetraitMotDePasse(detail) : demanderMotDePasse(detail)}>{detail.has_password ? "Retirer" : "Ajouter"}</button>
                    </div>
                    <div style={secRow}>
                      <span style={secRowLabel}><Clock size={14} /> Expiration</span>
                      <span style={{ flex: 1, fontSize: 12, color: detail.expires_at ? "#FBBF24" : MUTED }}>{detail.expires_at ? new Date(detail.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "Permanent"}</span>
                      <button style={secBtn} onClick={() => demanderExpiration(detail)}>Modifier</button>
                    </div>
                    <div style={secRow}>
                      <span style={secRowLabel}>{detail.status === "active" ? <Pause size={14} /> : <Play size={14} />} État</span>
                      <span style={{ flex: 1, fontSize: 12, color: detail.status === "active" ? "var(--success)" : "#FBBF24" }}>{detail.status === "active" ? "Actif" : detail.status === "paused" ? "En pause" : detail.status === "expired" ? "Expiré" : detail.status}</span>
                      <button style={secBtn} onClick={() => toggleManualPause(detail)}>{detail.status === "active" ? "Mettre en pause" : "Réactiver"}</button>
                    </div>
                  </div>
                ) : (
                  <a href="/upgrade" style={{ display: "block", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 13, textDecoration: "none" }}>
                    <p style={{ color: G, fontSize: 12.5, fontWeight: 700, margin: "0 0 3px", display: "flex", alignItems: "center", gap: 6 }}><ShieldCheck size={14} /> Sécurité du lien</p>
                    <p style={{ color: MUTED, fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>Mot de passe, expiration programmée et pause à partir du plan <strong style={{ color: "#F5F0E8" }}>Pro</strong> →</p>
                  </a>
                )}
              </div>
            ) : (
              <div>
                <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Contenu encodé</p>
                <p style={{ color: "#F5F0E8", fontSize: 12.5, margin: 0, wordBreak: "break-all", fontFamily: "monospace" }}>{detail.payload}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
              <button onClick={copyDetail} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: detailCopied ? "var(--success)" : "#F5F0E8", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {detailCopied ? <><Check size={15} /> Copié !</> : <><Link2 size={15} /> Copier</>}
              </button>
              <button onClick={downloadDetail} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, border: "none", background: G, color: "#080808", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                <Download size={15} /> PNG
              </button>
            </div>
            {detail.dynamic && detail.payload && (
              <a href={detail.payload} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", color: G, fontSize: 12, fontWeight: 600, textDecoration: "none", marginTop: 11 }}>Ouvrir le lien ↗</a>
            )}
          </div>
        </div>
      ) })()}

      {/* Pop-up statistiques d'un lien dynamique — ancrée à droite sur PC, feuille par-dessus sur mobile.
          Données 100% réelles (aucun graphe fictif) : total, dernier scan, moyenne/jour, création, statut. */}
      <StatistiquesQr qr={stats} onFermer={fermerStats} />

      {/* Modal génération en masse (Business) : coller/charger un CSV → créer N liens dynamiques. */}
      <ImportEnMasse
        ouvert={bulkOpen}
        onFermer={fermerBulk}
        onCrees={items => setSaved(prev => [...items, ...prev])}
      />
      {/* Une seule boîte de dialogue pour tout ce que faisaient prompt/confirm/alert. */}
      <Dialogue
        ouvert={demande !== null}
        titre={
          demande?.type === "destination" ? "Modifier la destination"
          : demande?.type === "motDePasse" ? "Protéger ce QR par un mot de passe"
          : demande?.type === "retirerMotDePasse" ? "Retirer le mot de passe ?"
          : demande?.type === "expiration" ? "Date de fin"
          : demande?.type === "supprimer" ? "Supprimer ce QR ?"
          : demande?.type === "message" ? demande.titre
          : ""
        }
        description={
          demande?.type === "destination" ? "Le QR déjà imprimé continuera de fonctionner : il pointera simplement ailleurs."
          : demande?.type === "motDePasse" ? "Il sera demandé au scan, avant la redirection."
          : demande?.type === "retirerMotDePasse" ? "Le QR redeviendra accessible à tous ceux qui le scannent."
          : demande?.type === "expiration" ? "Passé cette date, le QR cessera de rediriger. Laissez vide pour qu'il reste actif indéfiniment."
          : demande?.type === "supprimer" ? "C'est définitif. Si ce QR est déjà imprimé quelque part, il ne mènera plus nulle part."
          : demande?.type === "message" ? demande.texte
          : undefined
        }
        onFermer={fermerDialogue}
        onConfirmer={validerDialogue}
        destructif={demande?.type === "supprimer"}
        libelleConfirmer={
          demande?.type === "destination" ? "Enregistrer"
          : demande?.type === "motDePasse" ? "Protéger"
          : demande?.type === "retirerMotDePasse" ? "Retirer"
          : demande?.type === "expiration" ? "Enregistrer"
          : demande?.type === "supprimer" ? "Supprimer"
          : undefined
        }
        confirmerDesactive={
          (demande?.type === "destination" && !demande.valeur.trim()) ||
          (demande?.type === "motDePasse" && demande.valeur.trim().length < 4)
        }
      >
        {demande?.type === "destination" && (
          <label style={{ display: "block" }}>
            <span style={{ display: "block", color: MUTED, fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Nouvelle adresse</span>
            <input
              type="url" inputMode="url" autoComplete="off" placeholder="https://…"
              value={demande.valeur}
              onChange={e => setDemande({ ...demande, valeur: e.target.value })}
              onKeyDown={e => { if (e.key === "Enter" && demande.valeur.trim()) validerDialogue() }}
              style={field}
            />
          </label>
        )}
        {demande?.type === "motDePasse" && (
          <label style={{ display: "block" }}>
            <span style={{ display: "block", color: MUTED, fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Mot de passe (4 caractères minimum)</span>
            <input
              type="password" autoComplete="new-password"
              value={demande.valeur}
              onChange={e => setDemande({ ...demande, valeur: e.target.value })}
              onKeyDown={e => { if (e.key === "Enter" && demande.valeur.trim().length >= 4) validerDialogue() }}
              style={field}
            />
          </label>
        )}
        {demande?.type === "expiration" && (
          <label style={{ display: "block" }}>
            <span style={{ display: "block", color: MUTED, fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Le QR cessera de fonctionner après le</span>
            {/* Un champ de date, et non plus « tapez AAAA-MM-JJ » suivi d'un alert
                qui perdait la saisie quand le format n'était pas le bon. */}
            <input
              type="date"
              min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
              value={demande.valeur}
              onChange={e => setDemande({ ...demande, valeur: e.target.value })}
              style={{ ...field, colorScheme: "dark" }}
            />
          </label>
        )}
        {demande?.type === "supprimer" && demande.qr.label && (
          <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 700, margin: 0, wordBreak: "break-word" }}>{demande.qr.label}</p>
        )}
      </Dialogue>
    </div>
  )
}
