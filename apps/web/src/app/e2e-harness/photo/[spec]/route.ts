import { deflateSync } from "node:zlib"
import { harnessAutorise } from "../../gate"

// Photo de test, générée à la volée, aux dimensions demandées.
// GATÉE comme les autres routes de harness.
//
// Pourquoi cette route existe : aucun modèle de la galerie ne porte d'URL
// d'image, donc tout l'audit de la page publiée s'était fait sur des pages SANS
// photo — alors qu'une vraie page en est pleine, et qu'une photo change les
// hauteurs, les proportions et les états de chargement.
//
// Pourquoi un PNG écrit à la main plutôt qu'un SVG : l'optimiseur d'images de
// Next refuse le SVG, et c'est justement le chemin qu'on veut éprouver. Plutôt
// que d'ajouter `sharp` en dépendance pour une route de test, on encode le PNG
// directement — zlib est dans Node, et un PNG, c'est un en-tête, des lignes de
// pixels préfixées d'un octet de filtre, et trois blocs à somme de contrôle.
//
// Pourquoi les dimensions sont dans le CHEMIN et non en paramètres : mesuré,
// l'optimiseur de Next répond « "url" parameter is not allowed » dès que
// l'adresse source locale porte une chaîne de requête.

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function entier(v: string | null, defaut: number, max: number): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), max) : defaut
}

/** Table de CRC-32, celle du format PNG. */
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(b: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function bloc(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const corps = Buffer.concat([Buffer.from(type, "latin1"), data])
  const som = Buffer.alloc(4); som.writeUInt32BE(crc32(corps))
  return Buffer.concat([len, corps, som])
}

/** Teinte -> RVB, saturation et clarté fixes. Suffit pour des photos de test. */
function teinteVersRvb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

function png(w: number, h: number, i: number): Buffer {
  const teinte = (i * 47) % 360
  const [r1, g1, b1] = teinteVersRvb(teinte, 0.45, 0.32)
  const [r2, g2, b2] = teinteVersRvb((teinte + 40) % 360, 0.4, 0.16)
  // Générateur pseudo-aléatoire déterministe : la même image d'une exécution à
  // l'autre, donc des captures comparables au pixel près.
  let graine = (i * 2654435761) >>> 0
  const bruit = () => { graine = (graine * 1664525 + 1013904223) >>> 0; return (graine >>> 24) - 128 }

  const brut = Buffer.alloc(h * (w * 3 + 1))
  let p = 0
  const cx = w * 0.32, cy = h * 0.42, rayon = Math.min(w, h) * 0.22
  for (let y = 0; y < h; y++) {
    brut[p++] = 0
    const t = y / h
    for (let x = 0; x < w; x++) {
      const u = (x / w + t) / 2
      let r = r1 + (r2 - r1) * u, g = g1 + (g2 - g1) * u, b = b1 + (b2 - b1) * u
      const dx = x - cx, dy = y - cy
      if (dx * dx + dy * dy < rayon * rayon) { r = (r + 190) / 2; g = (g + 120) / 2; b = (b + 200) / 2 }
      const n = bruit() * 0.22
      brut[p++] = Math.max(0, Math.min(255, r + n))
      brut[p++] = Math.max(0, Math.min(255, g + n))
      brut[p++] = Math.max(0, Math.min(255, b + n))
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc("IHDR", ihdr),
    bloc("IDAT", deflateSync(brut, { level: 6 })),
    bloc("IEND", Buffer.alloc(0)),
  ])
}

/** `1600x1200-3.png` -> 1600 x 1200, teinte n° 3. */
export function lireSpec(spec: string): { w: number; h: number; i: number } {
  const m = /^(\d{1,4})x(\d{1,4})-(\d{1,2})\.png$/.exec(spec)
  if (!m) return { w: 1600, h: 1200, i: 1 }
  return { w: entier(m[1], 1600, 2400), h: entier(m[2], 1200, 2400), i: entier(m[3], 1, 99) }
}

export async function GET(_req: Request, ctx: { params: Promise<{ spec: string }> }) {
  if (!harnessAutorise()) return new Response("Not found", { status: 404 })
  const { spec } = await ctx.params
  const { w, h, i } = lireSpec(spec)
  const octets = png(w, h, i)
  return new Response(new Uint8Array(octets), {
    headers: { "content-type": "image/png", "content-length": String(octets.length), "cache-control": "public, max-age=3600" },
  })
}
