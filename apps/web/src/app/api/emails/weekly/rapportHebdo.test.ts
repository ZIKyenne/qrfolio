import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const SRC = join(__dirname, "../../../..")

function tousLesFichiers(dir: string, acc: string[] = []): string[] {
  for (const nom of readdirSync(dir).sort()) {
    if (nom === "node_modules" || nom.startsWith(".")) continue
    const chemin = join(dir, nom)
    if (statSync(chemin).isDirectory()) tousLesFichiers(chemin, acc)
    else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) acc.push(chemin)
  }
  return acc
}

describe("les scans se comptent sur la bonne colonne", () => {
  // La table `scans` n'a pas de colonne `created_at` : son horodatage est
  // `scanned_at`. Le rapport hebdomadaire filtrait sur la mauvaise — PostgREST
  // renvoyait une erreur 42703, supabase-js ne lève rien, `count` valait null.
  // TOUS les rapports annonçaient « 0 scan cette semaine », y compris à quelqu'un
  // qui en avait cent quatre-vingts, avec « Personne n'a encore scanné votre QR ».
  it("aucune requête sur `scans` ne filtre sur created_at", () => {
    const coupables: string[] = []
    for (const f of tousLesFichiers(SRC)) {
      const src = readFileSync(f, "utf8")
      const morceaux = src.split('from("scans")')
      for (const suite of morceaux.slice(1)) {
        // Portée : jusqu'à la requête suivante, au plus 400 caractères.
        const fin = suite.indexOf('from("')
        const requete = (fin > 0 ? suite.slice(0, fin) : suite).slice(0, 400)
        if (/["']created_at["']/.test(requete)) coupables.push(f.replace(SRC, "src"))
      }
    }
    expect(coupables, coupables.join(", ")).toEqual([])
  })

  it("les colonnes d'horodatage de chaque table d'événements sont celles du schéma", () => {
    // Une seule liste fait foi (lib/eventRetention) ; elle est vérifiée ici contre
    // la migration initiale, qui est le schéma réellement appliqué.
    const schema = readFileSync(join(SRC, "../../../supabase/migrations/20260521200846_initial_schema.sql"), "utf8")
    for (const [table, colonne] of [["scans", "scanned_at"], ["page_views", "viewed_at"], ["block_clicks", "clicked_at"]]) {
      const bloc = schema.slice(schema.indexOf(`create table public.${table}`))
      expect(bloc.slice(0, bloc.indexOf(");")), `${table}.${colonne}`).toContain(colonne)
    }
  })
})

describe("le rapport hebdomadaire ne compte que ce qui est vraiment parti", () => {
  const route = readFileSync(join(__dirname, "route.ts"), "utf8")

  it("lit le résultat de l'envoi", () => {
    // Le SDK Resend ne LÈVE PAS : un 429 (deux envois/seconde), un 403 (domaine
    // non vérifié) ou une panne réseau reviennent dans `error`. `sent++` était
    // inconditionnel : la tâche répondait « 12 envoyé(s) » et le journal affichait
    // « Dernière exécution » en vert pour deux emails réellement partis sur douze.
    expect(route).toMatch(/const \{ error: \w+ \} = await resend\.emails\.send/)
  })

  it("bascule le journal en erreur dès qu'un envoi échoue", () => {
    expect(route).toContain('echecs.length ? "erreur"')
  })

  it("n'écrit aucune adresse dans le journal", () => {
    for (const l of route.split("\n").filter(l => l.includes(".join("))) {
      expect(l.includes("sansAdresses("), l.trim()).toBe(true)
    }
  })
})
