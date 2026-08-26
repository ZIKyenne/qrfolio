import { describe, it, expect } from "vitest"
import { classifyTraffic } from "./detectTrafficSource"
import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("classifyTraffic — QR", () => {
  it("détecte un scan QR via utm_medium / qr / src", () => {
    expect(classifyTraffic("?utm_medium=qr", "https://instagram.com").source).toBe("qr_scan")
    expect(classifyTraffic("?qr=1", "").source).toBe("qr_scan")
    expect(classifyTraffic("?src=qr", "").source).toBe("qr_scan")
  })
  it("le QR est prioritaire sur tout le reste", () => {
    expect(classifyTraffic("?utm_medium=qr&utm_source=instagram", "https://facebook.com").source).toBe("qr_scan")
  })
})

describe("classifyTraffic — utm_source", () => {
  it("mappe une source connue (insensible à la casse)", () => {
    expect(classifyTraffic("?utm_source=Instagram", "").source).toBe("instagram")
    expect(classifyTraffic("?utm_source=whatsapp", "").source).toBe("whatsapp")
  })
  it("'x' -> twitter", () => {
    expect(classifyTraffic("?utm_source=x", "").source).toBe("twitter")
  })
  it("prioritaire sur le référent (cas WhatsApp/Telegram qui effacent le referrer)", () => {
    expect(classifyTraffic("?utm_source=telegram", "https://google.com").source).toBe("telegram")
  })
  it("utm_source inconnu -> on retombe sur le référent", () => {
    expect(classifyTraffic("?utm_source=inconnu", "https://instagram.com").source).toBe("instagram")
    expect(classifyTraffic("?utm_source=inconnu", "").source).toBe("direct")
  })
})

describe("classifyTraffic — référent", () => {
  it("classe les réseaux et retourne le domaine (sans www, sans chemin)", () => {
    expect(classifyTraffic("", "https://www.instagram.com/p/abc")).toEqual({ source: "instagram", referrer: "instagram.com" })
    expect(classifyTraffic("", "https://t.co/xyz").source).toBe("twitter")
    expect(classifyTraffic("", "https://lnkd.in/xyz").source).toBe("linkedin")
    expect(classifyTraffic("", "https://vm.tiktok.com/xyz").source).toBe("tiktok")
  })
  it("moteur de recherche -> google", () => {
    expect(classifyTraffic("", "https://www.google.fr/search?q=x").source).toBe("google")
    expect(classifyTraffic("", "https://duckduckgo.com/").source).toBe("google")
  })
  it("domaine inconnu -> referral avec le domaine (sous-domaine conservé, seul www retiré)", () => {
    expect(classifyTraffic("", "https://unblog.example.fr/article")).toEqual({ source: "referral", referrer: "unblog.example.fr" })
    expect(classifyTraffic("", "https://www.example.fr/x").referrer).toBe("example.fr")
  })
  it("yahoo : mail.yahoo -> email, mais yahoo/recherche -> referral (plus de faux 'email')", () => {
    expect(classifyTraffic("", "https://mail.yahoo.com/").source).toBe("email")
    expect(classifyTraffic("", "https://fr.search.yahoo.com/search?q=x").source).toBe("referral")
    expect(classifyTraffic("", "https://yahoo.com/").source).toBe("referral")
  })
  it("pas de référent -> direct", () => {
    expect(classifyTraffic("", "")).toEqual({ source: "direct", referrer: null })
  })
  it("référent malformé -> direct (pas de crash)", () => {
    expect(classifyTraffic("", "pas-une-url").source).toBe("direct")
  })
  it("ne stocke jamais le chemin complet (RGPD : domaine seul)", () => {
    const info = classifyTraffic("", "https://reddit.com/r/secret/very-private-thread")
    expect(info.referrer).toBe("reddit.com")
    expect(info.referrer).not.toContain("secret")
  })
})

