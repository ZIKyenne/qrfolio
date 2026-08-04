import { describe, it, expect } from "vitest"
import {
  bannerImageStyle, bannerOverlayLayers, availabilityStatus, profileBadgeStyle,
  bannerTitleStyle, bannerFrame, bannerHeight, bannerBackgroundStyle,
  normalizePhoneDigits, waLink, telLink, directionsLink, ctaButtonStyle, stickyActionHref, embedVideoUrl,
  SOCIAL_NETWORKS, SOCIAL_NETWORKS_MAP, productBadgeStyle,
  parsePrice, priceDiscount, countdownParts, stockStatus, paymentLink, paymentBrand, starRow,
  parseHourRanges, fmtMinutes, openStatus, dayField,
  vcardEscape, splitName, buildVCard, mapEmbedUrl, shareLinks, toCalStamp, calendarLinks, spotifyEmbedUrl, youtubeId, socialHref, extHref,
  docTypeMeta, docActionLabel, announcementMeta, blockDecoration,
  hexToRgb, rgbToHsl, contrastRatio, wcagLevel, isClipShape, optionLabel, avatarBgStyle,
  avatarShapeStyle, themeBackgroundStyle, avatarDecoStyle,
} from "./types"

describe("avatarDecoStyle (contour/ombre : clip-path vs box-shadow)", () => {
  it("forme en découpe : lueur/ombre via filter drop-shadow, jamais boxShadow ni border", () => {
    const r = avatarDecoStyle("hexagone", "or", "douce", "#C9A84C")
    expect(String(r.filter)).toContain("drop-shadow")
    expect(r.boxShadow).toBeUndefined()
    expect(r.border).toBeUndefined()
  })
  it("forme standard : lueur/ombre via boxShadow + bordure visible", () => {
    const r = avatarDecoStyle("cercle", "or", "douce", "#C9A84C")
    expect(r.boxShadow).toBeTruthy()
    expect(r.filter).toBeUndefined()
    expect(String(r.border)).toContain("solid")
  })
  it("bordure 'aucun' : border none et aucune lueur", () => {
    const r = avatarDecoStyle("cercle", "aucun", undefined, "#C9A84C")
    expect(r.border).toBe("none")
    expect(r.boxShadow).toBeUndefined()
  })
})

describe("avatarShapeStyle (partagé éditeur ↔ public)", () => {
  it("formes standard -> borderRadius", () => {
    expect(avatarShapeStyle("carré")).toEqual({ borderRadius: "8%" })
    expect(avatarShapeStyle("arrondi")).toEqual({ borderRadius: "22%" })
    expect(avatarShapeStyle("squircle")).toEqual({ borderRadius: "32%" })
    expect(avatarShapeStyle(undefined)).toEqual({ borderRadius: "50%" })
  })
  it("formes en découpe -> clipPath + borderRadius 0", () => {
    expect(String(avatarShapeStyle("hexagone").clipPath)).toContain("polygon")
    expect(avatarShapeStyle("hexagone").borderRadius).toBe("0")
    expect(String(avatarShapeStyle("diamant").clipPath)).toContain("polygon")
    expect(avatarShapeStyle("diamant").borderRadius).toBe("0")
  })
  it("invariant : isClipShape(s) ⟺ avatarShapeStyle(s) a un clipPath", () => {
    for (const s of ["cercle", "carré", "arrondi", "squircle", "hexagone", "diamant"]) {
      expect(isClipShape(s)).toBe("clipPath" in avatarShapeStyle(s))
    }
  })
})

describe("themeBackgroundStyle (source unique éditeur ↔ public)", () => {
  it("défaut = fond uni (bgGradient sinon bg)", () => {
    expect(themeBackgroundStyle({ bg: "#080808" } as any)).toEqual({ background: "#080808" })
    expect(themeBackgroundStyle({ bg: "#080808", bgGradient: "linear-gradient(x)" } as any)).toEqual({ background: "linear-gradient(x)" })
  })
  it("image : url + cover", () => {
    const r = themeBackgroundStyle({ bg: "#080808", bgMode: "image", bgImage: "photo.jpg" } as any)
    expect(r.backgroundImage).toBe("url(photo.jpg)")
    expect(r.backgroundSize).toBe("cover")
  })
  it("pattern grid : backgroundImage + size, fond = bg", () => {
    const r = themeBackgroundStyle({ bg: "#080808", bgMode: "pattern", bgPattern: "grid", pattern_size: 24 } as any)
    expect(r.background).toBe("#080808")
    expect(String(r.backgroundImage)).toContain("linear-gradient")
    expect(r.backgroundSize).toBe("24px 24px")
  })
  it("radial / mesh : dégradés", () => {
    expect(String(themeBackgroundStyle({ bg: "#080808", primary: "#C9A84C", bgMode: "radial" } as any).background)).toContain("radial-gradient")
    expect(String(themeBackgroundStyle({ bg: "#080808", bgMode: "mesh" } as any).background)).toContain("radial-gradient")
  })
})

describe("avatarBgStyle (partagé éditeur ↔ page publique)", () => {
  it("uni : fond plein de la 1re couleur", () => {
    expect(avatarBgStyle("uni", "#111111", "#222222")).toEqual({ background: "#111111" })
  })
  it("halo : radial c2 -> c1", () => {
    expect(avatarBgStyle("halo", "#111111", "#222222")).toEqual({ background: "radial-gradient(circle at 50% 32%, #222222, #111111)" })
  })
  it("mesh : contient les deux couleurs", () => {
    const r = avatarBgStyle("mesh", "#111111", "#222222").background
    expect(r).toContain("#111111")
    expect(r).toContain("#222222")
    expect(r).toContain("radial-gradient")
  })
  it("défaut (dégradé) pour une valeur inconnue ou absente", () => {
    expect(avatarBgStyle(undefined, "#111111", "#222222")).toEqual({ background: "linear-gradient(135deg, #111111, #222222)" })
    expect(avatarBgStyle("autre", "#111111", "#222222")).toEqual({ background: "linear-gradient(135deg, #111111, #222222)" })
  })
})

describe("hexToRgb", () => {
  it("convertit les hex 6 chiffres (avec ou sans #)", () => {
    expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb("000000")).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb("#C9A84C")).toEqual({ r: 201, g: 168, b: 76 })
    expect(hexToRgb("#FF8800")).toEqual({ r: 255, g: 136, b: 0 })
  })
  it("renvoie null pour un hex trop court / invalide (le raccourci 3 chiffres n'est pas géré)", () => {
    expect(hexToRgb("#FFF")).toBeNull()
    expect(hexToRgb("xy")).toBeNull()
    expect(hexToRgb("")).toBeNull()
  })
})

describe("rgbToHsl", () => {
  it("noir / blanc -> saturation 0", () => {
    expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 })
    expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 })
  })
  it("primaires -> teintes 0 / 120 / 240 à saturation pleine", () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 })
    expect(rgbToHsl(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 })
    expect(rgbToHsl(0, 0, 255)).toEqual({ h: 240, s: 100, l: 50 })
  })
})

