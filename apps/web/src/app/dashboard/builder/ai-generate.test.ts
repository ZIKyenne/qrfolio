import { describe, it, expect } from "vitest"
import { aiBriefToTemplate, AI_BRIEF_SCHEMA, AI_SECTION_KINDS, buildSystemPrompt, type AiBrief } from "./ai-generate"
import { AMBIANCE_KEYS } from "./page-templates"
import { BLOCK_DEFS } from "./blockDefs"

// Tout bloc émis par le mapper doit avoir un type existant dans BLOCK_DEFS.
function assertValidBlocks(blocks: { type: string; content: Record<string, string> }[]) {
  for (const b of blocks) {
    expect(BLOCK_DEFS[b.type], `type inconnu: ${b.type}`).toBeTruthy()
    for (const v of Object.values(b.content)) expect(typeof v).toBe("string")
  }
}

describe("aiBriefToTemplate", () => {
  it("profil toujours en tête + thème résolu depuis l'ambiance", () => {
    const t = aiBriefToTemplate({ name: "Le Bistrot", tagline: "Cuisine maison", badge: "⭐", ambiance: "velvet", sections: [] })
    expect(t.blocks[0].type).toBe("profile")
    expect(t.blocks[0].content).toEqual({ name: "Le Bistrot", tagline: "Cuisine maison", badge: "⭐" })
    expect(t.theme.primary).toBe("#EF4444") // T.velvet
    expect(t.group).toBe("IA")
    assertValidBlocks(t.blocks)
  })

  it("ambiance inconnue -> thème gold par défaut, nom vide -> secours", () => {
    const t = aiBriefToTemplate({ ambiance: "inexistant" as any, sections: [] })
    expect(t.theme.primary).toBe("#C9A84C") // T.gold
    expect(t.blocks[0].content.name).toBe("Mon activité")
  })

  it("mappe chaque kind vers un bloc valide avec les bonnes clés", () => {
    const brief: AiBrief = {
      name: "Test", tagline: "", badge: "", ambiance: "gold",
      sections: [
        { kind: "about", title: "", text: "Une belle histoire.", items: [] },
        { kind: "skills", title: "Expertises", text: "", items: [{ label: "SEO", value: "", detail: "" }, { label: "Ads", value: "", detail: "" }] },
        { kind: "services", title: "Services", text: "", items: [{ label: "Coaching", value: "💪", detail: "1h" }] },
        { kind: "menu", title: "Entrées", text: "", items: [{ label: "Soupe", value: "8€", detail: "maison" }] },
        { kind: "pricing", title: "Tarifs", text: "", items: [{ label: "Pro", value: "49€", detail: "/mois" }] },
        { kind: "testimonials", title: "Avis", text: "", items: [{ label: "Marie", value: "5", detail: "Top !" }] },
        { kind: "faq", title: "FAQ", text: "", items: [{ label: "Parking ?", value: "", detail: "Oui" }] },
        { kind: "hours", title: "Horaires", text: "Sur RDV", items: [{ label: "Semaine", value: "9h-18h", detail: "" }] },
        { kind: "cta", title: "Réserver", text: "https://calendly.com", items: [] },
        { kind: "announcement", title: "Promo", text: "-20%", items: [] },
        { kind: "social", title: "", text: "", items: [{ label: "Instagram", value: "https://instagram.com/x", detail: "" }] },
        { kind: "map", title: "Adresse", text: "12 rue de Paris", items: [] },
      ],
    }
    const t = aiBriefToTemplate(brief)
    assertValidBlocks(t.blocks)
    const types = t.blocks.map(b => b.type)
    expect(types).toEqual([
      "profile", "bio", "skills", "services_list", "menu_section", "pricing",
      "testimonials", "faq", "opening_hours", "cta_button", "announcement", "social_links", "google_maps_embed",
    ])
    const byType = Object.fromEntries(t.blocks.map(b => [b.type, b.content]))
    expect(byType.skills.tags).toBe("SEO, Ads")
    expect(byType.services_list.s1_name).toBe("Coaching")
    expect(byType.services_list.s1_icon).toBe("💪")
    expect(byType.menu_section.item1_price).toBe("8€")
    expect(byType.pricing.title1).toBe("Pro")
    expect(byType.testimonials.stars1).toBe("5")
    expect(byType.faq.a1).toBe("Oui")
    expect(byType.opening_hours.mon_fri).toBe("9h-18h")
    expect(byType.opening_hours.note).toBe("Sur RDV")
    expect(byType.cta_button.url).toBe("https://calendly.com")
    expect(byType.social_links.instagram).toBe("https://instagram.com/x")
    expect(byType.google_maps_embed.address).toBe("12 rue de Paris")
  })

  it("plafonne les listes à 3 (rendu public) et ignore les lignes vides", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ label: `P${i}`, value: `${i}€`, detail: "" }))
    const t = aiBriefToTemplate({ name: "X", ambiance: "gold", sections: [
      { kind: "menu", title: "Carte", text: "", items: [...many, { label: "", value: "", detail: "" }] },
      { kind: "services", title: "S", text: "", items: many },
    ] })
    const menu = t.blocks.find(b => b.type === "menu_section")!.content
    expect(menu.item3_name).toBe("P2")
    expect(menu.item4_name).toBeUndefined()
    const svc = t.blocks.find(b => b.type === "services_list")!.content
    expect(svc.s3_name).toBe("P2")   // le rendu public ne lit que s1..s3
    expect(svc.s4_name).toBeUndefined()
  })

  it("cta : n'accepte comme URL que ce qui ressemble à un lien (jamais une phrase)", () => {
    const phrase = aiBriefToTemplate({ ambiance: "gold", sections: [{ kind: "cta", title: "Réserver", text: "Contactez-nous vite", items: [] }] })
    expect(phrase.blocks.find(b => b.type === "cta_button")!.content.url).toBe("#") // phrase -> pas de href cassé
    const withUrl = aiBriefToTemplate({ ambiance: "gold", sections: [{ kind: "cta", title: "Réserver", text: "une phrase", items: [{ label: "", value: "calendly.com/x", detail: "" }] }] })
    expect(withUrl.blocks.find(b => b.type === "cta_button")!.content.url).toBe("calendly.com/x") // repli sur l'item URL
  })

  it("social : domaines de secours corrects (twitch.tv, t.me)", () => {
    const t = aiBriefToTemplate({ ambiance: "gold", sections: [{ kind: "social", title: "", text: "", items: [
      { label: "Twitch", value: "", detail: "" },
      { label: "Telegram", value: "", detail: "" },
    ] }] })
    const soc = t.blocks.find(b => b.type === "social_links")!.content
    expect(soc.twitch).toBe("https://twitch.tv")
    expect(soc.telegram).toBe("https://t.me")
  })

  it("kind inconnu ou section vide -> ignoré (pas de bloc parasite)", () => {
    const t = aiBriefToTemplate({ name: "X", ambiance: "gold", sections: [
      { kind: "inconnu", title: "?", text: "", items: [] },
      { kind: "services", title: "", text: "", items: [] }, // vide -> null
      { kind: "faq", title: "", text: "", items: [] },      // vide -> null
    ] })
    expect(t.blocks.map(b => b.type)).toEqual(["profile"])
  })

  it("robuste aux entrées non-tableau / null", () => {
    expect(() => aiBriefToTemplate({} as any)).not.toThrow()
    expect(() => aiBriefToTemplate({ sections: null } as any)).not.toThrow()
    expect(() => aiBriefToTemplate(null as any)).not.toThrow()
    expect(aiBriefToTemplate(null as any).blocks[0].type).toBe("profile")
  })

  it("réseau social : libellés libres normalisés + secours instagram", () => {
    const t = aiBriefToTemplate({ name: "X", ambiance: "gold", sections: [
      { kind: "social", title: "", text: "", items: [
        { label: "insta", value: "", detail: "" },
        { label: "Le Facebook", value: "https://fb.com/x", detail: "" },
        { label: "zzz", value: "", detail: "" },
      ] },
    ] })
    const soc = t.blocks.find(b => b.type === "social_links")!.content
    expect(soc.instagram).toBe("https://instagram.com")
    expect(soc.facebook).toBe("https://fb.com/x")
    expect(soc.zzz).toBeUndefined()
  })

  it("schéma : enum ambiance/kind cohérent avec les constantes", () => {
    expect((AI_BRIEF_SCHEMA.properties.ambiance as any).enum).toEqual(AMBIANCE_KEYS)
    expect((AI_BRIEF_SCHEMA.properties.sections.items.properties.kind as any).enum).toEqual([...AI_SECTION_KINDS])
    expect(buildSystemPrompt()).toContain("QRowg")
  })
})
