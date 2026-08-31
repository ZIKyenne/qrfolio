import { encreLisible } from "@/lib/contrasteQr"
/**
 * QRowg — Intro d'entrée thémable (runtime vanilla, zéro dépendance).
 * Issu du handoff design. Scopé sous #pi-intro / .pi-* ; SSR-safe.
 *
 *   const stop = initIntro({ style:"reveal", accent:"#C9A84C", bg:"#080808",
 *                            text:"#F5F0E8", title:"Marie Dupont" })
 *   stop()  // annule/nettoie immédiatement (démontage de composant)
 */

export type IntroStyle = "reveal" | "fade" | "curtain" | "pulse" | "ring" | "stack" | "zoom" | "flip" | "slide" | "corners"

export interface IntroConfig {
  style: IntroStyle
  accent: string
  bg: string           // peut être clair (#FFFFFF)
  text: string
  title: string        // obligatoire
  subtitle?: string
  avatar?: string      // optionnel ; fallback = 1re lettre de title
  duration: number     // ms
  oncePerSession: boolean
  skippable: boolean
}

export const DEFAULTS: IntroConfig = {
  style: "reveal",
  accent: "#C9A84C",
  bg: "#080808",
  text: "#F5F0E8",
  title: "Marie Dupont",
  subtitle: "Photographe",
  avatar: "",
  duration: 2400,
  oncePerSession: true,
  skippable: true,
}

export const STYLES: IntroStyle[] = ["reveal", "fade", "curtain", "pulse", "ring", "stack", "zoom", "flip", "slide", "corners"]

const SESSION_KEY = "pi-intro-seen"
const CSS_ID = "pi-intro-css"

/* ── CSS scopé ─────────────────────────────────────────────────────────── */

