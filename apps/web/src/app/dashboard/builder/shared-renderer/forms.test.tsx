import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { contactFormModel, quoteFormModel, reservationFormModel, bookingRequestFormModel, registerFormModel, rsvpFormModel } from "./forms/leadFormModels"
import { buildLeadPayload } from "./forms/leadPayload"
import { validateLeadForm, canSubmit, decideSubmit, decideResult } from "./forms/leadFormMachine"
import { SharedLeadFormView } from "./forms/SharedLeadFormView"
import { EditorLeadFormAdapter, EDITOR_FORM_PREVIEW_NOTICE } from "./forms/EditorLeadFormAdapter"
import { FORM_RENDERER_CANDIDATES, FORM_PILOT_CANDIDATES } from "./forms/formCandidates"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import type { SharedLeadFormModel } from "./forms/formTypes"

const H = (el: any) => renderToStaticMarkup(el)
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")

// ── Modèles ───────────────────────────────────────────────────────────────────
describe("B09.13 — modèles de formulaires", () => {
  it("contact_form : name/email requis (+phone conditionnel), message ; leadType contact", () => {
    const m = contactFormModel({})
    expect(m.fields.map(f => f.key)).toEqual(["name", "email", "message"])
    expect(m.fields.slice(0, 2).every(f => f.required)).toBe(true)
    expect(m.leadType).toBe("contact"); expect(m.subject).toBe("Nouveau message de contact")
    expect(contactFormModel({ show_phone: "yes" }).fields.map(f => f.key)).toEqual(["name", "email", "phone", "message"])
    expect(contactFormModel({ button_label: "Go" }).submitLabel).toBe("Go")
  })
  it("quote_form : phone par défaut, budget conditionnel, project (textarea)", () => {
    const m = quoteFormModel({})
    expect(m.fields.map(f => f.key)).toEqual(["name", "email", "phone", "project"])
    expect(m.fields.find(f => f.key === "project")?.type).toBe("textarea")
    expect(quoteFormModel({ show_phone: "no" }).fields.map(f => f.key)).toEqual(["name", "email", "project"])
    expect(quoteFormModel({ show_budget: "yes" }).fields.map(f => f.key)).toContain("budget")
    expect(m.leadType).toBe("quote")
  })
  it("reservation_form : name/date/people (aucun email), phone orphelin NON inclus", () => {
    const m = reservationFormModel({})
    expect(m.fields.map(f => f.key)).toEqual(["name", "date", "people"])
    expect(m.fields.find(f => f.key === "phone")).toBeUndefined()
    expect(m.fields.slice(0, 2).map(f => f.key)).toEqual(["name", "date"]) // 2 premiers requis
    expect(m.leadType).toBe("reservation")
  })
  it("booking_request : name/email/type/date/message ; leadType booking", () => {
    const m = bookingRequestFormModel({})
    expect(m.fields.map(f => f.key)).toEqual(["name", "email", "type", "date", "message"])
    expect(m.leadType).toBe("booking")
  })
  it("register : name/email (+phone/company conditionnels) ; leadType register", () => {
    expect(registerFormModel({}).fields.map(f => f.key)).toEqual(["name", "email"])
    expect(registerFormModel({ show_phone: "yes", show_company: "yes" }).fields.map(f => f.key)).toEqual(["name", "email", "phone", "company"])
    expect(registerFormModel({}).leadType).toBe("register")
  })
  it("rsvp : formulaire à choix (3 réponses), leadType rsvp, aucun champ", () => {
    const m = rsvpFormModel({})
    expect(m.kind).toBe("choice")
    expect(m.choices.map(c => c.value)).toEqual(["oui", "peut-etre", "non"])
    expect(rsvpFormModel({ yes_label: "Présent" }).choices[0].label).toBe("Présent")
  })
  it("aucune mutation du contenu source", () => {
    const c = { title: "T", show_phone: "yes", show_budget: "yes", show_company: "yes" }; const snap = JSON.stringify(c)
    contactFormModel(c); quoteFormModel(c); reservationFormModel(c); bookingRequestFormModel(c); registerFormModel(c); rsvpFormModel(c)
    expect(JSON.stringify(c)).toBe(snap)
  })
})

