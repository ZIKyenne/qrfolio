// logoCompose.ts — Composition du CONTENEUR de logo (forme + fond) avant injection
// dans qr-code-styling. Rend enfin réels les réglages logoShape/logoBg/logoBgColor
// (auparavant décoratifs — cf. docs/QR-STUDIO-PLAN.md §2.10). Client-only (canvas).
//
// Contrat : renvoie une data URL PNG du logo posé sur son conteneur ; si aucun
// conteneur n'est requis (forme carrée ET fond transparent), renvoie la source telle
// quelle (passe-plat, zéro coût). Le logo BRUT reste la source de vérité (sauvegarde) ;
// cette composition n'est utilisée qu'au RENDU.

export type LogoContainer = {
  shape?: "square" | "rounded" | "circle"
  bg?: "transparent" | "white" | "black" | "custom"
  bgColor?: string
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function shapePath(ctx: CanvasRenderingContext2D, S: number, shape: string): void {
  ctx.beginPath()
  if (shape === "circle") {
    ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2)
  } else if (shape === "rounded") {
    const r = S * 0.2
    ctx.moveTo(r, 0)
    ctx.arcTo(S, 0, S, S, r)
    ctx.arcTo(S, S, 0, S, r)
    ctx.arcTo(0, S, 0, 0, r)
    ctx.arcTo(0, 0, S, 0, r)
  } else {
    ctx.rect(0, 0, S, S)
  }
  ctx.closePath()
}

// Vrai si la configuration demande une composition (sinon passe-plat).
export function needsCompose(c: LogoContainer): boolean {
  return (c.shape ?? "square") !== "square" || (c.bg ?? "transparent") !== "transparent"
}

export async function composeLogo(src: string, c: LogoContainer): Promise<string> {
  if (!src || typeof document === "undefined") return src
  if (!needsCompose(c)) return src

  const shape = c.shape ?? "square"
  const bg = c.bg ?? "transparent"
  const fill =
    bg === "white" ? "#FFFFFF" :
    bg === "black" ? "#000000" :
    bg === "custom" ? (c.bgColor || "#FFFFFF") : null

  let img: HTMLImageElement
  try { img = await loadImage(src) } catch { return src }

  const S = 320
  const cv = document.createElement("canvas")
  cv.width = S; cv.height = S
  const ctx = cv.getContext("2d")
  if (!ctx) return src

  // Fond du conteneur (si demandé), à la forme voulue.
  if (fill) { shapePath(ctx, S, shape); ctx.fillStyle = fill; ctx.fill() }

  // Le logo respecte la forme (clip) ; léger retrait quand il y a un fond visible.
  shapePath(ctx, S, shape); ctx.save(); ctx.clip()
  const inset = fill ? S * 0.14 : 0
  const box = S - inset * 2
  const scale = Math.min(box / img.width, box / img.height) || 1
  const w = img.width * scale, h = img.height * scale
  ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h)
  ctx.restore()

  return cv.toDataURL("image/png")
}
