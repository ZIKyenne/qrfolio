import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { safeNext, errorRedirect, isBrandNew, displayName, cleanRefCode, REF_COOKIE } from "./callbackLogic"

describe("destination de retour", () => {
  it("garde un chemin interne", () => {
    expect(safeNext("/dashboard/builder/new?claim=1")).toBe("/dashboard/builder/new?claim=1")
  })
  it("refuse une URL externe", () => {
    expect(safeNext("https://exemple.test/vol")).toBe("/dashboard")
  })
  it("refuse le double slash (redirection protocol-relative)", () => {
    expect(safeNext("//exemple.test/vol")).toBe("/dashboard")
  })
  it("repli quand rien n'est fourni", () => {
    expect(safeNext(null)).toBe("/dashboard")
    expect(safeNext("   ")).toBe("/dashboard")
  })
})

describe("où renvoyer quand ça échoue", () => {
  it("un lien email périmé ramène à « mot de passe oublié »", () => {
    expect(errorRedirect("email", "/auth/reset-password")).toContain("/auth/forgot-password?error=")
  })
  it("un retour Google raté ramène à la connexion, pas au mot de passe oublié", () => {
    const u = errorRedirect("oauth", null)
    expect(u).toContain("/auth/login?error=")
    expect(u).not.toContain("forgot-password")
  })
  it("et conserve la destination pour ne pas perdre le brouillon", () => {
    const u = errorRedirect("oauth", "/dashboard/builder/new?claim=1")
    const q = new URLSearchParams(u.split("?")[1])
    expect(q.get("redirect")).toBe("/dashboard/builder/new?claim=1")
  })
  it("ne recopie pas une destination externe dans l'erreur", () => {
    expect(errorRedirect("oauth", "https://exemple.test")).not.toContain("exemple.test")
  })
  it("le message est en français et compréhensible", () => {
    const q = new URLSearchParams(errorRedirect("oauth", null).split("?")[1])
    expect(q.get("error")).toContain("Google")
    expect(q.get("error")).toContain("email")
  })
})

describe("premier passage", () => {
  const t = (ms: number) => new Date(ms).toISOString()
  it("inscription et connexion quasi simultanées = nouveau compte", () => {
    expect(isBrandNew({ created_at: t(1_700_000_000_000), last_sign_in_at: t(1_700_000_000_400) })).toBe(true)
  })
  it("une connexion ultérieure n'est plus un premier passage", () => {
    expect(isBrandNew({ created_at: t(1_700_000_000_000), last_sign_in_at: t(1_700_000_600_000) })).toBe(false)
  })
  it("sans date de connexion, on se fie à la création", () => {
    expect(isBrandNew({ created_at: t(1_700_000_000_000), last_sign_in_at: null })).toBe(true)
  })
  it("données absentes ou illisibles : on n'invente rien", () => {
    expect(isBrandNew(null)).toBe(false)
    expect(isBrandNew({ created_at: "pas une date", last_sign_in_at: null })).toBe(false)
    expect(isBrandNew({})).toBe(false)
  })
})

describe("nom affiché d'un compte Google", () => {
  it("prend full_name en premier", () => {
    expect(displayName({ user_metadata: { full_name: "Emilien Lampson", name: "autre" } })).toBe("Emilien Lampson")
  })
  it("puis name, puis given_name", () => {
    expect(displayName({ user_metadata: { name: "Emilien" } })).toBe("Emilien")
    expect(displayName({ user_metadata: { given_name: "Emilien" } })).toBe("Emilien")
  })
  it("à défaut, la partie locale de l'email", () => {
    expect(displayName({ user_metadata: {}, email: "emilien@exemple.fr" })).toBe("emilien")
  })
  it("rien du tout plutôt qu'un nom inventé", () => {
    expect(displayName(null)).toBe("")
    expect(displayName({ user_metadata: {} })).toBe("")
  })
  it("borne la longueur", () => {
    expect(displayName({ user_metadata: { full_name: "N".repeat(200) } }).length).toBe(80)
  })
})

describe("code de parrainage", () => {
  it("normalise en minuscules", () => {
    expect(cleanRefCode("  AbC12345 ")).toBe("abc12345")
  })
  it("refuse ce qui ne ressemble pas à un code", () => {
    for (const v of ["", "ab", "N".repeat(41), "code avec espace", "<script>", "../../etc"]) {
      expect(cleanRefCode(v), v).toBe("")
    }
  })
  it("null et undefined", () => {
    expect(cleanRefCode(null)).toBe("")
    expect(cleanRefCode(undefined)).toBe("")
  })
})

describe("câblage du retour d'authentification", () => {
  const read = (p: string) => readFileSync(join(__dirname, p), "utf8")

  it("le flux OAuth est marqué explicitement", () => {
    // Le lien de réinitialisation passe LUI AUSSI un `next` : sans marqueur,
    // un lien périmé renverrait vers la connexion au lieu du mot de passe oublié.
    expect(read("GoogleButton.tsx")).toContain("/auth/callback?flow=oauth&next=")
    expect(read("callback/route.ts")).toContain('searchParams.get("flow") === "oauth"')
  })

  it("le bouton n'apparaît que si Google est activé côté environnement", () => {
    const src = read("GoogleButton.tsx")
    expect(src).toContain('process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1"')
    expect(src).toContain("if (!GOOGLE_AUTH_ENABLED) return null")
  })

  it("le bouton est présent sur l'inscription ET la connexion", () => {
    expect(read("signup/page.tsx")).toContain("<GoogleButton")
    expect(read("login/page.tsx")).toContain("<GoogleButton")
  })

  it("le parrainage passe par un cookie, que Google ne peut pas transmettre", () => {
    expect(REF_COOKIE).toBe("qrowg_ref")
    expect(read("GoogleButton.tsx")).toContain("max-age=1800; path=/; SameSite=Lax")
    expect(read("callback/route.ts")).toContain("req.cookies.get(REF_COOKIE)")
    // Effacé dans tous les cas, y compris quand le code était invalide.
    expect(read("callback/route.ts")).toContain('res.cookies.set(REF_COOKIE, "", { maxAge: 0, path: "/" })')
  })

  it("le parrainage différé est idempotent", () => {
    // Un rechargement du retour ne doit pas créer un second parrainage.
    const src = read("callback/route.ts")
    expect(src).toContain('select("referred_by")')
    expect(src).toContain("if (!me || (me as any).referred_by) return")
    expect(src).toContain("(referrer as any).id === userId")   // pas d'auto-parrainage
  })

  it("un à-côté qui échoue n'empêche jamais d'entrer", () => {
    expect(read("callback/route.ts")).toMatch(/\} catch \{ \/\* la session est ouverte/)
  })

  it("l'email de bienvenue part aussi pour les comptes Google", () => {
    expect(read("callback/route.ts")).toContain("/api/emails/welcome")
    expect(read("callback/route.ts")).toContain("isBrandNew(user)")
  })
})