describe("contrastRatio + wcagLevel", () => {
  it("noir vs blanc = 21 (contraste maximal)", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5)
  })
  it("deux couleurs identiques = 1", () => {
    expect(contrastRatio("#C9A84C", "#C9A84C")).toBeCloseTo(1, 5)
  })
  it("est symétrique", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(contrastRatio("#FFFFFF", "#000000"), 5)
  })
  it("wcagLevel respecte les seuils 7 (AAA) et 4.5 (AA)", () => {
    expect(wcagLevel(21)).toBe("AAA")
    expect(wcagLevel(7)).toBe("AAA")
    expect(wcagLevel(6.9)).toBe("AA")
    expect(wcagLevel(4.5)).toBe("AA")
    expect(wcagLevel(4.49)).toBe("fail")
    expect(wcagLevel(1)).toBe("fail")
  })
  it("noir/blanc atteint le niveau AAA", () => {
    expect(wcagLevel(contrastRatio("#000000", "#FFFFFF"))).toBe("AAA")
  })
})

describe("isClipShape", () => {
  it("hexagone et diamant sont des formes en découpe (clip-path)", () => {
    expect(isClipShape("hexagone")).toBe(true)
    expect(isClipShape("diamant")).toBe(true)
  })
  it("cercle / carré / undefined ne le sont pas", () => {
    expect(isClipShape("cercle")).toBe(false)
    expect(isClipShape("carre")).toBe(false)
    expect(isClipShape(undefined)).toBe(false)
  })
})

describe("optionLabel", () => {
  it("renvoie la valeur inchangée si elle n'est pas mappée", () => {
    expect(optionLabel("valeur-inconnue-xyz")).toBe("valeur-inconnue-xyz")
    expect(optionLabel("")).toBe("")
  })
})

describe("blockDecoration", () => {
  const theme = { primary: "#C9A84C", accent: "#39FF8F" }
  it("inerte par défaut (aucune clé __ posée)", () => {
    const r = blockDecoration({ title: "x" }, theme)
    expect(r.style).toEqual({})
    expect(r.animClass).toBe("")
  })
  it("style global des blocs : les défauts du thème remplissent les clés absentes", () => {
    const t = { ...theme, blockStyle: { __radius: "L", __shadow: "Douce", __anim: "Fondu" } }
    const r = blockDecoration({ title: "x" }, t)   // bloc sans style propre -> hérite du global
    expect(r.style.borderRadius).toBe(22)          // L
    expect(r.style.boxShadow).toContain("rgba")     // Douce
    expect(r.animClass).toBe("qf-reveal")           // Fondu
  })
  it("style global : le style propre au bloc écrase le défaut global", () => {
    const t = { ...theme, blockStyle: { __radius: "L" } }
    expect(blockDecoration({ __radius: "S" }, t).style.borderRadius).toBe(10)   // le bloc gagne
    expect(blockDecoration({ __radius: "Défaut" }, t).style.borderRadius).toBeUndefined() // opt-out explicite
  })
  it("style global : n'injecte QUE les clés réservées __ (ignore les clés parasites)", () => {
    const t = { ...theme, blockStyle: { __radius: "M", title: "PIRATE" } as any }
    const r = blockDecoration({ text: "x" }, t)
    expect(r.style.borderRadius).toBe(16)
    // la clé parasite ne casse rien : seule __radius est prise en compte
    expect(r.style.background).toBeUndefined()
  })
  it("fond dégradé -> surface insérée + coins par défaut", () => {
    const r = blockDecoration({ __grad: "Océan" }, theme)
    expect(r.style.background).toContain("linear-gradient")
    expect(r.style.marginLeft).toBe(14)
    expect(r.style.borderRadius).toBe(16)
    expect(r.style.overflow).toBe("hidden")
  })
  it("fond couleur unie", () => {
    expect(blockDecoration({ __bg: "#123456" }, theme).style.background).toBe("#123456")
  })
  it("bordure Oui utilise la couleur primaire du thème", () => {
    expect(blockDecoration({ __border: "Oui" }, theme).style.border).toBe("1px solid #C9A84C33")
  })
  it("coins explicites priment sur le défaut", () => {
    expect(blockDecoration({ __grad: "Océan", __radius: "XL" }, theme).style.borderRadius).toBe(30)
  })
  it("ombre + glow se combinent", () => {
    const r = blockDecoration({ __shadow: "Douce", __glow: "Oui" }, theme)
    expect(r.style.boxShadow).toContain("rgba(0,0,0,0.28)")
    expect(r.style.boxShadow).toContain("#C9A84C44")
  })
  it("largeur étroite -> maxWidth + centrage", () => {
    const r = blockDecoration({ __width: "Étroite" }, theme)
    expect(r.style.maxWidth).toBe(360)
    expect(r.style.marginLeft).toBe("auto")
  })
  it("espacement + animation (révélation au scroll, rétrocompat anciennes valeurs)", () => {
    const r = blockDecoration({ __space: "Aéré", __anim: "Zoom" }, theme)
    expect(r.style.marginTop).toBe(22)
    expect(r.animClass).toBe("qf-reveal qf-a-zoom") // ancien "Zoom" -> nouvelle variante
  })
  it("animations étendues + effet au survol", () => {
    expect(blockDecoration({ __anim: "Glissé ←" }, theme).animClass).toBe("qf-reveal qf-a-left")
    expect(blockDecoration({ __anim: "Flou" }, theme).animClass).toBe("qf-reveal qf-a-blur")
    expect(blockDecoration({ __hover: "Élévation" }, theme).animClass).toBe("qf-hv-lift")
    expect(blockDecoration({ __anim: "Fondu", __hover: "Lueur" }, theme).animClass).toBe("qf-reveal qf-hv-glow")
    expect(blockDecoration({ __anim: "Aucune", __hover: "Aucun" }, theme).animClass).toBe("")
  })
  it("vitesse d'apparition (seulement si une anim est posée) + boucle", () => {
    expect(blockDecoration({ __anim: "Fondu", __anim_speed: "Lent" }, theme).animClass).toBe("qf-reveal qf-sp-slow")
    expect(blockDecoration({ __anim_speed: "Rapide" }, theme).animClass).toBe("") // pas d'anim -> vitesse ignorée
    expect(blockDecoration({ __loop: "Flottement" }, theme).animClass).toBe("qf-loop-float")
    expect(blockDecoration({ __anim: "Zoom avant", __anim_speed: "Rapide", __loop: "Pulsation" }, theme).animClass).toBe("qf-reveal qf-a-zoom qf-sp-fast qf-loop-pulse")
  })
  it("intensité : dégradé plein par défaut, adouci si Moyen/Léger", () => {
    expect(blockDecoration({ __grad: "Violet" }, theme).style.background).toBe("linear-gradient(135deg,#4c1d95,#2e1065)")
    const soft = blockDecoration({ __grad: "Violet", __intensity: "Léger" }, { ...theme, bg: "#080808" }).style.background
    expect(soft).toContain("rgba(8,8,8,0.62)")
    expect(soft).toContain("#4c1d95")
  })
  it("intensité sur couleur unie : ajoute de la transparence (alpha)", () => {
    expect(blockDecoration({ __bg: "#123456", __intensity: "Moyen" }, theme).style.background).toBe("#123456d9")
    expect(blockDecoration({ __bg: "#123456" }, theme).style.background).toBe("#123456")
  })
  it("intensité : hex court #abc étendu avant l'alpha (plus de no-op silencieux)", () => {
    expect(blockDecoration({ __bg: "#0d0", __intensity: "Léger" }, theme).style.background).toBe("#00dd009e")
    expect(blockDecoration({ __bg: "#0d0" }, theme).style.background).toBe("#0d0")
  })
  it("verre (glass) : flou + fond translucide + bordure par défaut", () => {
    const r = blockDecoration({ __glass: "Oui" }, theme)
    expect(r.style.backdropFilter).toBe("blur(12px)")
    expect(r.style.background).toBe("rgba(255,255,255,0.06)")
    expect(r.style.border).toContain("rgba(255,255,255,0.12)")
    expect(r.style.marginLeft).toBe(14)
  })
})