export function introCSS(): string { return `
#pi-intro{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;
 background:var(--pi-bg);color:var(--pi-text);font-family:var(--pi-font);
 -webkit-tap-highlight-color:transparent;cursor:pointer;opacity:1}
#pi-intro.pi-scoped{position:absolute}
#pi-intro.pi-out{opacity:0;transition:opacity 260ms cubic-bezier(.33,0,.2,1)}
#pi-intro *{box-sizing:border-box;margin:0;padding:0}
.pi-stage{position:relative;display:flex;flex-direction:column;align-items:center;gap:22px;padding:24px;text-align:center}
.pi-tilewrap{position:relative;display:grid;place-items:center}
.pi-tile{position:relative;width:108px;height:108px;border-radius:30px;display:grid;place-items:center}
.pi-face{width:100%;height:100%;border-radius:30px;overflow:hidden;display:grid;place-items:center;
 background:var(--pi-accent);color:var(--pi-on-accent);font-size:40px;font-weight:600;letter-spacing:-.02em}
.pi-face img{width:100%;height:100%;object-fit:cover;display:block}
.pi-stroke{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.pi-stroke rect{fill:none;stroke:var(--pi-accent);stroke-width:2.5;stroke-linejoin:round}
.pi-meta{display:flex;flex-direction:column;align-items:center;gap:7px}
.pi-name{font-size:26px;font-weight:600;letter-spacing:-.025em;color:var(--pi-text)}
.pi-sub{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--pi-dim)}
.pi-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.pi-cmeta{position:absolute;left:0;right:0;top:calc(50% + 74px);display:flex;flex-direction:column;
 align-items:center;gap:7px;padding:0 24px;text-align:center;
 animation:pi-rise calc(var(--pi-d)*.30) cubic-bezier(.22,1,.36,1) calc(var(--pi-d)*.66) both}
@keyframes pi-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes pi-draw{to{stroke-dashoffset:0}}

/* reveal */
.pi-reveal .pi-clip{position:absolute;inset:0;border-radius:30px;overflow:hidden}
.pi-reveal .pi-face{transform:scale(.84);opacity:0;
 animation:pi-pop calc(var(--pi-d)*.32) cubic-bezier(.2,1,.32,1) calc(var(--pi-d)*.20) both}
.pi-reveal .pi-stroke rect{stroke-dasharray:1;stroke-dashoffset:1;
 animation:pi-draw calc(var(--pi-d)*.36) cubic-bezier(.62,.03,.2,1) both}
.pi-reveal .pi-scan{position:absolute;top:-15%;left:0;width:44%;height:130%;
 background:linear-gradient(90deg,transparent,var(--pi-glow),transparent);transform:translateX(-150%);
 animation:pi-scan calc(var(--pi-d)*.44) cubic-bezier(.5,0,.18,1) calc(var(--pi-d)*.26) both}
.pi-reveal .pi-meta{animation:pi-rise calc(var(--pi-d)*.34) cubic-bezier(.22,1,.36,1) calc(var(--pi-d)*.46) both}
@keyframes pi-pop{to{transform:scale(1);opacity:1}}
@keyframes pi-scan{to{transform:translateX(320%)}}

/* fade */
.pi-fade .pi-halo{position:absolute;width:290px;height:290px;border-radius:90px;pointer-events:none;
 background:radial-gradient(closest-side,var(--pi-glow),transparent 72%);
 animation:pi-halo calc(var(--pi-d)*.7) cubic-bezier(.22,1,.36,1) both}
.pi-fade .pi-tile{animation:pi-soft calc(var(--pi-d)*.5) cubic-bezier(.22,1,.36,1) calc(var(--pi-d)*.06) both}
.pi-fade .pi-meta{animation:pi-rise calc(var(--pi-d)*.44) cubic-bezier(.22,1,.36,1) calc(var(--pi-d)*.22) both}
@keyframes pi-halo{0%{opacity:0;transform:scale(.72)}60%{opacity:1}100%{opacity:.6;transform:scale(1)}}
@keyframes pi-soft{from{opacity:0;transform:scale(1.07)}to{opacity:1;transform:scale(1)}}

/* curtain */
#pi-intro.pi-curtain{background:transparent}
.pi-veil{position:absolute;inset:0;background:var(--pi-bg);
 animation:pi-veilout calc(var(--pi-d)*.20) cubic-bezier(.4,0,.2,1) calc(var(--pi-d)*.60) both}
@keyframes pi-veilout{to{opacity:0}}
.pi-panel{position:absolute;inset:0;background:var(--pi-accent);display:grid;place-items:center;
 animation:pi-panel var(--pi-d) cubic-bezier(.68,0,.28,1) both}
@keyframes pi-panel{0%{transform:translateX(-101%)}36%{transform:translateX(0)}
 62%{transform:translateX(0)}100%{transform:translateX(101%)}}
.pi-curtain .pi-name{color:var(--pi-on-accent)}
.pi-curtain .pi-sub{color:var(--pi-on-accent-dim)}
.pi-curtain .pi-face{background:var(--pi-on-accent);color:var(--pi-accent)}
.pi-curtain .pi-stage{animation:pi-cmeta var(--pi-d) cubic-bezier(.3,0,.2,1) both}
@keyframes pi-cmeta{0%,16%{opacity:0;transform:translateY(12px)}
 34%,54%{opacity:1;transform:none}70%,100%{opacity:0;transform:translateY(-12px)}}

/* ring */
.pi-ringwrap{position:relative;width:168px;height:168px;display:grid;place-items:center}
.pi-ringwrap svg{position:absolute;inset:0;width:100%;height:100%}
.pi-ring .pi-track{fill:none;stroke:var(--pi-hair);stroke-width:3}
.pi-ring .pi-prog{fill:none;stroke:var(--pi-accent);stroke-width:3;stroke-linecap:round;
 stroke-dasharray:1;stroke-dashoffset:1;filter:drop-shadow(0 0 7px var(--pi-glow));
 animation:pi-draw calc(var(--pi-d)*.66) cubic-bezier(.42,.02,.2,1) calc(var(--pi-d)*.06) both}
.pi-ring .pi-tile{width:96px;height:96px;border-radius:26px;
 animation:pi-soft calc(var(--pi-d)*.34) cubic-bezier(.2,1,.32,1) calc(var(--pi-d)*.08) both}
.pi-ring .pi-face{border-radius:26px;font-size:36px}
.pi-ring .pi-meta{animation:pi-rise calc(var(--pi-d)*.30) cubic-bezier(.22,1,.36,1) calc(var(--pi-d)*.52) both}

/* zoom */
.pi-zoom .pi-tile{opacity:0;transform:scale(.5);filter:blur(8px);
 animation:pi-zoom calc(var(--pi-d)*.55) cubic-bezier(.16,1,.3,1) calc(var(--pi-d)*.06) both}
.pi-zoom .pi-meta{animation:pi-rise calc(var(--pi-d)*.4) cubic-bezier(.22,1,.36,1) calc(var(--pi-d)*.42) both}
@keyframes pi-zoom{to{opacity:1;transform:scale(1);filter:blur(0)}}

/* flip */
.pi-flip .pi-tilewrap{perspective:640px}
.pi-flip .pi-tile{opacity:0;transform:rotateY(-92deg);transform-origin:center;
 animation:pi-flip calc(var(--pi-d)*.6) cubic-bezier(.3,1.2,.5,1) calc(var(--pi-d)*.08) both}
.pi-flip .pi-meta{animation:pi-rise calc(var(--pi-d)*.4) cubic-bezier(.22,1,.36,1) calc(var(--pi-d)*.5) both}
@keyframes pi-flip{to{opacity:1;transform:rotateY(0)}}

/* slide */
.pi-slide .pi-tile{opacity:0;transform:translateY(26px);
 animation:pi-riseB calc(var(--pi-d)*.44) cubic-bezier(.16,1,.3,1) calc(var(--pi-d)*.05) both}
.pi-slide .pi-name{opacity:0;transform:translateY(20px);
 animation:pi-riseB calc(var(--pi-d)*.4) cubic-bezier(.16,1,.3,1) calc(var(--pi-d)*.34) both}
.pi-slide .pi-sub{opacity:0;transform:translateY(14px);
 animation:pi-riseB calc(var(--pi-d)*.4) cubic-bezier(.16,1,.3,1) calc(var(--pi-d)*.5) both}
@keyframes pi-riseB{to{opacity:1;transform:none}}

/* corners (finder patterns QR qui se tracent autour de la tuile) */
.pi-corners .pi-tile{opacity:0;transform:scale(.9);
 animation:pi-pop calc(var(--pi-d)*.3) cubic-bezier(.2,1,.32,1) calc(var(--pi-d)*.3) both}
.pi-corners .pi-cnr{position:absolute;inset:-15px;width:calc(100% + 30px);height:calc(100% + 30px);overflow:visible}
.pi-corners .pi-cnr path{fill:none;stroke:var(--pi-accent);stroke-width:6;stroke-linecap:round;stroke-linejoin:round;
 stroke-dasharray:1;stroke-dashoffset:1;filter:drop-shadow(0 0 6px var(--pi-glow));
 animation:pi-draw calc(var(--pi-d)*.38) cubic-bezier(.5,0,.2,1) both}
.pi-corners .pi-cnr path:nth-child(2){animation-delay:calc(var(--pi-d)*.09)}
.pi-corners .pi-cnr path:nth-child(3){animation-delay:calc(var(--pi-d)*.18)}
.pi-corners .pi-cnr path:nth-child(4){animation-delay:calc(var(--pi-d)*.27)}
.pi-corners .pi-meta{animation:pi-rise calc(var(--pi-d)*.4) cubic-bezier(.22,1,.36,1) calc(var(--pi-d)*.5) both}

@media (prefers-reduced-motion: reduce){
 #pi-intro *,#pi-intro *::before,#pi-intro *::after{
  animation-duration:1ms!important;animation-delay:0ms!important;transition-duration:1ms!important}
}`}

