// Route de harness E2E (T3.b) — modale de nommage AVEC sélecteur de style/disposition (moteur de
// templates), rendue sans Supabase. GATÉE 404 en production.
import { notFound } from "next/navigation"
import { NamingStyleHarness } from "./NamingStyleHarness"

export const dynamic = "force-dynamic"

export default function E2ENamingStylePage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <NamingStyleHarness />
}