// Le défaut que ces tests auraient dû attraper : ils vérifiaient les trois
// marqueurs que l'API accepte (utm_medium=qr, qr=1, src=qr) — mais aucun des
// trois n'est produit nulle part dans le produit. Le redirect /q/<code> écrit
// ?s=<code>, et rien d'autre. Résultat : 33 vues en base, toutes « direct »,
// et la ligne « QR Scan » du tableau de bord d'un client n'est jamais apparue.
describe("classifyTraffic — le marqueur que le produit écrit vraiment", () => {
  it("?s=<code> est un scan de QR code", () => {
    expect(classifyTraffic("?s=a1b2c3", "").source).toBe("qr_scan")
  })
  it("un scan reste un scan même avec un référent", () => {
    expect(classifyTraffic("?s=a1b2c3", "https://instagram.com").source).toBe("qr_scan")
  })
  it("le code du support n'est pas renvoyé comme référent", () => {
    expect(classifyTraffic("?s=a1b2c3", "").referrer).toBeNull()
  })
  it("le code accepté est exactement celui que lit qrSource", () => {
    for (const bon of ["a", "A1_b-2", "a".repeat(40)]) {
      expect(classifyTraffic(`?s=${bon}`, "").source, bon).toBe("qr_scan")
    }
    for (const mauvais of ["", "a".repeat(41), "a b", "a/b", "a.b"]) {
      expect(classifyTraffic(`?s=${encodeURIComponent(mauvais)}`, "").source, mauvais).not.toBe("qr_scan")
    }
  })
  it("un autre paramètre nommé s ailleurs ne fabrique pas de faux scan", () => {
    expect(classifyTraffic("?search=a1b2c3", "").source).toBe("direct")
    expect(classifyTraffic("?ss=a1b2c3", "").source).toBe("direct")
  })
})

describe("classifyTraffic — trafic venu du site lui-même", () => {
  it("une autre page du même domaine n'est pas un site tiers", () => {
    const r = classifyTraffic("", "https://qrowg.com/examples", "qrowg.com")
    expect(r.source).toBe("interne")
    expect(r.referrer).toBe("qrowg.com")
  })
  it("le www ne change rien, dans un sens comme dans l'autre", () => {
    expect(classifyTraffic("", "https://www.qrowg.com/", "qrowg.com").source).toBe("interne")
    expect(classifyTraffic("", "https://qrowg.com/", "www.qrowg.com").source).toBe("interne")
  })
  it("un sous-domaine du site compte comme interne", () => {
    expect(classifyTraffic("", "https://marcel.qrowg.com/", "qrowg.com").source).toBe("interne")
  })
  it("un domaine qui se termine par les mêmes lettres n'est PAS interne", () => {
    expect(classifyTraffic("", "https://pasqrowg.com/", "qrowg.com").source).toBe("referral")
  })
  it("sans domaine interne fourni, le comportement d'avant est conservé", () => {
    expect(classifyTraffic("", "https://qrowg.com/").source).toBe("referral")
  })
  it("un vrai site tiers reste un référent", () => {
    const r = classifyTraffic("", "https://lefigaro.fr/article", "qrowg.com")
    expect(r.source).toBe("referral")
    expect(r.referrer).toBe("lefigaro.fr")
  })
})

// Garde-fou structurel. Le vrai défaut n'était pas dans le classement : c'était
// que le classement et le redirect parlaient de deux paramètres différents, et
// que rien ne les confrontait. Ce test relit le redirect et vérifie que le
// paramètre qu'il écrit est bien celui qui vaut « scan de QR code ».
describe("le redirect et la détection parlent du même paramètre", () => {
  const routeQr = readFileSync(
    join(__dirname, "../app/q/[code]/route.ts"),
    "utf8",
  )

  it("le redirect ajoute bien un paramètre à l'URL de la page", () => {
    const marqueurs = [...routeQr.matchAll(/\$\{appUrl\}\/\$\{[^}]+\}\?([a-z_]+)=/g)].map(m => m[1])
    expect(marqueurs.length).toBeGreaterThan(0)
    for (const p of new Set(marqueurs)) {
      expect(classifyTraffic(`?${p}=a1b2c3`, ""), `?${p}= doit compter comme un scan`).toMatchObject({ source: "qr_scan" })
    }
  })
})
