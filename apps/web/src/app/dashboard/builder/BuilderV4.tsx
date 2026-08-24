  "use client"

  import { useState, useRef, useEffect, useCallback, useMemo, Component, memo } from "react"
  import {
    X, ChevronUp, ChevronDown, Trash2,
    Eye, Plus, Settings, Check, Search, Copy, EyeOff,
    ExternalLink, GripVertical, QrCode, MoreHorizontal, Undo2, Redo2, Sparkles,
    Pencil, Palette, Lightbulb, Globe, Send, Smartphone, RefreshCw, Lock, Unlock, Square, Layers
  } from "lucide-react"
  import { BLOCK_DEFS, BLOCK_CATEGORIES, BLOCK_HINTS, PRESET_CATEGORIES, SOCIAL_NETWORKS, PRESET_THEMES, IDENTITY_PRESETS, ACTION_PRESETS, COMMERCE_PRESETS, MEDIA_PRESETS, SOCIAL_PRESETS, INFO_PRESETS, SOCIAL_URL_TEMPLATES, AVAILABILITY_STATUSES, availabilityStatus, profileBadgeStyle, productBadgeStyle, priceDiscount, countdownParts, stockStatus, paymentBrand, paymentLink, starRow, openStatus, DAY_KEYS, mapEmbedUrl, calendarLinks, spotifyEmbedUrl, youtubeId, docTypeMeta, docActionLabel, announcementMeta, optionLabel, blockDecoration, BLOCK_GRADIENTS, BLOCK_RADIUS_OPTIONS, BLOCK_SHADOW_OPTIONS, BLOCK_SPACE_OPTIONS, BLOCK_WIDTH_OPTIONS, BLOCK_ANIM_OPTIONS, BLOCK_ANIM_SPEED_OPTIONS, BLOCK_HOVER_OPTIONS, BLOCK_LOOP_OPTIONS, BLOCK_INTENSITY_OPTIONS, BLOCK_STYLE_PRESETS, ctaButtonStyle, CTA_ANIM_CSS, stickyActionHref, GOOGLE_FONTS, hexToRgb, rgbToHsl, contrastRatio, wcagLevel, avatarShapeStyle, avatarDecoStyle, avatarBgStyle, bannerBackgroundStyle, bannerHeight, bannerImageStyle, bannerTitleStyle, bannerOverlayLayers, bannerFrame, BANNER_ANIM_CSS, normalizePageTheme, type Block, type BlockContent, type PageTheme } from "./types"
  import { PAGE_TEMPLATES, PAGE_TEMPLATE_GROUPS, type PageTemplate } from "./page-templates"
  import { useUndoRedo, useResize, reorderArray, cloneBlocks } from "./builderHooks"
  import { scoreBlock } from "./builderSearch"
  import { CommandPalette, type PaletteCommand } from "./CommandPalette"
  import { OutlinePanel } from "./OutlinePanel"
  import { G, MUTED } from "./builderConstants"
  import { BlockPreview } from "./builderPreview"
  import { FUNNEL, marque, etiquette, precharge } from "@/lib/funnel"
  // Mémoïsé : lors d'une frappe, seul le bloc édité change de référence (setBlocks
  // via .map préserve les autres) -> les blocs inchangés ne re-rendent plus.
  // Props stables (block/theme/dayMode, aucun callback) -> aucun risque de rendu périmé.
  const MemoBlockPreview = memo(BlockPreview)
  import { EditPanel, ThemePanel, Segmented, STYLE_COPY_KEYS } from "./builderPanels"
  import { BuilderStatus } from "./BuilderStatus"
  import { BlockLibrary } from "./BlockLibrary"
  import { essentialsForContext } from "./builderLibrary"
  import { BlockSettingsPanel } from "./BlockSettingsPanel"
  import { CanvasToolbar } from "./CanvasToolbar"
  import { MobileBuilderShell } from "./MobileBuilderShell"
  import BuilderWelcome from "./BuilderWelcome"
  import { InsertBetweenBlocks } from "./InsertBetweenBlocks"
  import { deviceFrameWidth, deviceLabel, canvasChrome, fitZoom, stepZoom, toggleOrientation, type CanvasDevice, type CanvasOrientation, type CanvasMode } from "./builderCanvas"
  import { useBuilderRedesign } from "./builderFlags"
  import { useIsMobile } from "@/lib/useIsMobile"
  import { useToast } from "@/components/Toast"
  import { useConfirm } from "@/components/ui/Confirm"
  import BannerStudio from "./BannerStudio"
  import ImageUpload from "./ImageUpload"
  import FileUpload from "./FileUpload"
  import QRCanvas from "../qr-codes/QRCanvas"
  import { getQRBlob, downloadBlob } from "../qr-codes/qrRender"
  import { createClient } from "@/lib/supabase/client"
  import { createSaveController, type SaveController } from "./saveController"
  import { persistSnapshot, type PageSnapshot } from "./savePage"
  import { createPublishController } from "./publish"
  import { publishPage } from "./publishActions"
  import { safeErrorMessage, loadStateFromError, type LoadState } from "./builderErrors"
  import { printHandoff, printStudioUrl } from "../print-studio/handoff"
  import { browserStorage, loadDraft, saveDraft, clearDraft, makeDraft, draftIsMeaningful, draftSummary, type LocalDraft } from "./draftStore"

  // Helper module-scope (evite la temporal-dead-zone du UUID_RE interne au composant).
  const IS_UUID = (s?: string | null): boolean => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

  // Frontiere d'erreur : isole un apercu de bloc qui planterait (contenu en cours d'edition
  // malforme) pour ne pas crasher toute la session du builder.
  class PreviewBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
    constructor(props: { children: React.ReactNode }) { super(props); this.state = { failed: false } }
    static getDerivedStateFromError() { return { failed: true } }
    componentDidUpdate(prev: { children: React.ReactNode }) { if (prev.children !== this.props.children && this.state.failed) this.setState({ failed: false }) }
    render() { return this.state.failed
      ? <div style={{ padding: "12px 16px", textAlign: "center", color: "#A8A190", fontSize: 11 }}>⚠ Aperçu indisponible pour ce bloc</div>
      : this.props.children }
  }

  const NOISE_SVG_URL = "url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E')"
  type Message = { role: "user" | "assistant"; content: string }


  // Snapshot d'historique : blocs + thème + nom -> undo/redo couvre TOUT le document
  // (pas seulement les blocs). Voir docs/BUILDER-REBUILD-PLAN.md §2.2.
  type EditorSnapshot = { blocks: Block[]; theme: PageTheme; name: string }
  const INITIAL_BLOCKS: Block[] = [
    { id: "1", type: "profile", content: { name: "Mon Nom", tagline: "Mon activité" }, visible: true },
    { id: "2", type: "bio", content: { text: "Bienvenue sur ma page !" }, visible: true },
    { id: "3", type: "cta_button", content: { label: "Me contacter", url: "#", style: "gold" }, visible: true },
  ]
  const INITIAL_NAME = "Ma Page"

  export default function BuilderV4({ pageId }: { pageId?: string }) {
    const confirm = useConfirm()
    const undoRedo = useUndoRedo<EditorSnapshot>({ blocks: INITIAL_BLOCKS, theme: PRESET_THEMES.midnight_gold, name: INITIAL_NAME })
    // Refs synchronisées : thème/nom lus AU MOMENT d'un push d'historique (les push
    // de blocs et de nom ont besoin du thème courant, et inversement).
    const themeRef = useRef<PageTheme>(PRESET_THEMES.midnight_gold)
    const nameRef = useRef(INITIAL_NAME)
    const [blocks, setBlocksRaw] = useState<Block[]>(INITIAL_BLOCKS)

    // setBlocks avec push historique automatique.
    // `coalesceKey` (optionnel) : regroupe les frappes rapides sur un même champ en
    // une seule entrée d'undo (voir useUndoRedo). Les opérations structurelles n'en
    // passent pas -> chacune reste une entrée distincte.
    const setBlocks = useCallback((updater: Block[] | ((prev: Block[]) => Block[]), skipHistory = false, coalesceKey?: string) => {
      setBlocksRaw(prev => {
        const next = typeof updater === "function" ? updater(prev) : updater
        if (!skipHistory) undoRedo.push({ blocks: next, theme: themeRef.current, name: nameRef.current }, coalesceKey)
        return next
      })
    }, [undoRedo])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [multiSelection, setMultiSelection] = useState<string[]>([])
    // Glisser-déposer (Phase 2 §2.14) : index du bloc glissé + position d'insertion.
    const [dragIdx, setDragIdx] = useState<number | null>(null)
    const [dropBefore, setDropBefore] = useState<number | null>(null)
    const [paletteOpen, setPaletteOpen] = useState(false) // palette de commandes (Cmd/Ctrl+K)
    const [outlineOpen, setOutlineOpen] = useState(false)  // plan de la page (outline)
    // Refs synchronisées : lecture fraîche de la sélection / des blocs depuis le
    // handler clavier global (deps []), sans re-souscrire l'écouteur à chaque frappe.
    const blocksKbRef = useRef(blocks)
    const selectedIdKbRef = useRef(selectedId)
    useEffect(() => { blocksKbRef.current = blocks }, [blocks])
    useEffect(() => { selectedIdKbRef.current = selectedId }, [selectedId])
    // multiSelection était lu depuis le state figé au montage dans le handler
    // clavier (deps []) -> Ctrl+A/Suppr multi cassés. On passe par une ref fraîche.
    const multiSelectionKbRef = useRef(multiSelection)
    useEffect(() => { multiSelectionKbRef.current = multiSelection }, [multiSelection])
    // Refs vers les actions (redéfinies à chaque render) : le handler clavier doit
    // appeler la DERNIÈRE version, pas celle capturée au montage.
    const deleteMultiRef = useRef<() => void>(() => {})
    const deleteBlockRef = useRef<(id: string) => void>(() => {})
    // Presse-papier de blocs + actions copier/coller/dupliquer (appelées via ref
    // depuis le handler clavier global, toujours à jour). Voir §2.5 du plan.
    const clipboardRef = useRef<Block[]>([])
    const copyRef = useRef<() => void>(() => {})
    const pasteRef = useRef<() => void>(() => {})
    const duplicateSelRef = useRef<() => void>(() => {})
    const [pageName, setPageName] = useState("Ma Page")
    const [pageSlug, setPageSlug] = useState("ma-page")
    const [pageStatus, setPageStatus] = useState("draft")
    const [theme, setTheme] = useState<PageTheme>(PRESET_THEMES.midnight_gold)
    // Sync refs pour les push d'historique (thème/nom lus au moment du push).
    useEffect(() => { themeRef.current = theme }, [theme])
    useEffect(() => { nameRef.current = pageName }, [pageName])
    // Applique un snapshot (undo/redo) : restaure blocs + thème + nom via les setters
    // BRUTS -> AUCUN nouveau push. Stable (useCallback) pour le handler clavier.
    const applySnapshot = useCallback((s: EditorSnapshot) => {
      setBlocksRaw(s.blocks); setTheme(s.theme); setPageName(s.name)
    }, [])
    // Change le thème ET l'enregistre dans l'historique (coalescé "theme" : un réglage
    // continu de curseur = une seule entrée d'undo). Utilisé par le panneau Thème.
    const commitTheme = useCallback((updater: PageTheme | ((p: PageTheme) => PageTheme)) => {
      const nt = typeof updater === "function" ? (updater as (p: PageTheme) => PageTheme)(themeRef.current) : updater
      setTheme(nt)
      undoRedo.push({ blocks: blocksKbRef.current, theme: nt, name: nameRef.current }, "theme")
    }, [undoRedo])
    // Plan de l'utilisateur (gating UI de l'animation d'entrée ; l'enforcement réel
    // est côté serveur au rendu de la page publique).
    const [userPlan, setUserPlan] = useState<string | null>(null)
    // Mode invité : on compose AVANT de créer un compte. Tant que la session n'est
    // pas connue on ne déclenche rien de réseau — sinon un visiteur anonyme sur
    // /builder/new déclencherait une création de page vouée à un 401.
    const [authState, setAuthState] = useState<"unknown" | "guest" | "user">("unknown")
    const guest = authState === "guest"
    useEffect(() => {
      const sb = createClient()
      sb.auth.getUser().then(({ data }) => {
        if (!data.user) { setAuthState("guest"); return }
        setAuthState("user")
        sb.from("profiles").select("plan").eq("id", data.user.id).single()
          .then(({ data: p }) => setUserPlan((p as any)?.plan ?? null))
      }).catch(() => setAuthState("guest"))
    }, [])
    const [rightTab, setRightTab] = useState<"preview"|"edit"|"theme">("edit")
    const [editTab, setEditTab] = useState<"contenu"|"style"|"layout"|"avance">("contenu")
    // Mode Simple (defaut) = un seul contexte "Contenu" (audit #10/#14 "montrer moins"). Expert = 4 onglets.
    // Defaut false = ce que rend le SSR ; on lit localStorage APRES montage (pas de mismatch d'hydratation),
    // et on persiste DANS le setter (pas dans un effet -> pas d'ecrasement au montage). Cf review #2.
    const [expertMode, setExpertModeRaw] = useState(false)
    useEffect(() => { try { if (localStorage.getItem("qrfolio_expert_mode") === "1") setExpertModeRaw(true) } catch {} }, [])
    const setExpertMode = (v: boolean | ((p: boolean) => boolean)) => setExpertModeRaw(prev => {
      const next = typeof v === "function" ? v(prev) : v
      try { localStorage.setItem("qrfolio_expert_mode", next ? "1" : "0") } catch {}
      return next
    })
    // Modeles par metier : menu deplie a la demande (replie par defaut) pour alleger la palette.
    const [metierOpen, setMetierOpen] = useState(false)
    const [styleClipboard, setStyleClipboard] = useState<Record<string, string> | null>(null)
    const [showTemplates, setShowTemplates] = useState(false)
    const [templateGroup, setTemplateGroup] = useState<string>(PAGE_TEMPLATE_GROUPS[0])
    const [aiGenPrompt, setAiGenPrompt] = useState("")
    const [aiGenLoading, setAiGenLoading] = useState(false)
    const [aiGenError, setAiGenError] = useState<string | null>(null)
    const [aiGenSoon, setAiGenSoon] = useState(false) // true = IA pas encore activee (ton info, pas erreur)

    async function generateWithAI() {
      const description = aiGenPrompt.trim()
      if (description.length < 5) { setAiGenError("Décrivez votre activité en quelques mots."); return }
      setAiGenLoading(true); setAiGenError(null); setAiGenSoon(false)
      try {
        const res = await fetch("/api/generate-page", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setAiGenSoon(!!data?.soon); setAiGenError(data?.error || "La génération a échoué."); return }
        if (!data?.template?.blocks?.length) { setAiGenError("Aucun contenu généré. Réessayez."); return }
        applyPageTemplate(data.template as PageTemplate) // applique + ferme la modale
      } catch {
        setAiGenError("Connexion impossible. Réessayez.")
      } finally {
        setAiGenLoading(false)
      }
    }
    const [activeCategory, setActiveCategory] = useState("essentials")
    const [search, setSearch] = useState("")
    const [dayMode, setDayMode] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [saveError, setSaveError] = useState(false)
    const [saveErrorMsg, setSaveErrorMsg] = useState("")
    const [hasUnsaved, setHasUnsaved] = useState(false)
    // ID reel de la page en base. Si l'URL est /builder/new (pageId non-UUID),
    // on cree d'abord la page puis on bascule sur son vrai UUID.
    const [liveId, setLiveId] = useState<string | undefined>(() => (IS_UUID(pageId) ? pageId : undefined))
    const [bootstrapError, setBootstrapError] = useState("")
    // État de chargement d'une page existante : distingue chargé / absente / accès refusé /
    // erreur récupérable. loadNonce permet de relancer le chargement (bouton « Réessayer »).
    const [loadState, setLoadState] = useState<LoadState>("loading")
    const [loadNonce, setLoadNonce] = useState(0)
    const creatingRef = useRef(false)
    // ── Essai sans inscription ────────────────────────────────────────────────
    // Le brouillon d'un visiteur vit dans son navigateur (la table `pages` impose
    // user_id NOT NULL : une page anonyme ne peut pas exister en base).
    const claimRef = useRef<LocalDraft | null>(null)   // brouillon à reprendre juste après l'inscription
    const [claimed, setClaimed] = useState(false)
    const modifRef = useRef(false)                     // repère « page modifiée » : une seule fois
    const wantPublishRef = useRef(false)               // « publier » cliqué AVANT le compte
    const autoPubRef = useRef(false)                   // la mise en ligne automatique n'a lieu qu'une fois
    const publieeRef = useRef(false)                   // repère « page publiée » : une seule fois
    const blocksRef = useRef(0)                        // nb de blocs, lisible depuis un callback stable
    // La mesure est chargée d'avance : le repère « publier sans compte » est posé
    // juste avant de quitter la page, il n'aurait pas le temps de partir sinon.
    useEffect(() => { precharge() }, [])      // confirmation « votre travail a été repris »
    const guestReady = useRef(false)                   // brouillon restauré : la sauvegarde locale peut démarrer
    // Reprise de brouillon : la page vient d'être créée VIDE en base et son contenu
    // n'est encore qu'en mémoire. Sans ce garde, le chargement qui suit lisait zéro
    // bloc et écrasait la page reprise — tout le travail du visiteur, perdu à la
    // dernière seconde. On saute ce premier chargement ; l'autosave écrit la suite.
    const skipLoadRef = useRef(false)
    const draftTimer = useRef<any>(null)
    const [draftState, setDraftState] = useState<"idle" | "saved" | "too_big" | "unavailable">("idle")
    const [draftFound, setDraftFound] = useState<LocalDraft | null>(null)   // proposition « reprendre »
    const [fromTemplate, setFromTemplate] = useState(false)                 // arrivée depuis la galerie
    const templateKeyRef = useRef<string | undefined>(undefined)            // modèle d'origine, à ne pas perdre
    const [showPublishPopup, setShowPublishPopup] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [publishSuccess, setPublishSuccess] = useState(false)
    const [publishWasUpdate, setPublishWasUpdate] = useState(false) // succès = mise à jour (déjà publiée) vs 1re publication
    const [publishError, setPublishError] = useState("")
    const [qrShortCode, setQrShortCode] = useState("")
    // Cible du QR (lien de scan) + telechargement PNG genere en local (sans API externe).
    const qrTarget = qrShortCode ? `${typeof window !== "undefined" ? window.location.origin : ""}/q/${qrShortCode}` : ""
    // Pont vers le Print Studio : on déduit métier, usage et textes depuis la page elle-même,
    // pour que l'utilisateur atterrisse sur un support déjà rempli au lieu d'une page blanche.
    const handoff = useMemo(() => printHandoff({ title: pageName, blocks: blocks.filter(b => b.visible !== false) }), [pageName, blocks])
    const downloadQrPng = async () => {
      if (!qrTarget) return
      const b = await getQRBlob({ data: qrTarget, fg: "#080808", bg: "#FFFFFF", ecc: "M", style: {}, size: 512 }, "png")
      if (b) downloadBlob(b, "qrcode.png")
    }
    const [showQrPanel, setShowQrPanel] = useState(false)
    const [pageStats, setPageStats] = useState({ views: 0, scans: 0 })
    const [clickCounts, setClickCounts] = useState<Record<string, number>>({}) // clics par bloc (90j) pour le compteur builder
    const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Salut ! 👋 Décris ton activité et je construis ta page." }])
    const [aiInput, setAiInput] = useState("")
    const [aiLoading, setAiLoading] = useState(false)
    const messagesEnd = useRef<HTMLDivElement>(null)
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    // Vrai s'il reste des modifications non encore sauvegardees (evite la perte de donnees
    // si l'onglet est ferme/recharge pendant le debounce de sauvegarde).
    const dirty = useRef(false)
    // Vrai seulement une fois la page CHARGEE (existante) ou CREEE (nouvelle). Empeche la
    // sauvegarde de partir avec les blocs de demo par defaut avant que load() n'ait ramene
    // les vrais blocs -> sinon, sur connexion lente, on ecraserait le contenu reel.
    const ready = useRef(false)

    // ── États collapse panneaux ────────────────────────────────────────────────
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
      if (typeof window !== "undefined") return localStorage.getItem("qrfolio_sidebar_collapsed") === "true"
      return false
    })
    const [blocksCollapsed, setBlocksCollapsed] = useState(() => {
      if (typeof window !== "undefined") return localStorage.getItem("qrfolio_blocks_collapsed") === "true"
      return false
    })
    const [rightCollapsed, setRightCollapsed] = useState(false)
    const [focusMode, setFocusMode] = useState(false)
    const [drawerCategory, setDrawerCategory] = useState<string|null>(null)
    const drawerRef = useRef<HTMLDivElement>(null)

    // Persister collapse sidebar
    useEffect(() => {
      if (typeof window !== "undefined") localStorage.setItem("qrfolio_sidebar_collapsed", String(sidebarCollapsed))
    }, [sidebarCollapsed])

    useEffect(() => {
      if (typeof window !== "undefined") localStorage.setItem("qrfolio_blocks_collapsed", String(blocksCollapsed))
    }, [blocksCollapsed])

    // ── Raccourcis clavier ────────────────────────────────────────────────────
    useEffect(() => {
      const isEditing = (e: KeyboardEvent) =>
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable

      const handler = (e: KeyboardEvent) => {
        const ctrl = e.ctrlKey || e.metaKey // Ctrl Windows / Cmd Mac

        // Ctrl/Cmd+K — Palette de commandes (fonctionne même en cours de saisie)
        if (ctrl && (e.key === "k" || e.key === "K")) {
          e.preventDefault()
          setPaletteOpen(o => !o)
          return
        }
        // "/" — ouverture rapide de la palette (menu d'insertion), hors champ de saisie
        if (e.key === "/" && !ctrl && !isEditing(e)) {
          e.preventDefault()
          setPaletteOpen(true)
          return
        }

        // Ctrl+Z — Undo
        if (ctrl && !e.shiftKey && (e.key === "z" || e.key === "Z") && !isEditing(e)) {
          e.preventDefault()
          const prev = undoRedo.undo()
          if (prev) applySnapshot(prev)
          return
        }
        // Ctrl+Shift+Z / Ctrl+Y — Redo
        if (ctrl && (e.shiftKey && (e.key === "z" || e.key === "Z") || e.key === "y" || e.key === "Y") && !isEditing(e)) {
          e.preventDefault()
          const next = undoRedo.redo()
          if (next) applySnapshot(next)
          return
        }

        // Ctrl+B — Bibliothèque de blocs
        if (ctrl && (e.key === "b" || e.key === "B") && !isEditing(e)) {
          e.preventDefault()
          setBlocksCollapsed(p => !p)
          setFocusMode(false)
          return
        }
        // Ctrl+E — Éditeur (panel droit)
        if (ctrl && (e.key === "e" || e.key === "E") && !isEditing(e)) {
          e.preventDefault()
          setRightCollapsed(p => !p)
          setFocusMode(false)
          return
        }
        // Ctrl+P — Preview (switch onglet)
        if (ctrl && (e.key === "p" || e.key === "P") && !isEditing(e)) {
          e.preventDefault()
          setRightCollapsed(false)
          setRightTab("edit")
          return
        }
        // Ctrl+D — Dupliquer la sélection
        if (ctrl && (e.key === "d" || e.key === "D") && !isEditing(e)) {
          e.preventDefault()
          duplicateSelRef.current()
          return
        }
        // Ctrl+C — Copier la sélection (hors saisie ; sinon copie native)
        if (ctrl && (e.key === "c" || e.key === "C")) {
          if (!isEditing(e) && (selectedIdKbRef.current || multiSelectionKbRef.current.length > 0)) {
            e.preventDefault()
            copyRef.current()
          }
          return
        }
        // Ctrl+V — Coller (hors saisie ; sinon collage natif dans le champ)
        if (ctrl && (e.key === "v" || e.key === "V")) {
          if (!isEditing(e)) { e.preventDefault(); pasteRef.current() }
          return
        }
        // Ctrl+F — Mode Focus
        if (ctrl && (e.key === "f" || e.key === "F") && !isEditing(e)) {
          e.preventDefault()
          setFocusMode(prev => {
            const next = !prev
            setSidebarCollapsed(next)
            setBlocksCollapsed(next)
            setRightCollapsed(next)
            return next
          })
          return
        }
        // Escape — désélectionner tout
        if (e.key === "Escape" && !isEditing(e)) {
          setMultiSelection([])
          setSelectedId(null)
          return
        }
        // Ctrl+A — sélectionner tous les blocs
        if (ctrl && (e.key === "a" || e.key === "A") && !isEditing(e)) {
          e.preventDefault()
          setMultiSelection(blocksKbRef.current.map(b => b.id))
          return
        }
        // Delete/Backspace — supprime la sélection multiple, sinon le bloc sélectionné.
        if ((e.key === "Delete" || e.key === "Backspace") && !isEditing(e)) {
          if (multiSelectionKbRef.current.length > 0) {
            e.preventDefault()
            deleteMultiRef.current()
            return
          }
          if (selectedIdKbRef.current) {
            e.preventDefault()
            deleteBlockRef.current(selectedIdKbRef.current)
            return
          }
        }
        // Flèches ↑/↓ — a11y clavier du canvas. Uniquement quand un bloc est déjà
        // sélectionné (sinon on laisse le défilement natif). Flèche seule = déplacer
        // la sélection ; Alt+flèche = déplacer le bloc (réordonnancement).
        if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !ctrl && !e.shiftKey && !isEditing(e)) {
          const cur = selectedIdKbRef.current
          if (!cur) return
          const bs = blocksKbRef.current
          if (bs.length === 0) return
          const dir = e.key === "ArrowDown" ? 1 : -1
          e.preventDefault()
          if (e.altKey) {
            // Déplacer le bloc sélectionné (setBlocks fonctionnel = état frais).
            setBlocks(p => {
              const idx = p.findIndex(b => b.id === cur)
              if (idx < 0 || p[idx]?.locked) return p
              const ni = idx + dir
              if (ni < 0 || ni >= p.length) return p
              const n = [...p]; [n[idx], n[ni]] = [n[ni], n[idx]]; return n
            })
          } else {
            // Déplacer la sélection au bloc voisin.
            const idx = bs.findIndex(b => b.id === cur)
            const ni = Math.max(0, Math.min(bs.length - 1, idx + dir))
            if (ni !== idx) { setMultiSelection([]); setSelectedId(bs[ni].id) }
          }
          return
        }
        // F seul — Mode Focus (fallback sans modificateur)
        if (!ctrl && !e.shiftKey && !e.altKey && (e.key === "f" || e.key === "F") && !isEditing(e)) {
          setFocusMode(prev => {
            const next = !prev
            setSidebarCollapsed(next)
            setBlocksCollapsed(next)
            setRightCollapsed(next)
            return next
          })
        }
      }
      window.addEventListener("keydown", handler)
      return () => window.removeEventListener("keydown", handler)
    }, [])

    // Fermer drawer au clic extérieur
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) setDrawerCategory(null)
      }
      if (drawerCategory) document.addEventListener("mousedown", handler)
      return () => document.removeEventListener("mousedown", handler)
    }, [drawerCategory])

    function toggleSidebar() { setSidebarCollapsed(p => !p); setFocusMode(false) }
    function toggleBlocks() { setBlocksCollapsed(p => !p); setFocusMode(false) }
    function toggleRight() { setRightCollapsed(p => !p); setFocusMode(false) }

    // ── Resize panneaux ────────────────────────────────────────────────────
    const blocksResize = useResize("blocks", 300, 240, 520)
    const rightResize = useResize("right", 340, 280, 520)
    // Responsive : sous 1024px, les 3 colonnes (palette | page | réglages) ne tiennent plus côte à côte.
    // On bascule en mode « un panneau à la fois » piloté par une barre d'onglets en bas.
    const isMobile = useIsMobile(1024)
    const focusNarrow = useIsMobile(1500) // < 1500 : en Focus, on masque la colonne Aperçu (le canvas fait office d'aperçu) → 2 colonnes
    const [mobileTab, setMobileTab] = useState<"blocks"|"canvas"|"panel">("canvas")
    // C04 — canvas responsive (actif seulement avec BUILDER_REDESIGN). Défauts = neutres (fluid/100 %)
    // → identique à l'existant tant que l'utilisateur ne change rien.
    const [canvasDevice, setCanvasDevice] = useState<CanvasDevice>("fluid")
    const [canvasOrientation, setCanvasOrientation] = useState<CanvasOrientation>("portrait")
    const [canvasZoom, setCanvasZoom] = useState(1)
    const [canvasMode, setCanvasMode] = useState<CanvasMode>("edit")
    // C06 — activation progressive : valeur ENV au 1er rendu (SSR-safe), override canary après montage.
    const BUILDER_REDESIGN = useBuilderRedesign()
    const [blockMenu, setBlockMenu] = useState<string | null>(null) // #10 : actions secondaires d'un bloc en bottom sheet
    const [blockSearchFocus, setBlockSearchFocus] = useState(false) // #13 : recherche de bloc focus -> on masque la barre du bas pour degager les resultats
    const [preview, setPreview] = useState(false) // #02 : mode Apercu plein ecran (masque tout le chrome d'edition)
    const enterPreview = () => { setPreview(true); setMobileTab("canvas"); setSelectedId(null) }
    // En mobile, les panneaux occupent 100% : on force l'état déplié (le mode réduit à icônes n'a plus de sens).
    useEffect(() => { if (isMobile) { setBlocksCollapsed(false); setRightCollapsed(false) } }, [isMobile])

    // ── Favoris ───────────────────────────────────────────────────────────────
    // ── Popover aperçu bloc ─────────────────────────────────────────────────
    const [popover, setPopover] = useState<{ type: string; x: number; y: number } | null>(null)
    const popoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    const showPopover = useCallback((type: string, e: React.MouseEvent) => {
      clearTimeout(popoverTimer.current)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      popoverTimer.current = setTimeout(() => {
        setPopover({ type, x: rect.right + 8, y: rect.top })
      }, 300)
    }, [])

    const hidePopover = useCallback(() => {
      clearTimeout(popoverTimer.current)
      setPopover(null)
    }, [])

    const [favorites, setFavorites] = useState<string[]>(() => {
      if (typeof window !== "undefined") {
        try { return JSON.parse(localStorage.getItem("qrfolio_fav_blocks") || "[]") } catch { return [] }
      }
      return []
    })

    const toggleFav = useCallback((type: string) => {
      setFavorites(prev => {
        const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        localStorage.setItem("qrfolio_fav_blocks", JSON.stringify(next))
        return next
      })
    }, [])

    const isFav = useCallback((type: string) => favorites.includes(type), [favorites])

    // ── Blocs récents ─────────────────────────────────────────────────────────
    const [recentBlocks, setRecentBlocks] = useState<string[]>(() => {
      if (typeof window !== "undefined") {
        try { return JSON.parse(localStorage.getItem("qrfolio_recent_blocks") || "[]") } catch { return [] }
      }
      return []
    })

    const pushRecent = useCallback((type: string) => {
      setRecentBlocks(prev => {
        const next = [type, ...prev.filter(t => t !== type)].slice(0, 8)
        localStorage.setItem("qrfolio_recent_blocks", JSON.stringify(next))
        return next
      })
    }, [])

    // ── Catégories repliées ───────────────────────────────────────────────────
    const [collapsedCats, setCollapsedCats] = useState<string[]>(() => {
      if (typeof window !== "undefined") {
        try { return JSON.parse(localStorage.getItem("qrfolio_collapsed_cats") || "[]") } catch { return [] }
      }
      return []
    })

    const toggleCat = useCallback((catId: string) => {
      setCollapsedCats(prev => {
        const next = prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
        localStorage.setItem("qrfolio_collapsed_cats", JSON.stringify(next))
        return next
      })
    }, [])

    const isCatCollapsed = useCallback((catId: string) => collapsedCats.includes(catId), [collapsedCats])
    // Mode Focus : on se concentre sur le CANVAS + l'ÉDITEUR. On masque la bibliothèque de blocs et
    // on replie la nav du dashboard (via événement), mais on GARDE l'éditeur ouvert pour éditer.
    function toggleFocus() {
      setFocusMode(p => {
        const next = !p
        setSidebarCollapsed(next); setBlocksCollapsed(next); setRightCollapsed(false)
        return next
      })
    }
    // Synchronise la nav du dashboard avec le mode Focus (toute transition, quelle que soit la sortie),
    // + restauration garantie en quittant le builder.
    useEffect(() => {
      try { window.dispatchEvent(new CustomEvent("qrowg:builder-focus", { detail: focusMode })) } catch { /* noop */ }
      return () => { try { window.dispatchEvent(new CustomEvent("qrowg:builder-focus", { detail: false })) } catch { /* noop */ } }
    }, [focusMode])

    // En mode Focus, les 3 sections (Aperçu/Éditeur/Thème) s'affichent EMPILÉES en même temps ; ce
    // petit en-tête collant les distingue et reste visible pendant le scroll de chaque section.
    const focusSectionHeader = (label: string) => focusMode ? (
      <div style={{ position: "sticky" as const, top: 0, zIndex: 6, padding: "8px 12px", background: "#1B1B1B", borderBottom: `1px solid ${G}40`, color: G, fontSize: 10.5, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: 1.5, flexShrink: 0 }}>{label}</div>
    ) : null

    useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

    useEffect(() => {
      // Ne charge que les polices CUSTOM (Fraunces / DM Sans deja chargees par le
      // layout) et donne a CHAQUE famille son axe de poids (sinon tout l apercu en faux-gras).
      const DEFAULTS = new Set(["Fraunces", "DM Sans"])
      const custom = [...new Set(
        [theme.fontDisplay, theme.fontBody].filter(Boolean).map(f => f.replace(/,.*/, "").trim()).filter(f => f && !DEFAULTS.has(f))
      )]
      if (!custom.length) return
      const families = custom.map(f => `family=${f.replace(/ /g, "+")}:wght@400;600;700`).join("&")
      const href = `https://fonts.googleapis.com/css2?${families}&display=swap`
      if (document.querySelector(`link[data-qf-font][href="${href}"]`)) return
      const link = document.createElement("link"); link.rel = "stylesheet"; link.href = href
      link.setAttribute("data-qf-font", "1")
      document.head.appendChild(link)
    }, [theme.fontDisplay, theme.fontBody])

    // Bootstrap : URL /builder/new (ou tout pageId non-UUID) -> on cree la page en base,
    // on recupere son vrai UUID, on met a jour l'URL sans rechargement, puis liveId prend le relais.
    // Le brouillon doit être en main AVANT la création de la page : le bootstrap
    // s'en sert comme contenu initial au lieu de créer une page vide.
    useEffect(() => {
      try {
        const q = new URLSearchParams(window.location.search)
        if (q.get("claim") === "1") claimRef.current = loadDraft(browserStorage())
        if (q.get("publier") === "1") wantPublishRef.current = true
      } catch {}
    }, [])

    useEffect(() => {
      if (!pageId || IS_UUID(pageId)) return
      if (authState !== "user") return        // invité ou session inconnue : aucune écriture
      if (creatingRef.current) return
      creatingRef.current = true
      ;(async () => {
        try {
          // Reprise du travail fait AVANT l'inscription : le brouillon local devient
          // le contenu de la page créée. C'est tout l'intérêt de l'essai sans compte.
          const claimed = claimRef.current
          const res = await fetch("/api/pages/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: claimed?.pageName || pageName }) })
          const json = await res.json().catch(() => ({}))
          if (!res.ok || !json?.pageId) { setBootstrapError(json?.message || json?.error || "Impossible de creer la page."); return }
          if (claimed) {
            setBlocksRaw(claimed.blocks.map(b => ({ id: IS_UUID(b.id) ? b.id : genId(), type: b.type, content: { ...b.content }, visible: b.visible !== false, draft: b.draft, locked: b.locked })))
            setPageName(claimed.pageName)
            if (claimed.theme) setTheme(normalizePageTheme(claimed.theme))
            clearDraft(browserStorage())
            claimRef.current = null
            setClaimed(true)
            // Repère 5 — bout du parcours : le compte existe ET le travail a été retrouvé.
            marque(FUNNEL.brouillonRepris, { modele: etiquette(claimed?.templateKey) })
            skipLoadRef.current = true
          } else {
            // Normalise les IDs de blocs par defaut (\"1\"/\"2\"/\"3\") en UUID -> chemin upsert propre.
            setBlocksRaw(prev => prev.map(b => IS_UUID(b.id) ? b : { ...b, id: genId() }))
          }
          // Page neuve creee : la sauvegarde peut persister les blocs initiaux.
          ready.current = true
          setLiveId(json.pageId)
          if (json.slug) setPageSlug(json.slug)
          try { window.history.replaceState(null, "", "/dashboard/builder/" + json.pageId) } catch {}
        } catch (e: any) {
          setBootstrapError(e?.message || "Impossible de creer la page.")
        }
      })()
    }, [pageId, authState])

    useEffect(() => {
      if (!IS_UUID(liveId)) return
      // Page tout juste créée à partir d'un brouillon : son contenu est en mémoire,
      // pas encore en base. Relire maintenant reviendrait à l'effacer.
      if (skipLoadRef.current) { skipLoadRef.current = false; setLoadState("loaded"); return }
      const supabase = createClient()
      let cancelled = false                 // ignore les résultats si l'effet est remplacé/démonté
      const alive = () => !cancelled && mountedRef.current
      setLoadState("loading")
      async function load() {
        try {
          // 1) Page (CRITIQUE). Erreur/absence → écran dédié, et surtout ready RESTE false
          //    (aucun autosave sur une page fantôme ou inaccessible → aucun écrasement).
          const { data: pg, error: pageErr } = await supabase.from("pages").select("title,slug,status,theme,total_views").eq("id", liveId).single()
          if (!alive()) return
          if (pageErr || !pg) { setLoadState(loadStateFromError(pageErr, false)); return }

          // 2) Blocs (CRITIQUES pour l'édition). Une erreur bloque le chargement (récupérable).
          const { data: blks, error: blkErr } = await supabase.from("blocks").select("*").eq("page_id", liveId).order("position")
          if (!alive()) return
          if (blkErr) { setLoadState(loadStateFromError(blkErr, false)); return }

          // Application de l'état chargé (uniquement après succès des lectures critiques →
          // pas de rendu partiel incohérent).
          // Thème NORMALISÉ à la frontière (fin des casts aveugles) : accepte les anciens
          // formats et garantit un PageTheme canonique complet côté Builder.
          const normTheme = normalizePageTheme(pg.theme)
          setPageName(pg.title); setPageSlug(pg.slug); setPageStatus(pg.status || "draft")
          setTheme(normTheme)
          setPageStats(s => ({ ...s, views: pg.total_views || 0 }))
          if (blks) {
            const loaded = blks.map(b => { const c = b.content || {}; return { id: b.id, type: b.type, content: c, visible: c.__visible !== undefined ? c.__visible !== false : (b.is_visible !== false), draft: c.__draft || false, locked: c.__locked || false } })
            setBlocksRaw(loaded)
            // Repart de l'état chargé (blocs + thème + nom) : évite l'undo->démo qui
            // écrasait le contenu, et cale le snapshot d'historique sur la page réelle.
            undoRedo.reset({ blocks: loaded, theme: normTheme, name: pg.title ?? nameRef.current })
          }

          // 3) Lectures NON critiques (QR, clics) : une erreur n'empêche PAS l'édition.
          const { data: qr } = await supabase.from("qr_codes").select("short_code,total_scans").eq("page_id", liveId).single()
          if (alive() && qr) { setQrShortCode(qr.short_code || ""); setPageStats(s => ({ ...s, scans: qr.total_scans || 0 })) }
          const since = new Date(); since.setDate(since.getDate() - 90)
          const { data: clk } = await supabase.from("block_clicks").select("block_id").eq("page_id", liveId).gte("clicked_at", since.toISOString())
          if (alive() && clk?.length) {
            const counts: Record<string, number> = {}
            for (const r of clk as any[]) { if (r.block_id) counts[r.block_id] = (counts[r.block_id] || 0) + 1 }
            setClickCounts(counts)
          }

          if (!alive()) return
          // Page chargée : la sauvegarde peut désormais s'activer sans risque d'écraser.
          // (ready passé à true APRÈS tous les setState → l'autosave d'hydratation, qui lit
          // ready.current === false pendant le chargement, ne se déclenche pas.)
          ready.current = true
          setLoadState("loaded")
        } catch (e) {
          // Exception (réseau, JSON, inattendue) : écran récupérable, ready reste false.
          if (alive()) setLoadState(loadStateFromError(e, false))
        }
      }
      load()
      return () => { cancelled = true }
    }, [liveId, loadNonce])

    // ── Invité : restauration du brouillon ────────────────────────────────────
    // Un visiteur qui revient retrouve son travail. On restaure d'office quand il
    // arrive depuis un modèle (?draft=1) ; sinon on propose, sans rien écraser.
    useEffect(() => {
      if (authState !== "guest" || guestReady.current) return
      const d = loadDraft(browserStorage())
      const asked = (() => { try { return new URLSearchParams(window.location.search).get("draft") === "1" } catch { return false } })()
      if (d && (asked || !draftIsMeaningful(d))) {
        applyDraft(d)
      } else if (d && d.templateKey) {
        templateKeyRef.current = d.templateKey
        setDraftFound(d)
      } else if (d) {
        setDraftFound(d)          // on demande avant d'écraser ce qu'il a peut-être commencé
      }
      guestReady.current = true
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authState])

    function applyDraft(d: LocalDraft) {
      templateKeyRef.current = d.templateKey
      // Page déjà remplie : le guide « on a posé 3 blocs pour toi » n'a plus de sens.
      if (d.templateKey || d.blocks.length > 3) setFromTemplate(true)
      setBlocksRaw(d.blocks.map(b => ({ id: b.id, type: b.type, content: { ...b.content }, visible: b.visible !== false, draft: b.draft, locked: b.locked })))
      setPageName(d.pageName)
      if (d.theme) setTheme(normalizePageTheme(d.theme))
      setDraftFound(null)
      guestReady.current = true
    }

    // ── Invité : sauvegarde du brouillon dans le navigateur ───────────────────
    // Sans compte il n'y a rien à écrire en base : on écrit localement, au même
    // format que ce que la base attend, pour que la reprise après inscription soit
    // une simple relecture — pas une conversion.
    useEffect(() => {
      if (authState !== "guest" || !guestReady.current || draftFound) return
      clearTimeout(draftTimer.current)
      draftTimer.current = setTimeout(() => {
        const d = makeDraft({ pageName, theme, blocks, templateKey: templateKeyRef.current, now: Date.now() })
        if (!draftIsMeaningful(d)) return          // le squelette de départ ne mérite pas d'être conservé
        const r = saveDraft(browserStorage(), d)
        setDraftState(r.ok === true ? "saved" : r.reason)
        dirty.current = !r.ok                       // rien n'est perdu si l'écriture a réussi
        // Repère 3 — la personne a VRAIMENT touché à sa page : draftIsMeaningful, juste
        // au-dessus, a déjà écarté le squelette de départ. Posé une seule fois.
        if (r.ok === true && !modifRef.current) { modifRef.current = true; marque(FUNNEL.pageModifiee, { blocs: blocks.length }) }
      }, 600)
      return () => clearTimeout(draftTimer.current)
    }, [blocks, pageName, theme, authState, draftFound])

    // Avertit avant de fermer/recharger l'onglet s'il reste des changements non sauvegardes.
    useEffect(() => {
      const handler = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = "" } }
      window.addEventListener("beforeunload", handler)
      return () => window.removeEventListener("beforeunload", handler)
    }, [])

    // ── Coordinateur de sauvegarde « single-flight » ───────────────────────────
    // Sérialise les sauvegardes d'un MÊME client : jamais deux en parallèle, le dernier
    // snapshot gagne, une sauvegarde ancienne ne peut ni marquer un état neuf comme
    // « Enregistré » ni supprimer un bloc ajouté après son démarrage. Créé une seule
    // fois ; la persistance et le snapshot portent tout le contexte (pas de closure stale).
    const saveCtrlRef = useRef<SaveController<PageSnapshot> | null>(null)
    if (!saveCtrlRef.current) {
      saveCtrlRef.current = createSaveController<PageSnapshot>({
        persist: (snap) => persistSnapshot(createClient(), snap),
        onChange: (s) => {
          dirty.current = s.dirty
          setSaving(s.saving)
          setHasUnsaved(s.dirty)
          setSaved(s.status === "saved")
          setSaveError(s.status === "error")
          // Message SÛR (jamais le message Supabase brut : table, code SQL, détail RLS).
          if (s.status === "error" && s.error) setSaveErrorMsg(safeErrorMessage(s.error))
        },
      })
    }

    // Refs fraîches pour les closures stables du contrôleur de publication (créé une fois).
    const liveIdRef = useRef(liveId); useEffect(() => { liveIdRef.current = liveId }, [liveId])
    const mountedRef = useRef(true); useEffect(() => () => { mountedRef.current = false }, [])

    // ── Contrôleur de publication ───────────────────────────────────────────────
    // Contrat : intention → flush (persiste le DERNIER snapshot via le coordinateur) →
    // mutation serveur (statut + revalidation ISR) → succès. Garde single-flight impérative
    // (anti double-clic). Aucun « Publié » n'est affiché tant que le serveur n'a pas confirmé.
    const publishCtrlRef = useRef<ReturnType<typeof createPublishController> | null>(null)
    if (!publishCtrlRef.current) {
      publishCtrlRef.current = createPublishController({
        flush: () => saveCtrlRef.current?.flush() ?? Promise.resolve(true),
        publish: () => publishPage(liveIdRef.current!),
        onChange: (s) => {
          if (!mountedRef.current) return // aucun setState après démontage
          setPublishing(s.phase === "publishing")
          if (s.phase === "publishing") setPublishError("")
          if (s.phase === "error") setPublishError(s.message)
          if (s.phase === "published") {
            setPublishError("")
            // Repère 6 — le bout du parcours : une page en ligne, un QR qui sert.
            if (!publieeRef.current) { publieeRef.current = true; marque(FUNNEL.pagePubliee, { auto: autoPubRef.current, blocs: blocksRef.current }) }
            setPageStatus("published")
            setPublishWasUpdate(s.alreadyPublished)
            setPublishSuccess(true)
            setTimeout(() => { if (mountedRef.current) setPublishSuccess(false) }, 3500)
          }
        },
      })
    }

    // Compteur de blocs lisible depuis les callbacks stables du contrôleur.
    useEffect(() => { blocksRef.current = blocks.length }, [blocks])

    // Tenir la promesse : elle a cliqué « publier », créé un compte, et sa page est
    // maintenant en base avec son contenu. On enregistre puis on publie — sans lui
    // redemander. L'ordre compte : saveNow() dépose le snapshot, publishLatest()
    // attend qu'il soit persisté avant de basculer le statut. Publier sans cela
    // mettrait en ligne une page vide.
    useEffect(() => {
      if (!wantPublishRef.current || autoPubRef.current) return
      if (!claimed || !IS_UUID(liveId) || !ready.current) return
      autoPubRef.current = true
      wantPublishRef.current = false
      setShowPublishPopup(true)          // on montre ce qui se passe, on ne le fait pas en douce
      saveNow()
      void publishCtrlRef.current?.publishLatest()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [claimed, liveId])

    // Snapshot IMMUABLE de l'état courant (cloné avant tout appel réseau). Renvoie null
    // tant que la page n'est pas prête (garde anti-écrasement des blocs de démo).
    const buildSnapshot = useCallback((): PageSnapshot | null => {
      if (!IS_UUID(liveId) || !ready.current) return null
      return {
        liveId: liveId!,
        pageName,
        theme: { ...(theme as any) },
        blocks: blocks.map(b => ({ id: b.id, type: b.type, content: { ...b.content }, visible: b.visible, draft: b.draft, locked: b.locked })),
      }
    }, [liveId, pageName, theme, blocks])

    // Libère le coordinateur au démontage (coupe les notifications → aucun setState après unmount).
    // On nulle la ref pour qu'un rendu ultérieur en recrée un (auto-réparation du double-montage
    // React strict en dev ; sans effet en production où le démontage est définitif).
    useEffect(() => () => { saveCtrlRef.current?.dispose(); saveCtrlRef.current = null }, [])

    useEffect(() => {
      // ready.current : garde anti-ecrasement — on ne sauvegarde pas tant que la page n'est
      // pas chargee (existante) ou creee (nouvelle), pour ne jamais persister les blocs de demo.
      if (!IS_UUID(liveId) || !ready.current) return
      // Feedback immédiat « non enregistré » ; le coordinateur confirmera après le réseau.
      dirty.current = true; setHasUnsaved(true); setSaved(false)
      clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        const snap = buildSnapshot()
        if (snap) saveCtrlRef.current?.request(snap)
      }, 800)
    }, [blocks, pageName, theme, liveId, buildSnapshot])

    // Déclenchement manuel immédiat (bouton « Enregistrer maintenant »).
    function saveNow() {
      clearTimeout(saveTimeout.current)
      const snap = buildSnapshot()
      if (snap) saveCtrlRef.current?.request(snap)
    }

    // Publication / mise à jour : délègue au contrôleur (flush → mutation serveur →
    // revalidation). La garde single-flight vit dans le contrôleur (double-clic sûr).
    function handlePublish() {
      // Invité : publier, c'est le moment où le compte devient nécessaire (la page
      // doit appartenir à quelqu'un). On emporte le brouillon — rien n'est resaisi.
      if (guest) { goSignup(); return }
      if (!IS_UUID(liveId)) return
      void publishCtrlRef.current?.publishLatest()
    }

    /** Emporte le brouillon vers l'inscription, puis revient créer la page. */
    function goSignup() {
      // Repère 4 — la marche décisive : elle a une page, on lui demande un compte.
      marque(FUNNEL.publierSansCompte, { blocs: blocks.length, modele: etiquette(templateKeyRef.current) })
      const d = makeDraft({ pageName, theme, blocks, templateKey: templateKeyRef.current, now: Date.now() })
      const r = saveDraft(browserStorage(), d)
      if (r.ok !== true) { setDraftState(r.reason); return }   // on ne l'envoie pas perdre son travail
      // L'INTENTION voyage, pas seulement le contenu : la personne n'a pas cliqué
      // « créer un compte », elle a cliqué « publier ». Sans ce marqueur, elle
      // revenait devant un brouillon et devait retrouver le bouton toute seule.
      const back = encodeURIComponent("/dashboard/builder/new?claim=1&publier=1")
      // Un souffle avant de partir : le temps que le repère parte vraiment. Personne
      // ne perçoit 120 ms, et sans cela la marche la plus intéressante du parcours
      // ne serait jamais comptée.
      setTimeout(() => { try { window.location.href = `/auth/signup?redirect=${back}` } catch {} }, 120)
    }

    // ID de bloc = UUID valide (colonne uuid en base) -> IDs stables entre sauvegardes,
    // ce qui préserve l'historique de clics (block_clicks.block_id) au lieu de le perdre à chaque publication.
    function genId(): string {
      try { if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID() } catch {}
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, ch => { const r = Math.floor(Math.random() * 16); const v = ch === "x" ? r : (r & 0x3 | 0x8); return v.toString(16) })
    }

    function addBlock(type: string, content?: BlockContent, insertAt?: number | null) {
      const def = BLOCK_DEFS[type]; if (!def) return
      const id = genId()
      const nb = { id, type, content: content||{...def.defaultContent}, visible: true }
      // C06 — index d'insertion optionnel (bouton « + » entre blocs). Absent = ajout en fin (inchangé).
      setBlocks(p => {
        if (insertAt == null) return [...p, nb]
        const at = Math.max(0, Math.min(p.length, insertAt))
        const next = p.slice(); next.splice(at, 0, nb); return next
      })
      setSelectedId(id); setRightTab("edit")
      if (isMobile) setMobileTab("panel")   // mobile : on ouvre direct l'éditeur du bloc ajouté
      pushRecent(type)
      // Scroll vers le nouveau bloc (page longue).
      setTimeout(() => { try { document.querySelector(`[data-block-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }) } catch {} }, 60)
    }
    // Index d'insertion en attente (déposé par un bouton « + » entre blocs, consommé au prochain ajout).
    const insertGapRef = useRef<number | null>(null)
    function onInsertAtGap(index: number) {
      insertGapRef.current = index
      if (isMobile) setMobileTab("blocks")   // mobile : ouvrir la bibliothèque
      else setActiveCategory("identity")     // desktop : la bibliothèque (panneau gauche) est déjà visible
    }
    // Ajout depuis la bibliothèque, en respectant l'index « + » en attente (puis on le consomme).
    function addFromLibrary(type: string) {
      const at = insertGapRef.current
      insertGapRef.current = null
      addBlock(type, undefined, at ?? undefined)
    }

    // Applique un MODÈLE DE PAGE complet : thème cohérent + jeu de blocs prêt à personnaliser.
    // Remplace les blocs (réversible via Ctrl+Z / undo). Confirme si la page a déjà du contenu.
    async function applyPageTemplate(tpl: PageTemplate) {
      const nonEmpty = blocks.filter(b => !(b.type === "profile" && !(b.content?.name))).length
      if (blocks.length > 1 || nonEmpty > 0) {
        if (!(await confirm({ title: "Appliquer ce modèle ?", message: `Appliquer le modèle « ${tpl.label} » ?\n\nLes blocs actuels seront remplacés et le thème mis à jour. Réversible avec Annuler (Ctrl+Z).`, confirmLabel: "Appliquer" }))) return
      }
      // Transactionnel : blocs + thème appliqués en UNE SEULE entrée d'undo
      // (setters bruts + un push explicite), plutôt que deux entrées séparées.
      const nextTheme = { ...themeRef.current, ...tpl.theme }
      const next = tpl.blocks.map(b => ({ id: genId(), type: b.type, content: { ...(BLOCK_DEFS[b.type]?.defaultContent || {}), ...b.content }, visible: true }))
      setBlocksRaw(next)
      setTheme(nextTheme)
      undoRedo.push({ blocks: next, theme: nextTheme, name: nameRef.current })
      setSelectedId(null); setRightTab("edit"); setShowTemplates(false)
      if (isMobile) setMobileTab("canvas")   // mobile : on montre la page fraîchement générée
    }

    // (Bouton "Generer une identite de base" retire — QWG-0019 : la page part deja
    //  pre-remplie et les "Modeles par metier" couvrent ce besoin.)

    function generateIdentityPreset(preset: typeof IDENTITY_PRESETS[number]) {
      const mk = (type: string, ov: Record<string, string>) => ({ ...(BLOCK_DEFS[type]?.defaultContent || {}), ...ov })
      const hasProfile = blocks.some(b => b.type === "profile")
      preset.blocks.forEach(b => {
        if (b.type === "profile" && hasProfile) return // ne recrée pas un profil existant
        addBlock(b.type, mk(b.type, b.content))
      })
    }

    function generateActionPreset(preset: typeof ACTION_PRESETS[number]) {
      const mk = (type: string, ov: Record<string, string>) => ({ ...(BLOCK_DEFS[type]?.defaultContent || {}), ...ov })
      preset.blocks.forEach(b => addBlock(b.type, mk(b.type, b.content)))
    }

    function generateSocialPreset(preset: typeof SOCIAL_PRESETS[number]) {
      const content: Record<string, string> = {}
      preset.networks.forEach(k => { content[k] = SOCIAL_URL_TEMPLATES[k] || "https://" })
      addBlock("social_links", content)
    }

    function generateCommercePreset(preset: typeof COMMERCE_PRESETS[number]) {
      const mk = (type: string, ov: Record<string, string>) => ({ ...(BLOCK_DEFS[type]?.defaultContent || {}), ...ov })
      preset.blocks.forEach(b => addBlock(b.type, mk(b.type, b.content)))
    }

    function generateMediaPreset(preset: typeof MEDIA_PRESETS[number]) {
      const mk = (type: string, ov: Record<string, string>) => ({ ...(BLOCK_DEFS[type]?.defaultContent || {}), ...ov })
      preset.blocks.forEach(b => addBlock(b.type, mk(b.type, b.content)))
    }

    function generateInfoPreset(preset: typeof INFO_PRESETS[number]) {
      const mk = (type: string, ov: Record<string, string>) => ({ ...(BLOCK_DEFS[type]?.defaultContent || {}), ...ov })
      preset.blocks.forEach(b => addBlock(b.type, mk(b.type, b.content)))
    }

    function deleteBlock(id: string) {
      if (blocks.find(b => b.id === id)?.locked) return
      setBlocks(p => p.filter(b => b.id !== id))
      if (selectedId === id) { setSelectedId(null); setRightTab("edit") }
    }

    function resetBlock(id: string) {
      const block = blocks.find(b => b.id === id); if (!block || block.locked) return
      const def = BLOCK_DEFS[block.type]
      setBlocks(p => p.map(b => b.id === id ? { ...b, content: { ...(def?.defaultContent || {}) } } : b))
    }

    function duplicateBlock(id: string) {
      const block = blocks.find(b => b.id === id); if (!block) return
      const newId = genId()
      const idx = blocks.findIndex(b => b.id === id)
      setBlocks(p => [...p.slice(0, idx+1), { ...block, id: newId, content: {...block.content} }, ...p.slice(idx+1)])
      setSelectedId(newId)
    }

    function toggleVisible(id: string) { setBlocks(p => p.map(b => b.id===id ? {...b, visible: !b.visible} : b)) }
    function toggleDraft(id: string) { setBlocks(p => p.map(b => b.id===id ? {...b, draft: !b.draft} : b)) }
    function toggleLock(id: string) { setBlocks(p => p.map(b => b.id===id ? {...b, locked: !b.locked} : b)) }

    // ── Sélection multiple ────────────────────────────────────────────────────
    function handleBlockClick(e: React.MouseEvent, blockId: string, blockIdx: number) {
      if (preview) return // #02 : en mode Apercu, aucun clic d'edition
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+clic : toggle dans la sélection multiple
        e.preventDefault()
        setMultiSelection(prev =>
          prev.includes(blockId) ? prev.filter(id => id !== blockId) : [...prev, blockId]
        )
        if (multiSelection.length === 0) setSelectedId(blockId)
      } else if (e.shiftKey && selectedId) {
        // Shift+clic : sélectionner une plage
        e.preventDefault()
        const selectedIdx = blocks.findIndex(b => b.id === selectedId)
        const min = Math.min(selectedIdx, blockIdx)
        const max = Math.max(selectedIdx, blockIdx)
        setMultiSelection(blocks.slice(min, max + 1).map(b => b.id))
      } else {
        // Clic simple
        setMultiSelection([])
        setSelectedId(blockId)
        setRightTab("edit")
      }
    }

    function deleteMulti() {
      const ids = multiSelection.length > 0 ? multiSelection : []
      if (ids.length === 0) return
      setBlocks(p => p.filter(b => !ids.includes(b.id) || b.locked))
      setMultiSelection([])
      setSelectedId(null)
    }
    // Le handler clavier global appelle ces actions via ref (toujours à jour).
    deleteMultiRef.current = deleteMulti
    deleteBlockRef.current = deleteBlock

    function duplicateMulti() {
      const ids = multiSelection
      if (ids.length === 0) return
      setBlocks(p => {
        const result = [...p]
        const newIds: string[] = []
        // Insérer les clones après le dernier bloc sélectionné
        const lastIdx = Math.max(...ids.map(id => result.findIndex(b => b.id === id)))
        const clones = ids.map(id => {
          const orig = result.find(b => b.id === id)!
          const newId = genId()
          newIds.push(newId)
          return { ...orig, id: newId, content: { ...orig.content } }
        })
        result.splice(lastIdx + 1, 0, ...clones)
        return result
      })
      setMultiSelection([])
    }

    // ── Dupliquer / Copier / Coller (clavier + palette) ───────────────────────
    function duplicateSelection() {
      if (multiSelection.length > 0) duplicateMulti()
      else if (selectedId) duplicateBlock(selectedId)
    }
    function copySelection() {
      const ids = multiSelection.length > 0 ? multiSelection : (selectedId ? [selectedId] : [])
      if (!ids.length) return
      clipboardRef.current = blocks.filter(b => ids.includes(b.id)).map(b => ({ ...b, content: { ...b.content } }))
    }
    function pasteClipboard() {
      const clip = clipboardRef.current
      if (!clip.length) return
      const clones = cloneBlocks(clip, genId)
      const anchorIds = multiSelection.length > 0 ? multiSelection : (selectedId ? [selectedId] : [])
      setBlocks(p => {
        let at = p.length
        if (anchorIds.length) at = Math.max(...anchorIds.map(id => p.findIndex(b => b.id === id))) + 1
        return [...p.slice(0, at), ...clones, ...p.slice(at)]
      })
      setSelectedId(clones[clones.length - 1].id)
      setMultiSelection(clones.length > 1 ? clones.map(c => c.id) : [])
      setRightTab("edit")
    }
    copyRef.current = copySelection
    pasteRef.current = pasteClipboard
    duplicateSelRef.current = duplicateSelection

    function toggleVisibleMulti() {
      const ids = multiSelection
      if (ids.length === 0) return
      // Si tous visibles → masquer tous, sinon → afficher tous
      const allVisible = ids.every(id => blocks.find(b => b.id === id)?.visible)
      setBlocks(p => p.map(b => ids.includes(b.id) ? { ...b, visible: !allVisible } : b))
    }

    function moveBlock(id: string, dir: number) {
      const block = blocks.find(b => b.id === id)
      if (block?.locked) return // Bloc verrouillé — déplacement interdit
      const idx = blocks.findIndex(b => b.id === id)
      const ni = idx + dir; if (ni < 0 || ni >= blocks.length) return
      setBlocks(p => { const n = [...p]; [n[idx], n[ni]] = [n[ni], n[idx]]; return n })
    }

    // ── FIX CRITIQUE: updateBlock immédiat + EditPanel key ────────────────────
    function updateBlock(id: string, key: string, value: string) {
      // Clé de coalescing par (bloc, champ) : taper dans un champ = UNE entrée d'undo,
      // pas une par caractère. Changer de champ/bloc démarre une nouvelle entrée.
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: { ...b.content, [key]: value } } : b), false, `field:${id}:${key}`)
    }

    // Édition inline (canvas) : committer STABLE (via ref) pour préserver la
    // mémoïsation de MemoBlockPreview (une prop callback recréée casserait le memo).
    const editFieldRef = useRef<(id: string, key: string, value: string) => void>(() => {})
    editFieldRef.current = updateBlock
    const onEditField = useCallback((id: string, key: string, value: string) => editFieldRef.current(id, key, value), [])

    async function sendAI(prompt?: string) {
      const msg = (prompt || aiInput).trim(); if (!msg || aiLoading) return
      setAiInput("")
      setMessages(p => [...p, { role: "user", content: msg }])
      setAiLoading(true)
      try {
        const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...messages, { role: "user", content: msg }] }) })
        const data = await res.json()
        const reply = data.content?.[0]?.text || "Erreur."
        let added = 0
        reply.split("\n").forEach((line: string) => {
          if (line.startsWith("ADD_BLOCK:")) { try { const j = JSON.parse(line.replace("ADD_BLOCK:","").trim()); addBlock(j.type, j.content); added++ } catch {} }
        })
        const clean = reply.split("\n").filter((l: string) => !l.startsWith("ADD_BLOCK:")).join("\n").trim()
        setMessages(p => [...p, { role: "assistant", content: clean + (added>0 ? `\n\n✅ ${added} bloc${added>1?"s":""} ajouté${added>1?"s":""}!` : "") }])
      } catch { setMessages(p => [...p, { role: "assistant", content: "Erreur de connexion." }]) }
      setAiLoading(false)
    }

    // ── Recherche enrichie (moteur pur partagé : builderSearch.ts) ─────────────
    const searchScore = scoreBlock

    const filteredBlocks = (() => {
      if (!search) {
        if (activeCategory === "essentials") {
          // ~20 blocs les plus utiles (contextuels + universels). Les 143 restent
          // accessibles via les categories et la recherche. (QWG-0017b)
          return essentialsForContext("default")
            .filter(type => BLOCK_DEFS[type])
            .map(type => [type, BLOCK_DEFS[type]] as [string, (typeof BLOCK_DEFS)[string]])
        }
        if (activeCategory === "recents") {
          return recentBlocks
            .filter(type => BLOCK_DEFS[type])
            .map(type => [type, BLOCK_DEFS[type]] as [string, (typeof BLOCK_DEFS)[string]])
        }
        if (activeCategory === "favorites") {
          return Object.entries(BLOCK_DEFS).filter(([type]) => favorites.includes(type))
        }
        return Object.entries(BLOCK_DEFS).filter(([, def]) => def.category === activeCategory)
      }
      return Object.entries(BLOCK_DEFS)
        .map(([type, def]) => ({ type, def, score: searchScore(type, def, search) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ type, def }) => [type, def] as [string, (typeof BLOCK_DEFS)[string]])
    })()

    const groupedResults = search
      ? BLOCK_CATEGORIES.map(cat => ({
          cat,
          blocks: filteredBlocks.filter(([, def]) => def.category === cat.id)
        })).filter(({ blocks }) => blocks.length > 0)
      : null

    // Compteurs par catégorie — calculés une seule fois par render
    const catCounts = Object.values(BLOCK_DEFS).reduce((acc, def) => {
      acc[def.category] = (acc[def.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Compteurs recherche — nb de résultats par catégorie
    const searchCounts = search && groupedResults
      ? Object.fromEntries(groupedResults.map(({ cat, blocks }) => [cat.id, blocks.length]))
      : null

    function hlText(text: string, query: string): React.ReactNode {
      if (!query.trim()) return text
      const lo = text.toLowerCase()
      const idx = lo.indexOf(query.toLowerCase())
      if (idx === -1) return text
      return <>{text.slice(0, idx)}<mark style={{ background: "rgba(201,168,76,0.25)", color: "#F5F0E8", borderRadius: 2, padding: "0 1px" }}>{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>
    }

    // selectedBlock recalculé depuis blocks à chaque render — garantit fraîcheur
    const selectedBlock = blocks.find(b => b.id === selectedId)
    // Revenir à l'onglet Contenu à chaque changement de bloc sélectionné.
    useEffect(() => { setEditTab("contenu") }, [selectedId])

    // Fond du thème appliqué partout
    function bgStyle(): React.CSSProperties {
      if (dayMode) return { background: "#FAFAFA" }
      if (!theme) return { background: "#080808" }
      const t = theme as any
      let base: React.CSSProperties = {}

      if (t.bgMode === "pattern") {
        const patSize = t.pattern_size || 20
        const patOpacity = t.pattern_opacity || 0.15
        const patColor = t.pattern_color || "#C9A84C"
        const alpha = Math.round(patOpacity * 255).toString(16).padStart(2, "0")
        const c = patColor + alpha
        let bgImg = ""
        switch(t.bgPattern || "dots") {
          case "dots": bgImg = `radial-gradient(circle, ${c} 1px, transparent 1px)`; break
          case "grid": bgImg = `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`; break
          case "lines": bgImg = `linear-gradient(0deg, ${c} 1px, transparent 1px)`; break
          case "diagonals": bgImg = `linear-gradient(45deg, ${c} 1px, transparent 1px)`; break
          case "hexagons": bgImg = `radial-gradient(circle, ${c} 2px, transparent 2px)`; break
          case "circles": bgImg = `radial-gradient(circle, transparent ${patSize*0.3}px, ${c} ${patSize*0.3}px, ${c} ${patSize*0.32}px, transparent ${patSize*0.32}px)`; break
          case "zigzag": bgImg = `linear-gradient(135deg, ${c} 25%, transparent 25%), linear-gradient(225deg, ${c} 25%, transparent 25%)`; break
          case "waves": bgImg = `repeating-linear-gradient(90deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${patSize}px), repeating-linear-gradient(180deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${patSize}px)`; break
          case "squares": bgImg = `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`; break
          case "circles": bgImg = `radial-gradient(circle, transparent ${patSize*0.3}px, ${c} ${patSize*0.3}px, ${c} ${patSize*0.32}px, transparent ${patSize*0.32}px)`; break
          case "stars": bgImg = `radial-gradient(circle, ${c} 1.5px, transparent 1.5px), radial-gradient(circle at ${patSize/2}px ${patSize/2}px, ${c} 1.5px, transparent 1.5px)`; break
          default: bgImg = `radial-gradient(circle, ${c} 1px, transparent 1px)`
        }
        base = { background: theme.bg, backgroundImage: bgImg, backgroundSize: `${patSize}px ${patSize}px` }
      } else if (t.bgMode === "radial") {
        return { background: t.bgGradient || `radial-gradient(circle at 50% 50%, ${theme.primary}, ${theme.bg})` }
      } else if (t.bgMode === "mesh") {
        const c1 = t.mesh_c1 || "#C9A84C"; const c2 = t.mesh_c2 || "var(--success)"; const c3 = t.mesh_c3 || "#7B2FBE"
        const blurPx = Math.round((t.mesh_blur||40)/3)
        base = {
          background: `radial-gradient(ellipse at 10% 20%, ${c1}90, transparent 55%), radial-gradient(ellipse at 90% 80%, ${c2}90, transparent 55%), radial-gradient(ellipse at 80% 10%, ${c3}70, transparent 55%), ${theme.bg}`,
          ...(blurPx > 0 ? { backdropFilter: `blur(${blurPx}px)` } : {})
        }
      } else if (t.bgMode === "image" && t.bgImage) {
        base = {
          backgroundImage: `url(${t.bgImage})`,
          backgroundSize: t.bgImageSize || "cover",
          backgroundPosition: "center",
          ...(t.bgBlur > 0 ? { filter: `blur(${t.bgBlur}px)` } : {})
        }
      } else {
        const animStyle: React.CSSProperties = t.bgAnimation === "gradient-flow"
          ? { backgroundSize: "400% 400%", animation: `gradientShift ${t.anim_speed||8}s ease infinite` }
          : t.bgAnimation === "aurora"
          ? { backgroundSize: "300% 300%", animation: `auroraShift ${t.anim_speed||12}s ease infinite` }
          : {}
        base = { background: theme.bgGradient || theme.bg, ...animStyle }
      }
      return base
    }

    // Chargement d'une page existante en échec : écran clair plutôt qu'un builder rempli de
    // blocs de démo (page fantôme). not_found/forbidden = terminaux ; error = « Réessayer ».
    if (IS_UUID(liveId) && (loadState === "not_found" || loadState === "forbidden" || loadState === "error")) {
      const info = loadState === "not_found"
        ? { icon: "🗑️", title: "Cette page n'existe plus", sub: "Elle a peut-être été supprimée." }
        : loadState === "forbidden"
        ? { icon: "🔒", title: "Vous n'avez plus accès à cette page", sub: "Demandez au propriétaire de vous réinviter." }
        : { icon: "⚠️", title: "Impossible de charger la page", sub: "Vérifiez votre connexion puis réessayez." }
      return (
        <div style={{ height: "100dvh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, sans-serif", color: "#F5F0E8", padding: 24 }}>
          <div role="alert" style={{ maxWidth: 380, textAlign: "center", background: "#111009", border: "1px solid rgba(201,168,76,0.16)", borderRadius: 16, padding: "32px 28px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>{info.icon}</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", fontFamily: "Fraunces, serif" }}>{info.title}</h1>
            <p style={{ fontSize: 13, color: "#8A8478", margin: "0 0 22px", lineHeight: 1.6 }}>{info.sub}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {loadState === "error" && (
                <button onClick={() => { setLoadState("loading"); setLoadNonce(n => n + 1) }} className="da-btn-primary da-btn-primary--sm"><span>Réessayer</span></button>
              )}
              <a href="/dashboard" className="da-btn-neutral da-btn-neutral--sm">Retour au tableau de bord</a>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="builder-root" style={{ height: "100dvh", background: "#080808", display: "flex", flexDirection: "column", fontFamily: "DM Sans, sans-serif", color: "#F5F0E8", overflow: "hidden", position: "relative" }}>

        {/* Guide de bienvenue au 1er lancement (auto-gere via localStorage) — QWG-0016 */}
        {/* Le guide dit « on a posé 3 blocs pour toi » : hors sujet quand on arrive
            d'un modèle avec une page déjà remplie. On le garde pour la page vierge. */}
        {!preview && !draftFound && !fromTemplate && !claimed && <BuilderWelcome mobile={isMobile} />}

        {/* Un visiteur qui revient a laissé du travail derrière lui. On demande avant
            de l'écraser : reprendre, ou repartir de zéro — jamais à son insu. */}
        {draftFound && (
          <div role="dialog" aria-modal="true" aria-label="Reprendre votre page"
            style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ maxWidth: 380, width: "100%", background: "#111009", border: "1px solid rgba(201,168,76,0.22)", borderRadius: 18, padding: "26px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }} aria-hidden>📝</div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px", fontFamily: "Fraunces, serif", color: "#F5F0E8" }}>Vous aviez commencé une page</h2>
              <p style={{ fontSize: 13, color: MUTED, margin: "0 0 20px", lineHeight: 1.55 }}>
                {draftSummary(draftFound, Date.now())} — gardée dans ce navigateur.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => applyDraft(draftFound)} className="da-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  <span>Reprendre où j'en étais</span>
                </button>
                <button onClick={() => { clearDraft(browserStorage()); setDraftFound(null); guestReady.current = true }}
                  style={{ width: "100%", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px", color: MUTED, fontSize: 12.5, cursor: "pointer" }}>
                  Repartir de zéro
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Retour d'inscription : on confirme que le travail a bien suivi. */}
        {claimed && (
          <div role="status" style={{ position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 380, background: "rgba(57,255,143,0.12)", border: "1px solid rgba(57,255,143,0.35)", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 9, maxWidth: "calc(100vw - 28px)" }}>
            <Check size={14} color="var(--success)" />
            <span style={{ color: "var(--success)", fontSize: 12.5, fontWeight: 600 }}>{autoPubRef.current ? "Votre page vous a suivi et part en ligne." : "Votre page vous a suivi — elle est maintenant dans votre compte."}</span>
            <button onClick={() => setClaimed(false)} aria-label="Fermer" style={{ background: "none", border: "none", color: "var(--success)", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        )}

        {/* C05 — Shell mobile dédié (flag ON + viewport mobile). Recouvre le Builder desktop-compressé.
            Flag OFF ou desktop = interface historique strictement inchangée (zéro régression). */}
        {BUILDER_REDESIGN && isMobile && !preview && (
          <MobileBuilderShell
            pageName={pageName} saving={saving} saved={saved} saveError={saveError} saveErrorMsg={saveErrorMsg} hasUnsaved={hasUnsaved}
            canUndo={undoRedo.canUndo()} canRedo={undoRedo.canRedo()}
            onUndo={() => { const p = undoRedo.undo(); if (p) applySnapshot(p) }}
            onRedo={() => { const n = undoRedo.redo(); if (n) applySnapshot(n) }}
            onSave={saveNow} onRetry={() => saveCtrlRef.current?.retry()}
            onBack={() => { try { window.location.assign("/dashboard") } catch { /* noop */ } }}
            blocks={blocks} selectedId={selectedId} onSelect={setSelectedId}
            favorites={favorites} recents={recentBlocks} onToggleFavorite={toggleFav}
            onAddBlock={(t) => addBlock(t)}
            onChange={(id, k, v) => updateBlock(id, k, v)}
            onDuplicate={(id) => duplicateBlock(id)} onDelete={(id) => deleteBlock(id)}
            onToggleVisible={(id) => toggleVisible(id)} onToggleLock={(id) => toggleLock(id)} onToggleDraft={(id) => toggleDraft(id)}
            onMove={(id, dir) => setBlocks(prev => { const i = prev.findIndex(b => b.id === id); return i < 0 ? prev : reorderArray(prev, i, dir === -1 ? i - 1 : i + 2) })}
            onReset={(id) => resetBlock(id)}
            pageStatus={pageStatus} publishing={publishing} publishError={publishError} onPublish={() => { void handlePublish() }}
            publicUrl={pageSlug ? `/${pageSlug}` : undefined}
            renderCanvas={() => blocks.map(b => (
              <div key={b.id} data-block-id={b.id} onClick={() => setSelectedId(b.id)} style={{ cursor: "pointer", boxShadow: selectedId === b.id ? `inset 0 0 0 2px ${G}` : "none", opacity: b.visible ? (b.draft ? 0.6 : 1) : 0.35 }}>
                <PreviewBoundary><MemoBlockPreview block={b} theme={theme} dayMode={dayMode} /></PreviewBoundary>
              </div>
            ))}
            renderLegacyContent={(b) => <EditPanel key={b.id + "-mc"} block={b} onChange={(k, v) => updateBlock(b.id, k, v)} only="content" />}
            renderLegacyDesign={(b) => <EditPanel key={b.id + "-ml"} block={b} onChange={(k, v) => updateBlock(b.id, k, v)} only="layout" />}
          />
        )}

        {/* TOPBAR (masquee en mode Apercu plein ecran sur mobile) */}
        <div style={{ height: 50, background: "#0D0D0D", borderBottom: "1px solid rgba(201,168,76,0.12)", display: (preview && isMobile) ? "none" : "flex", alignItems: "center", padding: isMobile ? "0 9px" : "0 14px", gap: isMobile ? 6 : 10, flexShrink: 0, zIndex: 20 }}>
          <a href="/dashboard" aria-label="Retour au tableau de bord"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0, textDecoration: "none", color: G, fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, textTransform: "lowercase", whiteSpace: "nowrap", ...(isMobile ? { width: 30, fontSize: 19 } : {}) }}>
            {isMobile ? "←" : "← QRowg"}
          </a>
          {!isMobile && <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />}
          {/* Le nom se coupait au milieu d'un mot, sans point de suspension : on lui
              laisse la place restante et on l'ellipse proprement. */}
          <input value={pageName} onChange={e => { const v = e.target.value; setPageName(v); undoRedo.push({ blocks: blocksKbRef.current, theme: themeRef.current, name: v }, "pagename") }}
            aria-label="Nom de la page"
            style={{ background: "transparent", border: "none", color: "#F5F0E8", fontSize: 13, fontWeight: 600, outline: "none", minWidth: 0, textOverflow: "ellipsis", ...(isMobile ? { flex: "1 1 0" } : { width: 160 }) }} />
          {/* Statut de sauvegarde. Flag ON (C01) : indicateur unifié tokenisé + a11y (role=status/aria-live).
              Flag OFF : coquille historique inchangée (zéro régression). */}
          {BUILDER_REDESIGN ? (
            <BuilderStatus mobile={isMobile} saving={saving} saved={saved} saveError={saveError} saveErrorMsg={saveErrorMsg} hasUnsaved={hasUnsaved} onSave={saveNow} onRetry={() => saveCtrlRef.current?.retry()} />
          ) : (<>
          {saving && <span style={{ color: MUTED, fontSize: 10 }}>Enregistrement…</span>}
          {saved && !saveError && !saving && <span style={{ color: "var(--success)", fontSize: 10, display: "flex", alignItems: "center", gap: 3 }}><Check size={10} /> Enregistré</span>}
          {hasUnsaved && !saving && !saved && !saveError && (
            <button onClick={saveNow} title="Enregistrer maintenant (sinon sauvegarde auto après ~1s)"
              style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 6, padding: "3px 8px", color: "#FBBF24", fontSize: 10, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FBBF24" }} /> {isMobile ? "Enregistrer" : "Modifications non enregistrées · Enregistrer"}
            </button>
          )}
          {saveError && <button onClick={() => saveCtrlRef.current?.retry()} title={saveErrorMsg ? `Erreur : ${saveErrorMsg} — cliquer pour réessayer` : "Réessayer la sauvegarde"} style={{ color: "#EF4444", fontSize: 10, display: "flex", alignItems: "center", gap: 3, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", maxWidth: isMobile ? 130 : 340, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", flexShrink: 0 }}>⚠ {isMobile ? "Réessayer" : `${saveErrorMsg ? saveErrorMsg : "Échec"} — Réessayer`}</button>}
          </>)}
          {pageId && !IS_UUID(pageId) && !liveId && !bootstrapError && <span style={{ color: MUTED, fontSize: 10 }}>Création de la page…</span>}
          {bootstrapError && <span style={{ color: "#EF4444", fontSize: 10, display: "flex", alignItems: "center", gap: 3 }} title={bootstrapError}>⚠ {bootstrapError}</span>}
          {/* Invité : « Mode démo » laissait croire que rien n'est gardé. C'est faux
              depuis qu'on écrit un brouillon local — on dit ce qui se passe vraiment. */}
          {/* Sur mobile, la barre du haut n'a pas la place : le logo passait à la ligne
              et le nom de la page se coupait au milieu d'un mot. Le bandeau du canvas,
              juste en dessous, porte déjà la même information — celle-ci est en trop. */}
          {guest && !isMobile && draftState === "saved" && <span style={{ color: "var(--success)", fontSize: 10, display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}><Check size={10} /> Brouillon gardé ici</span>}
          {guest && draftState === "too_big" && <span style={{ color: "#FBBF24", fontSize: 10, whiteSpace: "nowrap" }} title="Le brouillon dépasse ce que le navigateur peut garder — créez un compte pour ne rien perdre.">⚠ {isMobile ? "Trop lourd" : "Brouillon trop lourd"}</span>}
          {guest && draftState === "unavailable" && <span style={{ color: "#FBBF24", fontSize: 10, whiteSpace: "nowrap" }} title="Ce navigateur refuse d'enregistrer (navigation privée ?) — créez un compte pour garder votre page.">⚠ {isMobile ? "Non gardé" : "Rien ne peut être gardé ici"}</span>}
          {!guest && !pageId && !isMobile && <span style={{ color: "#8A8478", fontSize: 9 }}>Mode démo</span>}
          <div style={{ flex: 1 }} />

          {/* Boutons Undo / Redo */}
          <div style={{ display: "flex", gap: 3 }}>
            <button onClick={() => { const p = undoRedo.undo(); if(p) applySnapshot(p) }}
              disabled={!undoRedo.canUndo()}
              title="Annuler — Ctrl+Z"
              style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, cursor: undoRedo.canUndo() ? "pointer" : "default", color: undoRedo.canUndo() ? "#F5F0E8" : "rgba(255,255,255,0.2)", fontSize: 13, transition: "all 0.15s" }}
              onMouseEnter={e => { if(undoRedo.canUndo()) { e.currentTarget.style.background="rgba(201,168,76,0.1)"; e.currentTarget.style.borderColor="rgba(201,168,76,0.3)" }}}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)" }}>
              <Undo2 size={15} />
            </button>
            <button onClick={() => { const n = undoRedo.redo(); if(n) applySnapshot(n) }}
              disabled={!undoRedo.canRedo()}
              title="Rétablir — Ctrl+Shift+Z"
              style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, cursor: undoRedo.canRedo() ? "pointer" : "default", color: undoRedo.canRedo() ? "#F5F0E8" : "rgba(255,255,255,0.2)", fontSize: 13, transition: "all 0.15s" }}
              onMouseEnter={e => { if(undoRedo.canRedo()) { e.currentTarget.style.background="rgba(201,168,76,0.1)"; e.currentTarget.style.borderColor="rgba(201,168,76,0.3)" }}}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)" }}>
              <Redo2 size={15} />
            </button>
          </div>

          {/* Modèles de page complets (icone seule sur mobile pour degager la barre) */}
          <button onClick={() => setShowTemplates(true)} title="Partir d'un modèle de page complet"
            style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 7, padding: isMobile ? "5px 9px" : "5px 10px", color: G, fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            <Sparkles size={12} />{!isMobile && " Modèles"}
          </button>

          {/* Bouton Focus Mode (desktop uniquement — panneaux redimensionnables) */}
          {!isMobile && <button onClick={toggleFocus} title="Mode Focus — Ctrl+F"
            style={{ display: "flex", alignItems: "center", gap: 5, background: focusMode ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${focusMode ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 7, padding: "5px 10px", color: focusMode ? G : MUTED, fontSize: 10, fontWeight: focusMode ? 700 : 400, cursor: "pointer" }}>
            {focusMode ? "⊞" : "⊡"} Focus
          </button>}

          {/* Raccourcis clavier — tooltip (survol : desktop uniquement) */}
          <div style={{ position: "relative", display: isMobile ? "none" : "block" }}>
            <button
              style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, cursor: "pointer", color: MUTED, fontSize: 11, fontWeight: 700 }}
              title="Raccourcis clavier"
              onMouseEnter={e => { const t = e.currentTarget.nextElementSibling as HTMLElement; if(t) t.style.opacity = "1"; if(t) t.style.pointerEvents = "none" }}
              onMouseLeave={e => { const t = e.currentTarget.nextElementSibling as HTMLElement; if(t) t.style.opacity = "0" }}>
              ?
            </button>
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#161616", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 12, padding: "12px 14px", zIndex: 200, opacity: 0, transition: "opacity 0.15s", pointerEvents: "none", minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
              <p style={{ color: MUTED, fontSize: 9, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px" }}>Raccourcis</p>
              {[
                ["Ctrl+K", "Palette de commandes"],
                ["/", "Insérer un bloc"],
                ["Ctrl+D", "Dupliquer"],
                ["Ctrl+C", "Copier"],
                ["Ctrl+V", "Coller"],
                ["Ctrl+Z", "Annuler"],
                ["Ctrl+⇧+Z", "Rétablir"],
                ["Ctrl+B", "Bibliothèque"],
                ["Ctrl+E", "Éditeur"],
                ["Ctrl+P", "Aperçu"],
                ["Ctrl+F", "Mode Focus"],
                ["Ctrl+A", "Tout sélectionner"],
                ["↑ / ↓", "Bloc précédent/suivant"],
                ["Alt+↑ / ↓", "Déplacer le bloc"],
                ["Suppr", "Supprimer la sélection"],
                ["Échap", "Tout désélectionner"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: MUTED, fontSize: 11 }}>{v}</span>
                  <kbd style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, padding: "2px 7px", color: G, fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>{k}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Aperçu plein écran + Thème retirés de la barre : redondants avec les onglets du panneau
              de droite (Aperçu / Éditer / Thème) et « Voir en direct ». */}
          {qrTarget && !isMobile && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowQrPanel(p => !p)} style={{ display: "flex", alignItems: "center", gap: 5, background: showQrPanel ? "rgba(201,168,76,0.12)" : "rgba(201,168,76,0.06)", border: `1px solid ${showQrPanel ? "rgba(201,168,76,0.4)" : "rgba(201,168,76,0.2)"}`, borderRadius: 8, padding: "5px 11px", color: G, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                <QrCode size={11} /> QR Code
              </button>
              {showQrPanel && (
                <>
                  <div onClick={() => setShowQrPanel(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#161616", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 16, padding: "18px", zIndex: 200, boxShadow: "0 8px 40px rgba(0,0,0,0.6)", width: 200 }}>
                    <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 700, margin: "0 0 10px", textAlign: "center" }}>Mon QR Code</p>
                    {pageStatus !== "published" && <p style={{ color: "#FBBF24", fontSize: 10, fontWeight: 700, textAlign: "center", margin: "0 0 8px", lineHeight: 1.35 }}>Publie ta page pour activer ce QR (sinon il mène à une page vide).</p>}
                    <div style={{ background: "#FFFFFF", borderRadius: 10, padding: 8, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <QRCanvas value={qrTarget} size={120} />
                    </div>
                    <div style={{ background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 7, padding: "6px 9px", marginBottom: 8 }}>
                      <p style={{ color: MUTED, fontSize: 8, margin: "0 0 1px", textTransform: "uppercase", letterSpacing: 1 }}>URL de scan</p>
                      <p style={{ color: G, fontSize: 10, margin: 0, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>/q/{qrShortCode}</p>
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={downloadQrPng} style={{ flex: 1, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 7, padding: "7px", color: G, cursor: "pointer", fontSize: 10, fontWeight: 600, textAlign: "center" }}>↓ PNG</button>
                      <a href="/dashboard/qr-codes" style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "7px", color: MUTED, textDecoration: "none", fontSize: 10, textAlign: "center" }}>Perso →</a>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}



          {pageId && pageSlug && pageStatus === "published" && !isMobile && (
            <a href={`/${pageSlug}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 7, padding: "5px 11px", color: G, textDecoration: "none", fontSize: 11, fontWeight: 600 }}>
              <ExternalLink size={11} /> Voir en direct
            </a>
          )}

          <div style={{ position: "relative", flexShrink: 0 }}>
            <button onClick={() => { setShowPublishPopup(true); if (!guest && pageStatus !== "published" && !publishing && IS_UUID(liveId)) void handlePublish() }}
              className={pageStatus === "published" ? undefined : "da-btn-primary da-btn-primary--sm"}
              style={pageStatus === "published"
                ? { display: "flex", alignItems: "center", gap: 6, background: "rgba(57,255,143,0.12)", border: "1px solid rgba(57,255,143,0.35)", borderRadius: 9, padding: "8px 18px", color: "var(--success)", fontSize: 14, fontWeight: 700, cursor: "pointer" }
                : undefined}>
              {pageStatus==="published" ? <><Check size={13} /> Publié</> : <span>Publier</span>}
            </button>
            {showPublishPopup && (
              <>
                <div onClick={() => setShowPublishPopup(false)} style={{ position: "fixed", inset: 0, zIndex: 199, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
                <div style={{ position: "absolute", top: "calc(100% + 12px)", right: 0, background: "#0F0F0F", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 20, padding: "24px", zIndex: 200, boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.1)", width: 320 }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: pageStatus==="published" ? "rgba(57,255,143,0.12)" : "rgba(201,168,76,0.12)", border: `1px solid ${pageStatus==="published" ? "rgba(57,255,143,0.3)" : "rgba(201,168,76,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {pageStatus==="published" ? <Globe size={20} color="var(--success)" /> : <Send size={20} color={G} />}
                    </div>
                    <div>
                      <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>{guest ? "Mettre en ligne" : pageStatus==="published" ? "Page en ligne" : "Publier la page"}</p>
                      <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{guest ? "Dernière étape : votre compte" : pageStatus==="published" ? "Votre page est accessible" : "Rendre la page accessible"}</p>
                    </div>
                  </div>

                  {/* Statut */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: pageStatus==="published" ? "rgba(57,255,143,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${pageStatus==="published" ? "rgba(57,255,143,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: pageStatus==="published" ? "var(--success)" : MUTED, boxShadow: pageStatus==="published" ? "0 0 6px var(--success)80" : "none" }} />
                    <span style={{ color: pageStatus==="published" ? "var(--success)" : MUTED, fontSize: 12, fontWeight: 600 }}>{guest ? "Brouillon local" : pageStatus==="published" ? "En ligne" : "Brouillon"}</span>
                    <span style={{ color: MUTED, fontSize: 11, marginLeft: "auto" }}>{blocks.length} bloc{blocks.length!==1?"s":""}</span>
                  </div>

                  {/* URL — rien à montrer tant que la page n'a pas d'adresse. */}
                  {pageSlug && !guest && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ color: MUTED, fontSize: 10, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1.5 }}>URL de la page</p>
                      <div style={{ background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ color: G, fontSize: 12, margin: 0, fontFamily: "JetBrains Mono, monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {typeof window !== "undefined" ? window.location.origin : ""}/{pageSlug}
                        </p>
                        <button onClick={() => { navigator.clipboard.writeText((typeof window !== "undefined" ? window.location.origin : "")+"/"+pageSlug) }}
                          style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 6, padding: "4px 8px", color: G, cursor: "pointer", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                          Copier
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Stats rapides */}
                  <div style={{ display: guest ? "none" : "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                      <p style={{ color: G, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif" }}>{pageStats.views}</p>
                      <p style={{ color: MUTED, fontSize: 9, margin: 0 }}>👁 Vues</p>
                    </div>
                    <div style={{ background: "rgba(57,255,143,0.06)", border: "1px solid rgba(57,255,143,0.15)", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                      <p style={{ color: "var(--success)", fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif" }}>{pageStats.scans}</p>
                      <p style={{ color: MUTED, fontSize: 9, margin: 0, display: "inline-flex", alignItems: "center", gap: 3 }}><Smartphone size={9} /> Scans</p>
                    </div>
                  </div>

                  {/* Bouton principal — publie (brouillon) ou met à jour la page publique
                      (déjà publiée : réenregistre + revalide le cache ISR pour rendre les
                      derniers changements visibles immédiatement). */}
                  <button onClick={handlePublish} disabled={!guest && (publishing || !IS_UUID(liveId))} aria-busy={publishing}
                    className="da-btn-primary" style={{ width: "100%", justifyContent: "center", marginBottom: pageSlug ? 10 : 0 }}>
                    {guest ? <><Send size={14} /> Créer mon compte et publier</> : publishing ? (
                      <span style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
                        <span style={{display:"inline-block",width:14,height:14,border:"2px solid #08080880",borderTopColor:"#080808",borderRadius:"50%",animation:"mo-spin 0.7s linear infinite"}} />
                        {pageStatus==="published" ? "Mise à jour…" : "Publication…"}
                      </span>
                    ) : publishSuccess ? (
                      <span style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
                        <Check size={15} /> {publishWasUpdate ? "Page à jour !" : "Page publiée !"}
                      </span>
                    ) : pageStatus==="published" ? <><RefreshCw size={14} /> Mettre à jour la page</> : <><Send size={14} /> Publier maintenant</>}
                  </button>

                  {/* Invité : dire exactement ce qui va se passer, sans surprise. */}
                  {guest && (
                    <p style={{ color: MUTED, fontSize: 11, lineHeight: 1.45, margin: "0 0 10px" }}>
                      Votre page est gardée dans ce navigateur. Le compte sert à lui donner une
                      adresse et un QR code — vous la retrouverez telle quelle, rien à resaisir.
                    </p>
                  )}

                  {/* Erreur publication */}
                  {publishError && (
                    <div role="alert" style={{marginBottom:10,padding:"9px 12px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:9,color:"#F87171",fontSize:12,display:"flex",alignItems:"center",gap:6}}>
                      <span>⚠</span>
                      <span>{publishError}</span>
                      <button onClick={()=>setPublishError("")} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#F87171",fontSize:14,lineHeight:1}}>×</button>
                    </div>
                  )}
                  {/* Voir la page */}
                  {pageSlug && pageStatus === "published" && (
                    <a href={`/${pageSlug}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px", color: MUTED, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                      <ExternalLink size={13} /> Voir la page
                    </a>
                  )}
                  {/* QR de la page publiée, affiché ICI pour être atteignable aussi sur
                      mobile (le panneau QR de la barre du haut est masqué sous 1024 px)
                      et parce que c'est le moment où il sert : la page vient d'être mise
                      en ligne, l'étape suivante est de l'imprimer. */}
                  {/* Invité : voir à quoi ça ressemble avant de s'engager. Le QR n'encode
                      pas encore d'adresse réelle — on le dit, et on n'offre pas de le
                      télécharger : un QR imprimé qui ne mène nulle part serait pire que rien. */}
                  {guest && (
                    <div style={{ marginTop: 10, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                      <p style={{ color: MUTED, fontSize: 10, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1, textAlign: "center" }}>Votre QR code</p>
                      <div style={{ position: "relative", background: "#FFFFFF", borderRadius: 10, padding: 8, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ filter: "blur(2.5px)", opacity: 0.55 }} aria-hidden><QRCanvas value="https://qrowg.com" size={132} /></div>
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0A0A", fontSize: 11, fontWeight: 700, textAlign: "center", padding: 10 }}>Aperçu</span>
                      </div>
                      <p style={{ color: MUTED, fontSize: 11, lineHeight: 1.45, margin: 0, textAlign: "center" }}>
                        Il sera généré, et téléchargeable, dès que la page aura une adresse.
                      </p>
                    </div>
                  )}

                  {pageStatus === "published" && qrTarget && (
                    <div style={{ marginTop: 10, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                      <p style={{ color: MUTED, fontSize: 10, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1, textAlign: "center" }}>Votre QR code</p>
                      <div style={{ background: "#FFFFFF", borderRadius: 10, padding: 8, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <QRCanvas value={qrTarget} size={132} />
                      </div>
                      <button onClick={downloadQrPng} style={{ width: "100%", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 10, padding: "11px", color: G, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>↓ Télécharger le QR (PNG)</button>

                      {/* Un QR en PNG ne sert à rien tant qu'il n'est pas posé quelque part.
                          On propose donc les 3 supports les plus évidents pour ce métier, avec
                          le studio déjà pré-rempli (métier, usage, nom, message, appel à l'action). */}
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                        <p style={{ color: MUTED, fontSize: 10, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: 1, textAlign: "center" }}>L'imprimer sur un support</p>
                        <p style={{ color: "rgba(245,240,232,0.45)", fontSize: 10.5, margin: "0 0 9px", textAlign: "center", lineHeight: 1.35 }}>
                          {handoff.metier !== "Tout" ? `Conseillé pour « ${handoff.metier} »` : "Prêt à imprimer, textes déjà remplis"}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {handoff.suggested.map(sg => (
                            <a key={sg.id} href={printStudioUrl(qrShortCode, handoff, sg.id)}
                              style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 10px", textDecoration: "none" }}>
                              <span aria-hidden style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 7, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: G, fontSize: 12 }}>🖨</span>
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: "block", color: "#F5F0E8", fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sg.label}</span>
                                <span style={{ display: "block", color: MUTED, fontSize: 10, lineHeight: 1.3 }}>{sg.why}</span>
                              </span>
                              <span aria-hidden style={{ marginLeft: "auto", color: MUTED, fontSize: 13 }}>›</span>
                            </a>
                          ))}
                        </div>
                        <a href={printStudioUrl(qrShortCode, handoff)}
                          style={{ display: "block", marginTop: 7, textAlign: "center", color: MUTED, fontSize: 11, textDecoration: "none", padding: "6px" }}>
                          Voir tous les supports →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

          {/* SIDEBAR BLOCS — masquée en mode Focus (concentration canvas + éditeur) */}
          <div style={{ width: isMobile ? "100%" : (blocksCollapsed ? 64 : blocksResize.width), background: "#0A0A0A", borderRight: "none", display: (focusMode && !isMobile) ? "none" : (isMobile && mobileTab !== "blocks" ? "none" : "flex"), flexDirection: "column", flexShrink: isMobile ? 1 : 0, overflow: "hidden", transition: blocksCollapsed ? "width 0.25s ease" : "none", position: "relative" }}>
            {/* C02 — Bibliothèque refondue en overlay (flag ON, panneau déplié). Flag OFF ou rail replié :
                la bibliothèque legacy ci-dessous reste strictement inchangée (zéro régression). */}
            {BUILDER_REDESIGN && !blocksCollapsed && (
              <div style={{ position: "absolute", inset: 0, zIndex: 6, display: "flex", flexDirection: "column", background: "#0A0A0A" }}>
                <BlockLibrary favorites={favorites} recents={recentBlocks} mobile={isMobile} onAdd={addFromLibrary} onToggleFavorite={toggleFav} />
              </div>
            )}
            {/* Bouton collapse/expand */}
            <button onClick={toggleBlocks} title={blocksCollapsed ? "Ouvrir" : "Réduire"}
              style={{ position: "absolute", top: 8, right: 8, zIndex: 20, width: 22, height: 22, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: MUTED, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
              {blocksCollapsed ? "›" : "‹"}
            </button>
            {/* Mode étendu: recherche normale */}
            {!blocksCollapsed && (
              <div style={{ padding: "10px 8px 10px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <Search size={isMobile ? 15 : 11} style={{ position: "absolute", left: isMobile ? 12 : 8, top: "50%", transform: "translateY(-50%)", color: MUTED }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un bloc..."
                    style={{ width: "100%", height: isMobile ? 46 : undefined, background: "#111", border: "1px solid rgba(201,168,76,0.15)", borderRadius: isMobile ? 11 : 7, padding: isMobile ? "0 34px 0 36px" : "7px 7px 7px 24px", color: "#F5F0E8", fontSize: isMobile ? 15 : 11, outline: "none", boxSizing: "border-box" }}
                    onFocus={e => { e.target.style.borderColor = "rgba(201,168,76,0.4)"; setBlockSearchFocus(true) }}
                    onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.15)"; setBlockSearchFocus(false) }} />
                  {search && <button onClick={() => setSearch("")} aria-label="Effacer" style={{ position: "absolute", right: isMobile ? 8 : 7, top: "50%", transform: "translateY(-50%)", width: isMobile ? 30 : undefined, height: isMobile ? 30 : undefined, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 0 }}><X size={isMobile ? 15 : 10} /></button>}
                </div>
              </div>
            )}
            {/* Mode réduit: icône loupe */}
            {blocksCollapsed && (
              <div style={{ padding: "10px 0", display: "flex", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                <button onClick={toggleBlocks} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 4 }}>
                  <Search size={16} />
                </button>
              </div>
            )}

            {!search && !blocksCollapsed && (
              <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(4, minmax(0, 1fr))" : "1fr 1fr", gap: isMobile ? 5 : 6 }}>
                  {/* Essentiels — vue par defaut (~20 blocs les plus utiles). QWG-0017b */}
                  <button onClick={() => setActiveCategory("essentials")} title="Les blocs les plus utiles pour demarrer"
                    style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: "center", gap: isMobile ? 3 : 7, minWidth: 0, background: activeCategory==="essentials" ? "rgba(201,168,76,0.16)" : "rgba(255,255,255,0.03)", border: `1px solid ${activeCategory==="essentials" ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.06)"}`, borderRadius: 10, padding: isMobile ? "5px 3px" : "9px 11px", color: activeCategory==="essentials" ? "#C9A84C" : MUTED, fontSize: 12, fontWeight: activeCategory==="essentials" ? 700 : 500, cursor: "pointer", transition: "all 0.15s", textAlign: "left" as const }}>
                    <span style={{ fontSize: isMobile ? 16 : 15, flexShrink: 0 }}>✨</span>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" as const : "nowrap", fontSize: isMobile ? 9.5 : undefined, textAlign: isMobile ? "center" as const : undefined, lineHeight: isMobile ? 1.15 : undefined, width: isMobile ? "100%" : undefined }}>Essentiels</span>
                  </button>
                  {/* Catégorie Récents — visible seulement si au moins 1 récent */}
                  {recentBlocks.length > 0 && (
                    <button onClick={() => setActiveCategory("recents")} title="Blocs récemment utilisés"
                      style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: "center", gap: isMobile ? 3 : 7, minWidth: 0, background: activeCategory==="recents" ? "var(--action)18" : "rgba(255,255,255,0.03)", border: `1px solid ${activeCategory==="recents" ? "var(--action)50" : "rgba(255,255,255,0.06)"}`, borderRadius: 10, padding: isMobile ? "5px 3px" : "9px 11px", color: activeCategory==="recents" ? "var(--action)" : MUTED, fontSize: 12, fontWeight: activeCategory==="recents" ? 700 : 500, cursor: "pointer", transition: "all 0.15s", textAlign: "left" as const }}>
                      <span style={{ fontSize: isMobile ? 16 : 15, flexShrink: 0 }}>🕐</span>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" as const : "nowrap", fontSize: isMobile ? 9.5 : undefined, textAlign: isMobile ? "center" as const : undefined, lineHeight: isMobile ? 1.15 : undefined, width: isMobile ? "100%" : undefined }}>Récents</span>
                    </button>
                  )}
                  {/* Catégorie Favoris — visible seulement si au moins 1 favori */}
                  {favorites.length > 0 && (
                    <button onClick={() => setActiveCategory("favorites")} title="Vos blocs favoris"
                      style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: "center", gap: isMobile ? 3 : 7, minWidth: 0, background: activeCategory==="favorites" ? "#FFD70018" : "rgba(255,255,255,0.03)", border: `1px solid ${activeCategory==="favorites" ? "#FFD70050" : "rgba(255,255,255,0.06)"}`, borderRadius: 10, padding: isMobile ? "5px 3px" : "9px 11px", color: activeCategory==="favorites" ? "#FFD700" : MUTED, fontSize: 12, fontWeight: activeCategory==="favorites" ? 700 : 500, cursor: "pointer", transition: "all 0.15s", textAlign: "left" as const }}>
                      <span style={{ fontSize: isMobile ? 16 : 15, flexShrink: 0 }}>⭐</span>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" as const : "nowrap", fontSize: isMobile ? 9.5 : undefined, textAlign: isMobile ? "center" as const : undefined, lineHeight: isMobile ? 1.15 : undefined, width: isMobile ? "100%" : undefined }}>Favoris</span>
                      <span style={{ display: isMobile ? "none" : undefined, marginLeft: "auto", flexShrink: 0, background: "rgba(255,215,0,0.15)", borderRadius: 10, padding: "0px 6px", fontSize: 9.5, fontWeight: 700 }}>{favorites.length}</span>
                    </button>
                  )}
                  {BLOCK_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)} title={cat.desc}
                      className={activeCategory===cat.id ? "da-cat on" : "da-cat"}
                      style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: "center", gap: isMobile ? 3 : 7, minWidth: 0, background: activeCategory===cat.id ? `color-mix(in srgb, ${cat.color} 15%, transparent)` : "#14110d", border: `1px solid ${activeCategory===cat.id ? `color-mix(in srgb, ${cat.color} 46%, transparent)` : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: isMobile ? "5px 3px" : "9px 11px", color: activeCategory===cat.id ? cat.color : MUTED, fontSize: 12, fontWeight: activeCategory===cat.id ? 700 : 500, cursor: "pointer", transition: "background .18s ease, border-color .18s ease, color .18s ease", textAlign: "left" as const }}>
                      <span style={{ fontSize: isMobile ? 16 : 15, flexShrink: 0 }}>{cat.icon}</span>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" as const : "nowrap", fontSize: isMobile ? 9.5 : undefined, textAlign: isMobile ? "center" as const : undefined, lineHeight: isMobile ? 1.15 : undefined, width: isMobile ? "100%" : undefined }}>{cat.label}</span>
                      {search && searchCounts ? (
                      <span style={{ display: isMobile ? "none" : undefined, marginLeft: "auto", flexShrink: 0, background: activeCategory===cat.id ? `color-mix(in srgb, ${cat.color} 22%, transparent)` : "rgba(255,255,255,0.06)", color: activeCategory===cat.id ? cat.color : MUTED, borderRadius: 999, padding: "0px 7px", fontSize: 9.5, fontWeight: 700, lineHeight: "17px" }}>
                        {searchCounts[cat.id] || 0}
                      </span>
                      ) : null}
                    </button>
                  ))}
                </div>
                <p style={{ color: MUTED, fontSize: 11.5, margin: "6px 0 0", paddingLeft: 2 }}>
                  {activeCategory==="essentials" ? "Les blocs les plus utiles pour démarrer — parcours les catégories pour tout voir." : activeCategory==="recents" ? `${recentBlocks.length} bloc${recentBlocks.length>1?"s":""} récent${recentBlocks.length>1?"s":""}` : activeCategory==="favorites" ? `${favorites.length} bloc${favorites.length>1?"s":""} favori${favorites.length>1?"s":""}` : BLOCK_CATEGORIES.find(c => c.id===activeCategory)?.desc}
                </p>
              </div>
            )}
            {/* Mode réduit : icônes catégories + drawer flottant */}
            {blocksCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                {recentBlocks.length > 0 && (
                  <button onClick={() => { setDrawerCategory("recents"); setActiveCategory("recents") }}
                    title={`Récents (${recentBlocks.length})`}
                    style={{ width: 44, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: (drawerCategory==="recents" || activeCategory==="recents") ? "var(--action)18" : "transparent", border: `1px solid ${(drawerCategory==="recents" || activeCategory==="recents") ? "var(--action)40" : "transparent"}`, borderRadius: 8, cursor: "pointer", fontSize: 16, transition: "all 0.15s" }}>
                    🕐
                  </button>
                )}
                {favorites.length > 0 && (
                  <button onClick={() => { setDrawerCategory("favorites"); setActiveCategory("favorites") }}
                    title={`Favoris (${favorites.length})`}
                    style={{ width: 44, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: (drawerCategory==="favorites" || activeCategory==="favorites") ? "#FFD70018" : "transparent", border: `1px solid ${(drawerCategory==="favorites" || activeCategory==="favorites") ? "#FFD70040" : "transparent"}`, borderRadius: 8, cursor: "pointer", fontSize: 16, transition: "all 0.15s" }}>
                    ⭐
                  </button>
                )}
                {BLOCK_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => { setDrawerCategory(drawerCategory===cat.id ? null : cat.id); setActiveCategory(cat.id) }}
                    title={`${cat.label} (${catCounts[cat.id] || 0})`}
                    style={{ width: 44, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: (drawerCategory===cat.id || activeCategory===cat.id) ? cat.color+"18" : "transparent", border: `1px solid ${(drawerCategory===cat.id || activeCategory===cat.id) ? cat.color+"40" : "transparent"}`, borderRadius: 8, cursor: "pointer", fontSize: 16, transition: "all 0.15s", position: "relative" as const }}>
                    {cat.icon}
                    <span style={{ position: "absolute", bottom: 2, right: 3, fontSize: 7, color: MUTED, fontWeight: 700, lineHeight: 1 }}>{catCounts[cat.id]||0}</span>
                  </button>
                ))}
              </div>
            )}

            {!blocksCollapsed && <div style={{ flex: 1, overflowY: "auto", padding: "5px 6px" }}>
              {search
                ? (filteredBlocks.length===0
                  ? (
                    <div style={{ padding: "30px 14px", textAlign: "center" }}>
                      <p style={{ fontSize: 22, margin: "0 0 8px" }}>🔍</p>
                      <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600, margin: "0 0 3px" }}>Aucun bloc trouvé</p>
                      <p style={{ color: MUTED, fontSize: 10, margin: "0 0 12px" }}>"{search}"</p>
                      <button onClick={() => setSearch("")} style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 7, padding: "5px 12px", color: G, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Effacer</button>
                    </div>
                  )
                  : (<>
                    {(groupedResults||[]).map(({ cat, blocks: catBlocks }) => (
                      <div key={cat.id} style={{ marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 6px 3px" }}>
                          <span style={{ fontSize: 11 }}>{cat.icon}</span>
                          <span style={{ color: cat.color, fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>{cat.label}</span>
                          <span style={{ color: MUTED, fontSize: 9 }}>·{catBlocks.length}</span>
                        </div>
                        {catBlocks.map(([type, def]) => (
                          <button key={type} onClick={() => addBlock(type)}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", background: "transparent", border: "1px solid transparent", borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "left" as const, marginBottom: 1 }}
                            onMouseEnter={e => { e.currentTarget.style.background = def.color+"10"; e.currentTarget.style.color = "#F5F0E8"; showPopover(type, e) }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = MUTED; hidePopover() }}>
                            <div style={{ width: 26, height: 26, borderRadius: 6, background: def.color+"12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{def.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hlText(def.label, search)}</p>
                              <p style={{ margin: 0, fontSize: 10.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hlText(def.description, search)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                  </>)
                )
                : (
                  /* Mode normal — accordéon par catégorie */
                  <>
                    {/* Essentiels — liste plate des ~20 blocs les plus utiles (QWG-0019b) */}
                    {activeCategory==="essentials" && filteredBlocks.map(([type, def]) => (
                      <button key={type} onClick={() => addBlock(type)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", background: "transparent", border: "1px solid transparent", borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "left" as const, marginBottom: 2 }}
                        onMouseEnter={e => { const el = e.currentTarget; el.style.background = def.color+"10"; el.style.color = "#F5F0E8" }}
                        onMouseLeave={e => { const el = e.currentTarget; el.style.background = "transparent"; el.style.color = MUTED }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: def.color+"12", border: `1px solid ${def.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{def.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "inherit", lineHeight: 1.2 }}>{def.label}</p>
                          <p style={{ margin: 0, fontSize: 10.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.description}</p>
                        </div>
                        <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toggleFav(type) }}
                          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleFav(type) } }}
                          title={isFav(type) ? "Retirer des favoris" : "Ajouter aux favoris"} aria-pressed={isFav(type)}
                          style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontSize: 13, opacity: isFav(type) ? 1 : 0, color: isFav(type) ? "#FFD700" : MUTED }}
                          className="fav-star">
                          {isFav(type) ? "⭐" : "☆"}
                        </span>
                      </button>
                    ))}
                    {/* Récents */}
                    {activeCategory==="recents" && recentBlocks.length > 0 && filteredBlocks.map(([type, def]) => (
                      <button key={type} onClick={() => addBlock(type)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", background: "transparent", border: "1px solid transparent", borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "left" as const, marginBottom: 2 }}
                        onMouseEnter={e => { const el = e.currentTarget; el.style.background = "var(--action)10"; el.style.color = "#F5F0E8" }}
                        onMouseLeave={e => { const el = e.currentTarget; el.style.background = "transparent"; el.style.color = MUTED }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: def.color+"12", border: `1px solid ${def.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{def.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "inherit", lineHeight: 1.2 }}>{def.label}</p>
                          <p style={{ margin: 0, fontSize: 10.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.description}</p>
                        </div>
                        <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toggleFav(type) }}
                          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleFav(type) } }}
                          title={isFav(type) ? "Retirer des favoris" : "Ajouter aux favoris"} aria-pressed={isFav(type)}
                          style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontSize: 13, opacity: isFav(type) ? 1 : 0, color: isFav(type) ? "#FFD700" : MUTED }}
                          className="fav-star">
                          {isFav(type) ? "⭐" : "☆"}
                        </span>
                      </button>
                    ))}
                    {/* Favoris */}
                    {activeCategory==="favorites" && favorites.length > 0 && filteredBlocks.map(([type, def]) => (
                      <button key={type} onClick={() => addBlock(type)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", background: "transparent", border: "1px solid transparent", borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "left" as const, marginBottom: 2 }}
                        onMouseEnter={e => { const el = e.currentTarget; el.style.background = "#FFD70010"; el.style.color = "#F5F0E8" }}
                        onMouseLeave={e => { const el = e.currentTarget; el.style.background = "transparent"; el.style.color = MUTED }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: def.color+"12", border: `1px solid ${def.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{def.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "inherit", lineHeight: 1.2 }}>{def.label}</p>
                          <p style={{ margin: 0, fontSize: 10.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.description}</p>
                        </div>
                        <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toggleFav(type) }}
                          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleFav(type) } }}
                          title="Retirer des favoris" aria-pressed
                          style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontSize: 13, opacity: 1, color: "#FFD700" }}
                          className="fav-star">⭐</span>
                      </button>
                    ))}
                    {/* Catégories normales en accordéon */}
                    {activeCategory!=="recents" && activeCategory!=="favorites" && (
                      <div>
                        {/* Header catégorie active avec collapse */}
                        {(() => {
                          const cat = BLOCK_CATEGORIES.find(c => c.id===activeCategory)
                          if (!cat) return null
                          const collapsed = isCatCollapsed(activeCategory)
                          const catBlocks = Object.entries(BLOCK_DEFS).filter(([, def]) => def.category === activeCategory)
                          // Sous-groupes clairs pour la section Identité (Essentiel / Image / Présentation / Confiance)
                          const IDENTITY_GROUPS: { label: string; keys: string[] }[] = [
                            { label: "Essentiel",    keys: ["profile", "bio"] },
                            { label: "Image",        keys: ["cover_banner"] },
                            { label: "Présentation", keys: ["skills", "about", "expertise", "languages", "journey"] },
                            { label: "Confiance",    keys: ["availability", "certifications"] },
                            // Preuve sociale : blocs existants (rendu déjà en place) rendus découvrables ici
                            { label: "Preuve sociale", keys: ["business_stats", "google_reviews_block", "testimonials", "visit_counter"] },
                          ]
                          const RECO = new Set(["profile"])
                          const blockBtn = (type: string, def: any) => (
                            <button key={type} onClick={() => addBlock(type)}
                              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", background: "transparent", border: "1px solid transparent", borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "left" as const, marginBottom: 2, transition: "all 0.15s" }}
                              onMouseEnter={e => { const el = e.currentTarget; el.style.background = def.color+"10"; el.style.color = "#F5F0E8"; el.style.borderColor = def.color+"20"; const star = el.querySelector(".fav-star") as HTMLElement; if(star && !isFav(type)) star.style.opacity = "0.5"; showPopover(type, e) }}
                              onMouseLeave={e => { const el = e.currentTarget; el.style.background = "transparent"; el.style.color = MUTED; el.style.borderColor = "transparent"; const star = el.querySelector(".fav-star") as HTMLElement; if(star && !isFav(type)) star.style.opacity = "0"; hidePopover() }}>
                              <div style={{ width: 30, height: 30, borderRadius: 8, background: def.color+"12", border: `1px solid ${def.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{def.icon}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "inherit", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.label}</p>
                                  {RECO.has(type) && <span style={{ flexShrink: 0, background: "rgba(201,168,76,0.16)", border: "1px solid rgba(201,168,76,0.35)", color: G, fontSize: 8, fontWeight: 800, letterSpacing: 0.3, borderRadius: 6, padding: "1px 5px", textTransform: "uppercase" as const }}>★ Reco</span>}
                                </div>
                                <p style={{ margin: 0, fontSize: 10.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>{def.description}</p>
                              </div>
                              <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toggleFav(type) }}
                                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleFav(type) } }}
                                title={isFav(type) ? "Retirer des favoris" : "Ajouter aux favoris"} aria-pressed={isFav(type)}
                                style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontSize: 13, opacity: isFav(type) ? 1 : 0, transition: "opacity 0.15s", color: isFav(type) ? "#FFD700" : MUTED }}
                                className="fav-star">
                                {isFav(type) ? "⭐" : "☆"}
                              </span>
                            </button>
                          )
                          const subHeader = { color: MUTED, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.2, margin: "9px 6px 3px" }
                          return (
                            <div>
                              <button onClick={() => toggleCat(activeCategory)}
                                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 9px 6px", background: "transparent", border: "none", borderBottom: `1px solid rgba(255,255,255,0.05)`, cursor: "pointer", marginBottom: collapsed ? 0 : 4 }}>
                                <span style={{ fontSize: 13 }}>{cat.icon}</span>
                                <span style={{ color: cat.color, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.5, flex: 1, textAlign: "left" as const }}>{cat.label}</span>
                                <span style={{ color: MUTED, fontSize: 9, marginRight: 4 }}>{catBlocks.length}</span>
                                <span style={{ color: MUTED, fontSize: 10, display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
                              </button>
                              {!collapsed && (activeCategory === "identity"
                                ? (() => {
                                    const grouped = IDENTITY_GROUPS.flatMap(g => g.keys)
                                    const rest = catBlocks.filter(([t]) => !grouped.includes(t)) // blocs identité non classés -> "Autres"
                                    return (<>
                                      {/* Modèles par métier : 1 clic crée une identité adaptée */}
                                      <div style={{ margin: "0 0 10px" }}>
                                        <button type="button" onClick={() => setMetierOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", background: metierOpen ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.09)", border: `1px solid ${metierOpen ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.3)"}`, borderRadius: 9, cursor: "pointer", padding: "9px 12px", margin: "8px 0" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 12.5, fontWeight: 700 }}><Sparkles size={13} /> Modèles par métier</span><ChevronDown size={15} color={G} style={{ transform: metierOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /></button>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                          {metierOpen && IDENTITY_PRESETS.map(p => (
                                            <button key={p.key} type="button" onClick={() => generateIdentityPreset(p)} title={`Crée : ${p.blocks.map(b => (BLOCK_DEFS as any)[b.type]?.label || b.type).join(", ")}`}
                                              style={{ display: "flex", alignItems: "center", gap: 7, minHeight: isMobile ? 46 : undefined, padding: isMobile ? "11px 11px" : "9px 10px", borderRadius: 10, border: "1px solid rgba(201,168,76,0.18)", cursor: "pointer", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: isMobile ? 12 : 11, fontWeight: 600, textAlign: "left" as const, transition: "all .15s" }}
                                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                              onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)" }}>
                                              <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                              <span style={{ flex: 1, lineHeight: 1.2 }}>{p.label}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      {IDENTITY_GROUPS.map(g => {
                                        const gb = g.keys.filter(k => (BLOCK_DEFS as any)[k])
                                        if (!gb.length) return null
                                        return (
                                          <div key={g.label}>
                                            <p style={subHeader}>{g.label}</p>
                                            {gb.map(k => blockBtn(k, (BLOCK_DEFS as any)[k]))}
                                          </div>
                                        )
                                      })}
                                      {rest.length > 0 && (<div><p style={subHeader}>Autres</p>{rest.map(([t, d]) => blockBtn(t, d))}</div>)}
                                    </>)
                                  })()
                                : activeCategory === "actions"
                                ? (<>
                                    <div style={{ margin: "2px 0 10px" }}>
                                      <button type="button" onClick={() => setMetierOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", background: metierOpen ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.09)", border: `1px solid ${metierOpen ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.3)"}`, borderRadius: 9, cursor: "pointer", padding: "9px 12px", margin: "8px 0" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 12.5, fontWeight: 700 }}><Sparkles size={13} /> Modèles par métier</span><ChevronDown size={15} color={G} style={{ transform: metierOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /></button>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                        {metierOpen && ACTION_PRESETS.map(p => (
                                          <button key={p.key} type="button" onClick={() => generateActionPreset(p)} title={`Crée : ${p.blocks.map(b => (BLOCK_DEFS as any)[b.type]?.label || b.type).join(", ")}`}
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(201,168,76,0.18)", cursor: "pointer", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: 11, fontWeight: 600, textAlign: "left" as const, transition: "all .15s" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)" }}>
                                            <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                            <span style={{ flex: 1, lineHeight: 1.2 }}>{p.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <p style={subHeader}>Toutes les actions</p>
                                    {catBlocks.map(([type, def]) => blockBtn(type, def))}
                                  </>)
                                : activeCategory === "media"
                                ? (<>
                                    <div style={{ margin: "2px 0 10px" }}>
                                      <button type="button" onClick={() => setMetierOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", background: metierOpen ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.09)", border: `1px solid ${metierOpen ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.3)"}`, borderRadius: 9, cursor: "pointer", padding: "9px 12px", margin: "8px 0" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 12.5, fontWeight: 700 }}><Sparkles size={13} /> Modèles par métier</span><ChevronDown size={15} color={G} style={{ transform: metierOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /></button>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                        {metierOpen && MEDIA_PRESETS.map(p => (
                                          <button key={p.key} type="button" onClick={() => generateMediaPreset(p)} title={`Crée : ${p.blocks.map(b => (BLOCK_DEFS as any)[b.type]?.label || b.type).join(", ")}`}
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(201,168,76,0.18)", cursor: "pointer", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: 11, fontWeight: 600, textAlign: "left" as const, transition: "all .15s" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)" }}>
                                            <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                            <span style={{ flex: 1, lineHeight: 1.2 }}>{p.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <p style={subHeader}>Tous les blocs médias</p>
                                    {catBlocks.map(([type, def]) => blockBtn(type, def))}
                                  </>)
                                : activeCategory === "commerce"
                                ? (<>
                                    <div style={{ margin: "2px 0 10px" }}>
                                      <button type="button" onClick={() => setMetierOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", background: metierOpen ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.09)", border: `1px solid ${metierOpen ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.3)"}`, borderRadius: 9, cursor: "pointer", padding: "9px 12px", margin: "8px 0" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 12.5, fontWeight: 700 }}><Sparkles size={13} /> Modèles par métier</span><ChevronDown size={15} color={G} style={{ transform: metierOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /></button>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                        {metierOpen && COMMERCE_PRESETS.map(p => (
                                          <button key={p.key} type="button" onClick={() => generateCommercePreset(p)} title={`Crée : ${p.blocks.map(b => (BLOCK_DEFS as any)[b.type]?.label || b.type).join(", ")}`}
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(201,168,76,0.18)", cursor: "pointer", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: 11, fontWeight: 600, textAlign: "left" as const, transition: "all .15s" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)" }}>
                                            <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                            <span style={{ flex: 1, lineHeight: 1.2 }}>{p.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <p style={subHeader}>Tous les blocs commerce</p>
                                    {catBlocks.map(([type, def]) => blockBtn(type, def))}
                                  </>)
                                : activeCategory === "social"
                                ? (<>
                                    <div style={{ margin: "2px 0 10px" }}>
                                      <button type="button" onClick={() => setMetierOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", background: metierOpen ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.09)", border: `1px solid ${metierOpen ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.3)"}`, borderRadius: 9, cursor: "pointer", padding: "9px 12px", margin: "8px 0" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 12.5, fontWeight: 700 }}><Sparkles size={13} /> Modèles par métier</span><ChevronDown size={15} color={G} style={{ transform: metierOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /></button>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                        {metierOpen && SOCIAL_PRESETS.map(p => (
                                          <button key={p.key} type="button" onClick={() => generateSocialPreset(p)} title={`Crée un bloc Liens sociaux : ${p.networks.join(", ")}`}
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(201,168,76,0.18)", cursor: "pointer", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: 11, fontWeight: 600, textAlign: "left" as const, transition: "all .15s" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)" }}>
                                            <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                            <span style={{ flex: 1, lineHeight: 1.2 }}>{p.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                      <p style={{ color: MUTED, fontSize: 9, margin: "6px 0 0" }}>Les liens de base sont pré-remplis : complétez-les avec votre nom d&apos;utilisateur.</p>
                                    </div>
                                    <p style={subHeader}>Tous les réseaux</p>
                                    {catBlocks.map(([type, def]) => blockBtn(type, def))}
                                  </>)
                                : activeCategory === "info"
                                ? (() => {
                                    // Sous-catégories Infos : bibliothèque de contenu organisée façon Notion.
                                    // Certains blocs sont "empruntés" à d'autres catégories (par clé) pour la découvrabilité,
                                    // sans changer leur catégorie d'origine (ils restent aussi dans Business/Actions).
                                    const INFO_GROUPS: { label: string; keys: string[] }[] = [
                                      { label: "Présentation",           keys: ["heading", "rich_text", "quote_block", "about", "announcement"] },
                                      { label: "Organisation",           keys: ["process_steps", "timeline", "values", "engagements"] },
                                      { label: "Preuves & confiance",     keys: ["testimonials", "stats_block", "trust_badge", "visit_counter", "scan_counter"] },
                                      { label: "Entreprise",              keys: ["team", "founder_message", "info_table"] },
                                      { label: "Informations pratiques",  keys: ["opening_hours", "google_maps_embed", "service_area", "on_site_services"] },
                                      { label: "Questions fréquentes",    keys: ["faq"] },
                                      { label: "Documents",               keys: ["documents", "download_file"] },
                                      { label: "Informations légales",    keys: ["legal_info", "business_certifications"] },
                                    ]
                                    const grouped = new Set(INFO_GROUPS.flatMap(g => g.keys))
                                    const rest = catBlocks.filter(([t]) => !grouped.has(t))
                                    return (<>
                                      {/* Modèles par métier : 1 clic crée une section informative complète */}
                                      <div style={{ margin: "2px 0 10px" }}>
                                        <button type="button" onClick={() => setMetierOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", background: metierOpen ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.09)", border: `1px solid ${metierOpen ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.3)"}`, borderRadius: 9, cursor: "pointer", padding: "9px 12px", margin: "8px 0" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 12.5, fontWeight: 700 }}><Sparkles size={13} /> Modèles par métier</span><ChevronDown size={15} color={G} style={{ transform: metierOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /></button>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                          {metierOpen && INFO_PRESETS.map(p => (
                                            <button key={p.key} type="button" onClick={() => generateInfoPreset(p)} title={`Crée : ${p.blocks.map(b => (BLOCK_DEFS as any)[b.type]?.label || b.type).join(", ")}`}
                                              style={{ display: "flex", alignItems: "center", gap: 7, minHeight: isMobile ? 46 : undefined, padding: isMobile ? "11px 11px" : "9px 10px", borderRadius: 10, border: "1px solid rgba(201,168,76,0.18)", cursor: "pointer", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: isMobile ? 12 : 11, fontWeight: 600, textAlign: "left" as const, transition: "all .15s" }}
                                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                              onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)" }}>
                                              <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                              <span style={{ flex: 1, lineHeight: 1.2 }}>{p.label}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      {INFO_GROUPS.map(g => {
                                        const gb = g.keys.filter(k => (BLOCK_DEFS as any)[k])
                                        if (!gb.length) return null
                                        return (
                                          <div key={g.label}>
                                            <p style={subHeader}>{g.label}</p>
                                            {gb.map(k => blockBtn(k, (BLOCK_DEFS as any)[k]))}
                                          </div>
                                        )
                                      })}
                                      {rest.length > 0 && (<div><p style={subHeader}>Autres</p>{rest.map(([t, d]) => blockBtn(t, d))}</div>)}
                                    </>)
                                  })()
                                : catBlocks.map(([type, def]) => blockBtn(type, def))
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </>
                )}
            </div>}
          </div>

          {/* POIGNÉE RESIZE sidebar blocs (souris uniquement -> masquée en mobile) */}
          {!blocksCollapsed && !isMobile && (
            <div
              onMouseDown={blocksResize.onMouseDown}
              style={{
                width: 4, flexShrink: 0, background: "rgba(201,168,76,0.1)",
                borderRight: "1px solid rgba(201,168,76,0.1)",
                cursor: "col-resize", position: "relative", zIndex: 10,
                transition: "background 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.4)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(201,168,76,0.1)"}
            >
              {/* Indicateur visuel */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", gap: 3 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(201,168,76,0.6)" }} />)}
              </div>
            </div>
          )}

          {/* DRAWER FLOTTANT — mode réduit blocs */}
          {blocksCollapsed && drawerCategory && (
            <div ref={drawerRef} style={{ position: "absolute", left: 64, top: 0, width: 240, height: "100%", background: "#0D0D0D", borderRight: "1px solid rgba(201,168,76,0.15)", zIndex: 50, display: "flex", flexDirection: "column", boxShadow: "4px 0 24px rgba(0,0,0,0.5)" }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 14 }}>{drawerCategory==="recents" ? "🕐" : drawerCategory==="favorites" ? "⭐" : BLOCK_CATEGORIES.find(c => c.id===drawerCategory)?.icon}</span>
                  <span style={{ color: drawerCategory==="recents" ? "var(--action)" : drawerCategory==="favorites" ? "#FFD700" : "#F5F0E8", fontSize: 12, fontWeight: 700 }}>{drawerCategory==="recents" ? `Récents (${recentBlocks.length})` : drawerCategory==="favorites" ? `Favoris (${favorites.length})` : BLOCK_CATEGORIES.find(c => c.id===drawerCategory)?.label}</span>
                  {drawerCategory!=="recents" && drawerCategory!=="favorites" && (
                    <span style={{ background: "rgba(255,255,255,0.07)", color: MUTED, borderRadius: 10, padding: "1px 7px", fontSize: 9, fontWeight: 700, marginLeft: 4 }}>
                      {catCounts[drawerCategory||""] || 0}
                    </span>
                  )}
                </div>
                <button onClick={() => setDrawerCategory(null)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 2 }}><X size={13} /></button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "5px 6px" }}>
                {(drawerCategory === "recents"
                  ? recentBlocks.filter(t => BLOCK_DEFS[t]).map(t => [t, BLOCK_DEFS[t]] as [string, (typeof BLOCK_DEFS)[string]])
                  : drawerCategory === "favorites"
                  ? Object.entries(BLOCK_DEFS).filter(([type]) => favorites.includes(type))
                  : Object.entries(BLOCK_DEFS).filter(([, def]) => def.category === drawerCategory)
                ).map(([type, def]) => (
                  <button key={type} onClick={() => { addBlock(type); setDrawerCategory(null) }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", background: "transparent", border: "1px solid transparent", borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "left" as const, marginBottom: 2 }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = BLOCK_DEFS[type]?.color+"10"; el.style.color = "#F5F0E8" }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = "transparent"; el.style.color = MUTED }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: def.color+"12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{def.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "inherit", lineHeight: 1.2 }}>{def.label}</p>
                      <p style={{ margin: 0, fontSize: 10.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.description}</p>
                    </div>
                    <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toggleFav(type) }}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleFav(type) } }}
                      title={isFav(type) ? "Retirer des favoris" : "Ajouter aux favoris"} aria-pressed={isFav(type)}
                      style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontSize: 12, color: isFav(type) ? "#FFD700" : "rgba(255,255,255,0.25)" }}>
                      {isFav(type) ? "⭐" : "☆"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CANVAS */}
          <div style={{ flex: 1, overflowY: "auto", padding: preview && isMobile ? "0 0 96px" : isMobile ? "12px" : "20px", background: BUILDER_REDESIGN ? "#070707" : "#0A0A0A", display: isMobile && mobileTab !== "canvas" ? "none" : undefined }}
            onClick={e => { if (e.target === e.currentTarget) { setSelectedId(null); setMultiSelection([]) } }}>
            {/* C04 — Toolbar canvas responsive (flag ON, desktop). Flag OFF = rien (canvas inchangé). */}
            {BUILDER_REDESIGN && !isMobile && !preview && canvasMode === "edit" && (() => {
              const chrome = canvasChrome(canvasDevice, false, "edit")
              return (
                <div style={{ position: "sticky", top: 0, zIndex: 25, marginBottom: 12, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <CanvasToolbar
                    device={canvasDevice} orientation={canvasOrientation} zoom={canvasZoom} mode={canvasMode}
                    label={deviceLabel(canvasDevice, canvasOrientation, 900)} showOrientation={chrome.showOrientation} showZoom={chrome.showZoom}
                    onDevice={d => { setCanvasDevice(d); setCanvasZoom(1); setCanvasOrientation("portrait") }}
                    onToggleOrientation={() => setCanvasOrientation(toggleOrientation)}
                    onZoomIn={() => setCanvasZoom(z => stepZoom(z, 1))}
                    onZoomOut={() => setCanvasZoom(z => stepZoom(z, -1))}
                    onFit={() => setCanvasZoom(fitZoom(canvasDevice, canvasOrientation, 900))}
                    onReset={() => setCanvasZoom(1)}
                    onCenter={() => { try { document.querySelector('[data-block-id]')?.scrollIntoView({ behavior: "smooth", block: "start" }) } catch {} }}
                    onToggleMode={() => setCanvasMode("preview")}
                    onFullscreen={toggleFocus}
                  />
                </div>
              )
            })()}
            {BUILDER_REDESIGN && !isMobile && canvasMode === "preview" && (
              <div style={{ position: "sticky", top: 0, zIndex: 25, marginBottom: 12, display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", background: "rgba(12,12,12,0.92)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: G, fontWeight: 700 }}>Aperçu</span>
                <div style={{ flex: 1 }} />
                <button onClick={() => setCanvasMode("edit")} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#F5F0E8", fontSize: 12, cursor: "pointer" }}>Éditer</button>
              </div>
            )}
            <div style={BUILDER_REDESIGN && !isMobile
              ? { width: canvasDevice === "fluid" ? "100%" : deviceFrameWidth(canvasDevice, canvasOrientation, 900), maxWidth: canvasDevice === "fluid" ? 640 : "100%", margin: "0 auto", transform: canvasZoom !== 1 ? `scale(${canvasZoom})` : undefined, transformOrigin: "top center", borderRadius: canvasDevice !== "fluid" ? (canvasDevice === "mobile" ? 26 : 14) : 0, border: canvasDevice !== "fluid" ? "1px solid rgba(255,255,255,0.12)" : "none", boxShadow: canvasDevice !== "fluid" ? "0 10px 40px rgba(0,0,0,0.45)" : "none", overflow: canvasDevice !== "fluid" ? "hidden" : "visible", transition: "width 0.2s ease" }
              : { maxWidth: 640, margin: "0 auto" }}>
              {/* ── Toolbar flottante multi-sélection (≥2 blocs) ─────────────── */}
              {multiSelection.length >= 2 && (
                <div style={{
                  position: "sticky", top: 0, zIndex: 20, marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 12px",
                  background: "rgba(8,8,8,0.92)",
                  border: `1px solid ${G}40`,
                  borderRadius: 12,
                  backdropFilter: "blur(12px)",
                  boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${G}15`,
                  animation: "popoverIn 0.15s ease",
                }}>
                  {/* Badge sélection */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 8, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: G+"20", border: `1px solid ${G}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: G, fontSize: 9, fontWeight: 700 }}>{multiSelection.length}</span>
                    </div>
                    <span style={{ color: G, fontSize: 11, fontWeight: 700 }}>
                      {multiSelection.length} bloc{multiSelection.length>1?"s":""} sélectionné{multiSelection.length>1?"s":""}
                    </span>
                  </div>

                  <div style={{ flex: 1 }} />

                  {/* Actions */}
                  {(() => {
                    const allVisible = multiSelection.every(id => blocks.find(b => b.id===id)?.visible)
                    const allLocked = multiSelection.every(id => blocks.find(b => b.id===id)?.locked)
                    const lockedCount = multiSelection.filter(id => blocks.find(b => b.id===id)?.locked).length

                    return (<>
                      {/* Masquer/Afficher */}
                      <button onClick={toggleVisibleMulti}
                        title={allVisible ? "Masquer les blocs sélectionnés" : "Afficher les blocs sélectionnés"}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 11px", color: allVisible ? MUTED : "#EF4444", fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#F5F0E8" }}
                        onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.color=allVisible?MUTED:"#EF4444" }}>
                        {allVisible ? <><EyeOff size={11} /> <span>Masquer</span></> : <><Eye size={11} /> <span>Afficher</span></>}
                      </button>

                      {/* Verrouiller/Déverrouiller */}
                      <button onClick={() => {
                          const ids = multiSelection
                          setBlocks(p => p.map(b => ids.includes(b.id) ? {...b, locked: !allLocked} : b))
                        }}
                        title={allLocked ? "Déverrouiller" : `Verrouiller${lockedCount>0?` (${lockedCount} déjà verrouillé${lockedCount>1?"s":""})`:""}`}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: allLocked ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${allLocked ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "6px 11px", color: allLocked ? G : MUTED, fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background="rgba(201,168,76,0.15)"; e.currentTarget.style.color=G }}
                        onMouseLeave={e => { e.currentTarget.style.background=allLocked?"rgba(201,168,76,0.12)":"rgba(255,255,255,0.05)"; e.currentTarget.style.color=allLocked?G:MUTED }}>
                        {allLocked ? <Unlock size={11} /> : <Lock size={11} />}
                        <span>{allLocked ? "Déverrouiller" : "Verrouiller"}</span>
                      </button>

                      {/* Dupliquer */}
                      <button onClick={duplicateMulti}
                        title={`Dupliquer ${multiSelection.length} blocs`}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 11px", color: MUTED, fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#F5F0E8" }}
                        onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.color=MUTED }}>
                        <Copy size={11} /> <span>Dupliquer</span>
                      </button>

                      {/* Supprimer avec confirmation */}
                      <button onClick={async () => {
                          const unlocked = multiSelection.filter(id => !blocks.find(b => b.id===id)?.locked)
                          if (unlocked.length === 0) return
                          const msg = `Supprimer ${unlocked.length} bloc${unlocked.length>1?"s":""}${unlocked.length<multiSelection.length?` (${multiSelection.length-unlocked.length} verrouillé${multiSelection.length-unlocked.length>1?"s":""} ignoré${multiSelection.length-unlocked.length>1?"s":""})`:""}?`
                          if (await confirm({ title: "Supprimer les blocs ?", message: msg, confirmLabel: "Supprimer", danger: true })) deleteMulti()
                        }}
                        title="Supprimer les blocs sélectionnés"
                        style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "6px 11px", color: "#EF4444", fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background="rgba(239,68,68,0.18)"; e.currentTarget.style.borderColor="rgba(239,68,68,0.5)" }}
                        onMouseLeave={e => { e.currentTarget.style.background="rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor="rgba(239,68,68,0.25)" }}>
                        <Trash2 size={11} /> <span>Supprimer</span>
                      </button>
                    </>)
                  })()}

                  {/* Séparateur */}
                  <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", margin: "0 2px" }} />

                  {/* Désélectionner */}
                  <button onClick={() => setMultiSelection([])} title="Désélectionner (Échap)"
                    style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: MUTED, cursor: "pointer", fontSize: 14, fontWeight: 300 }}
                    onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#F5F0E8" }}
                    onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color=MUTED }}>
                    ×
                  </button>
                </div>
              )}
              {!preview && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "6px 12px", background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 9, backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
                <span style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#8A8478" }}>CANVAS</span>
                <span style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 6, padding: "1px 6px", fontSize: 10, color: G }}>{blocks.length} bloc{blocks.length!==1?"s":""}</span>
                {blocks.filter(b => b.draft).length > 0 && (
                  <span style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 6, padding: "1px 6px", fontSize: 10, color: "#FBBF24", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Pencil size={9} /> {blocks.filter(b => b.draft).length} brouillon{blocks.filter(b => b.draft).length > 1 ? "s" : ""}
                  </span>
                )}
                {guest && draftState === "saved" && <span style={{ color: "var(--success)", fontSize: 9, marginLeft: "auto" }}>Brouillon gardé</span>}
                {!guest && !pageId && <span style={{ color: "#8A8478", fontSize: 9, marginLeft: "auto" }}>Mode démo</span>}
              </div>}

              <div style={{ ...bgStyle(), borderRadius: 20, overflow: "hidden", minHeight: 200, position: "relative", boxShadow: "0 8px 60px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}>
              {/* Effets overlay */}
              {(theme as any).effect_noise && (
                <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", opacity: (theme as any).noise_opacity ? (theme as any).noise_opacity/100 : 0.06, mixBlendMode: "overlay" as const, backgroundImage: NOISE_SVG_URL, backgroundRepeat: "repeat", backgroundSize: "128px 128px" }} />
              )}
              {(theme as any).effect_glow && <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: `radial-gradient(ellipse at 50% 0%, ${(theme as any).glow_color||"#C9A84C"}${Math.round(((theme as any).glow_intensity||40)/100*180).toString(16).padStart(2,"0")}, transparent ${(theme as any).glow_size||300}px)` }} />}
              {(theme as any).effect_overlay && <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: (theme as any).overlay_color||"#000000", opacity: ((theme as any).overlay_opacity||30)/100 }} />}
              {(theme as any).effect_vignette && <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: `radial-gradient(ellipse at 50% 50%, transparent ${Math.max(10, 100-((theme as any).vignette_intensity||40))}%, rgba(0,0,0,${((theme as any).vignette_intensity||40)/100}) 100%)` }} />}
              {(theme as any).effect_blur && (
                <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", backdropFilter: `blur(${(theme as any).blur_amount||4}px)`, WebkitBackdropFilter: `blur(${(theme as any).blur_amount||4}px)` }} />
              )}
              {blocks.length===0 ? (
                <div style={{ padding: "56px 30px 60px", textAlign: "center" }}>
                  <p style={{ color: "#8A8478", fontSize: 28, margin: "0 0 8px" }}>✦</p>
                  <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>Votre page est vide</p>
                  <p style={{ color: MUTED, fontSize: 13, margin: "0 0 16px" }}>Ajoutez un premier bloc pour démarrer.</p>
                  <button type="button" onClick={() => { if (isMobile) setMobileTab("blocks"); else addBlock("profile") }} className="da-btn-primary da-btn-primary--sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Plus size={14} /> Ajouter un bloc
                  </button>
                </div>
              ) : blocks.map((block, idx) => {
                const def = BLOCK_DEFS[block.type]
                const isSelected = block.id === selectedId
                const isMultiSelected = multiSelection.includes(block.id)
                return (
                  <div key={block.id}
                    data-block-id={block.id}
                    onClick={(e) => handleBlockClick(e, block.id, idx)}
                    onDragOver={dragIdx === null ? undefined : (e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); const nb = (e.clientY - r.top) < r.height / 2 ? idx : idx + 1; setDropBefore(p => p === nb ? p : nb) }}
                    onDrop={dragIdx === null ? undefined : (e) => { e.preventDefault(); if (dragIdx === null) return; const ib = dropBefore ?? idx; const from = dragIdx; setBlocks(prev => reorderArray(prev, from, ib)); setDragIdx(null); setDropBefore(null) }}
                    style={{ fontFamily: theme.fontBody || "DM Sans, sans-serif", position: "relative", marginBottom: 0, border: "none", borderRadius: isSelected ? 10 : 0, overflow: "visible", cursor: block.locked ? "default" : "pointer", transition: "box-shadow 0.15s, background 0.1s", opacity: idx === dragIdx ? 0.4 : (block.visible ? (block.draft ? 0.6 : 1) : 0.35), background: isSelected ? "rgba(201,168,76,0.05)" : isMultiSelected ? "rgba(201,168,76,0.06)" : block.draft ? "rgba(251,191,36,0.03)" : "transparent", boxShadow: isSelected ? `inset 0 0 0 2px ${G}, 0 0 0 4px ${G}1f` : isMultiSelected ? `inset 3px 0 0 ${G}80` : block.draft ? "inset 3px 0 0 rgba(251,191,36,0.5)" : block.locked ? "inset 3px 0 0 rgba(168,161,144,0.55)" : "none" }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.boxShadow = `inset 3px 0 0 rgba(201,168,76,0.3)`
                      const overlay = e.currentTarget.querySelector(".block-overlay") as HTMLElement
                      const handle = e.currentTarget.querySelector(".block-handle") as HTMLElement
                      if (overlay) overlay.style.opacity = "1"
                      if (handle) handle.style.opacity = "1"
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.boxShadow = "none"
                      const overlay = e.currentTarget.querySelector(".block-overlay") as HTMLElement
                      const handle = e.currentTarget.querySelector(".block-handle") as HTMLElement
                      if (overlay) overlay.style.opacity = "0"
                      if (handle) handle.style.opacity = "0"
                    }}>

                    {/* C06 — bouton « + » d'insertion entre blocs (flag ON, desktop, mode édition) */}
                    {BUILDER_REDESIGN && !isMobile && !preview && canvasMode === "edit" && dragIdx === null && (
                      <div className="insert-between" style={{ position: "absolute", top: -9, left: 0, right: 0, zIndex: 16, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
                        <div style={{ pointerEvents: "auto" }}><InsertBetweenBlocks index={idx} onInsert={onInsertAtGap} /></div>
                      </div>
                    )}

                    {/* Indicateur d'insertion du glisser-déposer (ligne dorée) */}
                    {dragIdx !== null && dropBefore === idx && <div style={{ position: "absolute", left: 0, right: 0, top: -1, height: 3, background: G, borderRadius: 2, zIndex: 20, boxShadow: `0 0 6px ${G}`, pointerEvents: "none" }} />}
                    {dragIdx !== null && idx === blocks.length - 1 && dropBefore === blocks.length && <div style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 3, background: G, borderRadius: 2, zIndex: 20, boxShadow: `0 0 6px ${G}`, pointerEvents: "none" }} />}

                    {/* Poignée de glisser-déposer (Phase 2, §2.14). draggable natif ; les blocs
                        verrouillés ne se glissent pas. Réordonnancement clavier (chevrons /
                        Alt+flèches) conservé pour l'accessibilité. */}
                    {!preview && <div className="block-handle"
                      draggable={!block.locked}
                      onDragStart={e => { e.stopPropagation(); setDragIdx(idx); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", String(idx)) } catch {} }}
                      onDragEnd={() => { setDragIdx(null); setDropBefore(null) }}
                      style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 18, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s", cursor: block.locked ? "not-allowed" : "grab", zIndex: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {[0,1,2,3,4,5].map(i => <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(201,168,76,0.5)" }} />)}
                      </div>
                    </div>}

                    {!preview && <div className="block-overlay" style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: isMobile ? 6 : 3, opacity: (isMobile && isSelected) ? 1 : 0, transition: "opacity 0.15s", zIndex: 10 }}
                      onClick={e => e.stopPropagation()}>
                      {/* Barre contextuelle du bloc (§2.1) : Monter/Descendre + Dupliquer (action fréquente) + "..." (reste dans le bottom sheet, cibles 40px mobile #6) */}
                      <button onClick={() => moveBlock(block.id, -1)} disabled={idx===0} title="Monter" aria-label="Monter le bloc" style={{ width: isMobile?40:24, height: isMobile?40:24, background: "rgba(15,15,15,0.92)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)", color: idx===0 ? "rgba(255,255,255,0.2)" : "#F5F0E8", cursor: idx===0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7 }}><ChevronUp size={isMobile?17:10} /></button>
                      <button onClick={() => moveBlock(block.id, 1)} disabled={idx===blocks.length-1} title="Descendre" aria-label="Descendre le bloc" style={{ width: isMobile?40:24, height: isMobile?40:24, background: "rgba(15,15,15,0.92)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)", color: idx===blocks.length-1 ? "rgba(255,255,255,0.2)" : "#F5F0E8", cursor: idx===blocks.length-1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7 }}><ChevronDown size={isMobile?17:10} /></button>
                      <button onClick={e => { e.stopPropagation(); duplicateBlock(block.id) }} title="Dupliquer (Ctrl+D)" aria-label="Dupliquer le bloc" style={{ width: isMobile?40:24, height: isMobile?40:24, background: "rgba(15,15,15,0.92)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)", color: "#F5F0E8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7 }}><Copy size={isMobile?16:11} /></button>
                      <button onClick={e => { e.stopPropagation(); setBlockMenu(block.id) }} title="Plus d'actions" aria-label="Plus d'actions" style={{ width: isMobile?40:24, height: isMobile?40:24, background: "rgba(15,15,15,0.92)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)", color: "#F5F0E8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7 }}><MoreHorizontal size={isMobile?17:12} /></button>
                    </div>}

                    {!preview && isSelected && (
                      <div style={{ position: "absolute", bottom: 6, left: 22, display: "flex", alignItems: "center", gap: 4, background: "rgba(8,8,8,0.88)", backdropFilter: "blur(4px)", border: `1px solid ${G}25`, borderRadius: 6, padding: "2px 7px", zIndex: 10 }}>
                        <span style={{ fontSize: 10 }}>{def?.icon}</span>
                        <span style={{ color: G, fontSize: 9, fontWeight: 700 }}>{def?.label}</span>
                      </div>
                    )}
                    {block.draft && !block.locked && (
                      <div style={{ position: "absolute", top: 6, left: 22, display: "flex", alignItems: "center", gap: 4, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 5, padding: "2px 7px", zIndex: 10, pointerEvents: "none" }}>
                        <Pencil size={8} color="#FBBF24" />
                        <span style={{ color: "#FBBF24", fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const }}>Brouillon</span>
                      </div>
                    )}
                    {block.locked && (
                      <div style={{ position: "absolute", top: 6, right: 8, display: "flex", alignItems: "center", gap: 3, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5, padding: "2px 6px", zIndex: 10, pointerEvents: "none" }}>
                        <Lock size={8} color="#A8A190" />
                        <span style={{ color: "#A8A190", fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const }}>Verrouillé</span>
                      </div>
                    )}
                    {clickCounts[block.id] > 0 && (
                      <div title={`${clickCounts[block.id]} clic${clickCounts[block.id] > 1 ? "s" : ""} sur 90 jours`} style={{ position: "absolute", bottom: 6, right: 8, display: "flex", alignItems: "center", gap: 3, background: "rgba(57,255,143,0.12)", border: "1px solid rgba(57,255,143,0.3)", borderRadius: 20, padding: "2px 8px", zIndex: 10, pointerEvents: "none" }}>
                        <span style={{ fontSize: 9 }}>👆</span>
                        <span style={{ color: "var(--success)", fontSize: 9, fontWeight: 700 }}>{clickCounts[block.id]} clic{clickCounts[block.id] > 1 ? "s" : ""}</span>
                      </div>
                    )}

                    <div style={{ overflow: "hidden", minHeight: 36, position: "relative", zIndex: 2, ...blockDecoration(block.content, theme).style }}>
                      <PreviewBoundary><MemoBlockPreview block={block} theme={theme} dayMode={dayMode} editable={!preview && !(BUILDER_REDESIGN && canvasMode === "preview")} onEditField={onEditField} /></PreviewBoundary>
                    </div>
                  </div>
                )
              })}

              {/* C06 — insertion en fin de page via « + » (flag ON, desktop) */}
              {BUILDER_REDESIGN && !isMobile && !preview && canvasMode === "edit" && blocks.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
                  <InsertBetweenBlocks index={blocks.length} onInsert={onInsertAtGap} />
                </div>
              )}

              {!preview && <button onClick={() => { setActiveCategory("identity"); setSearch("") }}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "rgba(201,168,76,0.04)", border: "2px dashed rgba(201,168,76,0.2)", borderRadius: 14, padding: "18px", color: MUTED, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8, transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(201,168,76,0.5)"; e.currentTarget.style.color=G; e.currentTarget.style.background="rgba(201,168,76,0.08)"; e.currentTarget.style.transform="translateY(-1px)" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(201,168,76,0.2)"; e.currentTarget.style.color=MUTED; e.currentTarget.style.background="rgba(201,168,76,0.04)"; e.currentTarget.style.transform="translateY(0)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={14} color={G} /></div>
                Ajouter un nouveau bloc
              </button>}
              {!preview && <button onClick={() => setShowTemplates(true)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "transparent", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", marginTop: 10 }}
                onMouseEnter={e => e.currentTarget.style.color = G} onMouseLeave={e => e.currentTarget.style.color = MUTED}>
                <Sparkles size={13} /> ou partir d&apos;un modèle de page complet
              </button>}
              </div>
            </div>
          </div>

          {/* PANEL DROIT */}
          {/* POIGNÉE RESIZE panel droit (souris uniquement -> masquée en mobile) */}
          {!rightCollapsed && !isMobile && (
            <div
              onMouseDown={rightResize.onMouseDown}
              style={{
                width: 4, flexShrink: 0, background: "rgba(201,168,76,0.1)",
                borderLeft: "1px solid rgba(201,168,76,0.1)",
                cursor: "col-resize", position: "relative", zIndex: 10,
                transition: "background 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.4)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(201,168,76,0.1)"}
            >
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", gap: 3 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(201,168,76,0.6)" }} />)}
              </div>
            </div>
          )}
          <div style={{ width: isMobile ? "100%" : (rightCollapsed ? 48 : (focusMode ? (focusNarrow ? 620 : 740) : rightResize.width)), background: "#161616", borderLeft: "none", display: isMobile && mobileTab !== "panel" ? "none" : "flex", flexDirection: (focusMode && !isMobile) ? "row" : "column", flexShrink: isMobile ? 1 : 0, overflow: "hidden", transition: rightCollapsed ? "width 0.25s ease" : "none", position: "relative" }}>
            <div style={{ display: focusMode ? "none" : "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              {rightCollapsed
                ? /* Mode réduit: onglets verticaux */
                  <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 0 }}>
                    {(["edit","theme"] as const).map(tab => (
                      <button key={tab} onClick={() => { setRightTab(tab); setRightCollapsed(false) }}
                        style={{ padding: "14px 4px", background: "transparent", border: "none", borderLeft: `2px solid ${rightTab===tab ? G : "transparent"}`, color: rightTab===tab ? G : MUTED, fontSize: 9, fontWeight: rightTab===tab ? 700 : 400, cursor: "pointer", writingMode: "vertical-rl" as const, textOrientation: "mixed" as const, letterSpacing: 1 }}>
                        {tab==="edit" ? <Pencil size={13} /> : <Palette size={13} />}
                      </button>
                    ))}
                    <button onClick={toggleRight} style={{ padding: "12px 4px", background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 14, marginTop: "auto" }}>›</button>
                  </div>
                : /* Mode normal: onglets horizontaux */
                  <>
                    {(["edit","theme"] as const).map(tab => (
                      <button key={tab} onClick={() => setRightTab(tab)}
                        style={{ flex: 1, padding: "11px 4px", background: "transparent", border: "none", borderBottom: `2px solid ${rightTab===tab ? G : "transparent"}`, color: rightTab===tab ? G : MUTED, fontSize: 12, fontWeight: rightTab===tab ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                        {tab==="edit" ? "Éditer" : "Thème"}
                      </button>
                    ))}
                    <button onClick={toggleRight} title="Réduire" style={{ padding: "11px 8px", background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 12 }}>‹</button>
                  </>
              }
            </div>


            {!rightCollapsed && (focusMode || rightTab==="edit") && (
              <div style={{ flex: 1, minHeight: 0, minWidth: 0, overflowY: "auto", padding: 14, position: "relative", borderRight: focusMode ? "1px solid rgba(255,255,255,0.08)" : undefined }}>
                {focusSectionHeader("Éditeur")}
                {/* C03 — Réglages refondus (flag ON) : coquille Simple/Avancé + injection du panneau
                    legacy (EditPanel) pour le design/disposition et les blocs non pilotes. Flag OFF =
                    éditeur historique ci-dessous strictement inchangé (zéro régression). */}
                {BUILDER_REDESIGN && (
                  <div style={{ position: "absolute", inset: 0, zIndex: 6, background: "#161616" }}>
                    <BlockSettingsPanel
                      block={selectedBlock ?? null}
                      mobile={isMobile}
                      index={selectedBlock ? blocks.findIndex(b => b.id === selectedBlock.id) : 0}
                      total={blocks.length}
                      onChange={(k, v) => { if (selectedBlock) updateBlock(selectedBlock.id, k, v) }}
                      onDuplicate={() => { if (selectedBlock) duplicateBlock(selectedBlock.id) }}
                      onDelete={() => { if (selectedBlock) deleteBlock(selectedBlock.id) }}
                      onToggleVisible={() => { if (selectedBlock) toggleVisible(selectedBlock.id) }}
                      onToggleLock={() => { if (selectedBlock) toggleLock(selectedBlock.id) }}
                      onToggleDraft={() => { if (selectedBlock) toggleDraft(selectedBlock.id) }}
                      onResetBlock={() => { if (selectedBlock) resetBlock(selectedBlock.id) }}
                      onRequestClose={() => setSelectedId(null)}
                      onOpenLibrary={() => { if (isMobile) setMobileTab("blocks") }}
                      onOpenOutline={() => setOutlineOpen(true)}
                      confirm={(m) => confirm({ title: "Confirmer", message: m, confirmLabel: "Confirmer" })}
                      renderLegacyContent={(b) => <EditPanel key={b.id+"-c"} block={b} onChange={(k, v) => updateBlock(b.id, k, v)} only="content" />}
                      renderLegacyDesign={(b) => <EditPanel key={b.id+"-l"} block={b} onChange={(k, v) => updateBlock(b.id, k, v)} only="layout" />}
                    />
                  </div>
                )}
                {!selectedBlock
                  ? <div style={{ textAlign: "center", padding: "50px 14px" }}>
                      <Settings size={28} color={MUTED} style={{ margin: "0 auto 8px", opacity: 0.2, display: "block" }} />
                      <p style={{ color: MUTED, fontSize: 12, margin: 0, lineHeight: 1.7 }}>Clique sur un bloc dans le canvas pour l&apos;éditer</p>
                    </div>
                  : <>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ background: `${BLOCK_DEFS[selectedBlock.type]?.color||G}12`, border: `1px solid ${BLOCK_DEFS[selectedBlock.type]?.color||G}25`, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                          {BLOCK_DEFS[selectedBlock.type]?.icon}
                        </div>
                        <div>
                          <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 700, margin: 0 }}>{BLOCK_DEFS[selectedBlock.type]?.label}</p>
                          <p style={{ color: MUTED, fontSize: 10, margin: 0 }}>{BLOCK_DEFS[selectedBlock.type]?.description}</p>
                        </div>
                        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                          {/* #11 : une seule action "..." -> meme bottom sheet que l'overlay (dup/masquer/verrouiller/brouillon/supprimer) */}
                          <button onClick={() => setBlockMenu(selectedBlock.id)} title="Plus d'actions" aria-label="Plus d'actions" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, width: isMobile ? 34 : 26, height: isMobile ? 34 : 26, cursor: "pointer", color: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center" }}><MoreHorizontal size={isMobile ? 17 : 13} /></button>
                        </div>
                      </div>
                      {(() => {
                        const bc = selectedBlock.content as any
                        const set = (k: string, v: string) => updateBlock(selectedBlock.id, k, v)
                        const selStyle: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, color: "#F5F0E8", fontSize: 12, padding: "7px 9px", cursor: "pointer" }
                        const labelStyle: React.CSSProperties = { color: MUTED, fontSize: 11, display: "block", marginBottom: 4, fontWeight: 500 }
                        const secTitle: React.CSSProperties = { color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 9px" }
                        // Helpers appelés en ligne (sel/toggle) au lieu de composants JSX — évite un remontage à chaque rendu.
                        const sel = (k: string, label: string, options: string[], def: string) => (
                          <div>
                            <label style={labelStyle}>{label}</label>
                            <Segmented value={bc[k] || def} options={options} onChange={v => set(k, v)} active={G} muted={MUTED} />
                          </div>
                        )
                        const toggle = (k: string, label: string, icon: React.ReactNode) => {
                          const on = bc[k] === "Oui"
                          return (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                              <span style={{ color: "#F5F0E8", fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}><span style={{ display: "inline-flex" }}>{icon}</span>{label}</span>
                              <button onClick={() => set(k, on ? "" : "Oui")}
                                style={{ width: 42, height: 24, borderRadius: 12, background: on ? G : "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                                <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                              </button>
                            </div>
                          )
                        }
                        const active = STYLE_COPY_KEYS.some(k => bc[k] && !["Aucun", "Défaut", "Non", "Normale", "Aucune", "Plein", ""].includes(bc[k]))
                        const applyPreset = (apply: Record<string, string>) => setBlocks(p => p.map(b => b.id === selectedBlock.id ? { ...b, content: { ...b.content, ...apply } } : b))
                        const TABS = [
                          { k: "contenu", label: "Contenu" },
                          { k: "style", label: "Style" },
                          { k: "layout", label: "Mise en page" },
                          { k: "avance", label: "Avancé" },
                        ] as const
                        return (
                          <>
                            {/* Onglets d'édition du bloc — visibles seulement en mode Expert (audit #10 : un seul contexte) */}
                            {expertMode && (
                            <div style={{ display: "flex", gap: 4, background: "#100e0c", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 11, padding: 4, margin: "0 0 14px" }}>
                              {TABS.map(t => (
                                <button key={t.k} onClick={() => setEditTab(t.k)} className={editTab===t.k ? undefined : "da-seg-btn"}
                                  style={{ flex: 1, minHeight: isMobile ? 42 : undefined, padding: isMobile ? "10px 3px" : "8px 3px", borderRadius: 8, border: "none", cursor: "pointer", background: editTab===t.k ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 88%, #fff), var(--accent))" : "transparent", color: editTab===t.k ? "#1a1408" : MUTED, fontSize: isMobile ? 11.5 : 10, fontWeight: editTab===t.k ? 800 : 600, boxShadow: editTab===t.k ? "0 1px 0 rgba(255,255,255,.4) inset, 0 6px 16px -10px rgba(201,162,77,.7)" : "none", transition: "background .18s ease, color .18s ease", whiteSpace: "nowrap" as const }}>{t.label}</button>
                              ))}
                            </div>
                            )}

                            {/* CONTENU — toujours affiché en mode Simple, ou sous l'onglet Contenu en Expert */}
                            {(!expertMode || editTab === "contenu") && <EditPanel key={selectedBlock.id+"-c"} block={selectedBlock} onChange={set} only="content" />}

                            {/* MISE EN PAGE */}
                            {expertMode && editTab === "layout" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <EditPanel key={selectedBlock.id+"-l"} block={selectedBlock} onChange={set} only="layout" />
                                {sel("__width", "Largeur du bloc", BLOCK_WIDTH_OPTIONS, "Normale")}
                                {sel("__space", "Espacement vertical", BLOCK_SPACE_OPTIONS, "Défaut")}
                                {/* Taille du texte — curseur (met à l'échelle le contenu du bloc). 100 % = normal. */}
                                <div>
                                  <label style={labelStyle}>Taille du texte</label>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <input type="range" min={80} max={140} step={5}
                                      value={Number(bc.__text_scale) || 100}
                                      onChange={e => set("__text_scale", e.target.value === "100" ? "" : e.target.value)}
                                      aria-label="Taille du texte" style={{ flex: 1, accentColor: G }} />
                                    <span style={{ minWidth: 42, textAlign: "right", color: "#F5F0E8", fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{Number(bc.__text_scale) || 100}%</span>
                                  </div>
                                  {(Number(bc.__text_scale) || 100) !== 100 && (
                                    <button onClick={() => set("__text_scale", "")} style={{ marginTop: 5, background: "none", border: "none", color: MUTED, fontSize: 10, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Réinitialiser</button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* STYLE */}
                            {expertMode && editTab === "style" && (
                              <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 10px" }}>
                                  <p style={secTitle}>Modèles d&apos;apparence</p>
                                  {active && <button onClick={() => STYLE_COPY_KEYS.forEach(k => set(k, ""))} title="Réinitialiser l'apparence de ce bloc"
                                    style={{ background: "none", border: "none", color: MUTED, fontSize: 10, cursor: "pointer", textDecoration: "underline" }}>Réinitialiser</button>}
                                </div>
                                {/* Copier / coller le style entre blocs */}
                                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                                  <button onClick={() => setStyleClipboard(Object.fromEntries(STYLE_COPY_KEYS.map(k => [k, bc[k] || ""])))} title="Copier l'apparence de ce bloc"
                                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#F5F0E8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                    <Copy size={11} /> Copier le style
                                  </button>
                                  <button onClick={() => { if (styleClipboard) applyPreset(styleClipboard) }} disabled={!styleClipboard} title={styleClipboard ? "Appliquer l'apparence copiée" : "Copiez d'abord le style d'un bloc"}
                                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 8, border: `1px solid ${styleClipboard ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.07)"}`, background: styleClipboard ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)", color: styleClipboard ? G : "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 600, cursor: styleClipboard ? "pointer" : "not-allowed" }}>
                                    📋 Coller le style
                                  </button>
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                                  {BLOCK_STYLE_PRESETS.map(p => (
                                    <button key={p.key} onClick={() => applyPreset(p.apply)} title={`Appliquer le style ${p.label}`}
                                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.2)" }}>
                                      <span style={{ fontSize: 13 }}>{p.emoji}</span>{p.label}
                                    </button>
                                  ))}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                  {/* Fond dégradé — sélecteur visuel (swatches), fini le menu natif blanc */}
                                  <div>
                                    <label style={labelStyle}>Fond dégradé</label>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                                      {[["Aucun", "transparent"] as const, ...Object.entries(BLOCK_GRADIENTS)].map(([name, val]) => {
                                        const sel = (bc.__grad || "Aucun") === name
                                        return (
                                          <button key={name} onClick={() => set("__grad", name === "Aucun" ? "" : name)} title={name}
                                            style={{ height: 34, borderRadius: 8, cursor: "pointer", border: sel ? `2px solid ${G}` : "1px solid rgba(255,255,255,0.12)", background: name === "Aucun" ? "repeating-conic-gradient(rgba(255,255,255,0.06) 0% 25%, transparent 0% 50%) 50% / 10px 10px" : val, position: "relative", padding: 0 }}>
                                            {name === "Aucun" && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: MUTED }}>Aucun</span>}
                                            {sel && name !== "Aucun" && <span style={{ position: "absolute", top: 2, right: 3, color: "#fff", fontSize: 10, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>✓</span>}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                  {(!bc.__grad || bc.__grad === "Aucun") && (
                                    <div>
                                      <label style={labelStyle}>Fond (couleur unie)</label>
                                      <div style={{ display: "flex", gap: 7 }}>
                                        <input type="color" value={bc.__bg || "#111111"} onChange={e => set("__bg", e.target.value)} style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0, background: "none" }} />
                                        <input type="text" value={bc.__bg || ""} onChange={e => set("__bg", e.target.value)} placeholder="Aucun (transparent)" style={{ ...selStyle, flex: 1, cursor: "text" }} />
                                        {bc.__bg && <button onClick={() => set("__bg", "")} title="Retirer le fond" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", padding: "0 9px", fontSize: 12 }}>✕</button>}
                                      </div>
                                    </div>
                                  )}
                                  {/* Intensité : n'a de sens que si un fond est actif */}
                                  {((bc.__grad && bc.__grad !== "Aucun") || (bc.__bg && bc.__bg.startsWith("#"))) && (
                                    <div>
                                      <label style={labelStyle}>Intensité du fond</label>
                                      <Segmented value={bc.__intensity || "Plein"} options={BLOCK_INTENSITY_OPTIONS} onChange={v => set("__intensity", v)} active={G} muted={MUTED} />
                                      <p style={{ color: MUTED, fontSize: 9.5, margin: "4px 0 0" }}>« Léger » laisse transparaître le fond de la page — plus doux, texte toujours lisible.</p>
                                    </div>
                                  )}
                                  {toggle("__border", "Bordure", <Square size={12} />)}
                                  {sel("__radius", "Coins arrondis", BLOCK_RADIUS_OPTIONS, "Défaut")}
                                  {sel("__shadow", "Ombre", BLOCK_SHADOW_OPTIONS, "Non")}
                                  {toggle("__glow", "Halo lumineux (glow)", <Sparkles size={12} />)}
                                  {toggle("__glass", "Effet verre (flou)", <Layers size={12} />)}
                                </div>
                              </div>
                            )}

                            {/* AVANCÉ */}
                            {expertMode && editTab === "avance" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div>
                                  <p style={secTitle}>Visibilité</p>
                                  {[
                                    { key: "hide_mobile", label: "Afficher sur mobile", icon: "📱" },
                                    { key: "hide_desktop", label: "Afficher sur ordinateur", icon: "🖥️" },
                                  ].map(o => {
                                    const shown = bc[o.key] !== "yes" // "yes" = masqué
                                    return (
                                      <div key={o.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0" }}>
                                        <span style={{ color: "#F5F0E8", fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}><span>{o.icon}</span>{o.label}</span>
                                        <button onClick={() => set(o.key, shown ? "yes" : "")} title={shown ? "Cliquer pour masquer" : "Cliquer pour afficher"}
                                          style={{ width: 42, height: 24, borderRadius: 12, background: shown ? G : "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                                          <span style={{ position: "absolute", top: 3, left: shown ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                                        </button>
                                      </div>
                                    )
                                  })}
                                  {(bc.hide_mobile === "yes" || bc.hide_desktop === "yes") && (
                                    <p style={{ color: "#F59E0B", fontSize: 9.5, margin: "4px 0 0" }}>⚠ Ce bloc est masqué sur {bc.hide_mobile === "yes" ? "mobile" : ""}{bc.hide_mobile === "yes" && bc.hide_desktop === "yes" ? " et " : ""}{bc.hide_desktop === "yes" ? "ordinateur" : ""} (page publiée).</p>
                                  )}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                  <p style={secTitle}>Animations</p>
                                  {sel("__anim", "À l'apparition (au scroll)", BLOCK_ANIM_OPTIONS, "Aucune")}
                                  {bc.__anim && bc.__anim !== "Aucune" && sel("__anim_speed", "Vitesse d'apparition", BLOCK_ANIM_SPEED_OPTIONS, "Normal")}
                                  {sel("__hover", "Au survol", BLOCK_HOVER_OPTIONS, "Aucun")}
                                  {sel("__loop", "En boucle (emphase)", BLOCK_LOOP_OPTIONS, "Aucune")}
                                  <p style={{ color: MUTED, fontSize: 9.5, margin: "-2px 0 0" }}>L&apos;apparition se déclenche quand le bloc entre à l&apos;écran (visible sur la page publiée).</p>
                                </div>
                                <div>
                                  <p style={secTitle}>Nom interne</p>
                                  <input type="text" value={bc.__name || ""} onChange={e => set("__name", e.target.value)} placeholder="Ex : Section horaires (privé)" style={{ ...selStyle, cursor: "text" }} />
                                  <p style={{ color: MUTED, fontSize: 9.5, margin: "4px 0 0" }}>Aide-mémoire visible uniquement par vous.</p>
                                </div>
                                <div>
                                  <p style={secTitle}>Actions</p>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => duplicateBlock(selectedBlock.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#F5F0E8", fontSize: 12, cursor: "pointer" }}><Copy size={11} /> Dupliquer</button>
                                    {!selectedBlock.locked && <button onClick={() => deleteBlock(selectedBlock.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.07)", color: "#EF4444", fontSize: 12, cursor: "pointer" }}><Trash2 size={11} /> Supprimer</button>}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Bascule Simple <-> Expert (audit #10/#14 : options avancees masquees par defaut) */}
                            {!expertMode ? (
                              <button type="button" onClick={() => { setExpertMode(true); setEditTab("style") }}
                                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, marginTop: 16, border: "1px dashed rgba(255,255,255,0.14)", borderRadius: 11, background: "rgba(255,255,255,0.02)", color: MUTED, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                                <Settings size={15} /> Style &amp; options avancées
                              </button>
                            ) : (
                              <button type="button" onClick={() => { setExpertMode(false); setEditTab("contenu") }}
                                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 42, marginTop: 16, border: "none", background: "none", color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                ← Revenir au mode simple
                              </button>
                            )}
                          </>
                        )
                      })()}
                    </>
                }
              </div>
            )}

            {!rightCollapsed && (focusMode || rightTab==="theme") && (
              <div style={{ flex: 1, minHeight: 0, minWidth: 0, overflowY: "auto", padding: 14 }}>
                {focusSectionHeader("Thème")}
                <ThemePanel theme={theme} onThemeChange={commitTheme} userPlan={userPlan}
                  previewName={(blocks.find(b => b.type === "profile")?.content as any)?.name || pageName}
                  previewAvatar={(blocks.find(b => b.type === "profile")?.content as any)?.avatar || ""} />
              </div>
            )}

          </div>
        </div>

        {/* BARRE D'ONGLETS MOBILE — un panneau à la fois (palette | page | réglages) */}
        {/* Barre flottante en mode Apercu : sortir + voir en direct (#02) */}
        {isMobile && preview && (
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60, display: "flex", gap: 10, padding: "10px 14px calc(10px + env(safe-area-inset-bottom))", background: "rgba(12,11,9,0.9)", backdropFilter: "blur(14px)", borderTop: "1px solid rgba(201,168,76,0.2)" }}>
            <button onClick={() => setPreview(false)} className="da-btn-primary da-btn-primary--sm" style={{ flex: 1, minHeight: 48, justifyContent: "center" }}>
              <ChevronDown size={16} style={{ transform: "rotate(90deg)" }} /> <span>Modifier</span>
            </button>
            {pageSlug && <a href={`/${pageSlug}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 48, padding: "0 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "#F5F0E8", fontSize: 13, fontWeight: 700, textDecoration: "none" }}><ExternalLink size={14} /> Voir en direct</a>}
          </div>
        )}

        {/* #13 : pendant la recherche de bloc, on masque la barre du bas -> les resultats prennent toute la hauteur au-dessus du clavier */}
        {/* C06 — le shell mobile (flag ON) remplace la barre historique : on l'évite pour ne pas
            créer deux navigations simultanées (§4). */}
        {isMobile && !BUILDER_REDESIGN && !preview && !(blockSearchFocus && mobileTab === "blocks") && (
          <div style={{ flexShrink: 0, display: "flex", background: "#0C0C0C", borderTop: "1px solid rgba(255,255,255,0.08)", paddingBottom: "env(safe-area-inset-bottom)" }}>
            {([
              { id: "blocks", label: "Blocs", icon: "🧱" },
              { id: "canvas", label: "Page", icon: "📄" },
              { id: "panel", label: "Réglages", icon: "⚙️" },
            ] as const).map(t => {
              const on = mobileTab === t.id
              return (
                <button key={t.id} onClick={() => setMobileTab(t.id)}
                  style={{ flex: 1, minHeight: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "8px 4px", background: on ? "rgba(201,168,76,0.12)" : "transparent", border: "none", borderTop: `3px solid ${on ? G : "transparent"}`, color: on ? G : MUTED, fontSize: 11, fontWeight: on ? 800 : 500, cursor: "pointer" }}>
                  <span style={{ fontSize: 17 }}>{t.icon}</span>{t.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Actions secondaires d'un bloc (bottom sheet) — #10 : sorties de l'overlay pour desencombrer */}
        {blockMenu && (() => {
          const b = blocks.find(x => x.id === blockMenu)
          if (!b) return null
          const def = BLOCK_DEFS[b.type]
          const items: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }[] = [
            { icon: <Copy size={17} />, label: "Dupliquer", onClick: () => { duplicateBlock(b.id); setBlockMenu(null) } },
            { icon: b.visible ? <EyeOff size={17} /> : <Eye size={17} />, label: b.visible ? "Masquer" : "Afficher", onClick: () => { toggleVisible(b.id); setBlockMenu(null) } },
            { icon: b.locked ? <Unlock size={16} /> : <Lock size={16} />, label: b.locked ? "Déverrouiller" : "Verrouiller", onClick: () => { toggleLock(b.id); setBlockMenu(null) } },
            ...(b.locked ? [] : [{ icon: <Pencil size={16} />, label: b.draft ? "Retirer du brouillon" : "Mettre en brouillon", onClick: () => { toggleDraft(b.id); setBlockMenu(null) } }]),
            ...(b.locked ? [] : [{ icon: <RefreshCw size={16} />, label: "Réinitialiser", onClick: () => { resetBlock(b.id); setBlockMenu(null) } }]),
            ...(b.locked ? [] : [{ icon: <Trash2 size={17} color="#EF4444" />, label: "Supprimer", danger: true, onClick: () => { deleteBlock(b.id); setBlockMenu(null) } }]),
          ]
          return (
            <div onClick={() => setBlockMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "#141210", borderTopLeftRadius: 20, borderTopRightRadius: 20, border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none", padding: "10px 12px calc(14px + env(safe-area-inset-bottom))", boxShadow: "0 -16px 44px rgba(0,0,0,0.55)" }}>
                <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.18)", margin: "0 auto 10px" }} />
                <p style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: "0 6px 6px", display: "flex", alignItems: "center", gap: 8 }}><span>{def?.icon}</span> {def?.label || "Bloc"}</p>
                {items.map((it, i) => (
                  <button key={i} onClick={it.onClick}
                    style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "13px 12px", background: "none", border: "none", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none", color: it.danger ? "#EF4444" : "#F5F0E8", fontSize: 14.5, fontWeight: 500, cursor: "pointer", textAlign: "left" }}>
                    <span style={{ width: 24, display: "flex", justifyContent: "center", flexShrink: 0 }}>{it.icon}</span> {it.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Popover aperçu bloc */}
        {popover && (() => {
          const def = BLOCK_DEFS[popover.type]
          const hint = BLOCK_HINTS[popover.type]
          if (!def) return null
          const cat = BLOCK_CATEGORIES.find(c => c.id === def.category)
          // Ajustement vertical pour rester dans l'écran
          const adjustedY = Math.min(popover.y, window.innerHeight - 200)
          return (
            <div style={{
              position: "fixed", left: popover.x, top: adjustedY, zIndex: 9999,
              width: 220, background: "#161616",
              border: `1px solid ${def.color}30`,
              borderRadius: 14, overflow: "hidden",
              boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)`,
              animation: "popoverIn 0.15s ease",
              pointerEvents: "none",
            }}>
              {/* Header coloré */}
              <div style={{ padding: "12px 14px", background: `linear-gradient(135deg, ${def.color}12, ${def.color}06)`, borderBottom: `1px solid ${def.color}20` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: def.color+"18", border: `1px solid ${def.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{def.icon}</div>
                  <div>
                    <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 700, margin: "0 0 1px" }}>{def.label}</p>
                    {cat && <span style={{ background: cat.color+"15", color: cat.color, borderRadius: 10, padding: "1px 6px", fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>{cat.label}</span>}
                  </div>
                </div>
                <p style={{ color: "rgba(245,240,232,0.65)", fontSize: 10, margin: 0, lineHeight: 1.5 }}>{def.description}</p>
              </div>
              {/* Preview + hint */}
              <div style={{ padding: "10px 14px" }}>
                {hint ? (
                  <>
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 10px", marginBottom: 8, fontFamily: "monospace", fontSize: 10, color: "rgba(245,240,232,0.5)", lineHeight: 1.5 }}>
                      {hint.preview}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Lightbulb size={10} />
                      <span style={{ color: def.color, fontSize: 10, fontWeight: 500 }}>{hint.hint}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Lightbulb size={10} />
                    <span style={{ color: MUTED, fontSize: 10 }}>Cliquez pour ajouter à la page</span>
                  </div>
                )}
              </div>
              {/* Champs disponibles */}
              {def.fields.length > 0 && (
                <div style={{ padding: "0 14px 10px", display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {def.fields.slice(0, 4).map(f => (
                    <span key={f.key} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "2px 6px", fontSize: 8, color: "rgba(245,240,232,0.4)" }}>{f.label.split(" — ").pop()}</span>
                  ))}
                  {def.fields.length > 4 && <span style={{ fontSize: 8, color: MUTED }}>+{def.fields.length - 4}</span>}
                </div>
              )}
            </div>
          )
        })()}

        {/* MODALE — Modèles de page complets (par métier -> sous-variantes) */}
        {showTemplates && (
          <div onClick={() => setShowTemplates(false)}
            style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 860, maxHeight: "88vh", background: "#111", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
              {/* En-tête */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
                <Sparkles size={20} color={G} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, color: "#F5F0E8", fontSize: 15, fontWeight: 700 }}>Modèles de page</p>
                  <p style={{ margin: 0, color: MUTED, fontSize: 11 }}>Une page complète et cohérente en un clic — personnalisable ensuite.</p>
                </div>
                <button onClick={() => setShowTemplates(false)} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", width: 30, height: 30, fontSize: 16 }}>×</button>
              </div>
              {/* Génération par IA — décris ton activité, l'IA construit la page */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(120deg,rgba(201,168,76,0.09),rgba(57,255,143,0.05))" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 17 }}>🪄</span>
                  <p style={{ margin: 0, color: "#F5F0E8", fontSize: 13.5, fontWeight: 800 }}>Générer ma page avec l&apos;IA</p>
                </div>
                <p style={{ margin: "0 0 10px", color: MUTED, fontSize: 11.5, lineHeight: 1.4 }}>Décris ton activité en une phrase — l&apos;IA construit une page complète, prête à personnaliser.</p>
                <div style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, gap: 8, alignItems: isMobile ? "stretch" : "flex-start" }}>
                  <textarea
                    value={aiGenPrompt}
                    onChange={e => { setAiGenPrompt(e.target.value); if (aiGenError) { setAiGenError(null); setAiGenSoon(false) } }}
                    disabled={aiGenLoading}
                    placeholder="Ex : Salon de coiffure haut de gamme à Lyon, coupe, coloration, barbier. Réservation en ligne, ambiance chaleureuse."
                    rows={3}
                    style={{ flex: 1, resize: "vertical", minHeight: isMobile ? 76 : 60, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, color: "#F5F0E8", fontSize: 12.5, padding: "10px 12px", lineHeight: 1.45, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const }}
                  />
                  <button onClick={generateWithAI} disabled={aiGenLoading}
                    className="da-btn-primary da-btn-primary--sm" style={{ flexShrink: 0, alignSelf: "stretch", minHeight: isMobile ? 48 : undefined, minWidth: isMobile ? undefined : 120, justifyContent: "center" }}>
                    {aiGenLoading
                      ? <><span style={{ width: 13, height: 13, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "mo-spin 0.7s linear infinite" }} /> Génération…</>
                      : <><Sparkles size={14} /> Générer ma page</>}
                  </button>
                </div>
                {aiGenError && (aiGenSoon
                  ? <div style={{ margin: "9px 0 0", padding: "9px 11px", borderRadius: 9, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.28)", color: "#E8D9A8", fontSize: 11.5, lineHeight: 1.45, display: "flex", gap: 7 }}><span style={{ flexShrink: 0 }}>⏳</span><span>{aiGenError}</span></div>
                  : <p style={{ margin: "7px 0 0", color: "#F87171", fontSize: 10.5 }}>{aiGenError}</p>)}
                {aiGenLoading && <p style={{ margin: "7px 0 0", color: MUTED, fontSize: 10 }}>L&apos;IA rédige votre page… (quelques secondes)</p>}
              </div>
              <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
                {/* Colonne métiers */}
                <div style={{ width: 190, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.07)", overflowY: "auto", padding: 8 }} className="iphone-scroll">
                  {PAGE_TEMPLATE_GROUPS.map(grp => {
                    const on = templateGroup === grp
                    const emoji = PAGE_TEMPLATES.find(t => t.group === grp)?.emoji || "📄"
                    return (
                      <button key={grp} onClick={() => setTemplateGroup(grp)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", marginBottom: 3, borderRadius: 9, border: "none", cursor: "pointer", background: on ? "rgba(201,168,76,0.12)" : "transparent", color: on ? G : "#C8C2B6", fontSize: 12, fontWeight: on ? 700 : 500, textAlign: "left" as const }}>
                        <span style={{ fontSize: 15 }}>{emoji}</span>{grp}
                      </button>
                    )
                  })}
                </div>
                {/* Variantes du métier */}
                <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }} className="iphone-scroll">
                  {PAGE_TEMPLATES.filter(t => t.group === templateGroup).map(tpl => (
                    <div key={tpl.key} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, overflow: "hidden", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column" }}>
                      {/* Mini-apercu de page (avatar + titre + CTA aux couleurs du theme) — plus visuel (#16) */}
                      <div style={{ height: 148, background: tpl.theme.bgGradient || tpl.theme.bg, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, padding: "16px" }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${tpl.theme.primary}, ${tpl.theme.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>{tpl.emoji}</div>
                        <div style={{ width: "56%", height: 6, borderRadius: 3, background: (tpl.theme as any).text || "#F5F0E8", opacity: 0.9 }} />
                        <div style={{ width: "40%", height: 4, borderRadius: 2, background: (tpl.theme as any).muted || "#9A948A", opacity: 0.7 }} />
                        <div style={{ width: "74%", height: 15, borderRadius: 8, background: tpl.theme.accent || tpl.theme.primary, marginTop: 3, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} />
                        <div style={{ position: "absolute", bottom: 7, right: 7, display: "flex", gap: 3 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: tpl.theme.primary, border: "1px solid rgba(255,255,255,0.25)" }} />
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: tpl.theme.accent, border: "1px solid rgba(255,255,255,0.25)" }} />
                        </div>
                      </div>
                      <div style={{ padding: "11px 12px", flex: 1, display: "flex", flexDirection: "column" }}>
                        <p style={{ margin: "0 0 2px", color: "#F5F0E8", fontSize: 13, fontWeight: 700 }}>{tpl.label}</p>
                        <p style={{ margin: "0 0 8px", color: MUTED, fontSize: 10.5, lineHeight: 1.4 }}>{tpl.desc}</p>
                        <p style={{ margin: "0 0 10px", color: "#6E685E", fontSize: 9.5 }}>{tpl.blocks.length} sections · {(BLOCK_DEFS[tpl.blocks[0]?.type]?.label) || ""}…</p>
                        <button onClick={() => applyPageTemplate(tpl)}
                          style={{ marginTop: "auto", width: "100%", padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", background: G, color: "#080808", fontSize: 11.5, fontWeight: 700 }}>
                          Utiliser ce modèle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          blockDefs={BLOCK_DEFS}
          recentBlockTypes={recentBlocks}
          onInsertBlock={(t) => addBlock(t)}
          commands={[
            { id: "undo", label: "Annuler", hint: "Ctrl+Z", keywords: "undo revenir historique", icon: "↶", run: () => { const p = undoRedo.undo(); if (p) applySnapshot(p) } },
            { id: "redo", label: "Rétablir", hint: "Ctrl+⇧+Z", keywords: "redo refaire", icon: "↷", run: () => { const n = undoRedo.redo(); if (n) applySnapshot(n) } },
            { id: "save", label: "Enregistrer maintenant", hint: "Ctrl+S", keywords: "sauvegarder save", icon: "💾", run: saveNow },
            { id: "publish", label: "Publier la page", keywords: "publier ligne", icon: "🚀", run: () => { void handlePublish() } },
            { id: "preview", label: "Aperçu plein écran", hint: "Ctrl+P", keywords: "prévisualiser voir", icon: "👁", run: () => setPreview(true) },
            { id: "templates", label: "Modèles de page", keywords: "template modèle gabarit", icon: "✨", run: () => setShowTemplates(true) },
            { id: "duplicate", label: "Dupliquer la sélection", hint: "Ctrl+D", keywords: "dupliquer clone copie", icon: "⧉", run: duplicateSelection },
            { id: "copy", label: "Copier la sélection", hint: "Ctrl+C", keywords: "copier", icon: "⎘", run: copySelection },
            { id: "paste", label: "Coller", hint: "Ctrl+V", keywords: "coller paste", icon: "📋", run: pasteClipboard },
            { id: "outline", label: "Plan de la page", keywords: "plan structure calques navigation sommaire", icon: "☰", run: () => setOutlineOpen(true) },
            { id: "theme", label: "Ouvrir le thème", keywords: "thème couleur police design", icon: "🎨", run: () => setRightTab("theme") },
            { id: "focus", label: "Mode Focus", hint: "Ctrl+F", keywords: "focus concentration", icon: "◱", run: toggleFocus },
            { id: "expert", label: expertMode ? "Passer en mode Simple" : "Passer en mode Expert", keywords: "simple expert avancé", icon: "⚙", run: () => setExpertMode(v => !v) },
          ] as PaletteCommand[]}
        />

        <OutlinePanel
          open={outlineOpen}
          onClose={() => setOutlineOpen(false)}
          blocks={blocks}
          blockDefs={BLOCK_DEFS}
          onSelect={(id) => {
            setSelectedId(id); setRightTab("edit")
            if (isMobile) setMobileTab("canvas")
            setOutlineOpen(false)
            setTimeout(() => { try { document.querySelector(`[data-block-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }) } catch {} }, 60)
          }}
          onMove={(id, dir) => moveBlock(id, dir)}
        />

        <style>{`
          @keyframes popoverIn { from { opacity: 0; transform: translateX(-4px) scale(0.97) } to { opacity: 1; transform: translateX(0) scale(1) } }
          @keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
          @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
          @keyframes auroraShift{0%{background-position:0% 0%}33%{background-position:100% 0%}66%{background-position:50% 100%}100%{background-position:0% 0%}}
          .iphone-scroll::-webkit-scrollbar{display:none}
          .panel-collapse{transition:width 0.25s var(--mo-ease-emphasized)}
          .focus-mode .sidebar{width:64px!important}
          button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible, [role="button"]:focus-visible { outline: 2px solid #C9A84C; outline-offset: 2px; border-radius: 4px; }
        `}</style>
      </div>
    )
  }