/* ── utils couleur / dessin ────────────────────────────────────────────── */

function hex2rgb(h: string): [number, number, number] {
  h = String(h || "").trim().replace("#", "")
  if (h.length === 3) h = h.split("").map(c => c + c).join("")
  if (!/^[0-9a-f]{6}$/i.test(h)) h = "000000"
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgba(h: string, a: number): string { const c = hex2rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})` }
/**
 * Noir ou blanc sur l'accent, celui des deux qui se lit vraiment.
 *
 * La version d'avant comparait la luminance à un seuil de 0,48. Sur l'or QRowg
 * #C9A84C (luminance 0,409) elle choisissait du BLANC : 2,4 pour 1, sous le
 * minimum lisible de 4,5 — du texte illisible sur la couleur de marque, à
 * l'ouverture de la page publique. Huit couleurs de la palette sur vingt-deux
 * étaient dans ce cas.
 */
const onColor = (h: string): string => encreLisible(h)
function esc(s: unknown): string {
  return String(s == null ? "" : s).replace(/[&<>"]/g, m => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as Record<string, string>)[m]))
}
function ease(x: number): number { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3) }
function rr(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return }
  r = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const SYSTEM_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
const CANVAS_FONT = SYSTEM_FONT

/* ── styles Canvas ─────────────────────────────────────────────────────── */

function drawPulse(ctx: any, w: number, h: number, t: number, cfg: IntroConfig, on: string, initial: string) {
  const N = 7, box = Math.min(w, h) * 0.44, cell = box / N, gap = cell * 0.26, m = cell - gap
  const cx = w / 2, cy = h / 2 - 14
  const ph = Math.min(1, t / 0.62)
  const out = t > 0.62 ? ease((t - 0.62) / 0.38) : 0
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const d = Math.hypot(i - (N - 1) / 2, j - (N - 1) / 2) / 4.25
    const wv = 0.5 + 0.5 * Math.sin((ph * 2.6 - d * 1.5) * Math.PI * 2)
    const a = (0.10 + 0.80 * wv) * (1 - out)
    if (a <= 0.004) continue
    const s = m * (0.5 + 0.5 * wv) * (1 - out * 0.7)
    let px = cx - box / 2 + i * cell + cell / 2
    let py = cy - box / 2 + j * cell + cell / 2
    px += (cx - px) * out; py += (cy - py) * out
    ctx.globalAlpha = a; ctx.fillStyle = cfg.accent
    rr(ctx, px - s / 2, py - s / 2, s, s, s * 0.3); ctx.fill()
  }
  if (out > 0) {
    const S = box * 0.46 * ease(Math.min(1, out * 1.25))
    ctx.globalAlpha = out; ctx.fillStyle = cfg.accent
    rr(ctx, cx - S / 2, cy - S / 2, S, S, S * 0.28); ctx.fill()
    if (out > 0.45 && S > 30) {
      ctx.globalAlpha = (out - 0.45) / 0.55; ctx.fillStyle = on
      ctx.font = `600 ${Math.round(S * 0.38)}px ${CANVAS_FONT}`
      ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillText(initial, cx, cy + S * 0.02)
    }
  }
  ctx.globalAlpha = 1
}

function drawStack(ctx: any, w: number, h: number, t: number, cfg: IntroConfig, on: string, initial: string) {
  const n = 6, S = Math.min(w, h) * 0.30, cx = w / 2, cy = h / 2 - 14
  const out = t > 0.64 ? ease((t - 0.64) / 0.36) : 0
  for (let i = 0; i < n; i++) {
    const k = ease((t - i * 0.075) / 0.30)
    if (k <= 0) continue
    const y0 = cy - h * 0.55, y1 = cy - (n - 1 - i) * 7
    let y = y0 + (y1 - y0) * k
    let rot = (-0.30 + i * 0.10) * (1 - k)
    let a = k
    const top = i === n - 1
    if (out > 0) {
      if (top) { y += (cy - y) * out }
      else { y -= out * h * 0.30 * ((n - i) / n); a *= 1 - out; rot += out * 0.22 * (i % 2 ? 1 : -1) }
    }
    if (a <= 0.004) continue
    const sc = (top && out > 0) ? 1 + 0.12 * out : 1
    ctx.save()
    ctx.globalAlpha = a; ctx.translate(cx, y); ctx.rotate(rot); ctx.scale(sc, sc)
    ctx.fillStyle = top ? cfg.accent : rgba(cfg.accent, 0.14 + 0.09 * i)
    rr(ctx, -S / 2, -S / 2, S, S, S * 0.27); ctx.fill()
    ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(cfg.text, 0.10); ctx.stroke()
    if (top && out > 0.35) {
      ctx.globalAlpha = a * (out - 0.35) / 0.65; ctx.fillStyle = on
      ctx.font = `600 ${Math.round(S * 0.36)}px ${CANVAS_FONT}`
      ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillText(initial, 0, 0)
    }
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

/* ── init ──────────────────────────────────────────────────────────────── */

/** @returns teardown() */
export function initIntro(config: Partial<IntroConfig>, mountEl?: HTMLElement): () => void {
  const noop = () => {}
  if (typeof document === "undefined") return noop            // SSR safe
  const cfg: IntroConfig = { ...DEFAULTS, ...(config || {}) }

  if (cfg.oncePerSession) {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return noop
      sessionStorage.setItem(SESSION_KEY, "1")
    } catch { /* mode privé : on joue quand même */ }
  }

  const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  // On découple la CONSTRUCTION (rapide) du HOLD (au moins ~1 s pour lire le nom /
  // logo) : `dur` pilote les animations (CSS via --pi-d + canvas), `visible` = temps
  // total à l'écran avant le fondu de sortie. duration = build + hold.
  const total = Math.max(1500, cfg.duration | 0)
  const dur = reduce ? 240 : Math.max(700, Math.min(1500, Math.round(total * 0.5)))  // build (snappy)
  const hold = reduce ? 220 : Math.max(1000, total - dur)                             // lecture stable ≥ 1 s
  const visible = dur + hold

  if (!document.getElementById(CSS_ID)) {
    const st = document.createElement("style")
    st.id = CSS_ID
    st.textContent = introCSS()
    document.head.appendChild(st)
  }

  const host: HTMLElement = mountEl || document.body
  const scoped = !!mountEl
  const on = onColor(cfg.accent)
  const initial = (String(cfg.title || "?").trim().charAt(0) || "?").toUpperCase()

  const root = document.createElement("div")
  root.id = "pi-intro"
  root.className = "pi-" + cfg.style + (scoped ? " pi-scoped" : "")
  root.setAttribute("role", "presentation")
  root.setAttribute("aria-hidden", "true")

  const vars: Record<string, string> = {
    "--pi-accent": cfg.accent,
    "--pi-bg": cfg.bg,
    "--pi-text": cfg.text,
    "--pi-on-accent": on,
    "--pi-on-accent-dim": rgba(on, .62),
    "--pi-dim": rgba(cfg.text, .55),
    "--pi-hair": rgba(cfg.text, .13),
    "--pi-glow": rgba(cfg.accent, .34),
    "--pi-d": dur + "ms",
    // --pi-font-family peut être défini globalement (ex. Inter self-hosté).
    "--pi-font": `var(--pi-font-family, ${SYSTEM_FONT})`,
  }
  for (const k in vars) root.style.setProperty(k, vars[k])

  const faceHTML = '<div class="pi-face" data-face></div>'
  const metaHTML =
    '<div class="pi-meta"><div class="pi-name">' + esc(cfg.title) + '</div>' +
    (cfg.subtitle ? '<div class="pi-sub">' + esc(cfg.subtitle) + '</div>' : '') + '</div>'

  let html: string
  if (cfg.style === "reveal") {
    html = '<div class="pi-stage"><div class="pi-tilewrap"><div class="pi-tile">' +
      '<div class="pi-clip">' + faceHTML + '<div class="pi-scan"></div></div>' +
      '<svg class="pi-stroke" viewBox="0 0 108 108"><rect pathLength="1" x="1.5" y="1.5" width="105" height="105" rx="29" ry="29"/></svg>' +
      '</div></div>' + metaHTML + '</div>'
  } else if (cfg.style === "fade" || cfg.style === "zoom" || cfg.style === "flip" || cfg.style === "slide") {
    html = '<div class="pi-stage"><div class="pi-tilewrap">' +
      (cfg.style === "fade" ? '<div class="pi-halo"></div>' : '') +
      '<div class="pi-tile">' + faceHTML + '</div></div>' + metaHTML + '</div>'
  } else if (cfg.style === "corners") {
    html = '<div class="pi-stage"><div class="pi-tilewrap"><div class="pi-tile">' + faceHTML + '</div>' +
      '<svg class="pi-cnr" viewBox="0 0 100 100">' +
      '<path pathLength="1" d="M8 30 V8 H30"/><path pathLength="1" d="M70 8 H92 V30"/>' +
      '<path pathLength="1" d="M92 70 V92 H70"/><path pathLength="1" d="M30 92 H8 V70"/>' +
      '</svg></div>' + metaHTML + '</div>'
  } else if (cfg.style === "curtain") {
    html = '<div class="pi-veil"></div><div class="pi-panel"><div class="pi-stage">' +
      '<div class="pi-tilewrap"><div class="pi-tile">' + faceHTML + '</div></div>' + metaHTML + '</div></div>'
  } else if (cfg.style === "ring") {
    html = '<div class="pi-stage"><div class="pi-ringwrap">' +
      '<svg viewBox="0 0 168 168">' +
      '<rect class="pi-track" pathLength="1" x="6" y="6" width="156" height="156" rx="46" ry="46"/>' +
      '<rect class="pi-prog" pathLength="1" x="6" y="6" width="156" height="156" rx="46" ry="46" transform="rotate(-90 84 84)"/>' +
      '</svg><div class="pi-tile">' + faceHTML + '</div></div>' + metaHTML + '</div>'
  } else { // pulse | stack (Canvas 2D)
    html = '<canvas class="pi-canvas"></canvas><div class="pi-cmeta">' +
      '<div class="pi-name">' + esc(cfg.title) + '</div>' +
      (cfg.subtitle ? '<div class="pi-sub">' + esc(cfg.subtitle) + '</div>' : '') + '</div>'
  }
  root.innerHTML = html

  const face = root.querySelector("[data-face]") as HTMLElement | null
  if (face) {
    if (cfg.avatar) {
      const img = document.createElement("img")
      img.alt = ""; img.decoding = "async"
      img.onerror = () => { img.remove(); face.textContent = initial }
      img.src = cfg.avatar
      face.appendChild(img)
    } else {
      face.textContent = initial
    }
  }

  host.appendChild(root)

  let prevOverflow = ""
  if (!scoped) {
    prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
  }

  let raf = 0, start = 0
  let ro: ResizeObserver | null = null
  const canvas = root.querySelector(".pi-canvas") as HTMLCanvasElement | null
  if (canvas) {
    const ctx = canvas.getContext("2d") as any
    const dpr = Math.min(2, window.devicePixelRatio || 1)   // DPR plafonné à 2
    let W = 1, H = 1
    const resize = () => {
      const r = root.getBoundingClientRect()
      W = Math.max(1, r.width); H = Math.max(1, r.height)
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    if (reduce) {
      (cfg.style === "stack" ? drawStack : drawPulse)(ctx, W, H, 1, cfg, on, initial)
    } else {
      if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(root) }
      const draw = (now: number) => {                        // rAF + delta time
        if (!start) start = now
        const t = Math.min(1, (now - start) / dur)
        ctx.clearRect(0, 0, W, H)
        ;(cfg.style === "stack" ? drawStack : drawPulse)(ctx, W, H, t, cfg, on, initial)
        if (t < 1) raf = requestAnimationFrame(draw)
      }
      raf = requestAnimationFrame(draw)
    }
  }

  let done = false, removeTimer = 0
  const finish = () => {
    if (done) return
    done = true
    if (raf) cancelAnimationFrame(raf)
    if (ro) ro.disconnect()
    root.classList.add("pi-out")
    removeTimer = window.setTimeout(() => {
      if (root.parentNode) root.parentNode.removeChild(root)
      if (!scoped) document.documentElement.style.overflow = prevOverflow
    }, 280)
  }

  const timer = window.setTimeout(finish, visible)
  if (cfg.skippable) {
    root.addEventListener("click", finish, { passive: true })
    root.addEventListener("touchstart", finish, { passive: true })
  }

  return function teardown() {
    done = true
    clearTimeout(timer); clearTimeout(removeTimer)
    if (raf) cancelAnimationFrame(raf)
    if (ro) ro.disconnect()
    if (root.parentNode) root.parentNode.removeChild(root)
    if (!scoped) document.documentElement.style.overflow = prevOverflow
  }
}

/** Rejouer en ignorant oncePerSession (preview builder). */
export function resetIntroSession() {
  try { sessionStorage.removeItem(SESSION_KEY) } catch { /* noop */ }
}

export default initIntro