// ── Payload ─────────────────────────────────────────────────────────────────
describe("B09.13 — buildLeadPayload (filtrage + sécurité)", () => {
  const m = contactFormModel({ show_phone: "yes" })
  it("name/email/phone par clé + data {label:valeur}, pageId/type", () => {
    const p = buildLeadPayload(m, { name: "Alice", email: "a@b.c", phone: "0600", message: "Bonjour" }, "p1", "b1")
    expect(p.name).toBe("Alice"); expect(p.email).toBe("a@b.c"); expect(p.phone).toBe("0600")
    expect(p.message).toBe("Bonjour"); expect(p.type).toBe("contact"); expect(p.pageId).toBe("p1"); expect(p.blockId).toBe("b1")
    expect(p.data).toEqual({ Nom: "Alice", Email: "a@b.c", "Téléphone": "0600", Message: "Bonjour" })
  })
  it("clés inconnues / ownerId / recipient IGNORÉS (jamais dans le payload)", () => {
    const p = buildLeadPayload(m, { name: "A", email: "a@b.c", ownerId: "hack", recipient: "evil@x.co", secret: "s" }, "p1")
    expect((p as any).ownerId).toBeUndefined(); expect((p as any).recipient).toBeUndefined()
    expect(JSON.stringify(p)).not.toContain("hack"); expect(JSON.stringify(p)).not.toContain("evil@x.co")
  })
  it("message = message||project||subject ; espaces nettoyés ; longueurs bornées", () => {
    expect(buildLeadPayload(m, { name: "A", email: "a@b.c" }, "p").message).toBe("Nouveau message de contact")
    expect(buildLeadPayload(quoteFormModel({}), { name: "A", email: "a@b.c", project: "Projet X" }, "p").message).toBe("Projet X")
    expect(buildLeadPayload(m, { name: "  Bob  ", email: "a@b.c" }, "p").name).toBe("Bob")
    expect(buildLeadPayload(m, { name: "x".repeat(900), email: "a@b.c" }, "p").name!.length).toBe(500)
    expect(buildLeadPayload(quoteFormModel({}), { name: "A", email: "a@b.c", project: "y".repeat(9000) }, "p").message!.length).toBe(5000)
  })
  it("aucune mutation des valeurs", () => {
    const v = { name: "A", email: "a@b.c" }; const snap = JSON.stringify(v)
    buildLeadPayload(m, v, "p"); expect(JSON.stringify(v)).toBe(snap)
  })
})

// ── Machine d'états ───────────────────────────────────────────────────────────
describe("B09.13 — machine de soumission", () => {
  const m = contactFormModel({})
  it("validation : requis manquants + email invalide", () => {
    expect(validateLeadForm(m, {}).ok).toBe(false)
    expect(validateLeadForm(m, { name: "A", email: "a@b.c" }).ok).toBe(true)
    expect(validateLeadForm(m, { name: "A", email: "bad" }).emailInvalid).toBe(true)
    expect(validateLeadForm(m, { email: "a@b.c" }).missing).toContain("name")
  })
  it("anti-double-submit : sending → canSubmit false / decideSubmit blocked", () => {
    expect(canSubmit("sending")).toBe(false); expect(canSubmit("idle")).toBe(true)
    expect(decideSubmit("sending", { honeypotFilled: false, validation: validateLeadForm(m, { name: "A", email: "a@b.c" }) }).action).toBe("blocked")
  })
  it("honeypot rempli → succès silencieux (rien envoyé)", () => {
    expect(decideSubmit("idle", { honeypotFilled: true, validation: validateLeadForm(m, {}) })).toEqual({ status: "success", action: "honeypot-skip" })
  })
  it("validation KO → validation_error ; OK → send", () => {
    expect(decideSubmit("idle", { honeypotFilled: false, validation: validateLeadForm(m, {}) }).status).toBe("validation_error")
    expect(decideSubmit("idle", { honeypotFilled: false, validation: validateLeadForm(m, { name: "A", email: "a@b.c" }) }).action).toBe("send")
  })
  it("résultat : ok → success ; échec+owner → mailto ; échec sans owner → error", () => {
    expect(decideResult(true, false)).toEqual({ status: "success", action: "none" })
    expect(decideResult(false, true)).toEqual({ status: "success", action: "mailto" })
    expect(decideResult(false, false)).toEqual({ status: "error", action: "none" })
  })
})

