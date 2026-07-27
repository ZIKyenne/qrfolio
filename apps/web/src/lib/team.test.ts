import { describe, it, expect } from "vitest"
import { ROLE_RANK, roleAtLeast, ASSIGNABLE_ROLES } from "./team"
import { canTeam, teamLimit } from "./plans"

describe("rôles équipe", () => {
  it("hiérarchie owner > admin > editor > viewer", () => {
    expect(ROLE_RANK.owner).toBeGreaterThan(ROLE_RANK.admin)
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.editor)
    expect(ROLE_RANK.editor).toBeGreaterThan(ROLE_RANK.viewer)
  })

  it("roleAtLeast compare correctement", () => {
    expect(roleAtLeast("owner", "admin")).toBe(true)
    expect(roleAtLeast("admin", "admin")).toBe(true)
    expect(roleAtLeast("editor", "admin")).toBe(false)
    expect(roleAtLeast("editor", "editor")).toBe(true)
    expect(roleAtLeast("viewer", "editor")).toBe(false)
  })

  it("un rôle absent (null/undefined) n'atteint aucun seuil", () => {
    expect(roleAtLeast(null, "editor")).toBe(false)
    expect(roleAtLeast(undefined, "viewer")).toBe(false)
  })

  it("seuls editor et admin sont assignables (jamais owner/viewer)", () => {
    expect(ASSIGNABLE_ROLES).toEqual(["editor", "admin"])
    expect(ASSIGNABLE_ROLES).not.toContain("owner")
    expect(ASSIGNABLE_ROLES).not.toContain("viewer")
  })
})

describe("gating plan Équipe", () => {
  it("l'équipe est réservée au plan Business", () => {
    expect(canTeam("business")).toBe(true)
    expect(canTeam("pro")).toBe(false)
    expect(canTeam("starter")).toBe(false)
    expect(canTeam("free")).toBe(false)
    expect(canTeam(null)).toBe(false)
    expect(canTeam(undefined)).toBe(false)
  })

  it("teamLimit reflète les sièges du plan", () => {
    expect(teamLimit("business")).toBe(5)
    expect(teamLimit("pro")).toBeNull()
    expect(teamLimit("free")).toBeNull()
  })
})