describe("docTypeMeta", () => {
  it("mappe les types connus (insensible à la casse et aux espaces)", () => {
    expect(docTypeMeta("Menu").icon).toBe("🍽️")
    expect(docTypeMeta("  brochure ").icon).toBe("📘")
    expect(docTypeMeta("Catalogue").icon).toBe("📚")
    expect(docTypeMeta("Contrat / CGV").icon).toBe("📝")
    expect(docTypeMeta("cgv").icon).toBe("📝")
  })
  it("retombe sur PDF pour un type inconnu ou vide", () => {
    expect(docTypeMeta("").icon).toBe("📄")
    expect(docTypeMeta(undefined).icon).toBe("📄")
    expect(docTypeMeta("n_importe_quoi").icon).toBe("📄")
  })
  it("retourne une couleur hex", () => {
    expect(docTypeMeta("Menu").color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})

describe("announcementMeta", () => {
  it("icône + couleur selon le type (accepte FR et EN)", () => {
    expect(announcementMeta("Information").icon).toBe("ℹ️")
    expect(announcementMeta("info").color).toBe("#38BDF8")
    expect(announcementMeta("Succès").icon).toBe("✅")
    expect(announcementMeta("success").label).toBe("Succès")
    expect(announcementMeta("Urgent").icon).toBe("🚨")
    expect(announcementMeta("urgence").color).toBe("#EF4444")
    expect(announcementMeta("Promo").icon).toBe("🎉")
  })
  it("repli sur Attention pour type inconnu / vide", () => {
    expect(announcementMeta("").icon).toBe("⚠️")
    expect(announcementMeta(undefined).label).toBe("Attention")
    expect(announcementMeta("bidon").color).toBe("#FBBF24")
  })
})

describe("docActionLabel", () => {
  it("Consulter pour menu / catalogue / autre", () => {
    expect(docActionLabel("Menu")).toBe("Consulter")
    expect(docActionLabel("Catalogue")).toBe("Consulter")
    expect(docActionLabel("Autre")).toBe("Consulter")
  })
  it("Télécharger par défaut (PDF, brochure, inconnu, vide)", () => {
    expect(docActionLabel("PDF")).toBe("Télécharger")
    expect(docActionLabel("Brochure")).toBe("Télécharger")
    expect(docActionLabel("")).toBe("Télécharger")
    expect(docActionLabel(undefined)).toBe("Télécharger")
  })
})

describe("bannerImageStyle", () => {
  it("défaut : cover / center / pas de zoom", () => {
    const s = bannerImageStyle({})
    expect(s.objectFit).toBe("cover")
    expect(s.objectPosition).toBe("center")
    expect(s.transform).toBeUndefined()
  })
  it("position précise + zoom", () => {
    const s = bannerImageStyle({ img_pos_x: "20", img_pos_y: "80", img_zoom: "2" })
    expect(s.objectPosition).toBe("20% 80%")
    expect(s.transform).toBe("scale(2)")
  })
  it("focus bas -> center bottom", () => {
    expect(bannerImageStyle({ img_focus: "bottom" }).objectPosition).toBe("center bottom")
  })
  it("filtres composés", () => {
    const f = bannerImageStyle({ img_brightness: "120", img_grayscale: "100", img_saturate: "0" }).filter as string
    expect(f).toContain("brightness(120%)")
    expect(f).toContain("grayscale(100%)")
    expect(f).toContain("saturate(0%)")
  })
  it("valeurs neutres -> pas de filter", () => {
    expect(bannerImageStyle({ img_brightness: "100" }).filter).toBeUndefined()
  })
})

describe("bannerOverlayLayers", () => {
  it("aucun overlay par défaut", () => {
    expect(bannerOverlayLayers({}, "#C9A84C")).toHaveLength(0)
  })
  it("verre -> backdropFilter", () => {
    const l = bannerOverlayLayers({ fx_overlay: "glass" }, "#C9A84C")
    expect(l).toHaveLength(1)
    expect(typeof l[0].style.backdropFilter).toBe("string")
  })
  it("aurora -> classe animée", () => {
    expect(bannerOverlayLayers({ fx_overlay: "aurora" }, "#C9A84C")[0].className).toBe("qfb-aurora-layer")
  })
  it("voile bas -> dégradé", () => {
    expect(String(bannerOverlayLayers({ overlay_gradient: "bottom" }, "#C9A84C")[0].style.background)).toContain("linear-gradient")
  })
  it("teinte + mode de fusion + opacité", () => {
    const l = bannerOverlayLayers({ overlay_color: "#ff0000", overlay_opacity: "0.5", blend_mode: "screen" }, "#C9A84C")
    expect(l[0].style.mixBlendMode).toBe("screen")
    expect(l[0].style.opacity).toBe(0.5)
  })
  it("teinte opacité 0 -> ignorée", () => {
    expect(bannerOverlayLayers({ overlay_color: "#ff0000", overlay_opacity: "0" }, "#C9A84C")).toHaveLength(0)
  })
})

describe("availabilityStatus", () => {
  it("statut connu : label + couleur + fond alpha", () => {
    const a = availabilityStatus("tour")
    expect(a.label).toBe("En tournée")
    expect(a.color).toBe("#9146FF")
    expect(a.bg).toBe("#9146FF14")
  })
  it("couleur de pastille personnalisée valide", () => {
    expect(availabilityStatus("available", "#123456").color).toBe("#123456")
  })
  it("statut inconnu -> fallback Disponible", () => {
    expect(availabilityStatus("inconnu_xyz").label).toBe("Disponible")
  })
  it("couleur invalide -> couleur du statut", () => {
    expect(availabilityStatus("available", "pasunehex").color).toBe("#39FF8F")
  })
})

describe("profileBadgeStyle", () => {
  it("Vérifié -> bleu + ✓", () => {
    const b = profileBadgeStyle("Vérifié", "#C9A84C")
    expect(b.color).toBe("#38BDF8")
    expect(b.icon).toBe("✓")
  })
  it("Premium -> or + 👑", () => {
    expect(profileBadgeStyle("Premium", "#C9A84C").icon).toBe("👑")
  })
  it("inconnu -> accent, pas d'icône", () => {
    const b = profileBadgeStyle("MonTrucPerso", "#C9A84C")
    expect(b.color).toBe("#C9A84C")
    expect(b.icon).toBe("")
  })
  it("libellé commençant par emoji -> pas de double icône", () => {
    expect(profileBadgeStyle("🔥 Populaire", "#C9A84C").icon).toBe("")
  })
})

describe("bannerTitleStyle", () => {
  it("défaut public 24/700", () => {
    const t = bannerTitleStyle({}, "public", "#fff", "Serif")
    expect(t.fontSize).toBe(24)
    expect(t.fontWeight).toBe(700)
    expect(t.fontFamily).toBe("Serif")
  })
  it("taille/graisse/glow/majuscules", () => {
    const t = bannerTitleStyle({ title_size: "32", title_weight: "800", title_effect: "glow", title_transform: "uppercase" }, "public", "#39FF8F", "Serif")
    expect(t.fontSize).toBe(32)
    expect(t.fontWeight).toBe(800)
    expect(String(t.textShadow)).toContain("#39FF8F")
    expect(t.textTransform).toBe("uppercase")
  })
  it("police mono", () => {
    expect(String(bannerTitleStyle({ title_font: "mono" }, "editor", "#fff", "Serif").fontFamily)).toContain("monospace")
  })
})

describe("bannerFrame", () => {
  it("ombre glow -> boxShadow accent", () => {
    const f = bannerFrame({ block_shadow: "glow" }, "#C9A84C", 12)
    expect(String(f.boxShadow)).toContain("#C9A84C")
  })
  it("bordure dégradée -> calque + rayon", () => {
    const f = bannerFrame({ block_border: "gradient", border_color: "#ff0000" }, "#C9A84C", 16)
    expect(f.borderLayer).toBeTruthy()
    expect(String(f.borderLayer!.style.background)).toContain("#ff0000")
    expect(f.borderLayer!.style.borderRadius).toBe(16)
  })
  it("aucun effet -> pas d'ombre", () => {
    expect(bannerFrame({}, "#C9A84C", 0).boxShadow).toBeUndefined()
  })
})

describe("bannerHeight", () => {
  it("xl public = 340", () => expect(bannerHeight({ height: "xl" }, "public")).toBe(340))
  it("hauteur px prioritaire", () => expect(bannerHeight({ height_px: "200" }, "public")).toBe(200))
  it("md éditeur = 100", () => expect(bannerHeight({}, "editor")).toBe(100))
})

describe("normalizePhoneDigits", () => {
  it("nettoie les espaces/ponctuation", () => {
    expect(normalizePhoneDigits("06 12 34 56 78")).toBe("0612345678")
  })
  it("indicatif ajouté + 0 national retiré", () => {
    expect(normalizePhoneDigits("06 12 34 56 78", "33")).toBe("33612345678")
  })
  it("numéro déjà international (+) respecté", () => {
    expect(normalizePhoneDigits("+33 6 12 34 56 78", "33")).toBe("33612345678")
  })
  it("n'ajoute pas deux fois l'indicatif", () => {
    expect(normalizePhoneDigits("33612345678", "33")).toBe("33612345678")
  })
  it("vide -> vide", () => {
    expect(normalizePhoneDigits("", "33")).toBe("")
  })
})

describe("waLink / telLink", () => {
  it("waLink construit wa.me + message encodé", () => {
    const l = waLink("0612345678", "Bonjour !", "33")
    expect(l).toBe("https://wa.me/33612345678?text=Bonjour%20!")
  })
  it("waLink sans numéro -> vide", () => {
    expect(waLink("", "x")).toBe("")
  })
  it("telLink garde le + international", () => {
    expect(telLink("+33 6 12 34 56 78")).toBe("tel:+33612345678")
  })
  it("telLink national", () => {
    expect(telLink("06 12 34 56 78")).toBe("tel:0612345678")
  })
  it("telLink vide -> vide", () => {
    expect(telLink("")).toBe("")
  })
})

describe("embedVideoUrl", () => {
  it("YouTube watch -> embed", () => {
    expect(embedVideoUrl("https://youtube.com/watch?v=abc123&t=10")).toBe("https://www.youtube-nocookie.com/embed/abc123")
  })
  it("youtu.be court -> embed", () => {
    expect(embedVideoUrl("https://youtu.be/xyz789")).toBe("https://www.youtube-nocookie.com/embed/xyz789")
  })
  it("YouTube Shorts -> embed", () => {
    expect(embedVideoUrl("https://www.youtube.com/shorts/short01")).toBe("https://www.youtube-nocookie.com/embed/short01")
  })
  it("Vimeo -> player", () => {
    expect(embedVideoUrl("https://vimeo.com/123456789")).toBe("https://player.vimeo.com/video/123456789")
  })
  it("URL nocookie deja collee -> reconnue (idempotent)", () => {
    expect(embedVideoUrl("https://www.youtube-nocookie.com/embed/abc123")).toBe("https://www.youtube-nocookie.com/embed/abc123")
  })
  it("lien inconnu -> vide (aucun repli brut, sécurité B09.11)", () => {
    expect(embedVideoUrl("https://exemple.com/video")).toBe("")
  })
  it("vide -> vide", () => {
    expect(embedVideoUrl("")).toBe("")
  })
})

describe("directionsLink", () => {
  it("google/auto par défaut", () => {
    expect(directionsLink("12 rue de la Paix, Paris")).toBe("https://www.google.com/maps/dir/?api=1&destination=12%20rue%20de%20la%20Paix%2C%20Paris")
  })
  it("apple plans", () => {
    expect(directionsLink("Paris", "apple")).toBe("https://maps.apple.com/?daddr=Paris")
  })
  it("waze", () => {
    expect(directionsLink("Paris", "waze")).toBe("https://waze.com/ul?q=Paris&navigate=yes")
  })
  it("adresse vide -> vide", () => {
    expect(directionsLink("")).toBe("")
  })
})

describe("ctaButtonStyle", () => {
  const opt = { G: "#C9A84C", accent: "#39FF8F", text: "#F5F0E8" }
  it("gold : ombre dorée, pas de classe", () => {
    const r = ctaButtonStyle("gold", opt)
    expect(String(r.style.boxShadow)).toContain("#C9A84C")
    expect(r.className).toBeUndefined()
  })
  it("gradient : classe animée", () => {
    expect(ctaButtonStyle("gradient", opt).className).toBe("qcta-flow")
  })
  it("glass : backdropFilter", () => {
    expect(String(ctaButtonStyle("glass", opt).style.backdropFilter)).toContain("blur")
  })
  it("luxe : bordure or", () => {
    expect(String(ctaButtonStyle("luxe", opt).style.border)).toContain("#C9A84C")
  })
  it("style inconnu -> gold", () => {
    expect(ctaButtonStyle("inconnu", opt).style.color).toBe("#080808")
  })
})

describe("stickyActionHref", () => {
  it("call -> tel", () => {
    const a = stickyActionHref("call", "0612345678")
    expect(a.href).toBe("tel:0612345678")
    expect(a.icon).toBe("📞")
  })
  it("directions -> google maps", () => {
    expect(stickyActionHref("directions", "Paris").href).toContain("google.com/maps/dir")
  })
  it("email -> mailto", () => {
    expect(stickyActionHref("email", "a@b.com").href).toBe("mailto:a@b.com")
  })
  it("share -> flag share, pas de href", () => {
    const a = stickyActionHref("share")
    expect(a.share).toBe(true)
    expect(a.href).toBeUndefined()
  })
  it("none -> icône vide", () => {
    expect(stickyActionHref("none").icon).toBe("")
  })
})

describe("SOCIAL_NETWORKS_MAP (parité éditeur <-> public)", () => {
  it("contient une entrée pour chaque réseau de l'éditeur", () => {
    for (const n of SOCIAL_NETWORKS) {
      expect(SOCIAL_NETWORKS_MAP[n.key]).toBeTruthy()
      expect(SOCIAL_NETWORKS_MAP[n.key].label).toBe(n.label)
      expect(SOCIAL_NETWORKS_MAP[n.key].color).toBe(n.color)
    }
  })
  it("couvre 30+ réseaux (bibliothèque riche)", () => {
    expect(Object.keys(SOCIAL_NETWORKS_MAP).length).toBeGreaterThan(30)
  })
  it("inclut les réseaux clés", () => {
    for (const k of ["instagram", "tiktok", "youtube", "spotify", "deezer", "twitch", "threads", "linkedin", "discord", "behance"]) {
      expect(SOCIAL_NETWORKS_MAP[k]).toBeTruthy()
    }
  })
})

describe("productBadgeStyle", () => {
  it("Promo -> rouge + icône", () => {
    const b = productBadgeStyle("Promo -30%", "#C9A84C")
    expect(b.color).toBe("#EF4444")
    expect(b.icon).toBe("🏷️")
    expect(b.fg).toBe("#fff")
  })
  it("Nouveau -> vert", () => {
    expect(productBadgeStyle("Nouveau", "#C9A84C").color).toBe("#39FF8F")
  })
  it("Épuisé -> gris + texte clair", () => {
    const b = productBadgeStyle("Épuisé", "#C9A84C")
    expect(b.color).toBe("#A8A190")
    expect(b.fg).toBe("#fff")
  })
  it("inconnu -> accent, pas d'icône", () => {
    const b = productBadgeStyle("MonBadge", "#C9A84C")
    expect(b.color).toBe("#C9A84C")
    expect(b.icon).toBe("")
  })
  it("libellé avec emoji -> pas de double icône", () => {
    expect(productBadgeStyle("⭐ Signature", "#C9A84C").icon).toBe("")
  })
})

describe("bannerBackgroundStyle", () => {
  it("dégradé nommé", () => {
    expect(String(bannerBackgroundStyle({ banner_type: "gradient", grad_preset: "or_nuit" }, "#C9A84C").background)).toContain("linear-gradient")
  })
  it("couleur unie", () => {
    expect(bannerBackgroundStyle({ banner_type: "color", bg_color: "#111" }, "#C9A84C").background).toBe("#111")
  })
  it("image -> style vide (géré par <img>)", () => {
    expect(Object.keys(bannerBackgroundStyle({ banner_type: "image", src: "x" }, "#C9A84C"))).toHaveLength(0)
  })
})

describe("parsePrice", () => {
  it("vide / gratuit / sur devis -> null", () => {
    expect(parsePrice("")).toBeNull()
    expect(parsePrice(undefined)).toBeNull()
    expect(parsePrice("Gratuit")).toBeNull()
    expect(parsePrice("Sur devis")).toBeNull()
  })
  it("entiers avec devise variée", () => {
    expect(parsePrice("29€")).toBe(29)
    expect(parsePrice("$29")).toBe(29)
    expect(parsePrice("29 USD")).toBe(29)
    expect(parsePrice("£19")).toBe(19)
  })
  it("décimale virgule ou point", () => {
    expect(parsePrice("29,90 €")).toBeCloseTo(29.9)
    expect(parsePrice("29.90€")).toBeCloseTo(29.9)
    expect(parsePrice("9,5")).toBeCloseTo(9.5)
  })
  it("séparateur de milliers (3 chiffres) traité comme entier", () => {
    expect(parsePrice("1,299€")).toBe(1299)
    expect(parsePrice("1.299 €")).toBe(1299)
    expect(parsePrice("1 299,00 €")).toBeCloseTo(1299)
  })
  it("texte non numérique -> null", () => {
    expect(parsePrice("abc")).toBeNull()
  })
})

describe("priceDiscount", () => {
  it("ancien prix supérieur -> pourcentage arrondi", () => {
    const d = priceDiscount("29€", "59€")
    expect(d).not.toBeNull()
    expect(d!.percent).toBe(51)
    expect(d!.label).toBe("-51%")
  })
  it("économie formatée avec devise reprise de l'ancien prix", () => {
    const d = priceDiscount("40€", "50€")
    expect(d!.percent).toBe(20)
    expect(d!.saved).toBe("10€")
  })
  it("pas de réduction si ancien <= prix", () => {
    expect(priceDiscount("59€", "29€")).toBeNull()
    expect(priceDiscount("29€", "29€")).toBeNull()
  })
  it("null si prix non numérique ou ancien absent", () => {
    expect(priceDiscount("29€", undefined)).toBeNull()
    expect(priceDiscount("Sur devis", "59€")).toBeNull()
    expect(priceDiscount("29€", "Gratuit")).toBeNull()
  })
  it("décimales : 29,90 vs 59,90 ~ -50%", () => {
    const d = priceDiscount("29,90€", "59,90€")
    expect(d!.percent).toBe(50)
  })
})

describe("countdownParts", () => {
  const DAY = 86400000, HOUR = 3600000, MIN = 60000, SEC = 1000
  it("cible NaN (aucune date) -> non expiré, zéros", () => {
    const p = countdownParts(NaN, 1000)
    expect(p.expired).toBe(false)
    expect(p.days).toBe(0)
    expect(Number.isNaN(p.totalMs)).toBe(true)
  })
  it("cible dépassée -> expired", () => {
    const p = countdownParts(1000, 5000)
    expect(p.expired).toBe(true)
    expect(p.totalMs).toBe(0)
  })
  it("cible = maintenant -> expired (diff 0)", () => {
    expect(countdownParts(1000, 1000).expired).toBe(true)
  })
  it("décompose j/h/m/s correctement", () => {
    const now = 0
    const target = 2 * DAY + 3 * HOUR + 4 * MIN + 5 * SEC
    const p = countdownParts(target, now)
    expect(p.expired).toBe(false)
    expect(p.days).toBe(2)
    expect(p.hours).toBe(3)
    expect(p.mins).toBe(4)
    expect(p.secs).toBe(5)
  })
  it("moins d'une minute", () => {
    const p = countdownParts(45 * SEC, 0)
    expect(p.days).toBe(0)
    expect(p.hours).toBe(0)
    expect(p.mins).toBe(0)
    expect(p.secs).toBe(45)
  })
})

describe("stockStatus", () => {
  it("vide / non numérique -> null (rien affiché)", () => {
    expect(stockStatus("")).toBeNull()
    expect(stockStatus(undefined)).toBeNull()
    expect(stockStatus("beaucoup")).toBeNull()
  })
  it("0 ou négatif -> épuisé + soldOut", () => {
    const s = stockStatus("0")
    expect(s!.state).toBe("out")
    expect(s!.soldOut).toBe(true)
    expect(stockStatus("-3")!.state).toBe("out")
  })
  it("1..seuil -> rareté (urgence), pas soldOut", () => {
    const s = stockStatus("3")
    expect(s!.state).toBe("low")
    expect(s!.label).toBe("Plus que 3 en stock")
    expect(s!.soldOut).toBe(false)
    expect(stockStatus("5")!.state).toBe("low")
  })
  it("au-dessus du seuil -> en stock", () => {
    expect(stockStatus("42")!.state).toBe("in")
    expect(stockStatus("6")!.state).toBe("in")
  })
  it("seuil personnalisable", () => {
    expect(stockStatus("8", 10)!.state).toBe("low")
  })
  it("extrait l'entier d'un texte (ex '3 restants')", () => {
    expect(stockStatus("3 restants")!.label).toBe("Plus que 3 en stock")
  })
})

describe("paymentLink", () => {
  it("URL http collée = priorité absolue", () => {
    expect(paymentLink({ platform: "Stripe", url: "https://buy.stripe.com/abc" })).toBe("https://buy.stripe.com/abc")
    expect(paymentLink({ platform: "PayPal", url: "https://buy.stripe.com/abc", handle: "jean" })).toBe("https://buy.stripe.com/abc")
  })
  it("PayPal via pseudo -> paypal.me", () => {
    expect(paymentLink({ platform: "PayPal", handle: "jean" })).toBe("https://paypal.me/jean")
    expect(paymentLink({ platform: "PayPal", handle: "@jean" })).toBe("https://paypal.me/jean")
  })
  it("PayPal avec montant", () => {
    expect(paymentLink({ platform: "PayPal", handle: "jean", amount: "29€" })).toBe("https://paypal.me/jean/29")
  })
  it("Revolut via pseudo -> revolut.me (sans montant)", () => {
    expect(paymentLink({ platform: "Revolut", handle: "marie", amount: "10€" })).toBe("https://revolut.me/marie")
  })
  it("Stripe/Lydia/SumUp sans URL -> vide", () => {
    expect(paymentLink({ platform: "Stripe", handle: "jean" })).toBe("")
    expect(paymentLink({ platform: "Lydia" })).toBe("")
  })
  it("pseudo vide -> vide", () => {
    expect(paymentLink({ platform: "PayPal", handle: "" })).toBe("")
    expect(paymentLink({ platform: "PayPal" })).toBe("")
  })
})

describe("paymentBrand", () => {
  it("marque connue -> couleur + icône", () => {
    expect(paymentBrand("PayPal").color).toBe("#009CDE")
    expect(paymentBrand("PayPal").handleBased).toBe(true)
    expect(paymentBrand("Stripe").handleBased).toBe(false)
  })
  it("inconnu / vide -> Stripe par défaut", () => {
    expect(paymentBrand(undefined).label).toBe("Stripe")
    expect(paymentBrand("Bidule").label).toBe("Stripe")
  })
})

describe("starRow", () => {
  it("note pleine -> 5 étoiles remplies", () => {
    expect(starRow(5)).toEqual([1, 1, 1, 1, 1])
  })
  it("décimale : 4.9 -> 4 pleines + 1 quasi pleine", () => {
    const r = starRow(4.9)
    expect(r.slice(0, 4)).toEqual([1, 1, 1, 1])
    expect(r[4]).toBeCloseTo(0.9)
  })
  it("demi-étoile : 3,5 (virgule) -> [1,1,1,0.5,0]", () => {
    expect(starRow("3,5")).toEqual([1, 1, 1, 0.5, 0])
  })
  it("zéro / vide / non numérique -> tout vide", () => {
    expect(starRow(0)).toEqual([0, 0, 0, 0, 0])
    expect(starRow(undefined)).toEqual([0, 0, 0, 0, 0])
    expect(starRow("abc")).toEqual([0, 0, 0, 0, 0])
  })
  it("borné : au-delà du max -> tout plein", () => {
    expect(starRow(9)).toEqual([1, 1, 1, 1, 1])
  })
  it("max personnalisable", () => {
    expect(starRow(2, 3)).toEqual([1, 1, 0])
  })
})

describe("fmtMinutes", () => {
  it("heure pile -> '18h', sinon '9h30'", () => {
    expect(fmtMinutes(540)).toBe("9h")
    expect(fmtMinutes(1080)).toBe("18h")
    expect(fmtMinutes(570)).toBe("9h30")
    expect(fmtMinutes(0)).toBe("0h")
  })
})

describe("parseHourRanges", () => {
  it("plage simple", () => {
    expect(parseHourRanges("9h - 18h")).toEqual([{ start: 540, end: 1080 }])
  })
  it("double plage (coupure midi)", () => {
    expect(parseHourRanges("9h-12h, 14h-18h")).toEqual([{ start: 540, end: 720 }, { start: 840, end: 1080 }])
  })
  it("formats varies (: . et minutes)", () => {
    expect(parseHourRanges("9:30 - 17:00")).toEqual([{ start: 570, end: 1020 }])
    expect(parseHourRanges("10h30 – 16h")).toEqual([{ start: 630, end: 960 }])
  })
  it("ferme / vide -> []", () => {
    expect(parseHourRanges("Fermé")).toEqual([])
    expect(parseHourRanges("")).toEqual([])
    expect(parseHourRanges(undefined)).toEqual([])
  })
  it("plage invalide (fin <= debut) ignoree", () => {
    expect(parseHourRanges("18h - 9h")).toEqual([])
  })
})

describe("openStatus", () => {
  const uniform = { mon_fri: "9h - 18h", saturday: "9h - 18h", sunday: "9h - 18h" }
  it("ouvert pendant les heures -> ferme a X", () => {
    const r = openStatus(uniform, new Date(2026, 6, 8, 10, 30))
    expect(r?.open).toBe(true)
    expect(r?.label).toBe("Ouvert · ferme à 18h")
    expect(r?.color).toBe("#39FF8F")
  })
  it("avant ouverture -> ouvre a X", () => {
    const r = openStatus(uniform, new Date(2026, 6, 8, 8, 0))
    expect(r?.open).toBe(false)
    expect(r?.label).toBe("Fermé · ouvre à 9h")
  })
  it("apres fermeture -> ouvre demain (scan des jours suivants)", () => {
    const r = openStatus(uniform, new Date(2026, 6, 8, 20, 0))
    expect(r?.open).toBe(false)
    expect(r?.label).toBe("Fermé · ouvre demain à 9h")
  })
  it("ferme bientot (<= 30 min avant la fermeture)", () => {
    const r = openStatus(uniform, new Date(2026, 6, 8, 17, 40))
    expect(r?.open).toBe(true)
    expect(r?.label).toBe("Ferme bientôt · à 18h")
    expect(r?.color).toBe("#FBBF24")
  })
  it("apres fermeture -> nomme le prochain jour ouvre (lundi / samedi)", () => {
    const c = { mon_fri: "9h - 18h", saturday: "", sunday: "" }
    // 2026-07-10 = vendredi 20h : samedi/dimanche vides, puis lundi 9h -> ouvre lundi
    expect(openStatus(c, new Date(2026, 6, 10, 20, 0))?.label).toBe("Fermé · ouvre lundi à 9h")
    // un seul jour ouvert dans la semaine, consulté juste apres sa fermeture le meme jour -> Fermé
    const only = { mon_fri: "", saturday: "9h - 12h", sunday: "" }
    expect(openStatus(only, new Date(2026, 6, 4, 13, 0))?.label).toBe("Fermé · ouvre samedi à 9h")
  })
  it("selectionne le bon champ selon le jour", () => {
    const c = { mon_fri: "9h - 18h", saturday: "10h - 16h", sunday: "" }
    // 2026-07-04 = samedi, 2026-07-06 = lundi, 2026-07-05 = dimanche
    expect(openStatus(c, new Date(2026, 6, 4, 11, 0))?.label).toBe("Ouvert · ferme à 16h")
    expect(openStatus(c, new Date(2026, 6, 6, 11, 0))?.label).toBe("Ouvert · ferme à 18h")
    expect(openStatus(c, new Date(2026, 6, 5, 11, 0))).toBeNull() // dimanche vide -> pas de badge
  })
  it("coupure midi : ferme entre les deux plages", () => {
    const c = { mon_fri: "9h-12h, 14h-18h", saturday: "", sunday: "" }
    expect(openStatus(c, new Date(2026, 6, 6, 13, 0))?.label).toBe("Fermé · ouvre à 14h")
    expect(openStatus(c, new Date(2026, 6, 6, 15, 0))?.open).toBe(true)
  })
  it("mode jour par jour : chaque jour a son horaire", () => {
    const c = { mon: "9h - 19h", tue: "9h - 19h", wed: "Fermé", thu: "9h - 19h", fri: "9h - 19h", sat: "10h - 17h", sun: "" }
    expect(openStatus(c, new Date(2026, 6, 6, 11, 0))?.label).toBe("Ouvert · ferme à 19h") // lundi
    // mercredi 2026-07-08 fermé -> scan : jeudi 9h
    expect(openStatus(c, new Date(2026, 6, 8, 11, 0))?.label).toBe("Fermé · ouvre demain à 9h")
    // dimanche 2026-07-05 vide -> pas de badge
    expect(openStatus(c, new Date(2026, 6, 5, 11, 0))).toBeNull()
  })
})

describe("dayField", () => {
  it("mode jour-par-jour prioritaire sur l hérité", () => {
    const c = { mon: "8h - 20h", mon_fri: "9h - 18h" }
    expect(dayField(c, 1)).toBe("8h - 20h") // lundi -> per-day
    expect(dayField(c, 2)).toBeUndefined()  // mardi vide en per-day (mode per-day actif)
  })
  it("repli hérité si aucun champ jour-par-jour", () => {
    const c = { mon_fri: "9h - 18h", saturday: "10h - 16h", sunday: "" }
    expect(dayField(c, 3)).toBe("9h - 18h") // mercredi -> mon_fri
    expect(dayField(c, 6)).toBe("10h - 16h") // samedi
    expect(dayField(c, 0)).toBe("") // dimanche
  })
})

describe("vcardEscape", () => {
  it("echappe , ; \\ et retours ligne", () => {
    expect(vcardEscape("Paris, France")).toBe("Paris\\, France")
    expect(vcardEscape("a;b")).toBe("a\\;b")
    expect(vcardEscape("a\\b")).toBe("a\\\\b")
    expect(vcardEscape("l1\nl2")).toBe("l1\\nl2")
  })
})

describe("splitName", () => {
  it("prenom + nom", () => {
    expect(splitName("Jean Dupont")).toEqual({ given: "Jean", family: "Dupont" })
  })
  it("prenom compose -> dernier mot = nom", () => {
    expect(splitName("Jean Marie Dupont")).toEqual({ given: "Jean Marie", family: "Dupont" })
  })
  it("un seul mot / vide", () => {
    expect(splitName("Madonna")).toEqual({ given: "Madonna", family: "" })
    expect(splitName("")).toEqual({ given: "", family: "" })
  })
})

describe("buildVCard", () => {
  it("carte complete valide (BEGIN/END, FN, N, champs)", () => {
    const v = buildVCard({ name: "Jean Dupont", phone: "+33612345678", email: "jean@ex.com", company: "Studio PIXEL", title: "DA", website: "https://x.com", address: "Paris, France" })
    expect(v.startsWith("BEGIN:VCARD\r\nVERSION:3.0")).toBe(true)
    expect(v.endsWith("END:VCARD")).toBe(true)
    expect(v).toContain("FN:Jean Dupont")
    expect(v).toContain("N:Dupont;Jean;;;")
    expect(v).toContain("ORG:Studio PIXEL")
    expect(v).toContain("TITLE:DA")
    expect(v).toContain("TEL;TYPE=CELL:+33612345678")
    expect(v).toContain("EMAIL;TYPE=INTERNET:jean@ex.com")
    expect(v).toContain("URL:https://x.com")
    expect(v).toContain("ADR;TYPE=WORK:;;Paris\\, France;;;;")
  })
  it("utilise CRLF entre les lignes", () => {
    expect(buildVCard({ name: "A B" }).includes("\r\n")).toBe(true)
  })
  it("sans nom -> FN reprend l'entreprise", () => {
    const v = buildVCard({ company: "ACME" })
    expect(v).toContain("FN:ACME")
    expect(v).not.toContain("\nN:")
  })
  it("champs vides omis", () => {
    const v = buildVCard({ name: "Jean" })
    expect(v).not.toContain("TEL")
    expect(v).not.toContain("ADR")
  })
})

describe("mapEmbedUrl", () => {
  it("construit une carte depuis l'adresse (sans cle API)", () => {
    const u = mapEmbedUrl("12 rue de la Paix, Paris")
    expect(u).toBe("https://maps.google.com/maps?q=12%20rue%20de%20la%20Paix%2C%20Paris&z=15&output=embed")
  })
  it("zoom personnalise valide (1-2 chiffres)", () => {
    expect(mapEmbedUrl("Paris", "", "18")).toContain("&z=18&")
    expect(mapEmbedUrl("Paris", "", "abc")).toContain("&z=15&") // invalide -> defaut
  })
  it("URL embed personnalisee prioritaire", () => {
    const custom = "https://www.google.com/maps/embed?pb=xyz"
    expect(mapEmbedUrl("Paris", custom)).toBe(custom)
  })
  it("rien d'exploitable -> vide", () => {
    expect(mapEmbedUrl("")).toBe("")
    expect(mapEmbedUrl(undefined, undefined)).toBe("")
  })
})

describe("shareLinks", () => {
  const L = shareLinks("https://qrowg.com/jean", "Jean Dupont")
  const by = (k: string) => L.find(t => t.key === k)!
  it("6 reseaux, encodage URL", () => {
    expect(L.map(t => t.key)).toEqual(["whatsapp", "facebook", "x", "linkedin", "telegram", "email"])
    expect(by("whatsapp").href).toContain("https%3A%2F%2Fqrowg.com%2Fjean")
  })
  it("WhatsApp/X/Telegram incluent le texte, Facebook seulement l'URL", () => {
    expect(by("whatsapp").href).toContain("Jean%20Dupont")
    expect(by("x").href).toContain("&text=Jean%20Dupont")
    expect(by("facebook").href).not.toContain("Jean")
  })
  it("email en mailto", () => {
    expect(by("email").href.startsWith("mailto:?subject=Jean%20Dupont")).toBe(true)
  })
  it("sans texte -> pas de segment texte parasite", () => {
    const w = shareLinks("https://x.io").find(t => t.key === "whatsapp")!
    expect(w.href).toBe("https://wa.me/?text=https%3A%2F%2Fx.io%3Futm_source%3Dwhatsapp%26utm_medium%3Dshare")
  })
  it("attribution : chaque lien pose utm_source de son reseau", () => {
    expect(by("whatsapp").href).toContain("utm_source%3Dwhatsapp")
    expect(by("x").href).toContain("utm_source%3Dx")
    expect(by("linkedin").href).toContain("utm_source%3Dlinkedin")
  })
  it("utm ajoute avec & si l'URL a deja des parametres", () => {
    const w = shareLinks("https://qrowg.com/jean?ref=1").find(t => t.key === "telegram")!
    expect(w.href).toContain("jean%3Fref%3D1%26utm_source%3Dtelegram")
  })
})

describe("toCalStamp", () => {
  it("datetime -> tampon flottant (pas de decalage TZ)", () => {
    expect(toCalStamp("2025-06-15T19:00")).toBe("20250615T190000")
    expect(toCalStamp("2025-06-15T19:00:30")).toBe("20250615T190030")
    expect(toCalStamp("2025-06-15 09:05")).toBe("20250615T090500")
  })
  it("date seule -> 9h par defaut", () => {
    expect(toCalStamp("2025-12-31")).toBe("20251231T090000")
  })
  it("vide / invalide -> null", () => {
    expect(toCalStamp("")).toBeNull()
    expect(toCalStamp("bientot")).toBeNull()
    expect(toCalStamp(undefined)).toBeNull()
  })
})

describe("calendarLinks", () => {
  it("construit Google + .ics depuis les champs", () => {
    const r = calendarLinks({ name: "Soirée", start: "2025-06-15T19:00", end: "2025-06-15T23:00", location: "Paris, France", description: "Venez !" })!
    expect(r.google).toContain("calendar.google.com/calendar/render")
    expect(r.google).toContain("dates=20250615T190000%2F20250615T230000")
    expect(r.google).toContain("action=TEMPLATE")
    expect(r.ics.startsWith("data:text/calendar")).toBe(true)
    const ics = decodeURIComponent(r.ics.split(",")[1])
    expect(ics).toContain("BEGIN:VEVENT")
    expect(ics).toContain("DTSTART:20250615T190000")
    expect(ics).toContain("DTEND:20250615T230000")
    expect(ics).toContain("SUMMARY:Soirée")
    expect(ics).toContain("LOCATION:Paris\\, France") // virgule echappee
    expect(ics.includes("\r\n")).toBe(true)
  })
  it("fin absente -> +1h", () => {
    const r = calendarLinks({ name: "X", start: "2025-06-15T19:00" })!
    expect(r.google).toContain("20250615T190000%2F20250615T200000")
  })
  it("debordement d heure (23h +1h -> lendemain 0h)", () => {
    const r = calendarLinks({ name: "X", start: "2025-06-15T23:30" })!
    expect(r.google).toContain("20250615T233000%2F20250616T003000")
  })
  it("date de debut invalide -> null", () => {
    expect(calendarLinks({ name: "X", start: "" })).toBeNull()
  })
})

describe("spotifyEmbedUrl", () => {
  it("URL standard track -> embed", () => {
    expect(spotifyEmbedUrl("https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6"))
      .toBe("https://open.spotify.com/embed/track/6rqhFgbbKwnb9MLmUQDhG6?utm_source=generator&theme=0")
  })
  it("URL LOCALISEE (/intl-fr/) -> embed (bug corrige)", () => {
    expect(spotifyEmbedUrl("https://open.spotify.com/intl-fr/album/1DFixLWuPkv3KT3TnV35m3?si=abc"))
      .toBe("https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3?utm_source=generator&theme=0")
  })
  it("type deduit de l'URL (playlist)", () => {
    expect(spotifyEmbedUrl("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"))
      .toContain("/embed/playlist/37i9dQZF1DXcBWIGoYBM5M")
  })
  it("URI spotify: -> embed", () => {
    expect(spotifyEmbedUrl("spotify:track:6rqhFgbbKwnb9MLmUQDhG6"))
      .toContain("/embed/track/6rqhFgbbKwnb9MLmUQDhG6")
  })
  it("URL d'embed deja prete -> inchangee", () => {
    const e = "https://open.spotify.com/embed/track/xyz?utm_source=generator&theme=0"
    expect(spotifyEmbedUrl(e)).toBe(e)
  })
  it("vide / non Spotify -> vide", () => {
    expect(spotifyEmbedUrl("")).toBe("")
    expect(spotifyEmbedUrl("https://exemple.com/x")).toBe("")
  })
})

describe("youtubeId", () => {
  it("watch?v= (ignore &t=)", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe("dQw4w9WgXcQ")
  })
  it("youtu.be avec parametres (?si=) -> id propre (bug corrige)", () => {
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ?si=abc123")).toBe("dQw4w9WgXcQ")
  })
  it("Shorts (bug corrige)", () => {
    expect(youtubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })
  it("embed / live", () => {
    expect(youtubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
    expect(youtubeId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })
  it("vide / non YouTube -> vide", () => {
    expect(youtubeId("")).toBe("")
    expect(youtubeId("https://exemple.com/x")).toBe("")
  })
})

describe("socialHref", () => {
  it("URL complete -> telle quelle", () => {
    expect(socialHref("instagram", "https://instagram.com/jean")).toBe("https://instagram.com/jean")
  })
  it("pseudo -> modele du reseau", () => {
    expect(socialHref("instagram", "jean")).toBe("https://instagram.com/jean")
    expect(socialHref("linkedin", "jean")).toBe("https://linkedin.com/in/jean")
  })
  it("pseudo avec @ et modele finissant par @ -> pas de double @", () => {
    expect(socialHref("tiktok", "@jean")).toBe("https://tiktok.com/@jean")
    expect(socialHref("tiktok", "jean")).toBe("https://tiktok.com/@jean")
  })
  it("domaine sans protocole -> https://", () => {
    expect(socialHref("instagram", "instagram.com/jean")).toBe("https://instagram.com/jean")
    expect(socialHref("instagram", "www.instagram.com/jean")).toBe("https://www.instagram.com/jean")
  })
  it("email -> mailto:", () => {
    expect(socialHref("email", "jean@exemple.com")).toBe("mailto:jean@exemple.com")
  })
  it("vide -> vide", () => {
    expect(socialHref("instagram", "")).toBe("")
    expect(socialHref("instagram", undefined)).toBe("")
  })
})

describe("extHref", () => {
  it("domaine sans protocole -> https://", () => {
    expect(extHref("www.site.com")).toBe("https://www.site.com")
    expect(extHref("site.com/page")).toBe("https://site.com/page")
  })
  it("URL/mailto/tel/ancre/relatif -> inchanges (idempotent)", () => {
    expect(extHref("https://x.com")).toBe("https://x.com")
    expect(extHref("http://x.com")).toBe("http://x.com")
    expect(extHref("mailto:a@b.com")).toBe("mailto:a@b.com")
    expect(extHref("tel:+33")).toBe("tel:+33")
    expect(extHref("#")).toBe("#")
    expect(extHref("/interne")).toBe("/interne")
  })
  it("vide -> vide", () => {
    expect(extHref("")).toBe("")
    expect(extHref(undefined)).toBe("")
  })
})