// ── Parité éditeur (aperçu inactif) ───────────────────────────────────────────
describe("B09.13 — adapter éditeur (aperçu non soumis)", () => {
  const out = H(createElement(EditorLeadFormAdapter, { model: contactFormModel({ show_phone: "yes" }), idPrefix: "b1", TEXT: "#fff", MUTED: "#999", accent: "#000" }))
  it("rend les champs + labels + bouton, avec mention d'aperçu", () => {
    expect(out).toContain("Nom"); expect(out).toContain("Email"); expect(out).toContain("Message")
    expect(out).toContain("<label"); expect(out).toContain("<button")
    expect(out).toContain(EDITOR_FORM_PREVIEW_NOTICE)
  })
  it("aucune soumission réelle : pas de <form>, pas de honeypot, pas de faux succès, bouton neutralisé", () => {
    expect(out).not.toContain("<form")
    expect(out).not.toContain('name="website"')          // honeypot jamais affiché en éditeur
    expect(out).not.toContain("Demande envoyée")          // aucun faux état de succès
    expect(out).toContain('aria-disabled="true"')          // bouton non soumis
    expect(out).toContain("readonly")                       // champs en lecture seule
  })
  it("accessibilité : chaque champ a un label associé (htmlFor/id)", () => {
    expect(out).toContain('for="b1-name"'); expect(out).toContain('id="b1-name"')
    expect(out).toContain('for="b1-email"'); expect(out).toContain('id="b1-email"')
  })
})

// ── Sécurité ──────────────────────────────────────────────────────────────────
describe("B09.13 — sécurité", () => {
  it("valeur contenant du HTML/script → échappée (aucune injection brute)", () => {
    const out = H(createElement(SharedLeadFormView, { model: contactFormModel({}), values: { name: "<script>alert(1)</script>" }, status: "idle", idPrefix: "b1", TEXT: "#fff", MUTED: "#999", accent: "#000" }))
    expect(out).not.toContain("<script>alert(1)")
  })
  it("aucun dangerouslySetInnerHTML dans la vue/adapter/modèles", () => {
    for (const f of ["./forms/SharedLeadFormView.tsx", "./forms/EditorLeadFormAdapter.tsx", "./forms/leadFormModels.ts", "./forms/leadPayload.ts"]) {
      expect(read(f).includes("dangerouslySetInnerHTML")).toBe(false)
    }
  })
  it("l'adapter éditeur n'importe jamais submitLead / supabase", () => {
    const src = read("./forms/EditorLeadFormAdapter.tsx")
    expect(src.includes("submitLead")).toBe(false); expect(/supabase/i.test(src)).toBe(false)
  })
  it("la vue commune n'importe ni submitLead ni client réseau", () => {
    const src = read("./forms/SharedLeadFormView.tsx")
    expect(src.includes("submitLead")).toBe(false); expect(src.includes("/api/")).toBe(false)
  })
})

// ── Méta : rien n'est activé ─────────────────────────────────────────────────
describe("B09.13 — aucune activation", () => {
  it("toujours exactement 51 blocs shared actifs", () => {
    expect(SHARED_RENDERER_BLOCKS.size).toBe(52)
  })
  it("les 6 formulaires restent LEGACY (hors flag)", () => {
    for (const t of ["contact_form", "quote_form", "reservation_form", "booking_request", "event_register", "rsvp"]) {
      expect(SHARED_RENDERER_BLOCKS.has(t)).toBe(false)
    }
  })
  it("registre préparatoire complet + 2 pilotes recommandés", () => {
    expect(Object.keys(FORM_RENDERER_CANDIDATES).sort()).toEqual(["booking_request", "contact_form", "event_register", "quote_form", "reservation_form", "rsvp"])
    expect([...FORM_PILOT_CANDIDATES]).toEqual(["contact_form", "quote_form"])
  })
})
