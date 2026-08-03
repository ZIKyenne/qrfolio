import { describe, it, expect } from "vitest"
import { classifyError, safeErrorMessage, loadStateFromError, USER_MESSAGES } from "./builderErrors"

describe("classifyError", () => {
  it("réseau : message fetch/network", () => {
    expect(classifyError({ message: "TypeError: Failed to fetch" })).toEqual({ code: "NETWORK", retryable: true })
    expect(classifyError(new Error("fetch failed")).code).toBe("NETWORK")
    expect(classifyError({ message: "network request timed out" }).code).toBe("NETWORK")
  })
  it("absence : PGRST116 (0 ligne sur .single) ou 406", () => {
    expect(classifyError({ code: "PGRST116", message: "Results contain 0 rows" })).toEqual({ code: "NOT_FOUND", retryable: false })
    expect(classifyError({ status: 406 }).code).toBe("NOT_FOUND")
  })
  it("session expirée : 401 / PGRST301 / jwt", () => {
    expect(classifyError({ status: 401 }).code).toBe("UNAUTHORIZED")
    expect(classifyError({ code: "PGRST301" }).code).toBe("UNAUTHORIZED")
    expect(classifyError({ message: "JWT expired" }).code).toBe("UNAUTHORIZED")
  })
  it("droit refusé : 403 / 42501 / permission / RLS", () => {
    expect(classifyError({ status: 403 }).code).toBe("FORBIDDEN")
    expect(classifyError({ code: "42501", message: "permission denied for table pages" }).code).toBe("FORBIDDEN")
    expect(classifyError({ message: "new row violates row-level security policy" }).code).toBe("FORBIDDEN")
  })
  it("validation : contrainte / type", () => {
    expect(classifyError({ code: "23505", message: "duplicate key" }).code).toBe("VALIDATION")
    expect(classifyError({ message: "invalid input syntax for type uuid" }).code).toBe("VALIDATION")
  })
  it("serveur : 5xx / PGRST divers", () => {
    expect(classifyError({ status: 500 }).code).toBe("SERVER")
    expect(classifyError({ code: "PGRST200" }).code).toBe("SERVER")
  })
  it("inconnu par défaut, récupérable", () => {
    expect(classifyError({})).toEqual({ code: "UNKNOWN", retryable: true })
    expect(classifyError(null).code).toBe("UNKNOWN")
  })
})

describe("safeErrorMessage — ne fuite JAMAIS le détail technique", () => {
  it("remplace un message Supabase brut par un message utilisateur", () => {
    const raw = "permission denied for table public.pages (RLS policy pages_update)"
    const shown = safeErrorMessage({ code: "42501", message: raw })
    expect(shown).toBe(USER_MESSAGES.FORBIDDEN)
    expect(shown).not.toContain("pages")
    expect(shown).not.toContain("RLS")
    expect(shown).not.toContain("policy")
  })
  it("un message réseau donne le conseil de connexion", () => {
    expect(safeErrorMessage(new Error("Failed to fetch"))).toBe(USER_MESSAGES.NETWORK)
  })
  it("tout code produit un message non vide et prédéfini", () => {
    for (const e of [{ code: "PGRST116" }, { status: 500 }, { status: 401 }, {}, null]) {
      const m = safeErrorMessage(e)
      expect(Object.values(USER_MESSAGES)).toContain(m)
    }
  })
})

describe("loadStateFromError", () => {
  it("page présente → loaded (court-circuit)", () => {
    expect(loadStateFromError({ code: "PGRST116" }, true)).toBe("loaded")
  })
  it("absence → not_found", () => {
    expect(loadStateFromError({ code: "PGRST116" }, false)).toBe("not_found")
  })
  it("droit/session → forbidden", () => {
    expect(loadStateFromError({ status: 403 }, false)).toBe("forbidden")
    expect(loadStateFromError({ status: 401 }, false)).toBe("forbidden")
  })
  it("réseau/serveur/inconnu → error (récupérable)", () => {
    expect(loadStateFromError(new Error("fetch failed"), false)).toBe("error")
    expect(loadStateFromError({ status: 500 }, false)).toBe("error")
    expect(loadStateFromError({}, false)).toBe("error")
  })
})
