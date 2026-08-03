import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { whatsappButtonViewModel } from "./models/whatsappButton"
import { emailButtonViewModel } from "./models/emailButton"
import { downloadFileViewModel } from "./models/downloadFile"
import { orderOnlineViewModel } from "./models/orderOnline"
import { donationViewModel } from "./models/donation"
import { googleReviewViewModel } from "./models/googleReview"
import { PublicCtaLink } from "./primitives/BlockCtaLink"
import { EditorWhatsappButton } from "./blocks/whatsapp_button/EditorWhatsappButton"
import { PublicWhatsappButton } from "./blocks/whatsapp_button/PublicWhatsappButton"
import { EditorEmailButton } from "./blocks/email_button/EditorEmailButton"
import { PublicEmailButton } from "./blocks/email_button/PublicEmailButton"
import { EditorDownloadFile } from "./blocks/download_file/EditorDownloadFile"
import { PublicDownloadFile } from "./blocks/download_file/PublicDownloadFile"
import { EditorOrderOnline } from "./blocks/order_online/EditorOrderOnline"
import { PublicOrderOnline } from "./blocks/order_online/PublicOrderOnline"
import { EditorDonation } from "./blocks/donation/EditorDonation"
import { PublicDonation } from "./blocks/donation/PublicDonation"
import { EditorGoogleReview } from "./blocks/google_review/EditorGoogleReview"
import { PublicGoogleReview } from "./blocks/google_review/PublicGoogleReview"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

