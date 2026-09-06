import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// ─────────────────────────────────────────────────────────────────────────────
// LA PAGE PUBLIÉE NE LIT PAS L'HEURE AU PREMIER RENDU
//
// La page publique est mise en cache 60 secondes (ISR, `revalidate = 60` dans
// page.tsx). Le HTML qu'un visiteur reçoit a donc entre 0 et 60 secondes quand
// son navigateur l'hydrate. Tout ce qui se calcule à partir de l'heure COURANTE
// pendant le premier rendu diffère forcément entre le serveur et le client :
// React signale un mismatch (#418) et jette le HTML du serveur pour tout
// refaire côté client — sur la page la plus importante du produit, celle qu'on
// découvre en scannant un QR.
//
// Trois composants appliquaient déjà le bon motif (Ouvert/Fermé, Horaires,
// Annonce) : état initial neutre, heure lue dans un `useEffect`. Le compte à
// rebours l'avait manqué — `useState(() => Date.now())` — et Playwright a
// attrapé le #418 sur le modèle « Soirée ».
// ─────────────────────────────────────────────────────────────────────────────

// La page publiée et ses blocs sont deux fichiers depuis la découpe, mais une
// seule surface pour cette règle : on les lit ensemble.
const ici_ = dirname(fileURLToPath(import.meta.url))
const src = ["PublicPageClient.tsx", "renduLegacy.tsx", "blocsPublics.tsx"].map(f => readFileSync(join(ici_, f), "utf8")).join("\n")

describe("aucune horloge dans un état initial de la page publiée", () => {
  it("aucun useState n'est initialisé avec l'heure courante", () => {
    const fautifs = src.split("\n")
      .map((l, i) => [i + 1, l] as const)
      .filter(([, l]) => /useState/.test(l) && /(Date\.now\(\)|new Date\(\s*\))/.test(l))
      .map(([n, l]) => `ligne ${n} : ${l.trim().slice(0, 100)}`)
    expect(fautifs, "un état initial lit l'horloge : mismatch d'hydratation garanti sous ISR").toEqual([])
  })

  it("le compte à rebours part d'un état neutre", () => {
    expect(src).toContain("const [now, setNow] = useState<number | null>(null)")
    // Et il ne peut pas afficher « Offre terminée » avant d'avoir lu l'heure.
    expect(src).toContain("const p = now === null ? null : countdownParts(targetMs, now)")
    expect(src).toContain("{p?.expired")
    expect(src).toContain('{val === null ? "––" : String(val).padStart(2, "0")}')
  })

  it("les trois voisins gardent le bon motif", () => {
    expect(src).toContain("const [st, setSt] = useState<ReturnType<typeof openStatus>>(null)")   // Ouvert / Fermé
    expect(src).toContain("const [today, setToday] = useState(-1)")                              // Horaires
    expect(src).toContain("const [now, setNow] = useState<number | null>(null)")                 // Annonce
  })

  it("la page publique est bien mise en cache — c'est ce qui rend la règle nécessaire", () => {
    const serveur = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "page.tsx"), "utf8")
    expect(serveur).toMatch(/export const revalidate = \d+/)
  })
})
