// Page de revue des primitives UI : interne. Elle était publique en production,
// sans garde. Même porte que les harness de test : 404 en production, sauf
// E2E_HARNESS=1 pour une mesure sur le vrai build.
import { notFound } from "next/navigation"
import { harnessAutorise } from "@/app/e2e-harness/gate"
import UiDemo from "./UiDemo"

export default function Page() {
  if (!harnessAutorise()) notFound()
  return <UiDemo />
}
