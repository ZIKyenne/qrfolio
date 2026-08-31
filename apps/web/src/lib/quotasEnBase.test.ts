import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PLANS, qrLimit, dynLimit, pageLimit, canDynSecurite, type PlanId } from "./plans"

// Les limites de plan ne vivaient que dans les routes /api. La base est joignable
// directement avec la clé publique, et la règle RLS autorise le propriétaire à
// écrire chez lui : trois lignes dans la console du navigateur suffisaient pour
// cinquante QR modifiables sur un plan qui en donne un.
//
// Une migration pose désormais les mêmes limites en base. Deux endroits pour les
// mêmes chiffres — donc un test qui les compare, sinon ils divergeront.

const SQL = readFileSync(join(__dirname, "../../../../supabase/migrations/20260831140000_quotas_plan.sql"), "utf8")

/** Lit une branche `when 'starter' then 7` du bloc CASE d'une limite. */
function limiteSql(quoi: "qr" | "dyn" | "pages", plan: PlanId): number | null {
  const bloc = SQL.slice(SQL.indexOf(`when '${quoi}' then`))
  const portee = bloc.slice(0, bloc.indexOf("end") + 3)
  if (plan === "free") {
    const m = portee.match(/else\s+(\d+)\s+end/)
    return m ? Number(m[1]) : NaN as never
  }
  const m = portee.match(new RegExp(`when '${plan}'\\s+then\\s+(null|\\d+)`))
  if (!m) return NaN as never
  return m[1] === "null" ? null : Number(m[1])
}

describe("la base applique exactement les mêmes limites que le code", () => {
  const plans = Object.keys(PLANS) as PlanId[]

  it("les QR autonomes", () => {
    for (const p of plans) expect(limiteSql("qr", p), p).toBe(qrLimit(p))
  })

  it("les QR modifiables", () => {
    for (const p of plans) expect(limiteSql("dyn", p), p).toBe(dynLimit(p))
  })

  it("les QR de page actifs", () => {
    for (const p of plans) expect(limiteSql("pages", p), p).toBe(pageLimit(p))
  })

  it("la sécurité du lien (mot de passe, expiration) couvre les mêmes plans", () => {
    const ligne = SQL.slice(SQL.indexOf("plan_a_securite_lien"))
    const m = ligne.match(/in \(([^)]*)\)/)
    expect(m, "la liste des plans autorisés est introuvable").toBeTruthy()
    const autorises = m![1].split(",").map(s => s.trim().replace(/'/g, ""))
    for (const p of plans) expect(autorises.includes(p), p).toBe(canDynSecurite(p))
  })
})

describe("la migration ne peut pas casser un compte existant", () => {
  it("ne vérifie le quota qu'au PASSAGE à l'état actif", () => {
    // Sans cette condition, renommer un QR déjà actif sur un compte au-dessus de
    // sa limite (ancien plan, rétrogradation) serait refusé.
    expect(SQL).toContain("or not (coalesce(old.dynamic, false) and coalesce(old.status, 'active') = 'active')")
    expect(SQL).toContain("if tg_op = 'UPDATE' and coalesce(old.status, 'active') = 'active' then return new; end if;")
  })

  it("ne bloque une expiration héritée que si on la MODIFIE", () => {
    expect(SQL).toContain("old.expires_at is distinct from new.expires_at")
    expect(SQL).toContain("old.password_hash is distinct from new.password_hash")
  })

  it("ne supprime ni ne réécrit aucune ligne", () => {
    expect(SQL, "une migration de quota ne doit rien effacer").not.toMatch(/\bdelete from\b/i)
    expect(SQL).not.toMatch(/\btruncate\b/i)
    // `drop trigger if exists` avant `create trigger` est attendu : c'est ce qui
    // rend la migration rejouable.
    expect(SQL.match(/\bdrop\b/gi)?.length).toBe(2)
  })

  it("se replie sur le plan gratuit quand le profil est illisible", () => {
    expect(SQL).toContain("coalesce(p_plan, 'free')")
  })
})