const theme: any = { fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const eCtx: EditorRenderCtx = { theme, primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190", accent: "#39FF8F", surfaceStyle: { background: "#080808" }, canEdit: false, edit: () => () => {} }
const pCtx: PublicRenderCtx = { theme, G: "#C9A84C", TEXT: "#F5F0E8", MUTED: "#A8A190", FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: () => {} }
const H = (el: any) => renderToStaticMarkup(el)

describe("wave2 — modèles purs (contenu + lien sûr)", () => {
  it("whatsapp : href via waLink si téléphone, visible", () => {
    expect(whatsappButtonViewModel({}).link.visible).toBe(false)
    const vm = whatsappButtonViewModel({ phone: "+33612345678" })
    expect(vm.link.visible).toBe(true); expect(vm.link.external).toBe(true); expect(vm.link.trackTarget).toBe("whatsapp")
    expect(vm.label).toBe("Discuter sur WhatsApp")
  })
  it("email : mailto + subject encodé ; invisible sans email", () => {
    expect(emailButtonViewModel({}).link.visible).toBe(false)
    const vm = emailButtonViewModel({ email: "a@b.com", subject: "Coucou & Cie" })
    expect(vm.link.href).toBe("mailto:a@b.com?subject=Coucou%20%26%20Cie")
    expect(vm.link.external).toBe(false)
  })
  it("download : extHref, typeDoc, invisible sans url", () => {
    expect(downloadFileViewModel({}).link.visible).toBe(false)
    const vm = downloadFileViewModel({ url: "ex.com/f.pdf", type_doc: "PDF", label: "Guide" })
    expect(vm.link.href).toBe("https://ex.com/f.pdf"); expect(vm.typeDoc).toBe("PDF"); expect(vm.link.external).toBe(true)
  })
  it("order_online : TOUJOURS visible, external seulement si http(s)", () => {
    expect(orderOnlineViewModel({}).link.visible).toBe(true)
    expect(orderOnlineViewModel({ url: "https://ex.com" }).link.external).toBe(true)
    expect(orderOnlineViewModel({ url: "/interne" }).link.external).toBe(false)
    expect(orderOnlineViewModel({}).link.trackTarget).toBe("order")
  })
  it("donation : couleur de plateforme, invisible sans url", () => {
    expect(donationViewModel({ platform: "Patreon" }).color).toBe("#FF424D")
    expect(donationViewModel({ platform: "Inconnue" }).color).toBe("#F59E0B")
    expect(donationViewModel({}).link.visible).toBe(false)
    expect(donationViewModel({ url: "ex.com" }).link.trackTarget).toBe("ex.com")
  })
  it("google_review : étoiles parseInt bornées, invisible sans url", () => {
    expect(googleReviewViewModel({ stars: "4" }).stars).toBe(4)
    expect(googleReviewViewModel({ stars: "0" }).stars).toBe(5)
    expect(googleReviewViewModel({}).stars).toBe(5)
    expect(googleReviewViewModel({}).link.visible).toBe(false)
  })
  it("sécurité : javascript: neutralisé dans tous les modèles à URL", () => {
    for (const vm of [downloadFileViewModel({ url: "javascript:alert(1)" }), orderOnlineViewModel({ url: "javascript:alert(1)" }), donationViewModel({ url: "javascript:alert(1)" }), googleReviewViewModel({ url: "javascript:alert(1)" })]) {
      const h = (vm as any).link.href
      if (h) expect(h.startsWith("javascript:")).toBe(false)
    }
  })
  it("non-mutation des entrées", () => {
    const c = { url: "ex.com", label: "X", platform: "Ko-fi", stars: "5" }; const s = JSON.stringify(c)
    donationViewModel(c); googleReviewViewModel(c); orderOnlineViewModel(c); downloadFileViewModel(c)
    expect(JSON.stringify(c)).toBe(s)
  })
})

describe("wave2 — parité de rendu ÉDITEUR (non navigable)", () => {
  const cases: [string, any, any][] = [
    ["whatsapp", EditorWhatsappButton, { phone: "+33612345678" }],
    ["email", EditorEmailButton, { email: "a@b.com" }],
    ["download", EditorDownloadFile, { url: "ex.com/f.pdf", label: "Guide" }],
    ["order", EditorOrderOnline, { url: "https://ex.com" }],
    ["donation", EditorDonation, { url: "ex.com" }],
    ["google_review", EditorGoogleReview, { url: "ex.com" }],
  ]
  for (const [name, Comp, content] of cases) {
    it(`${name} : aria-disabled, aucun <a>, aucun href`, () => {
      const out = H(createElement(Comp, { content, ctx: eCtx }))
      expect(out).toContain("aria-disabled")
      expect(out).not.toContain("<a ")
      expect(out).not.toContain("href=")
    })
  }
  it("éditeur : CTA affiché MÊME sans donnée de lien (aperçu)", () => {
    expect(H(createElement(EditorWhatsappButton, { content: {}, ctx: eCtx }))).toContain("Discuter sur WhatsApp")
    expect(H(createElement(EditorDonation, { content: {}, ctx: eCtx }))).toContain("Soutenir mon travail")
  })
})

describe("wave2 — parité de rendu PUBLIC (lien + null)", () => {
  it("whatsapp : <a target=_blank rel> si téléphone, null sinon", () => {
    const out = H(createElement(PublicWhatsappButton, { content: { phone: "+33612345678" }, ctx: pCtx }))
    expect(out).toContain("<a "); expect(out).toContain('target="_blank"'); expect(out).toContain('rel="noopener noreferrer"')
    expect(H(createElement(PublicWhatsappButton, { content: {}, ctx: pCtx }))).toBe("")
  })
  it("email : <a mailto> SANS target, null sans email", () => {
    const out = H(createElement(PublicEmailButton, { content: { email: "a@b.com" }, ctx: pCtx }))
    expect(out).toContain('href="mailto:a@b.com"'); expect(out).not.toContain('target="_blank"')
    expect(H(createElement(PublicEmailButton, { content: {}, ctx: pCtx }))).toBe("")
  })
  it("download : <a> href sûr, null sans url", () => {
    expect(H(createElement(PublicDownloadFile, { content: { url: "ex.com/f.pdf", label: "Guide" }, ctx: pCtx }))).toContain('href="https://ex.com/f.pdf"')
    expect(H(createElement(PublicDownloadFile, { content: {}, ctx: pCtx }))).toBe("")
  })
  it("order_online : TOUJOURS un <a> (href=# si vide)", () => {
    expect(H(createElement(PublicOrderOnline, { content: {}, ctx: pCtx }))).toContain('href="#"')
    expect(H(createElement(PublicOrderOnline, { content: { url: "https://ex.com" }, ctx: pCtx }))).toContain('href="https://ex.com"')
  })
  it("donation : <a> couleur plateforme, null sans url", () => {
    expect(H(createElement(PublicDonation, { content: { url: "ex.com", platform: "Patreon" }, ctx: pCtx }))).toContain("<a ")
    expect(H(createElement(PublicDonation, { content: {}, ctx: pCtx }))).toBe("")
  })
  it("google_review : <a> + étoiles, null sans url", () => {
    const out = H(createElement(PublicGoogleReview, { content: { url: "ex.com", stars: "3" }, ctx: pCtx }))
    expect(out).toContain("<a "); expect((out.match(/★/g) || []).length).toBe(3)
    expect(H(createElement(PublicGoogleReview, { content: {}, ctx: pCtx }))).toBe("")
  })
})

describe("wave2 — sécurité & tracking du lien", () => {
  it("PublicCtaLink : href=# si null, jamais de schéma exécutable", () => {
    const out = H(createElement(PublicCtaLink, { href: null, external: false, trackTarget: "x", trackClick: () => {}, style: {}, children: "T" }))
    expect(out).toContain('href="#"')
  })
  it("PublicCtaLink : un tracking qui échoue ne casse pas le rendu (try/catch)", () => {
    const boom = () => { throw new Error("net") }
    expect(() => H(createElement(PublicCtaLink, { href: "https://x.com", external: true, trackTarget: "t", trackClick: boom, style: {}, children: "T" }))).not.toThrow()
  })
})
