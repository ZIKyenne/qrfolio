import { ImageResponse } from "next/og"
import { readFileSync } from "node:fs"
import { createAdminClient } from "@/lib/supabase/server"
import { isPublicHttpUrl } from "@/lib/safeUrl"

// Image Open Graph generee dynamiquement par page (1200x630) — identite or/noir QRowg.
// Referencee par generateMetadata quand aucune og_image_url custom n'est definie.
// NB : le nom utilise Cormorant (serif) pour l'OG uniquement — Satori (next/og) ne peut
// pas instancier proprement le Fraunces variable (l'optical-sizing resterait au minimum),
// donc on garde ce woff statique bundlé. Le site visible, lui, est 100 % Fraunces.
export const runtime = "nodejs"

const SIZE = { width: 1200, height: 630 }

// Polices de marque bundlees dans le repo (DM Sans = corps, Cormorant = serif OG).
// Cache au niveau module : lues une seule fois par instance. Lecture synchrone via `fs`
// (fetch(file://) n'est pas supporte en runtime nodejs) ; `new URL(..., import.meta.url)`
// fait tracer/inclure les .ttf par le bundler Next. DM Sans est en 1er = police par defaut.
let fontsCache: { name: string; data: Buffer; style: "normal"; weight: 400 | 600 }[] | null = null
function loadFonts() {
  if (fontsCache === null) {
    const read = (f: string) => readFileSync(new URL(`./fonts/${f}`, import.meta.url))
    fontsCache = [
      { name: "DMSans", data: read("DMSans-400.woff"), style: "normal" as const, weight: 400 as const },
      { name: "DMSans", data: read("DMSans-600.woff"), style: "normal" as const, weight: 600 as const },
      { name: "Cormorant", data: read("Cormorant-600.woff"), style: "normal" as const, weight: 600 as const },
    ]
  }
  return fontsCache
}

function initial(name: string): string {
  const t = (name || "").trim()
  return t ? t[0].toUpperCase() : "Q"
}

// Rendu de secours (page introuvable ou erreur) : carte de marque generique.
async function fallback() {
  const fonts = loadFonts()
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#080808", color: "#C9A84C" }}>
        <div style={{ fontSize: 110, fontWeight: 600, letterSpacing: -2, fontFamily: "Cormorant" }}>QRowg</div>
        <div style={{ fontSize: 30, color: "#8A8478", marginTop: 8 }}>Une page. Un QR. Tout vous.</div>
      </div>
    ),
    { ...SIZE, fonts }
  )
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params
    const admin = createAdminClient()

    const { data: page } = await admin
      .from("pages")
      .select("id, title, seo_title, seo_description, theme, profiles(full_name, avatar_url)")
      .eq("slug", slug)
      .eq("status", "published")
      .single()

    if (!page) return fallback()

    // Bloc profil = source la plus riche (nom, accroche, avatar)
    const { data: profBlock } = await admin
      .from("blocks")
      .select("content")
      .eq("page_id", (page as any).id)
      .eq("type", "profile")
      .order("position")
      .limit(1)
      .maybeSingle()

    const prof = (page as any).profiles || {}
    const pc = (profBlock as any)?.content || {}
    const theme = (page as any).theme || {}

    const primary = theme.primary || "#C9A84C"
    const bg = theme.bg || "#080808"                 // couleur de fond RÉELLE (champ = bg, pas "background")
    const bgFill = theme.bgGradient || bg            // parité page publique : dégradé si défini, sinon couleur unie
    const text = theme.text || "#F5F0E8"
    const muted = theme.muted || "#8A8478"   // couleur secondaire du thème (lisible aussi sur fond clair)

    const name = (pc.name || (page as any).seo_title || (page as any).title || prof.full_name || "QRowg").toString().slice(0, 42)
    const tagline = (pc.tagline || (page as any).seo_description || "").toString().slice(0, 90)
    const avatarUrl = (pc.avatar || prof.avatar_url || "").toString()

    // Pre-chargement de l'avatar en data-URI : un <img src=http> serait charge par Satori
    // PENDANT le streaming (hors de ce try/catch) -> un avatar casse ferait planter en 500.
    // En data-URI, l'echec est gere ici et on retombe proprement sur l'initiale.
    // isPublicHttpUrl : garde anti-SSRF (avatarUrl peut etre une URL arbitraire
    // fournie via un bloc profil) -> on refuse localhost / IP privees / metadata.
    let avatarData: string | null = null
    if (isPublicHttpUrl(avatarUrl)) {
      try {
        const r = await fetch(avatarUrl, { signal: AbortSignal.timeout(2500) })
        const ct = r.headers.get("content-type") || ""
        if (r.ok && ct.startsWith("image/")) {
          const buf = Buffer.from(await r.arrayBuffer())
          if (buf.length > 0 && buf.length < 3_000_000) avatarData = `data:${ct};base64,${buf.toString("base64")}`
        }
      } catch { /* avatar indisponible -> initiale */ }
    }

    const fonts = loadFonts()

    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: bgFill, position: "relative", padding: "70px 80px", justifyContent: "space-between" }}>
          {/* Halo d'accent en haut a gauche */}
          <div style={{ position: "absolute", top: -160, left: -120, width: 460, height: 460, borderRadius: 460, background: `${primary}22`, display: "flex" }} />
          {/* Barre d'accent haute */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: `linear-gradient(90deg, ${primary}, ${primary}00)` }} />

          {/* Bloc central : avatar + nom + accroche */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {avatarData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarData} width={172} height={172} style={{ width: 172, height: 172, borderRadius: 172, objectFit: "cover", border: `4px solid ${primary}` }} alt="" />
              ) : (
                <div style={{ display: "flex", width: 172, height: 172, borderRadius: 172, alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${primary}, ${primary}99)`, color: bg, fontSize: 92, fontWeight: 600, fontFamily: "Cormorant" }}>{initial(name)}</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", marginLeft: 46, maxWidth: 780 }}>
                <div style={{ fontSize: 86, fontWeight: 600, color: text, lineHeight: 1.02, letterSpacing: -1, fontFamily: "Cormorant" }}>{name}</div>
                {tagline ? <div style={{ fontSize: 34, color: muted, marginTop: 18, lineHeight: 1.25 }}>{tagline}</div> : null}
              </div>
            </div>
          </div>

          {/* Pied : marque + URL */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", width: 48, height: 48, borderRadius: 13, background: primary, color: bg, alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 600, fontFamily: "Cormorant" }}>Q</div>
              <div style={{ fontSize: 40, fontWeight: 600, color: primary, marginLeft: 16, letterSpacing: -0.5, fontFamily: "Cormorant" }}>QRowg</div>
            </div>
            <div style={{ fontSize: 27, color: muted }}>{`qrowg.com/${slug}`}</div>
          </div>
        </div>
      ),
      {
        ...SIZE,
        fonts,
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    )
  } catch {
    return fallback()
  }
}
