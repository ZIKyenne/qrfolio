import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")

// Ce qu'un client télécharge en scannant un QR, devant une vitrine, sur son forfait.
//
// Mesuré en conditions réelles (4G lente, processeur divisé par quatre) : la page
// tirait 1 205 Ko de JavaScript décompressé, dont 292 Ko — un quart — de métadonnées
// d'ÉDITEUR : libellés de champs, aides à la saisie, suggestions, contenus par défaut.
// Rien de tout cela ne sert à afficher une page. La cause tenait en une ligne : la
// page publique importe une quarantaine de fonctions d'affichage depuis types.ts, et
// le catalogue des blocs vivait dans le même fichier — il partait avec elles.
//
// Après séparation : 914 Ko, et 444 ms de moins avant que la page soit entièrement
// chargée. Ces tests empêchent le lien de revenir par mégarde.

describe("le catalogue de l'éditeur ne part plus chez le client", () => {
  it("types.ts ne contient plus le catalogue", () => {
    const types = lire("../dashboard/builder/types.ts")
    expect(types).not.toContain("export const BLOCK_DEFS")
  })

  it("et ne le réexporte pas non plus — le lien reviendrait aussitôt", () => {
    const types = lire("../dashboard/builder/types.ts")
    expect(types).not.toMatch(/export .*from ["']\.\/blockDefs["']/)
    expect(types).not.toContain('from "./blockDefs"')
  })

  it("la page publique ne l'importe nulle part", () => {
    for (const f of ["PublicPageClient.tsx", "renduLegacy.tsx", "page.tsx"]) {
      const src = lire(f)
      expect(src, `${f} importe le catalogue de l'éditeur`).not.toContain("blockDefs")
      expect(src, `${f} importe BLOCK_DEFS`).not.toContain("BLOCK_DEFS")
    }
  })

  it("le rendu partagé public reste propre lui aussi", () => {
    const reg = lire("../dashboard/builder/shared-renderer/publicRegistry.tsx")
    expect(reg).not.toContain("BLOCK_DEFS")
    expect(reg).not.toContain("blockDefs")
  })

  it("les catalogues de l'éditeur non plus : thèmes tout prêts et presets", () => {
    // PRESET_THEMES pesait à lui seul 64 Ko — la galerie des thèmes proposés dans
    // l'éditeur. Une page publiée en utilise UN, celui enregistré avec elle.
    const types = lire("../dashboard/builder/types.ts")
    for (const nom of ["PRESET_THEMES", "IDENTITY_PRESETS", "ACTION_PRESETS", "BLOCK_HINTS"]) {
      expect(types, `${nom} est revenu dans types.ts`).not.toContain(`export const ${nom}`)
    }
    expect(types).not.toContain('from "./editorPresets"')
    for (const f of ["PublicPageClient.tsx", "renduLegacy.tsx", "page.tsx"]) {
      expect(lire(f), `${f} importe les presets d'éditeur`).not.toContain("editorPresets")
    }
  })

  it("le catalogue, lui, reste complet", () => {
    const defs = lire("../dashboard/builder/blockDefs.ts")
    expect(defs).toContain("export const BLOCK_DEFS")
    // 178 types de blocs : on vérifie l'ordre de grandeur, pas un compte exact.
    expect((defs.match(/\n  [a-z_0-9]+: \{\n    label:/g) || []).length).toBeGreaterThan(150)
    const presets = lire("../dashboard/builder/editorPresets.ts")
    expect(presets).toContain("export const PRESET_THEMES")
    expect(presets.length, "la galerie de thèmes doit être là, entière").toBeGreaterThan(50_000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Deuxième mesure, le 6 septembre, sur le fichier CONSTRUIT cette fois.
//
// Le morceau que tout visiteur télécharge après un scan pesait 143,6 Ko
// (33,3 Ko compressés). Sur les 99 Ko de `case` qu'il contenait, 91 Ko
// concernaient des blocs DÉJÀ servis par le renderer partagé : du code que plus
// personne n'exécute, conservé pour pouvoir revenir en arrière — et payé par
// chaque visiteur, à chaque scan, sur son forfait.
//
// L'assurance n'est pas supprimée : elle cesse de voyager. Le rendu legacy vit
// dans son propre module, chargé à la demande, et ne descend que si la page
// contient un bloc non migré. Retirer un type de SHARED_RENDERER_BLOCKS le fait
// revenir aussitôt — le rollback fonctionne exactement comme avant.
//
// Mesuré après : 61,7 Ko (18,7 Ko compressés) pour le module legacy, qu'une
// page entièrement migrée ne télécharge plus du tout.
// ─────────────────────────────────────────────────────────────────────────────
describe("le rendu legacy ne voyage plus avec chaque visiteur", () => {
  const client = lire("PublicPageClient.tsx")
  const legacy = lire("renduLegacy.tsx")

  it("la page publique ne contient plus de rendu de bloc", () => {
    // Un seul `case` suffirait à faire redescendre le fichier entier.
    expect(client.match(/case "[a-z0-9_]+":/g) ?? [], "des `case` de blocs sont revenus").toEqual([])
    expect(client.split("\n").length, "PublicPageClient doit rester mince").toBeLessThan(500)
  })

  it("elle charge le legacy à la demande, et seulement s'il faut", () => {
    expect(client).toContain('import("./renduLegacy")')
    expect(client).toContain("if (!SharedPublic) return <RenduLegacy")
    // `dynamic()` sans ssr:false : le HTML arrive complet, le référencement est
    // intact et rien ne clignote au chargement.
    const decl = client.slice(client.indexOf('import("./renduLegacy")'))
    expect(decl.slice(0, 200)).not.toContain("ssr: false")
  })

  it("le legacy tient toujours tous les blocs non migrés", () => {
    const cas = new Set((legacy.match(/case "([a-z0-9_]+)":/g) ?? []).map(m => m.slice(6, -2)))
    expect(cas.size, "le rendu legacy s'est vidé").toBeGreaterThan(100)
    for (const t of ["profile", "opening_hours", "gallery", "contact_form"]) {
      expect(cas.has(t), `${t} a disparu du rendu legacy`).toBe(true)
    }
  })

  it("le rollback reste possible : le legacy garde aussi les blocs migrés", () => {
    // C'est tout l'intérêt de déplacer plutôt que de supprimer : retirer un type
    // de SHARED_RENDERER_BLOCKS doit le faire retomber sur un rendu qui existe.
    const cas = new Set((legacy.match(/case "([a-z0-9_]+)":/g) ?? []).map(m => m.slice(6, -2)))
    for (const t of ["heading", "pricing", "logo_wall", "quote_block", "scan_counter", "packs"]) {
      expect(cas.has(t), `${t} est migré mais n'a plus de repli legacy`).toBe(true)
    }
  })
})

